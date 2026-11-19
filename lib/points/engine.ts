import { db } from "@/lib/db";
import {
  userPointsLedger,
  valueSharePools,
  users,
  visits,
  trips,
  userConnections,
  UserPointsLedger,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const CURRENT_SEASON_YEAR = 2026;
export const CURRENT_RULE_VERSION = "v1.0";
export const SEASON_START_RATE = 0.2; // Yıla Başlangıç Puanı oranı (%20)
export const REFERRAL_PASSIVE_RATE = 0.2; // Arkadaş daveti pasif puan oranı (%20)

/**
 * Tüm puan ve oran hesaplamalarında ondalıklı değerleri en yakın tam sayıya yuvarlar.
 * Platformda puanlar istisnasız her zaman TAM SAYI (integer) olarak işlenir.
 */
export function roundPoints(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.round(raw);
}

/**
 * Arkadaş daveti %20 pasif puan payını tam sayı olarak hesaplar.
 */
export function calculateReferralPassivePoints(
  sourcePoints: number,
  rate: number = REFERRAL_PASSIVE_RATE
): number {
  if (!Number.isFinite(sourcePoints) || sourcePoints <= 0) return 0;
  return roundPoints(sourcePoints * rate);
}

// 2026 Sezonu Temel Kural Matrisi (Madde 81.1 & Madde 92)
export const POINT_RULES: Record<
  string,
  {
    base: number;
    multiplier: number;
    includedInSeasonStart: boolean;
    titleTr: string;
    titleEn: string;
  }
> = {
  daily_login: {
    base: 5,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Günlük Giriş Rozeti",
    titleEn: "Daily Login Badge",
  },
  comment_like: {
    base: 5,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Topluluk Yorum & Beğeni Etkileşimi",
    titleEn: "Community Comment & Like Interaction",
  },
  create_pin: {
    base: 10,
    multiplier: 1.0,
    includedInSeasonStart: true,
    titleTr: "Gezi / Mekan Pini Ekleme",
    titleEn: "Travel / Place Pin Creation",
  },
  checkin_pin: {
    base: 10,
    multiplier: 20.0, // 20x Fiziki Check-in Çarpanı (Madde 81.1) = 200 Puan
    includedInSeasonStart: false,
    titleTr: "Fiziki Mekan Check-in & GPS Doğrulaması (20x Çarpan!)",
    titleEn: "Physical Place Check-in & GPS Verification (20x Boost!)",
  },
  b2b_purchase: {
    base: 100,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Partner İşletme Rezervasyon / Satın Alma",
    titleEn: "Partner Booking / Purchase",
  },
  referral_passive: {
    base: 0,
    multiplier: 0.2, // %20 Pasif Arkadaş Payı (Madde 81.2)
    includedInSeasonStart: false,
    titleTr: "Arkadaş Seyahat Katkı Payı (%20 Pasif Gelir)",
    titleEn: "Friend Travel Contribution (%20 Passive Share)",
  },
  carry_over: {
    base: 0,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Yıla Başlangıç Puanı",
    titleEn: "Season Starting Score",
  },
  admin_reward: {
    base: 0,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Yönetici Özel Başarım Bonusu",
    titleEn: "Admin Special Achievement Reward",
  },
  admin_penalty: {
    base: 0,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Kural İhlali Ceza Kesintisi (Penalty)",
    titleEn: "Rule Violation Penalty Deduction",
  },
  delete_pin: {
    base: -10,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Silinen Gezi Pini İadesi (Geri Alma)",
    titleEn: "Deleted Travel Pin Reversal",
  },
  complete_trip: {
    base: 50,
    multiplier: 1.0,
    includedInSeasonStart: true,
    titleTr: "Tamamlanan Seyahat Rotası Bonusu",
    titleEn: "Completed Travel Route Bonus",
  },
  delete_trip: {
    base: -50,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Silinen Seyahat Rotası İadesi (Geri Alma)",
    titleEn: "Deleted Travel Route Reversal",
  },
  connect_friend: {
    base: 20,
    multiplier: 1.0,
    includedInSeasonStart: true,
    titleTr: "Onaylı Arkadaş / Aile İlişkisi",
    titleEn: "Confirmed Friend / Family Connection",
  },
  remove_friend: {
    base: -20,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "Kaldırılan İlişki Puan İadesi",
    titleEn: "Removed Connection Point Reversal",
  },
  welcome_bonus: {
    base: 50,
    multiplier: 1.0,
    includedInSeasonStart: false,
    titleTr: "AllTripX Kaşif Hoşgeldin Bonusu",
    titleEn: "AllTripX Explorer Welcome Bonus",
  },
};

export interface AwardPointsInput {
  userId: string;
  actionType: keyof typeof POINT_RULES | string;
  basePoints?: number;
  multiplier?: number;
  referenceId?: string;
  referenceType?: "visit" | "comment" | "user" | "order" | "trip" | "admin" | string;
  description?: string;
  metadata?: Record<string, any>;
  year?: number;
}

/**
 * İki kullanıcı arasındaki sosyal bağlantı için sıradan bağımsız (kanonik) tekil anahtar üretir.
 * Örn: getConnectionPairKey(u1, u2) === getConnectionPairKey(u2, u1)
 */
export function getConnectionPairKey(userA: string, userB: string): string {
  return `pair:${[userA, userB].sort().join(":")}`;
}

/**
 * Bir kullanıcının belirli bir referans (rota, pin, sosyal bağlantı çifti vb.) için
 * tüm sezonlar boyunca defterdeki NET puan bakiyesini hesaplar.
 * Çifte ödül, ekle-sil farming ve çifte kesintiyi kesin olarak engeller.
 */
export async function getReferenceNetPoints(
  userId: string,
  referenceId: string
): Promise<number> {
  const rows = await db
    .select({ finalPoints: userPointsLedger.finalPoints })
    .from(userPointsLedger)
    .where(
      and(
        eq(userPointsLedger.userId, userId),
        eq(userPointsLedger.referenceId, referenceId)
      )
    );
  return rows.reduce((sum, r) => sum + r.finalPoints, 0);
}

export interface SeasonStartingPointsBreakdown {
  pinCount: number;
  completedTripCount: number;
  activeConnectionCount: number;
  pinPoints: number;
  tripPoints: number;
  connectionPoints: number;
  totalStartingPoints: number;
}

/**
 * Yıla Başlangıç Puanı (Saf Hesaplama):
 * - Toplam Pin Sayısı × 10 × %20
 * - Toplam Tamamlanan Rota Sayısı × 50 × %20
 * - Toplam Sosyal İlişki Sayısı × 20 × %20
 * Tüm ara ve toplam değerler tam sayıya yuvarlanır. Diğer puan kalemleri dahil edilmez.
 */
export function computeSeasonStartingPointsFromCounts(counts: {
  pinCount: number;
  completedTripCount: number;
  activeConnectionCount: number;
}): SeasonStartingPointsBreakdown {
  const safePins = Math.max(0, Math.floor(counts.pinCount || 0));
  const safeTrips = Math.max(0, Math.floor(counts.completedTripCount || 0));
  const safeConnections = Math.max(0, Math.floor(counts.activeConnectionCount || 0));

  const pinPoints = roundPoints(safePins * POINT_RULES.create_pin.base * SEASON_START_RATE);
  const tripPoints = roundPoints(safeTrips * POINT_RULES.complete_trip.base * SEASON_START_RATE);
  const connectionPoints = roundPoints(
    safeConnections * POINT_RULES.connect_friend.base * SEASON_START_RATE
  );

  return {
    pinCount: safePins,
    completedTripCount: safeTrips,
    activeConnectionCount: safeConnections,
    pinPoints,
    tripPoints,
    connectionPoints,
    totalStartingPoints: roundPoints(pinPoints + tripPoints + connectionPoints),
  };
}

/**
 * Bir kullanıcının veritabanındaki o güne kadarki aktif varlıklarına göre
 * Yıla Başlangıç Puanını (Pin + Tamamlanan Rota + Onaylı İlişki) hesaplar.
 */
export async function calculateSeasonStartingPoints(
  userId: string
): Promise<SeasonStartingPointsBreakdown> {
  const [pinRows, tripRows, connRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(visits)
      .where(eq(visits.userId, userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(and(eq(trips.userId, userId), eq(trips.status, "completed"))),
    db
      .select({ targetUserId: userConnections.targetUserId })
      .from(userConnections)
      .where(
        and(eq(userConnections.userId, userId), eq(userConnections.status, "accepted"))
      ),
  ]);

  const pinCount = Number(pinRows[0]?.count || 0);
  const completedTripCount = Number(tripRows[0]?.count || 0);
  const activeConnectionCount = new Set(connRows.map((c) => c.targetUserId)).size;

  return computeSeasonStartingPointsFromCounts({
    pinCount,
    completedTripCount,
    activeConnectionCount,
  });
}

/**
 * Puan Dağıtım ve Ledger İşleme Motoru (Event-Sourcing Ledger Pattern)
 */
export async function awardPoints(input: AwardPointsInput): Promise<UserPointsLedger> {
  const year = input.year || CURRENT_SEASON_YEAR;
  const rule = POINT_RULES[input.actionType];

  const basePoints = roundPoints(input.basePoints ?? (rule ? rule.base : 0));
  const multiplier = input.multiplier ?? (rule ? rule.multiplier : 1.0);
  const finalPoints = roundPoints(basePoints * multiplier);

  const descText =
    input.description ||
    (rule ? rule.titleTr : `Puan İşlemi: ${input.actionType}`);

  // 1. Günlük login mükerrerlik kontrolü (Günde sadece 1 kez)
  if (input.actionType === "daily_login") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLogin = await db
      .select({ id: userPointsLedger.id })
      .from(userPointsLedger)
      .where(
        and(
          eq(userPointsLedger.userId, input.userId),
          eq(userPointsLedger.actionType, "daily_login"),
          sql`${userPointsLedger.createdAt} >= ${today.toISOString()}`
        )
      )
      .limit(1);

    if (existingLogin.length > 0) {
      // Zaten bugün günlük login puanı alınmış
      const current = await db
        .select()
        .from(userPointsLedger)
        .where(eq(userPointsLedger.id, existingLogin[0].id))
        .limit(1);
      return current[0];
    }
  }

  // 2. Ledger Kaydını Oluştur (Immutable Defter Kaydı)
  const ledgerInsert = await db
    .insert(userPointsLedger)
    .values({
      userId: input.userId,
      actionType: input.actionType,
      basePoints,
      multiplier,
      finalPoints,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      year,
      ruleVersion: CURRENT_RULE_VERSION,
      description: descText,
      metadata: input.metadata || {},
    })
    .returning();

  const createdEntry = ledgerInsert[0];

  // 3. Kullanıcının travelerScore alanını güncelle (Canlı skor senkronizasyonu)
  await db
    .update(users)
    .set({
      travelerScore: sql`GREATEST(0, ${users.travelerScore} + ${finalPoints})`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.userId));

  // 4. Sezon Havuzu Toplam Puanını Güncelle
  await db
    .update(valueSharePools)
    .set({
      totalPoolPoints: sql`GREATEST(0, ${valueSharePools.totalPoolPoints} + ${finalPoints})`,
      updatedAt: new Date(),
    })
    .where(eq(valueSharePools.year, year));

  // 5. Madde 81.2 & Madde 92: Referral Pasif Gelir Kontrolü (%20 Arkadaş Geliri - Kesin Tam Sayı)
  // Eğer bu eylem doğrudan bir seyahat katkısıysa (check-in, pin, tamamlanan rota, b2b) ve kullanıcı davet koduyla gelmişse
  if (
    finalPoints > 0 &&
    (input.actionType === "checkin_pin" ||
      input.actionType === "create_pin" ||
      input.actionType === "complete_trip" ||
      input.actionType === "b2b_purchase")
  ) {
    try {
      const userRecord = await db
        .select({ referredBy: users.referredBy, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      const referrerId = userRecord[0]?.referredBy;
      const passiveSharePoints = calculateReferralPassivePoints(finalPoints);
      if (referrerId && referrerId !== input.userId && passiveSharePoints > 0) {
        // Arkadaşın kazandığı puanın %20'si (tam sayıya yuvarlanmış) davet edenin hanesine pasif gelir olarak uçar!
        await db.insert(userPointsLedger).values({
          userId: referrerId,
          actionType: "referral_passive",
          basePoints: finalPoints,
          multiplier: REFERRAL_PASSIVE_RATE,
          finalPoints: passiveSharePoints,
          referenceId: input.userId,
          referenceType: "user",
          year,
          ruleVersion: CURRENT_RULE_VERSION,
          description: `Arkadaşın (${userRecord[0]?.fullName || "Gezgin"}) seyahat etti, hanene +${passiveSharePoints} pasif puan uçtu! 🚀`,
          metadata: { referredUserId: input.userId, triggerAction: input.actionType },
        });

        // Referans sahibinin skorunu ve havuzu güncelle
        await db
          .update(users)
          .set({ travelerScore: sql`${users.travelerScore} + ${passiveSharePoints}` })
          .where(eq(users.id, referrerId));

        await db
          .update(valueSharePools)
          .set({ totalPoolPoints: sql`${valueSharePools.totalPoolPoints} + ${passiveSharePoints}` })
          .where(eq(valueSharePools.year, year));
      }
    } catch (e) {
      console.error("Referral passive points error:", e);
    }
  }

  return createdEntry;
}

export interface UserPointsSummary {
  userId: string;
  year: number;
  totalPoints: number;
  checkinPoints: number;
  referralPoints: number;
  activityPoints: number;
  poolSharePercent: number; // örn: 0.45%
  totalPoolPoints: number;
  poolSharePercentage: number; // örn: 50.0%
  estimatedNetProfit: number; // 1,000,000 TL
  communityPoolShareTl: number; // 500,000 TL
  estimatedEarningsTl: number; // ~2,500 TL
  referralCode: string;
  invitedCount: number;
  rank: number;
}

/**
 * Kullanıcının Sezonluk Puan Özeti ve Hukuki Simülasyon Raporu (Madde 81.5)
 */
export async function getUserPointsSummary(
  userId: string,
  year: number = CURRENT_SEASON_YEAR
): Promise<UserPointsSummary> {
  // 1. Havuz Bilgisini Getir
  const pools = await db
    .select()
    .from(valueSharePools)
    .where(eq(valueSharePools.year, year))
    .limit(1);

  const pool = pools[0] || {
    estimatedNetProfit: 1000000,
    poolSharePercentage: 20.0,
    totalPoolPoints: 100000,
  };

  // 2. Kullanıcının Puanlarını Topla
  const ledgerRows = await db
    .select({
      actionType: userPointsLedger.actionType,
      finalPoints: userPointsLedger.finalPoints,
    })
    .from(userPointsLedger)
    .where(
      and(
        eq(userPointsLedger.userId, userId),
        eq(userPointsLedger.year, year)
      )
    );

  let totalPoints = 0;
  let checkinPoints = 0;
  let referralPoints = 0;
  let activityPoints = 0;

  for (const row of ledgerRows) {
    totalPoints += row.finalPoints;
    if (row.actionType === "checkin_pin") {
      checkinPoints += row.finalPoints;
    } else if (row.actionType === "referral_passive") {
      referralPoints += row.finalPoints;
    } else {
      activityPoints += row.finalPoints;
    }
  }

  // Güvenlik Önlemi: Puanlar asla negatif olamaz (Math.max(0, ...))
  totalPoints = Math.max(0, totalPoints);
  checkinPoints = Math.max(0, checkinPoints);
  referralPoints = Math.max(0, referralPoints);
  activityPoints = Math.max(0, activityPoints);

  // Havuz Toplam Puanı (En az kullanıcının puanı kadar olmalı)
  const totalPoolPoints = Math.max(pool.totalPoolPoints, totalPoints, 1);

  // Ağırlık Yüzdesi (%)
  const poolSharePercent = totalPoolPoints > 0 ? (totalPoints / totalPoolPoints) * 100 : 0;

  // Topluluk Havuzu Büyüklüğü (Örn: 1.000.000 * %20 = 200.000 TL)
  const communityPoolShareTl = pool.estimatedNetProfit * (pool.poolSharePercentage / 100);

  // Tahmini Pay (Simülasyon - Madde 81.5)
  const estimatedEarningsTl = Math.round((poolSharePercent / 100) * communityPoolShareTl);

  // 3. Kullanıcı Bilgisi ve Davet Kodu
  const userRows = await db
    .select({
      id: users.id,
      referralCode: users.referralCode,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let refCode = userRows[0]?.referralCode;
  if (!refCode) {
    refCode = await generateReferralCodeForUser(userId, userRows[0]?.username);
  }

  // Kaç kişiyi davet etmiş?
  const invitedRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.referredBy, userId));

  const invitedCount = Number(invitedRows[0]?.count || 0);

  return {
    userId,
    year,
    totalPoints,
    checkinPoints,
    referralPoints,
    activityPoints,
    poolSharePercent: Number(poolSharePercent.toFixed(2)),
    totalPoolPoints,
    poolSharePercentage: Number(pool.poolSharePercentage || 50),
    estimatedNetProfit: pool.estimatedNetProfit,
    communityPoolShareTl,
    estimatedEarningsTl,
    referralCode: refCode,
    invitedCount,
    rank: 1, // dinamik hesaplanabilir
  };
}

/**
 * Kullanıcı için Benzersiz Davet Kodu Üretici
 */
export async function generateReferralCodeForUser(
  userId: string,
  preferredUsername?: string | null
): Promise<string> {
  const base = preferredUsername
    ? preferredUsername.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
    : "GEZGIN";
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const code = `${base}${randomSuffix}`;

  await db
    .update(users)
    .set({ referralCode: code, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return code;
}

/**
 * Kullanıcının Son Puan Hareketleri (Ledger Akışı)
 */
export async function getRecentPointActivities(userId: string, limit = 10) {
  return await db
    .select()
    .from(userPointsLedger)
    .where(eq(userPointsLedger.userId, userId))
    .orderBy(desc(userPointsLedger.createdAt))
    .limit(limit);
}

export interface PaginatedActivitiesResult {
  items: (typeof userPointsLedger.$inferSelect)[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Kullanıcının Sayfalamalı Puan Defteri Hareketleri (Ledger Paging)
 */
export async function getPaginatedPointActivities(
  userId: string,
  page: number = 1,
  pageSize: number = 8
): Promise<PaginatedActivitiesResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(userPointsLedger)
    .where(eq(userPointsLedger.userId, userId));

  const totalCount = Number(countResult[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));

  const items = await db
    .select()
    .from(userPointsLedger)
    .where(eq(userPointsLedger.userId, userId))
    .orderBy(desc(userPointsLedger.createdAt))
    .limit(safePageSize)
    .offset(offset);

  return {
    items,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
