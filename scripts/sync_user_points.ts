import { db } from "../lib/db";
import { users, visits, userPointsLedger, valueSharePools } from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { CURRENT_SEASON_YEAR, CURRENT_RULE_VERSION } from "../lib/points/engine";

export async function syncAllUserPoints() {
  console.log("=== AllTripX Puan Senkronizasyonu Başlatılıyor ===");

  const allUsers = await db.select().from(users);
  const allVisits = await db.select().from(visits);

  console.log(`Toplam ${allUsers.length} kullanıcı ve ${allVisits.length} ziyaret kaydı bulundu.`);

  // Mevcut ledger kayıtlarını kontrol et
  const existingLedger = await db.select().from(userPointsLedger);
  const userLedgerMap = new Map<string, typeof existingLedger>();
  for (const entry of existingLedger) {
    const list = userLedgerMap.get(entry.userId) || [];
    list.push(entry);
    userLedgerMap.set(entry.userId, list);
  }

  let grandTotalPoolPoints = 0;

  for (const u of allUsers) {
    const userEntries = userLedgerMap.get(u.id) || [];
    const hasWelcomeBonus = userEntries.some((e) => e.actionType === "welcome_bonus");

    // 1. Hoşgeldin Bonusu (50 Puan)
    if (!hasWelcomeBonus) {
      await db.insert(userPointsLedger).values({
        userId: u.id,
        actionType: "welcome_bonus",
        basePoints: 50,
        multiplier: 1.0,
        finalPoints: 50,
        referenceId: u.id,
        referenceType: "user",
        year: CURRENT_SEASON_YEAR,
        ruleVersion: CURRENT_RULE_VERSION,
        description: "AllTripX Kaşifler Kulübüne Hoşgeldin Bonusu 🎁",
        metadata: { source: "onboarding" },
      });
    }

    // 2. Kullanıcının Gezi Pinleri (create_pin: 10 Puan)
    const userVisits = allVisits.filter((v) => v.userId === u.id);
    const existingPinRefs = new Set(
      userEntries
        .filter((e) => e.actionType === "create_pin" && e.referenceId)
        .map((e) => e.referenceId)
    );

    for (const v of userVisits) {
      if (!existingPinRefs.has(v.id)) {
        await db.insert(userPointsLedger).values({
          userId: u.id,
          actionType: "create_pin",
          basePoints: 10,
          multiplier: 1.0,
          finalPoints: 10,
          referenceId: v.id,
          referenceType: "visit",
          year: CURRENT_SEASON_YEAR,
          ruleVersion: CURRENT_RULE_VERSION,
          description: `Gezi Pini: ${v.cityName}, ${v.countryName}`,
          metadata: { countryCode: v.countryCode, cityName: v.cityName },
        });
      }
    }

    // 3. Günlük Giriş Bonusu (5 Puan)
    const hasDailyLogin = userEntries.some((e) => e.actionType === "daily_login");
    if (!hasDailyLogin) {
      await db.insert(userPointsLedger).values({
        userId: u.id,
        actionType: "daily_login",
        basePoints: 5,
        multiplier: 1.0,
        finalPoints: 5,
        referenceId: u.id,
        referenceType: "user",
        year: CURRENT_SEASON_YEAR,
        ruleVersion: CURRENT_RULE_VERSION,
        description: "Günlük Kaşif Giriş Bonusu ⚡",
        metadata: { date: new Date().toISOString() },
      });
    }

    // Kullanıcının güncel toplam puanını hesapla
    const updatedUserLedger = await db
      .select({ total: sql<number>`COALESCE(SUM(final_points), 0)` })
      .from(userPointsLedger)
      .where(eq(userPointsLedger.userId, u.id));

    const totalUserScore = Number(updatedUserLedger[0]?.total || 0);
    grandTotalPoolPoints += totalUserScore;

    // users.travelerScore alanını senkronize et
    await db
      .update(users)
      .set({
        travelerScore: totalUserScore,
        updatedAt: new Date(),
      })
      .where(eq(users.id, u.id));

    console.log(`Kullanıcı: ${u.fullName} (${u.email}) -> Toplam Puan: ${totalUserScore}`);
  }

  // 4. Havuz Toplam Puanını Güncelle (valueSharePools)
  await db
    .update(valueSharePools)
    .set({
      totalPoolPoints: grandTotalPoolPoints,
      poolSharePercentage: 50.0,
      updatedAt: new Date(),
    })
    .where(eq(valueSharePools.year, CURRENT_SEASON_YEAR));

  console.log(`=== Senkronizasyon Tamamlandı! Toplam Havuz Puanı: ${grandTotalPoolPoints} ===`);
  return { grandTotalPoolPoints };
}

if (require.main === module) {
  syncAllUserPoints()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Senkronizasyon hatası:", err);
      process.exit(1);
    });
}
