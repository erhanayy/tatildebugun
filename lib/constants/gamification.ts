/**
 * TatildeBugün / AllTripX - Gamification & Ranking Configuration
 * Parametrik Puanlama, Rütbe Eşikleri, Kademeli Yıldız Sistemi ve Başarım Rozetleri
 */

export const POINT_RULES = {
  PER_COUNTRY: 100,    // Ziyaret edilen her farklı ülke
  PER_CITY: 25,        // Ziyaret edilen her farklı şehir
  PER_TRIP: 50,        // Tamamlanan her seyahat rotası
  PER_POI: 10,         // Check-in yapılan her tarihi/turistik mekan
  PER_FEED_POST: 5,    // Topluluk akışında paylaşılan her hikaye
} as const;

export const COUNTRIES_PER_STAR = 5;

export interface StarRatingInfo {
  stars: number;
  countryCount: number;
  progressInStar: number;      // 0..4 (Mevcut yıldız içindeki ülke sayısı)
  remainingToNext: number;     // 1..5 (Bir sonraki yıldıza kalan ülke sayısı)
  starDisplay: string;         // '⭐⭐⭐'
  badgeLabelTr: string;        // '3 Yıldızlı Gezgin'
  badgeLabelEn: string;        // '3-Star Traveler'
}

/**
 * Gezilen ülke sayısına göre kademeli yıldız hesaplama
 * Her 5 ülke = 1 Yıldız
 */
export function getStarRating(countryCount: number): StarRatingInfo {
  const safeCount = Math.max(0, countryCount);
  const stars = Math.floor(safeCount / COUNTRIES_PER_STAR);
  const progressInStar = safeCount % COUNTRIES_PER_STAR;
  const remainingToNext = COUNTRIES_PER_STAR - progressInStar;
  
  // Yıldız emojisi dizgisi (Örn: ⭐⭐⭐)
  const starDisplay = stars > 0 ? "⭐".repeat(Math.min(stars, 5)) + (stars > 5 ? ` +${stars - 5}` : "") : "";

  return {
    stars,
    countryCount: safeCount,
    progressInStar,
    remainingToNext,
    starDisplay,
    badgeLabelTr: stars === 0 ? "Yeni Kaşif" : `${stars} Yıldızlı Gezgin`,
    badgeLabelEn: stars === 0 ? "New Explorer" : `${stars}-Star Traveler`,
  };
}

export interface TravelerTier {
  id: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  gradientClass: string;
  badgeBorderClass: string;
}

export const TRAVELER_TIERS: TravelerTier[] = [
  {
    id: "tier_1",
    minPoints: 0,
    maxPoints: 249,
    icon: "🎒",
    titleTr: "Çırak Seyyah",
    titleEn: "Novice Explorer",
    descTr: "Seyahat dünyasına ilk adımlarını atan hevesli gezgin.",
    descEn: "An enthusiastic traveler taking their first steps.",
    gradientClass: "from-slate-700 to-slate-800 text-slate-200",
    badgeBorderClass: "border-slate-600 bg-slate-800/80 text-slate-300",
  },
  {
    id: "tier_2",
    minPoints: 250,
    maxPoints: 749,
    icon: "🧭",
    titleTr: "Şehir Kaşifi",
    titleEn: "City Explorer",
    descTr: "Farklı şehirlerin sokaklarını ve kültürünü keşfeden gezgin.",
    descEn: "Exploring the streets and cultures of different cities.",
    gradientClass: "from-emerald-700 to-teal-800 text-teal-200",
    badgeBorderClass: "border-teal-500/40 bg-teal-500/15 text-teal-300",
  },
  {
    id: "tier_3",
    minPoints: 750,
    maxPoints: 1499,
    icon: "🗺️",
    titleTr: "Rota Ustası",
    titleEn: "Route Master",
    descTr: "Kendi rotalarını çizen ve çoklu şehir turlarını ustalıkla tamamlayan seyahat uzmanı.",
    descEn: "Designing custom itineraries and mastering multi-city trips.",
    gradientClass: "from-cyan-700 to-blue-800 text-cyan-200",
    badgeBorderClass: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
  },
  {
    id: "tier_4",
    minPoints: 1500,
    maxPoints: 2999,
    icon: "✈️",
    titleTr: "Kıta Fatihi",
    titleEn: "Globe Trotter",
    descTr: "Sınırları ve kıtaları aşarak dünyayı adımlayan deneyimli seyyah.",
    descEn: "Crossing borders and continents with seasoned travel experience.",
    gradientClass: "from-violet-700 to-indigo-800 text-indigo-200",
    badgeBorderClass: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
  },
  {
    id: "tier_5",
    minPoints: 3000,
    maxPoints: Infinity,
    icon: "👑",
    titleTr: "Evliya Çelebi",
    titleEn: "Grand Voyager",
    descTr: "Dünyanın dört bir yanını keşfetmiş, yaşayan bir seyahat efsanesi.",
    descEn: "A living travel legend having explored the far corners of the world.",
    gradientClass: "from-amber-600 via-amber-500 to-yellow-600 text-amber-100",
    badgeBorderClass: "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/20",
  },
];

/**
 * Toplam puana göre rütbeyi ve bir sonraki rütbe ilerlemesini döner
 */
export function getTierByScore(score: number): {
  currentTier: TravelerTier;
  nextTier: TravelerTier | null;
  progressPercent: number;
  pointsToNext: number;
} {
  const safeScore = Math.max(0, score);
  let currentTier = TRAVELER_TIERS[0];
  let nextTier: TravelerTier | null = TRAVELER_TIERS[1];

  for (let i = 0; i < TRAVELER_TIERS.length; i++) {
    if (safeScore >= TRAVELER_TIERS[i].minPoints) {
      currentTier = TRAVELER_TIERS[i];
      nextTier = i < TRAVELER_TIERS.length - 1 ? TRAVELER_TIERS[i + 1] : null;
    }
  }

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      progressPercent: 100,
      pointsToNext: 0,
    };
  }

  const range = nextTier.minPoints - currentTier.minPoints;
  const currentInRange = safeScore - currentTier.minPoints;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
  const pointsToNext = Math.max(0, nextTier.minPoints - safeScore);

  return {
    currentTier,
    nextTier,
    progressPercent,
    pointsToNext,
  };
}

export interface BadgeDefinition {
  id: string;
  icon: string;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  targetCount: number;
  metricType: "countries" | "pois" | "continents" | "trips" | "photos" | "connections";
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "world_citizen",
    icon: "🌍",
    titleTr: "Dünya Vatandaşı",
    titleEn: "Global Citizen",
    descTr: "5 farklı ülkeye seyahat bayrağı koy",
    descEn: "Place travel flags in at least 5 different countries",
    targetCount: 5,
    metricType: "countries",
  },
  {
    id: "history_hunter",
    icon: "🏛️",
    titleTr: "Tarih Avcısı",
    titleEn: "History Hunter",
    descTr: "En az 10 tarihi veya ikonik mekana check-in yap",
    descEn: "Check in to at least 10 historic or iconic sights",
    targetCount: 10,
    metricType: "pois",
  },
  {
    id: "continental_pioneer",
    icon: "🚂",
    titleTr: "Kıta Hattı",
    titleEn: "Continental Pioneer",
    descTr: "En az 2 farklı kıtada şehir ziyaret et",
    descEn: "Visit cities across at least 2 different continents",
    targetCount: 2,
    metricType: "continents",
  },
  {
    id: "vacation_master",
    icon: "🌴",
    titleTr: "Tatildeyim Şampiyonu",
    titleEn: "Vacation Champion",
    descTr: "Canlı tur rehberinde bir rotanın tüm duraklarını tamamla",
    descEn: "Complete all stops of an itinerary in the live travel guide",
    targetCount: 1,
    metricType: "trips",
  },
  {
    id: "visual_storyteller",
    icon: "📸",
    titleTr: "Gözlemci",
    titleEn: "Visual Storyteller",
    descTr: "Seyahatlerine en az 5 fotoğraf yükle",
    descEn: "Upload at least 5 photos to your journeys",
    targetCount: 5,
    metricType: "photos",
  },
  {
    id: "travel_companion",
    icon: "🧭",
    titleTr: "Yol Arkadaşı",
    titleEn: "Travel Companion",
    descTr: "En az 3 gezgin ile arkadaşlık veya aile bağı kur",
    descEn: "Connect with at least 3 travelers as friend or family",
    targetCount: 3,
    metricType: "connections",
  },
];
