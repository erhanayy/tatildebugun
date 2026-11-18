"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, visits, trips, tripPlaceVisits, travelMatches, userBadges, userConnections } from "@/lib/db/schema";
import { eq, or, and, sql, desc, inArray } from "drizzle-orm";
import {
  POINT_RULES,
  getStarRating,
  getTierByScore,
  BADGE_DEFINITIONS,
  StarRatingInfo,
  TravelerTier,
  BadgeDefinition,
} from "@/lib/constants/gamification";

export interface TravelerStats {
  user: {
    id: string;
    fullName: string;
    username: string | null;
    avatarUrl: string | null;
    baseCity: string | null;
    baseCountry: string | null;
  };
  includeHomeCity: boolean;
  countryCount: number;
  cityCount: number;
  tripCount: number;
  completedTrips: number;
  poiCount: number;
  totalDays: number;
  score: number;
  starInfo: StarRatingInfo;
  tierInfo: {
    currentTier: TravelerTier;
    nextTier: TravelerTier | null;
    progressPercent: number;
    pointsToNext: number;
  };
  badges: Array<{
    definition: BadgeDefinition;
    isUnlocked: boolean;
    currentValue: number;
    targetValue: number;
    progressPercent: number;
    unlockedAt: Date | null;
  }>;
  topCountries: Array<{
    countryCode: string;
    countryName: string;
    cityCount: number;
  }>;
  continentDistribution: Array<{
    name: string;
    percentage: number;
    count: number;
  }>;
}

// Kıta eşleme tablosu
const CONTINENT_MAP: Record<string, string> = {
  TR: "Avrupa / Asya",
  ES: "Avrupa",
  FR: "Avrupa",
  IT: "Avrupa",
  DE: "Avrupa",
  GB: "Avrupa",
  GR: "Avrupa",
  NL: "Avrupa",
  PT: "Avrupa",
  AT: "Avrupa",
  CH: "Avrupa",
  BE: "Avrupa",
  US: "Amerika",
  CA: "Amerika",
  BR: "Amerika",
  MX: "Amerika",
  AR: "Amerika",
  JP: "Asya",
  CN: "Asya",
  TH: "Asya",
  KR: "Asya",
  AE: "Asya / Orta Doğu",
  SA: "Asya / Orta Doğu",
  EG: "Afrika",
  MA: "Afrika",
  ZA: "Afrika",
  AU: "Okyanusya",
  NZ: "Okyanusya",
  KKTC: "Avrupa / Akdeniz",
};

/**
 * Giriş yapan kullanıcının kişisel seyahat karnesini ve rozetlerini hesaplar
 */
export async function getTravelerDashboardData(includeHomeCity = false): Promise<TravelerStats | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const currentUserId = session.user.id;

    // Kullanıcı profilini çek
    const userRes = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        baseCity: users.baseCity,
        baseCountry: users.baseCountry,
        travelerScore: users.travelerScore,
      })
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);

    const user = userRes[0];
    if (!user) return null;

    // Kullanıcının seyahat ve ziyaret kayıtlarını paralel çek
    const [rawVisits, rawTrips, rawPois, existingBadges] = await Promise.all([
      db.select().from(visits).where(eq(visits.userId, currentUserId)),
      db.select().from(trips).where(eq(trips.userId, currentUserId)),
      db.select().from(tripPlaceVisits).where(eq(tripPlaceVisits.userId, currentUserId)),
      db.select().from(userBadges).where(eq(userBadges.userId, currentUserId)),
    ]);

    // Ana şehri hariç tutma filtresi
    const effectiveVisits = includeHomeCity
      ? rawVisits
      : rawVisits.filter((v) => {
          const isHome =
            user.baseCity &&
            user.baseCountry &&
            v.cityName.toLowerCase().trim() === user.baseCity.toLowerCase().trim() &&
            v.countryCode.toUpperCase().trim() === user.baseCountry.toUpperCase().trim();
          return !isHome;
        });

    // Tekil ülkeler ve şehirler
    const uniqueCountryCodes = new Set(effectiveVisits.map((v) => v.countryCode.toUpperCase()));
    const uniqueCities = new Set(effectiveVisits.map((v) => `${v.cityName.toLowerCase()}_${v.countryCode}`));

    const countryCount = uniqueCountryCodes.size;
    const cityCount = uniqueCities.size;
    const tripCount = rawTrips.length;
    const completedTrips = rawTrips.filter((t) => t.status === "completed").length;
    const poiCount = rawPois.length;

    // Toplam seyahat günü
    const totalDays = effectiveVisits.reduce((acc, v) => acc + (v.stayDurationDays || 1), 0);

    // 2026 Sezonu Bütünleşik Değer Paylaşımı ve Puan Motoru Skoru
    const score = user.travelerScore || 0;

    const starInfo = getStarRating(countryCount);
    const tierInfo = getTierByScore(score);

    // Kıtaları tespit et
    const detectedContinents = new Set<string>();
    uniqueCountryCodes.forEach((code) => {
      const cont = CONTINENT_MAP[code] || "Diğer";
      detectedContinents.add(cont);
    });

    // Başarım rozetleri durumu
    const unlockedBadgeMap = new Map(existingBadges.map((b) => [b.badgeId, b.unlockedAt]));

    const badges = BADGE_DEFINITIONS.map((def) => {
      let currentValue = 0;
      switch (def.metricType) {
        case "countries":
          currentValue = countryCount;
          break;
        case "pois":
          currentValue = poiCount;
          break;
        case "continents":
          currentValue = detectedContinents.size;
          break;
        case "trips":
          currentValue = completedTrips;
          break;
        case "photos":
          currentValue = effectiveVisits.length; // Fotoğraflı seyahat yaklaşık
          break;
        case "connections":
          currentValue = 3; // Varsayılan bağlantı
          break;
      }

      const isUnlocked = currentValue >= def.targetCount || unlockedBadgeMap.has(def.id);
      const progressPercent = Math.min(100, Math.round((currentValue / def.targetCount) * 100));

      return {
        definition: def,
        isUnlocked,
        currentValue,
        targetValue: def.targetCount,
        progressPercent,
        unlockedAt: unlockedBadgeMap.get(def.id) || (isUnlocked ? new Date() : null),
      };
    });

    // En çok ziyaret edilen ülkeler
    const countryCityCountMap = new Map<string, { code: string; name: string; cities: Set<string> }>();
    effectiveVisits.forEach((v) => {
      const existing = countryCityCountMap.get(v.countryCode) || {
        code: v.countryCode,
        name: v.countryName,
        cities: new Set<string>(),
      };
      existing.cities.add(v.cityName);
      countryCityCountMap.set(v.countryCode, existing);
    });

    const topCountries = Array.from(countryCityCountMap.values())
      .map((c) => ({ countryCode: c.code, countryName: c.name, cityCount: c.cities.size }))
      .sort((a, b) => b.cityCount - a.cityCount)
      .slice(0, 5);

    // Kıta dağılımı
    const continentCountMap = new Map<string, number>();
    uniqueCountryCodes.forEach((code) => {
      const cont = CONTINENT_MAP[code] || "Diğer";
      continentCountMap.set(cont, (continentCountMap.get(cont) || 0) + 1);
    });

    const totalContinents = Math.max(1, countryCount);
    const continentDistribution = Array.from(continentCountMap.entries()).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalContinents) * 100),
    }));

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        baseCity: user.baseCity,
        baseCountry: user.baseCountry,
      },
      includeHomeCity,
      countryCount,
      cityCount,
      tripCount,
      completedTrips,
      poiCount,
      totalDays,
      score,
      starInfo,
      tierInfo,
      badges,
      topCountries,
      continentDistribution,
    };
  } catch (error) {
    console.error("Seyahat karnesi hesaplama hatası:", error);
    return null;
  }
}

export interface LeaderboardItem {
  id: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  countryCount: number;
  cityCount: number;
  tripCount: number;
  score: number;
  stars: number;
  starDisplay: string;
  tierTitleTr: string;
  tierTitleEn: string;
  isSelf: boolean;
  relationshipType?: string | null;
  isMasked?: boolean;
  rank: number;
}

/**
 * Kullanıcı adını baş harfleri ve nokta biçiminde maskeler (Örn: "Cumhur Saraçoğlu" -> "C.S.")
 */
function formatInitialsName(name: string | null | undefined): string {
  if (!name || !name.trim()) return "A.B.";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A.B.";
  return parts.map((p) => p.charAt(0).toLocaleUpperCase("tr-TR") + ".").join("");
}

/**
 * Sosyal Kapsamlı Liderlik Sıralamasını Getirir
 * (friends | family | relatives | global)
 * 
 * Gizlilik Kuralı:
 * - "global" sekmesinde, kullanıcının kendisi (isSelf) değilse ve
 *   onaylanmış bir ilişkisi (arkadaş, aile veya akraba) bulunmuyorsa
 *   adı A.B. biçiminde baş harfleriyle maskelenir; kişisel profil resmi ve kullanıcı adı gizlenir.
 * - Onaylanmış bir ilişki varsa (travelMatches veya userConnections) tam adı ve profil resmi gösterilir.
 */
export async function getLeaderboard(
  scope: "friends" | "family" | "relatives" | "global" = "friends"
): Promise<{
  items: LeaderboardItem[];
  userRank: number;
  totalParticipants: number;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { items: [], userRank: 0, totalParticipants: 0 };
    }

    const currentUserId = session.user.id;
    let targetUserIds: string[] = [currentUserId];
    const relationshipMap = new Map<string, string>();

    // 1. Kullanıcının kabul edilmiş tüm ilişkilerini (travelMatches + userConnections) sorgula
    const [matchedPairs, connectedPairs] = await Promise.all([
      db
        .select({
          senderId: travelMatches.senderId,
          receiverId: travelMatches.receiverId,
          rel: travelMatches.relationshipType,
        })
        .from(travelMatches)
        .where(
          and(
            eq(travelMatches.status, "accepted"),
            or(eq(travelMatches.senderId, currentUserId), eq(travelMatches.receiverId, currentUserId))
          )
        ),
      db
        .select({
          userId: userConnections.userId,
          targetUserId: userConnections.targetUserId,
          rel: userConnections.relationshipType,
        })
        .from(userConnections)
        .where(
          and(
            eq(userConnections.status, "accepted"),
            or(eq(userConnections.userId, currentUserId), eq(userConnections.targetUserId, currentUserId))
          )
        ),
    ]);

    matchedPairs.forEach((m) => {
      const partnerId = m.senderId === currentUserId ? m.receiverId : m.senderId;
      relationshipMap.set(partnerId, m.rel || "friend");
    });

    connectedPairs.forEach((c) => {
      const partnerId = c.userId === currentUserId ? c.targetUserId : c.userId;
      if (!relationshipMap.has(partnerId)) {
        relationshipMap.set(partnerId, c.rel || "friend");
      }
    });

    if (scope === "global") {
      // Genel sıralama: En aktif 50 kullanıcı
      const allActive = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true)).limit(50);
      targetUserIds = allActive.map((u) => u.id);
      if (!targetUserIds.includes(currentUserId)) targetUserIds.push(currentUserId);
    } else {
      // Sosyal filtre: Arkadaşlarım, Ailem veya Akrabalarım
      const relFilter =
        scope === "friends" ? "friend" : scope === "family" ? "family" : "relative";

      for (const [partnerId, rel] of relationshipMap.entries()) {
        if (rel === relFilter) {
          targetUserIds.push(partnerId);
        }
      }
    }

    // Hedef kullanıcıların bilgilerini ve seyahatlerini çek
    const [targetUsers, allVisits, allTrips] = await Promise.all([
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          username: users.username,
          avatarUrl: users.avatarUrl,
          travelerScore: users.travelerScore,
        })
        .from(users)
        .where(inArray(users.id, targetUserIds)),
      db.select({ userId: visits.userId, countryCode: visits.countryCode, cityName: visits.cityName }).from(visits),
      db.select({ userId: trips.userId, status: trips.status }).from(trips),
    ]);

    // Her kullanıcı için puan ve yıldız hesapla
    const userVisitMap = new Map<string, { countries: Set<string>; cities: Set<string> }>();
    allVisits.forEach((v) => {
      const existing = userVisitMap.get(v.userId) || { countries: new Set(), cities: new Set() };
      existing.countries.add(v.countryCode.toUpperCase());
      existing.cities.add(`${v.cityName.toLowerCase()}_${v.countryCode}`);
      userVisitMap.set(v.userId, existing);
    });

    const userTripsMap = new Map<string, number>();
    allTrips.forEach((t) => {
      if (t.status === "completed") {
        userTripsMap.set(t.userId, (userTripsMap.get(t.userId) || 0) + 1);
      }
    });

    const list: Omit<LeaderboardItem, "rank">[] = targetUsers.map((u) => {
      const vData = userVisitMap.get(u.id) || { countries: new Set(), cities: new Set() };
      const countries = vData.countries.size;
      const cities = vData.cities.size;
      const completedTrips = userTripsMap.get(u.id) || 0;

      // 2026 Sezonu Bütünleşik Değer Paylaşımı ve Puan Motoru Skoru
      const score = u.travelerScore || 0;

      const starInfo = getStarRating(countries);
      const tierInfo = getTierByScore(score);

      const isSelf = u.id === currentUserId;
      const relationshipType = relationshipMap.get(u.id) || null;
      const hasRelationship = Boolean(relationshipType);

      // Kural: Global sekmesinde kendisi değilse ve onaylanmış ilişkisi yoksa A.B. şeklinde maskelenir
      const shouldMask = scope === "global" && !isSelf && !hasRelationship;
      const displayName = shouldMask ? formatInitialsName(u.fullName) : u.fullName;
      const displayAvatar = shouldMask ? null : u.avatarUrl;
      const displayUsername = shouldMask ? null : u.username;

      return {
        id: u.id,
        fullName: displayName,
        username: displayUsername,
        avatarUrl: displayAvatar,
        countryCount: countries,
        cityCount: cities,
        tripCount: completedTrips,
        score,
        stars: starInfo.stars,
        starDisplay: starInfo.starDisplay,
        tierTitleTr: tierInfo.currentTier.titleTr,
        tierTitleEn: tierInfo.currentTier.titleEn,
        isSelf,
        relationshipType,
        isMasked: shouldMask,
      };
    });

    // Puana ve ülke sayısına göre azalan sırala
    list.sort((a, b) => b.score - a.score || b.countryCount - a.countryCount);

    const rankedItems: LeaderboardItem[] = list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const userRank = rankedItems.find((it) => it.isSelf)?.rank || 1;

    return {
      items: rankedItems,
      userRank,
      totalParticipants: rankedItems.length,
    };
  } catch (error) {
    console.error("Liderlik sıralaması hesaplama hatası:", error);
    return { items: [], userRank: 0, totalParticipants: 0 };
  }
}
