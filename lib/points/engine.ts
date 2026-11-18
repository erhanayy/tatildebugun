import { db } from "@/lib/db";
import { userPointsLedger, valueSharePools, users, UserPointsLedger } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const CURRENT_SEASON_YEAR = 2026;
export const CURRENT_RULE_VERSION = "v1.0";

// 2026 Sezonu Temel Kural Matrisi (Madde 81.1)
export const POINT_RULES: Record<
  string,
  { base: number; multiplier: number; titleTr: string; titleEn: string }
> = {
  daily_login: {
    base: 5,
    multiplier: 1.0,
    titleTr: "Günlük Giriş Rozeti",
    titleEn: "Daily Login Badge",
  },
  comment_like: {
    base: 5,
    multiplier: 1.0,
    titleTr: "Topluluk Yorum & Beğeni Etkileşimi",
    titleEn: "Community Comment & Like Interaction",
  },
  create_pin: {
    base: 10,
    multiplier: 1.0,
    titleTr: "Rota / Mekan Pin Oluşturma (Masabaşı)",
    titleEn: "Route / Place Pin Creation (Desk)",
  },
  checkin_pin: {
    base: 10,
    multiplier: 20.0, // 20x Fiziki Check-in Çarpanı (Madde 81.1) = 200 Puan
    titleTr: "Fiziki Mekan Check-in & GPS Doğrulaması (20x Çarpan!)",
    titleEn: "Physical Place Check-in & GPS Verification (20x Boost!)",
  },
  b2b_purchase: {
    base: 100,
    multiplier: 1.0,
    titleTr: "Partner İşletme Rezervasyon / Satın Alma",
    titleEn: "Partner Booking / Purchase",
  },
  referral_passive: {
    base: 0,
    multiplier: 0.2, // %20 Pasif Arkadaş Payı (Madde 81.2)
    titleTr: "Arkadaş Seyahat Katkı Payı (%20 Pasif Gelir)",
    titleEn: "Friend Travel Contribution (%20 Passive Share)",
  },
  carry_over: {
    base: 0,
    multiplier: 1.0,
    titleTr: "Geçmiş Sezon Kıdem Devir Puanı (Carry-Over)",
    titleEn: "Past Season Seniority Carry-Over",
  },
  admin_reward: {
    base: 0,
    multiplier: 1.0,
    titleTr: "Yönetici Özel Başarım Bonusu",
    titleEn: "Admin Special Achievement Reward",
  },
  admin_penalty: {
    base: 0,
    multiplier: 1.0,
    titleTr: "Kural İhlali Ceza Kesintisi (Penalty)",
    titleEn: "Rule Violation Penalty Deduction",
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
 * Puan Dağıtım ve Ledger İşleme Motoru (Event-Sourcing Ledger Pattern)
 */
export async function awardPoints(input: AwardPointsInput): Promise<UserPointsLedger> {
  const year = input.year || CURRENT_SEASON_YEAR;
  const rule = POINT_RULES[input.actionType];

  const basePoints = input.basePoints ?? (rule ? rule.base : 0);
  const multiplier = input.multiplier ?? (rule ? rule.multiplier : 1.0);
  const finalPoints = Math.round(basePoints * multiplier);

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

  // 5. Madde 81.2: Referral Pasif Gelir Kontrolü (%20 Arkadaş Geliri)
  // Eğer bu eylem doğrudan bir seyahat katkısıysa (check-in, pin, b2b) ve kullanıcı bir davet koduyla gelmişse
  if (
    finalPoints > 0 &&
    (input.actionType === "checkin_pin" ||
      input.actionType === "create_pin" ||
      input.actionType === "b2b_purchase")
  ) {
    try {
      const userRecord = await db
        .select({ referredBy: users.referredBy, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      const referrerId = userRecord[0]?.referredBy;
      if (referrerId && referrerId !== input.userId) {
        // Arkadaşın kazandığı puanın %20'si davet edenin hanesine pasif gelir olarak uçar!
        const passiveSharePoints = Math.max(1, Math.round(finalPoints * 0.2));
        await db.insert(userPointsLedger).values({
          userId: referrerId,
          actionType: "referral_passive",
          basePoints: finalPoints,
          multiplier: 0.2,
          finalPoints: passiveSharePoints,
          referenceId: input.userId,
          referenceType: "user",
          year,
          ruleVersion: CURRENT_RULE_VERSION,
          description: `Arkadaşın (${userRecord[0]?.fullName || "Gezgin"}) seyahat etti, hanene pasif puan uçtu! 🚀`,
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
  estimatedNetProfit: number; // 1,000,000 TL
  communityPoolShareTl: number; // 200,000 TL
  estimatedEarningsTl: number; // ~900 TL
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
