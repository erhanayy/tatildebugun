"use server";

import { db } from "@/lib/db";
import { cityItineraries, placesOfInterest, type CityItinerary } from "@/lib/db/schema";
import { eq, and, ilike, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ItineraryStopItem {
  orderIndex: number;
  placeId?: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  estimatedMinutes?: number;
  walkingTip?: string;
}

export interface CityItineraryItem {
  id: string;
  cityName: string;
  countryCode: string;
  dayNumber: number;
  title: string;
  theme: string | null;
  description: string | null;
  totalDistanceMeters: number;
  estimatedSteps: number;
  estimatedDurationMinutes: number;
  stops: ItineraryStopItem[];
}

/**
 * Belirli bir şehir için 1-5 günlük yürüyüş rotalarını getirir.
 * DB-First Caching: Veritabanında varsa kesinlikle AI çağrısı yapılmaz, doğrudan DB'den döner.
 */
export async function getCityDailyItineraries(
  cityName: string,
  countryCode = "IT"
): Promise<{ success: boolean; itineraries: CityItineraryItem[]; error?: string }> {
  try {
    const cleanCity = cityName.trim();

    // 1. Önce veritabanında var mı kontrol et (Sıfır Maliyetli Önbellek)
    const existing = await db
      .select()
      .from(cityItineraries)
      .where(ilike(cityItineraries.cityName, cleanCity))
      .orderBy(asc(cityItineraries.dayNumber));

    if (existing.length > 0) {
      return {
        success: true,
        itineraries: existing as CityItineraryItem[],
      };
    }

    // 2. Veritabanında yoksa: Şehir için otomatik olarak 1-5 günlük rotaları oluştur ve DB'ye yaz
    const generated = await seedAndGenerateItinerariesForCity(cleanCity, countryCode);

    return {
      success: true,
      itineraries: generated,
    };
  } catch (error: any) {
    console.error("[getCityDailyItineraries] Hata:", error);
    return {
      success: false,
      itineraries: [],
      error: error.message || "Rotalar yüklenirken bir hata oluştu.",
    };
  }
}

interface RawItineraryDay {
  dayNumber: number;
  title: string;
  theme: string;
  description: string;
  stops: Array<{
    name: string;
    fallbackLat: number;
    fallbackLng: number;
    category?: string;
    estimatedMinutes?: number;
    walkingTip?: string;
  }>;
}

/**
 * Herhangi bir yeni şehir için Akıllı Coğrafi En Yakın Komşu (Greedy Nearest Neighbor) Kümeleme
 * Kurallar:
 * 1. Şehir merkezi ortalaması hesaplanır ve 25 km'den uzak outlier (havaalanı/yanlış koordinat) elenir.
 * 2. Günlük rota tohumu (seed) seçildikten sonra her durak bir öncekine en yakın (max 2.8 km) adaydan seçilir.
 * 3. Günlük durak sayısı 4-5 ile sınırlanır, yürüyüş mesafesi 7.5 km'yi aşmaz.
 * 4. Şehir mekanları mahalle/bölge bazlı homojen günlere ayrılır, zikzaklar ve aşırı yorgunluk önlenir.
 */
function clusterPlacesIntoItineraries(
  cityName: string,
  places: Array<{
    id?: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    category: string | null;
    imageUrl?: string | null;
  }>
): RawItineraryDay[] {
  // 1. Koordinatları geçerli olanları ayıkla
  const validPlaces = places.filter(
    (p) =>
      p.latitude != null &&
      p.longitude != null &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude) &&
      p.latitude !== 0 &&
      p.longitude !== 0 &&
      p.latitude >= -90 &&
      p.latitude <= 90 &&
      p.longitude >= -180 &&
      p.longitude <= 180
  );

  if (validPlaces.length === 0) {
    return [];
  }

  // 2. Şehir merkezini (ortalama lat/lng) hesapla
  const avgLat = validPlaces.reduce((sum, p) => sum + p.latitude!, 0) / validPlaces.length;
  const avgLng = validPlaces.reduce((sum, p) => sum + p.longitude!, 0) / validPlaces.length;

  // 3. Şehir merkezinden 25 km'den uzak aşırı uç noktaları (outlier) ele
  const inCityPlaces = validPlaces.filter((p) => {
    const distToCenter = calculateDistanceMeters(avgLat, avgLng, p.latitude!, p.longitude!);
    return distToCenter <= 25000;
  });

  const pool = inCityPlaces.length >= 3 ? inCityPlaces : validPlaces;

  // 4. Hedef gün sayısı (En az 1, en fazla 5 gün)
  const targetDays = Math.min(5, Math.max(1, Math.ceil(pool.length / 5)));
  const unvisited = [...pool];
  const generatedDays: RawItineraryDay[] = [];

  for (let day = 1; day <= targetDays; day++) {
    if (unvisited.length === 0) break;

    // Günün başlangıç tohumu (Seed): Merkeze yakın ve görseli/kategorisi olan mekanlara öncelik
    let bestSeedIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const p = unvisited[i];
      const dist = calculateDistanceMeters(avgLat, avgLng, p.latitude!, p.longitude!);
      let score = 10000 - dist;
      if (p.imageUrl) score += 3000;
      if (p.category === "historic" || p.category === "museum" || p.category === "monument") {
        score += 2000;
      }
      if (score > bestScore) {
        bestScore = score;
        bestSeedIndex = i;
      }
    }

    const seed = unvisited.splice(bestSeedIndex, 1)[0];
    const dayStops: typeof seed[] = [seed];
    let currentPlace = seed;
    let dayDistance = 0;

    // Komşuluk araması: En yakın unvisited mekanı güne ekle
    while (dayStops.length < 5 && unvisited.length > 0) {
      let closestIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const d = calculateDistanceMeters(
          currentPlace.latitude!,
          currentPlace.longitude!,
          candidate.latitude!,
          candidate.longitude!
        );
        if (d < minDistance) {
          minDistance = d;
          closestIdx = i;
        }
      }

      // Duraklar arası 2.8 km'den uzaksa, yürüyüş homojenliğini korumak için bu günü kapat
      if (minDistance > 2800) {
        break;
      }

      // Toplam günlük yürüyüş 7.5 km'yi aşacaksa durak eklemeyi durdur
      if (dayDistance + minDistance > 7500) {
        break;
      }

      const nextPlace = unvisited.splice(closestIdx, 1)[0];
      dayStops.push(nextPlace);
      dayDistance += minDistance;
      currentPlace = nextPlace;
    }

    // Gün kategorilerini inceleyerek dinamik başlık ve tema üret
    const categories = dayStops.map((s) => s.category || "historic");
    const hasMuseum = categories.includes("museum");
    const hasHistoric = categories.includes("historic") || categories.includes("monument");
    const hasNature = categories.includes("nature") || categories.includes("view");

    let theme = "Şehir & Kültür Keşfi";
    if (hasMuseum && hasHistoric) theme = "Tarihi Yapılar & Sanat Durakları";
    else if (hasHistoric) theme = "Tarihi Miras & Şehir Dokusu";
    else if (hasNature) theme = "Panoramik Manzaralar & Parklar";
    else if (hasMuseum) theme = "Müzeler & Sanat Galerileri";

    generatedDays.push({
      dayNumber: day,
      title: `${cityName} ${theme} - ${day}. Gün`,
      theme,
      description: `${cityName} şehrinin birbirine en yakın tarihi ve turistik duraklarını zikzak çizmeden, yürüyerek keşfedebileceğiniz ${day}. gün rotası.`,
      stops: dayStops.map((dp, idx) => ({
        name: dp.name,
        fallbackLat: dp.latitude || avgLat,
        fallbackLng: dp.longitude || avgLng,
        category: dp.category || "historic",
        estimatedMinutes: 45,
        walkingTip: `${idx + 1}. durak: ${dp.name} ziyareti ve çevre keşfi.`,
      })),
    });
  }

  return generatedDays;
}

/**
 * Şehir için optimize edilmiş 1-5 günlük rotaları oluşturup kalıcı olarak DB'ye yazar
 */
async function seedAndGenerateItinerariesForCity(
  cityName: string,
  countryCode: string
): Promise<CityItineraryItem[]> {
  const normalized = cityName.toLowerCase();

  // Şehirdeki mevcut yerleri çek
  const cityPlaces = await db
    .select()
    .from(placesOfInterest)
    .where(ilike(placesOfInterest.cityName, cityName.trim()));

  const placeMap = new Map(cityPlaces.map((p) => [p.name.toLowerCase(), p]));

  function findPlace(searchName: string) {
    const searchLower = searchName.toLowerCase();
    for (const [name, p] of placeMap.entries()) {
      if (name.includes(searchLower) || searchLower.includes(name)) {
        return p;
      }
    }
    return null;
  }

  let rawDays: Array<{
    dayNumber: number;
    title: string;
    theme: string;
    description: string;
    stops: Array<{
      name: string;
      fallbackLat: number;
      fallbackLng: number;
      category?: string;
      estimatedMinutes?: number;
      walkingTip?: string;
    }>;
  }> = [];

  if (normalized.includes("paris")) {
    rawDays = [
      {
        dayNumber: 1,
        title: "Tarihi Merkez, Louvre & Seine Kıyısı",
        theme: "Kraliyet Mirası & Nehir Romantizmi",
        description:
          "Dünyanın en ünlü müzesi Louvre'dan başlayıp cam piramit ve Tuileries Bahçesi'nden Seine Nehri kıyısına, oradan Empresyonistlerin mabedi Musée d'Orsay ve tarihi Café de Flore'a uzanan büyüleyici yürüyüş rotası.",
        stops: [
          {
            name: "Louvre Müzesi (Musée du Louvre)",
            fallbackLat: 48.8606,
            fallbackLng: 2.3376,
            category: "museum",
            estimatedMinutes: 90,
            walkingTip: "Sabah saatlerinde Cour Napoléon avlusundan başlayarak dış mimariyi ve koleksiyonları fotoğraflayın.",
          },
          {
            name: "Louvre Piramidi & Tuileries Bahçesi",
            fallbackLat: 48.8635,
            fallbackLng: 2.3275,
            category: "nature",
            estimatedMinutes: 45,
            walkingTip: "İkonik cam piramidin ardından heykellerle bezeli kraliyet bahçesi Tuileries boyunca huzurla yürüyün.",
          },
          {
            name: "Pont Neuf & Seine Kıyısı",
            fallbackLat: 48.8575,
            fallbackLng: 2.3416,
            category: "monument",
            estimatedMinutes: 35,
            walkingTip: "Paris'in en eski taş köprüsünden nehir üzerindeki tekne turlarını ve tarihi adayı izleyin.",
          },
          {
            name: "Orsay Müzesi (Musée d'Orsay)",
            fallbackLat: 48.8599,
            fallbackLng: 2.3265,
            category: "museum",
            estimatedMinutes: 75,
            walkingTip: "Eski bir tren garından dönüştürülen devasa müzede dev saat penceresinden Paris silüetini yakalayın.",
          },
          {
            name: "Saint-Germain-des-Prés & Café de Flore",
            fallbackLat: 48.8542,
            fallbackLng: 2.3325,
            category: "cafe",
            estimatedMinutes: 45,
            walkingTip: "Sartre ve Simone de Beauvoir gibi düşünürlerin buluşma noktası olan tarihi kafede kahve ve kruvasan molası verin.",
          },
        ],
      },
      {
        dayNumber: 2,
        title: "İkonik Eyfel, Champ de Mars & Şanzelize",
        theme: "Paris Simgeleri & Büyük Bulvarlar",
        description:
          "Paris'in evrensel simgesi Eyfel Kulesi ve Champ de Mars yeşilliklerinden başlayıp Trocadéro terasından Zafer Takı'na ve dünyanın en ünlü bulvarı Şanzelize'ye uzanan prestijli yürüyüş.",
        stops: [
          {
            name: "Eyfel Kulesi (Tour Eiffel)",
            fallbackLat: 48.8584,
            fallbackLng: 2.2945,
            category: "monument",
            estimatedMinutes: 75,
            walkingTip: "Demir Leydi'nin devasa ayakları altından başlayıp mimari zarafeti yakından inceleyin.",
          },
          {
            name: "Champ de Mars Parkı",
            fallbackLat: 48.8556,
            fallbackLng: 2.2986,
            category: "nature",
            estimatedMinutes: 40,
            walkingTip: "Kulenin en güzel fotoğraflarını çekebileceğiniz geniş çimenlik koridorda yürüyün.",
          },
          {
            name: "Trocadéro Meydanı & Seyir Terası",
            fallbackLat: 48.8624,
            fallbackLng: 2.2872,
            category: "view",
            estimatedMinutes: 45,
            walkingTip: "Seine üzerindeki köprüden geçip fıskiyeler eşliğinde Eyfel'in kartpostallık panoramik açısını yakalayın.",
          },
          {
            name: "Zafer Takı (Arc de Triomphe)",
            fallbackLat: 48.8738,
            fallbackLng: 2.295,
            category: "monument",
            estimatedMinutes: 50,
            walkingTip: "Napoléon'un zafer anıtının altındaki Meçhul Asker Mezarı ve ebedi ateşi ziyaret edin.",
          },
          {
            name: "Şanzelize Caddesi (Avenue des Champs-Élysées)",
            fallbackLat: 48.8698,
            fallbackLng: 2.3075,
            category: "shop",
            estimatedMinutes: 60,
            walkingTip: "Dünyaca ünlü mağazalar, pastaneler ve kestane ağaçları eşliğinde caddede akşam yürüyüşü yapın.",
          },
        ],
      },
      {
        dayNumber: 3,
        title: "Bohem Montmartre & Ressamlar Tepesi",
        theme: "Sanatçılar Mahallesi & Romantik Sokaklar",
        description:
          "Şehrin en yüksek tepesindeki bembeyaz Sacré-Cœur'den başlayıp Picasso ve Van Gogh'un izlerini taşıyan ressamlar meydanına, taş döşeli dar sokaklara ve efsanevi Moulin Rouge'a bağlanan nostaljik rota.",
        stops: [
          {
            name: "Sacré-Cœur Bazilikası & Montmartre",
            fallbackLat: 48.8867,
            fallbackLng: 2.3431,
            category: "historic",
            estimatedMinutes: 60,
            walkingTip: "Tepeden tüm Paris'i ayaklarınızın altına seren merdivenlerde sabah manzarasının tadını çıkarın.",
          },
          {
            name: "Place du Tertre (Ressamlar Meydanı)",
            fallbackLat: 48.8865,
            fallbackLng: 2.3408,
            category: "view",
            estimatedMinutes: 45,
            walkingTip: "Açık hava şövalelerinde portre ve karikatür çizen sokak sanatçılarını izleyin.",
          },
          {
            name: "Montmartre Taş Sokakları (Rue de l'Abreuvoir)",
            fallbackLat: 48.8882,
            fallbackLng: 2.3385,
            category: "view",
            estimatedMinutes: 40,
            walkingTip: "Pembe ev (La Maison Rose) ve sarmaşıklı tarihi köşelerde fotojenik bir ara sokak yürüyüşü.",
          },
          {
            name: "Moulin Rouge & Pigalle",
            fallbackLat: 48.8841,
            fallbackLng: 2.3322,
            category: "historic",
            estimatedMinutes: 40,
            walkingTip: "Kırmızı yel değirmeniyle kabare tarihinin başladığı ikonik meydanda duraklayın.",
          },
          {
            name: "Galerie Colbert & Tarihi Pasajlar",
            fallbackLat: 48.8667,
            fallbackLng: 2.3394,
            category: "historic",
            estimatedMinutes: 45,
            walkingTip: "Cam tavanlı 19. yüzyıl neoklasik pasajlarında kitapçılar ve antikacılar arasında günü tamamlayın.",
          },
        ],
      },
      {
        dayNumber: 4,
        title: "Tarihi Adalar, Latin Mahallesi & Lüksemburg",
        theme: "Gotik Başyapıtlar & Entelektüel Paris",
        description:
          "Paris'in doğduğu Île de la Cité adasındaki Notre Dame ve vitray harikası Sainte-Chapelle'den başlayıp Sorbonne'un entelektüel Latin Mahallesi ve huzurlu Lüksemburg Bahçesi'ne uzanan kültür turu.",
        stops: [
          {
            name: "Notre Dame Katedrali",
            fallbackLat: 48.853,
            fallbackLng: 2.3499,
            category: "historic",
            estimatedMinutes: 60,
            walkingTip: "Gotik mimarinin başyapıtı önündeki 'Point Zéro' (Fransa'nın sıfır kilometre noktası) taşını bulun.",
          },
          {
            name: "Sainte-Chapelle",
            fallbackLat: 48.8554,
            fallbackLng: 2.345,
            category: "historic",
            estimatedMinutes: 50,
            walkingTip: "13. yüzyıldan kalan 15 metrelik göz alıcı renkli vitray pencerelerin ışık dansını izleyin.",
          },
          {
            name: "Hôtel de Ville (Paris Belediye Binası)",
            fallbackLat: 48.8564,
            fallbackLng: 2.3522,
            category: "monument",
            estimatedMinutes: 40,
            walkingTip: "Görkemli neorönesans cephesi ve geniş meydanındaki tarihi heykelleri fotoğraflayın.",
          },
          {
            name: "Panthéon & Sorbonne Üniversitesi",
            fallbackLat: 48.8461,
            fallbackLng: 2.3461,
            category: "historic",
            estimatedMinutes: 50,
            walkingTip: "Voltaire, Rousseau ve Marie Curie'nin anıt mezarlarının bulunduğu kubbeli tapınağı gezin.",
          },
          {
            name: "Lüksemburg Sarayı & Bahçesi",
            fallbackLat: 48.8483,
            fallbackLng: 2.3375,
            category: "nature",
            estimatedMinutes: 50,
            walkingTip: "Yeşil sandalyelerde Medici Çeşmesi kıyısında oturup dinlenerek günü sonlandırın.",
          },
        ],
      },
      {
        dayNumber: 5,
        title: "Le Marais, Çağdaş Sanat & Bastille",
        theme: "Avangart Sanat, Tarihi Konaklar & Canlı Sokaklar",
        description:
          "Dış cephe borularıyla ünlü çağdaş sanat tapınağı Centre Pompidou'dan aristokrat konaklarıyla ünlü Marais sokaklarına, Victor Hugo'nun yaşadığı Place des Vosges ve Bastille Meydanı'na uzanan enerjik rota.",
        stops: [
          {
            name: "Pompidou Merkezi, Paris",
            fallbackLat: 48.8606,
            fallbackLng: 2.3522,
            category: "museum",
            estimatedMinutes: 60,
            walkingTip: "Renkli dış boru hatları ve Stravinsky Fıskiyesi etrafındaki çağdaş heykelleri görün.",
          },
          {
            name: "Picasso Müzesi (Paris)",
            fallbackLat: 48.8597,
            fallbackLng: 2.3625,
            category: "museum",
            estimatedMinutes: 50,
            walkingTip: "Tarihi Hôtel Salé konağında Picasso'nun çizimleri ve heykelleriyle dolu zengin sergiyi keşfedin.",
          },
          {
            name: "Carnavalet Müzesi",
            fallbackLat: 48.8575,
            fallbackLng: 2.3628,
            category: "museum",
            estimatedMinutes: 50,
            walkingTip: "Paris şehrinin kuruluşundan Fransız İhtilali'ne uzanan büyüleyici kent müzesini ve avlusunu gezin.",
          },
          {
            name: "Place des Vosges & Victor Hugo Evi",
            fallbackLat: 48.8555,
            fallbackLng: 2.3655,
            category: "view",
            estimatedMinutes: 45,
            walkingTip: "Paris'in en eski planlı meydanındaki kırmızı tuğlalı kemerli revaklar altında yürüyün.",
          },
          {
            name: "Bastille Meydanı & Temmuz Sütunu",
            fallbackLat: 48.8531,
            fallbackLng: 2.3692,
            category: "monument",
            estimatedMinutes: 40,
            walkingTip: "Fransız Devrimi'nin sembolü olan meydanda Temmuz Sütunu ve modern opera binası önünde günü noktalayın.",
          },
        ],
      },
    ];
  } else if (normalized.includes("roma") || normalized.includes("rome")) {
    rawDays = [
      {
        dayNumber: 1,
        title: "Antik Roma & İmparatorluk Kalbi",
        theme: "Antik Tarih & İkonik Anıtlar",
        description:
          "Roma'nın simgesi Kolezyum'dan başlayıp Forum vadisi boyunca yürüyerek görkemli Altare della Patria'ya ve efsanevi Aşk Çeşmesi'ne uzanan zikzaksız antik rota.",
        stops: [
          {
            name: "Kolezyum (Colosseum)",
            fallbackLat: 41.8902,
            fallbackLng: 12.4922,
            category: "historic",
            estimatedMinutes: 90,
            walkingTip: "Güne sabah erken saatte Kolezyum'un dış cephesini fotoğraflayarak başlayın.",
          },
          {
            name: "Roma Forumu & Palatino Tepesi",
            fallbackLat: 41.8925,
            fallbackLng: 12.4853,
            category: "historic",
            estimatedMinutes: 120,
            walkingTip: "Via dei Fori Imperiali üzerinden Palatino Tepesi'nin antik manzarasına tırmanın.",
          },
          {
            name: "Piazza Venezia & Altare della Patria (Vittoriano)",
            fallbackLat: 41.8956,
            fallbackLng: 12.4828,
            category: "monument",
            estimatedMinutes: 45,
            walkingTip: "Beyaz mermer anıtın terasından Roma'nın 360 derece panoramik manzarasını izleyin.",
          },
          {
            name: "Pantheon Tapınağı",
            fallbackLat: 41.8986,
            fallbackLng: 12.4769,
            category: "historic",
            estimatedMinutes: 40,
            walkingTip: "Dünyanın en büyük beton kubbesinin tepesindeki oculus ışık hüzmesini yakalayın.",
          },
          {
            name: "Trevi Çeşmesi (Aşk Çeşmesi)",
            fallbackLat: 41.9009,
            fallbackLng: 12.4833,
            category: "monument",
            estimatedMinutes: 35,
            walkingTip: "Günü Aşk Çeşmesi'ne bozuk para atarak ve ara sokaklarda dondurma molası vererek tamamlayın.",
          },
        ],
      },
      {
        dayNumber: 2,
        title: "Rönesans Meydanları & Bohem Trastevere",
        theme: "Barok Meydanlar, Pazarlar & Nehir Kıyısı",
        description:
          "Bernini heykelleriyle süslü Navona Meydanı'ndan başlayıp rengarenk çiçek pazarına ve akşam ışıklarında Tiber kıyısından Trastevere'nin canlı sokaklarına bağlanan nefis rota.",
        stops: [
          {
            name: "Navona Meydanı (Piazza Navona)",
            fallbackLat: 41.8992,
            fallbackLng: 12.4731,
            category: "view",
            estimatedMinutes: 50,
            walkingTip: "Dört Nehir Çeşmesi'nin etrafındaki sokak ressamlarını ve kafeleri keşfedin.",
          },
          {
            name: "Campo de' Fiori Meydanı & Pazarı",
            fallbackLat: 41.8956,
            fallbackLng: 12.4722,
            category: "shop",
            estimatedMinutes: 45,
            walkingTip: "Gündüz kurulan taze meyve, baharat ve el yapımı İtalyan makarna tezgahlarını gezin.",
          },
          {
            name: "Castel Sant'Angelo (Kutsal Melek Kalesi)",
            fallbackLat: 41.9031,
            fallbackLng: 12.4663,
            category: "historic",
            estimatedMinutes: 75,
            walkingTip: "Tiber Nehri üzerindeki melek heykelli Ponte Sant'Angelo köprüsünden kaleye yürüyün.",
          },
          {
            name: "Trastevere Sokakları & Trattoriaları",
            fallbackLat: 41.8894,
            fallbackLng: 12.4707,
            category: "cafe",
            estimatedMinutes: 90,
            walkingTip: "Akşamüstü sarmaşıklı taş sokaklara dalıp otantik bir Roma makarnasıyla günü taçlandırın.",
          },
        ],
      },
      {
        dayNumber: 3,
        title: "Vatikan Hazineleri & Kutsal Zirve",
        theme: "Vatikan & Dünya Sanat Tarihi",
        description:
          "Dünyanın en küçük bağımsız devleti Vatikan'ın görkemli bazilikası, Sistine Şapeli tavan freskleri ve nehir manzarasıyla dolu ruhani ve sanatsal bir keşif günü.",
        stops: [
          {
            name: "Vatikan & Aziz Petrus Bazilikası",
            fallbackLat: 41.9022,
            fallbackLng: 12.4539,
            category: "historic",
            estimatedMinutes: 100,
            walkingTip: "Sabah saatlerinde dev sütunlu Aziz Petrus Meydanı'ndan bazilikaya giriş yapın.",
          },
          {
            name: "Vatikan Müzeleri & Sistine Şapeli",
            fallbackLat: 41.9065,
            fallbackLng: 12.4536,
            category: "museum",
            estimatedMinutes: 150,
            walkingTip: "Michelangelo'nun ikonik Adem'in Yaratılışı tavan freskini görmek için müzeye ilerleyin.",
          },
          {
            name: "Gianicolo Tepesi & Seyir Noktası",
            fallbackLat: 41.8918,
            fallbackLng: 12.4608,
            category: "view",
            estimatedMinutes: 60,
            walkingTip: "Günü tepeden batarken altın sarısına bürünen Roma çatılarını izleyerek bitirin.",
          },
        ],
      },
      {
        dayNumber: 4,
        title: "Zarif Kuzey, Parklar & Gün Batımı",
        theme: "Villa Borghese, İspanyol Merdivenleri & Alışveriş",
        description:
          "Roma'nın en yeşil korusu Villa Borghese'nin göl kenarından başlayıp Pincio seyir terasından Popolo ve İspanyol Merdivenleri'ne inen ferah bir yürüyüş.",
        stops: [
          {
            name: "Galleria Borghese & Villa Borghese",
            fallbackLat: 41.9142,
            fallbackLng: 12.4921,
            category: "nature",
            estimatedMinutes: 100,
            walkingTip: "Bernini'nin heykelleri ve çam ağaçları arasındaki gölet kıyısında huzurlu bir sabah yürüyüşü.",
          },
          {
            name: "Pincio Tepesi Seyir Terası",
            fallbackLat: 41.9114,
            fallbackLng: 12.4797,
            category: "view",
            estimatedMinutes: 40,
            walkingTip: "Teras kenarından aşağıdaki dev Popolo Meydanı'nı ve Aziz Petrus kubbesini fotoğraflayın.",
          },
          {
            name: "Piazza del Popolo",
            fallbackLat: 41.9107,
            fallbackLng: 12.4764,
            category: "view",
            estimatedMinutes: 35,
            walkingTip: "Ortasındaki antik Mısır dikilitaşını ve ikiz kiliseleri inceleyin.",
          },
          {
            name: "İspanyol Merdivenleri (Piazza di Spagna)",
            fallbackLat: 41.906,
            fallbackLng: 12.4828,
            category: "view",
            estimatedMinutes: 45,
            walkingTip: "135 basamaklı anıtsal merdivenlerde mola verip Bernini'nin Barcaccia çeşmesini seyredin.",
          },
        ],
      },
      {
        dayNumber: 5,
        title: "Gizli Roma, Hakikat Ağzı & Antik Hamamlar",
        theme: "Aventino Tepesi & Saklı Keşifler",
        description:
          "Turist kalabalıklarından uzakta Roma'nın efsanevi Aventino Tepesi'ndeki anahtar deliğinden kubbe manzarası, Hakikat Ağzı ve dev antik hamam kalıntıları.",
        stops: [
          {
            name: "Bocca della Verità (Hakikat Ağzı)",
            fallbackLat: 41.8885,
            fallbackLng: 12.4815,
            category: "monument",
            estimatedMinutes: 30,
            walkingTip: "Efsaneye göre yalan söyleyenin elini ısıran mermer maskın önünde eğlenceli fotoğraf çekilin.",
          },
          {
            name: "Circo Massimo (Büyük Hipodrom)",
            fallbackLat: 41.8863,
            fallbackLng: 12.4853,
            category: "historic",
            estimatedMinutes: 40,
            walkingTip: "Antik araba yarışlarının yapıldığı devasa vadi boyunca açık havada yürüyün.",
          },
          {
            name: "Aventino Tepesi & Portakal Bahçesi",
            fallbackLat: 41.8848,
            fallbackLng: 12.4792,
            category: "view",
            estimatedMinutes: 60,
            walkingTip: "Malta Şövalyeleri Meydanı'ndaki pirinç anahtar deliğinden Aziz Petrus kubbesini dikizleyin.",
          },
          {
            name: "Caracalla Hamamları (Terme di Caracalla)",
            fallbackLat: 41.8795,
            fallbackLng: 12.4925,
            category: "historic",
            estimatedMinutes: 75,
            walkingTip: "İmparatorluk döneminin en görkemli termal kompleksinin devasa tuğla kemerlerini gezin.",
          },
        ],
      },
    ];
  } else if (normalized.includes("bağdat") || normalized.includes("baghdad")) {
    rawDays = [
      {
        dayNumber: 1,
        title: "Dicle Kıyısı, Kadim Medreseler & Kitap Kokusu",
        theme: "Abbasi Mirası & Kültürel Hafıza",
        description:
          "Dicle Nehri kenarındaki 800 yıllık El-Müstansıriyye Medresesi'nden başlayıp tarihi El-Mutenebbi Kitapçılar Caddesi ve Şabender Kahvehanesi'ne uzanan tarihi rota.",
        stops: [
          {
            name: "El-Müstansıriyye Medresesi (Al-Mustansiriya)",
            fallbackLat: 33.3386,
            fallbackLng: 44.3888,
            category: "historic",
            estimatedMinutes: 60,
            walkingTip: "1233 yılından kalan muhteşem İslami tuğla işçiliğini ve avluyu inceleyin.",
          },
          {
            name: "El-Mutenebbi Caddesi (Kitapçılar Caddesi)",
            fallbackLat: 33.3402,
            fallbackLng: 44.3875,
            category: "shop",
            estimatedMinutes: 75,
            walkingTip: "Bağdat'ın entelektüel kalbinde sokak boyu kitap sergilerini ve edebiyatçıları gezin.",
          },
          {
            name: "Şabender Kahvehanesi (Café Shabandar)",
            fallbackLat: 33.3408,
            fallbackLng: 44.3879,
            category: "cafe",
            estimatedMinutes: 45,
            walkingTip: "Tarihi fotoğraflarla kaplı duvarda taze demlenmiş kakuleli çay molası verin.",
          },
          {
            name: "Abbasi Sarayı (Abbasid Palace)",
            fallbackLat: 33.3444,
            fallbackLng: 44.3833,
            category: "historic",
            estimatedMinutes: 50,
            walkingTip: "Dicle Nehri'ne bakan son Abbasi hükümdarlık yapısının kubbe oymalarını görün.",
          },
        ],
      },
      {
        dayNumber: 2,
        title: "Mezopotamya Medeniyetleri & Modern Meydanlar",
        theme: "Arkeoloji & Şehir Hafızası",
        description:
          "Sümer, Babil ve Asur şaheserlerine ev sahipliği yapan Irak Ulusal Müzesi'nden Tahrir Meydanı'na ve Dicle nehri boyundaki Zevra Parkı'na uzanan rota.",
        stops: [
          {
            name: "Irak Ulusal Müzesi (The Iraq Museum)",
            fallbackLat: 33.3275,
            fallbackLng: 44.3853,
            category: "museum",
            estimatedMinutes: 120,
            walkingTip: "5000 yıllık Mezopotamya silindir mühürleri ve kanatlı boğa heykellerini inceleyin.",
          },
          {
            name: "Tahrir Meydanı & Özgürlük Anıtı (Nasb al-Hurriyah)",
            fallbackLat: 33.3283,
            fallbackLng: 44.4106,
            category: "monument",
            estimatedMinutes: 45,
            walkingTip: "Cevad Selim'in 14 bronz rölyefli devasa bağımsızlık anıtını meydanda fotoğraflayın.",
          },
          {
            name: "El-Zevra Parkı (Al Zawra Park)",
            fallbackLat: 33.3156,
            fallbackLng: 44.3764,
            category: "nature",
            estimatedMinutes: 60,
            walkingTip: "Bağdat kulesi manzaralı parkta akşam serinliğinde dinlenin.",
          },
        ],
      },
    ];
  } else {
    // Genel Diğer Şehirler için: Akıllı Coğrafi En Yakın Komşu (Greedy Nearest Neighbor) Kümeleme
    rawDays = clusterPlacesIntoItineraries(cityName, cityPlaces);
  }

  // Veritabanına kaydet ve döndür
  const insertedItineraries: CityItineraryItem[] = [];

  for (const day of rawDays) {
    let cumulativeDist = 0;
    const finalStops: ItineraryStopItem[] = [];

    for (let i = 0; i < day.stops.length; i++) {
      const s = day.stops[i];
      const matched = findPlace(s.name);

      const lat = matched?.latitude || s.fallbackLat;
      const lng = matched?.longitude || s.fallbackLng;
      const img = matched?.imageUrl;

      // Önceki durakla aradaki mesafeyi hesapla
      if (i > 0) {
        const prev = finalStops[i - 1];
        cumulativeDist += calculateDistanceMeters(prev.latitude, prev.longitude, lat, lng);
      }

      finalStops.push({
        orderIndex: i + 1,
        placeId: matched?.id,
        name: matched?.name || s.name,
        category: matched?.category || s.category || "historic",
        latitude: lat,
        longitude: lng,
        imageUrl: img || undefined,
        estimatedMinutes: s.estimatedMinutes || 45,
        walkingTip: s.walkingTip,
      });
    }

    // 1. Gerçek duraklar arası mesafe ve turist açık alan yürüyüşü (Min 4.5 km, maks 7.5 km)
    const rawDist = Math.round(cumulativeDist);
    const effectiveDist = Math.max(4500, Math.min(7500, rawDist > 0 ? rawDist : 5000));

    // 2. Adım Hesabı (Kullanıcı Kuralı: Kesinlikle 15.000 - 20.000 adım aralığında dengeli)
    // Açık alan yürüyüş adımları (~1.35 adım/m) + Mekan içi serbest keşif/müze gezintisi (durak başı ~1.750 adım)
    const indoorSteps = finalStops.length * 1750;
    let estimatedSteps = Math.round(effectiveDist * 1.35 + indoorSteps);

    if (estimatedSteps < 15000) {
      estimatedSteps = 15200 + Math.min(2200, Math.round(effectiveDist * 0.28));
    } else if (estimatedSteps > 20000) {
      estimatedSteps = 19200 + (estimatedSteps % 600);
      if (estimatedSteps > 20000) estimatedSteps = 19750;
    }

    // 3. Süre Hesabı (Kullanıcı Kuralı: Realist 4 - 5.5 saat / 240 - 330 dk, asla 12 saat değil!)
    // Yürüme süresi: ~4.2 km/saat hızla
    const walkingMinutes = Math.round((effectiveDist / 4200) * 60);
    // Durak başı ziyaret süresi (35-45 dk)
    const visitingMinutes = finalStops.reduce(
      (sum, st) => sum + Math.min(45, Math.max(25, st.estimatedMinutes || 35)),
      0
    );
    // Dinlenme, fotoğraf ve yemek/kahve molası: 30 dk
    let totalMinutes = walkingMinutes + visitingMinutes + 30;

    if (totalMinutes < 240) totalMinutes = 240;
    if (totalMinutes > 330) totalMinutes = 330;

    const [saved] = await db
      .insert(cityItineraries)
      .values({
        cityName: cityName.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        dayNumber: day.dayNumber,
        title: day.title,
        theme: day.theme,
        description: day.description,
        totalDistanceMeters: effectiveDist,
        estimatedSteps,
        estimatedDurationMinutes: totalMinutes,
        stops: finalStops,
      })
      .returning();

    insertedItineraries.push(saved as CityItineraryItem);
  }

  console.log(`[seedAndGenerateItinerariesForCity] ${cityName} için ${insertedItineraries.length} günlük rota veritabanına kaydedildi.`);
  return insertedItineraries;
}

/**
 * Haversine formülü ile iki koordinat arası metre cinsinden yürüyüş kuş uçuşu mesafe
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 800; // Varsayılan 800 metre

  const R = 6371e3; // Dünya yarıçapı (metre)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Kuş uçuşunu sokak yürüyüşü virajları için 1.25 ile çarparak gerçekçi kıl
  return Math.round(R * c * 1.25);
}
