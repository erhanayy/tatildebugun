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

  if (normalized.includes("roma") || normalized.includes("rome")) {
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
    // Genel Diğer Şehirler için: Şehir mekanlarını eşit parçalara bölüp otomatik gün rotaları çıkar
    const chunkSize = Math.min(6, Math.max(3, Math.ceil(cityPlaces.length / 3)));
    const totalDays = Math.min(5, Math.max(1, Math.ceil(cityPlaces.length / chunkSize)));

    for (let day = 1; day <= totalDays; day++) {
      const start = (day - 1) * chunkSize;
      const dayPlaces = cityPlaces.slice(start, start + chunkSize);
      if (dayPlaces.length === 0) break;

      rawDays.push({
        dayNumber: day,
        title: `${cityName} Keşif Rotası - ${day}. Gün`,
        theme: "Şehir & Kültür Keşfi",
        description: `${cityName} şehrinin öne çıkan turistik duraklarını sırasıyla yürüyerek keşfedebileceğiniz ${day}. gün planı.`,
        stops: dayPlaces.map((dp, idx) => ({
          name: dp.name,
          fallbackLat: dp.latitude || 0,
          fallbackLng: dp.longitude || 0,
          category: dp.category,
          estimatedMinutes: 60,
          walkingTip: `${idx + 1}. durak: ${dp.name} ziyareti.`,
        })),
      });
    }
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
        estimatedMinutes: s.estimatedMinutes || 60,
        walkingTip: s.walkingTip,
      });
    }

    // Gerçekçi adım ve süre hesaplaması
    // Ortalama adım uzunluğu: ~0.7m (1 km ~ 1.400 adım)
    const estimatedSteps = Math.round(cumulativeDist * 1.4);
    // Yürüme hızı 4 km/saat + her mekanda kalış süresi
    const walkingMinutes = Math.round((cumulativeDist / 4000) * 60);
    const visitingMinutes = finalStops.reduce((sum, st) => sum + (st.estimatedMinutes || 45), 0);
    const totalMinutes = walkingMinutes + visitingMinutes;

    const [saved] = await db
      .insert(cityItineraries)
      .values({
        cityName: cityName.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        dayNumber: day.dayNumber,
        title: day.title,
        theme: day.theme,
        description: day.description,
        totalDistanceMeters: Math.round(cumulativeDist),
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
