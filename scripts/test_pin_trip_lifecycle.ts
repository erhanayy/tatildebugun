/**
 * TatildeBugün / AllTripX - Pin & Rota Puan Yaşam Döngüsü ve Muhasebe Geri Alma Birim Testi
 * (Unit Test: Pin & Route Points Lifecycle & Reversible Accounting)
 * 
 * TAM İZOLASYON PRENSİBİ:
 * Bu test gerçek kullanıcıları (örn. erhanayyildiz@gmail.com) ASLA kullanmaz.
 * Geçici bir test kullanıcısı oluşturur, tüm testleri çalıştırır ve finally bloğunda
 * tüm test defter kayıtlarını, ziyaretleri, rotaları ve kullanıcıyı tamamen temizler.
 */

import { db } from "../lib/db";
import { users, visits, trips, tripStops, userPointsLedger, valueSharePools } from "../lib/db/schema";
import { awardPoints, getUserPointsSummary, CURRENT_SEASON_YEAR } from "../lib/points/engine";
import { eq, and, sql } from "drizzle-orm";

async function runTests() {
  console.log("=== 🧭 ALLTRIPX PIN & ROTA PUAN YAŞAM DÖNGÜSÜ BİRİM TESTİ (TAM İZOLASYONLU) ===\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? "- " + detail : ""}`);
    }
  }

  // Havuzun başlangıç durumunu kaydet
  const initialPool = (await db.select().from(valueSharePools).where(eq(valueSharePools.year, CURRENT_SEASON_YEAR)))[0];
  const startPoolPoints = initialPool.totalPoolPoints;

  // 1. İzole Test Kullanıcısı Oluştur
  const testEmail = `test_runner_${Date.now()}@internal.test`;
  const [testUser] = await db
    .insert(users)
    .values({
      email: testEmail,
      password: "test_password_hash_12345",
      fullName: "İzole Test Gezgini",
      username: `test_${Date.now()}`,
      travelerScore: 100,
      role: "guest",
      isActive: true,
    })
    .returning();

  assert(Boolean(testUser?.id), "İzole test kullanıcısı başarıyla oluşturuldu");
  const userId = testUser.id;
  const startScore = 100;

  console.log(`\nİzole Test Ortamı Hazırlandı:`);
  console.log(` -> Test Kullanıcı ID: ${userId}`);
  console.log(` -> Test Kullanıcı Skoru: ${startScore} Pts`);
  console.log(` -> Sezon Havuz Puanı: ${startPoolPoints} Pts`);

  try {
    // ==============================================================
    // TEST 1: PİN OLUŞTURMA VE PUAN KAZANIMI (+10 Pts)
    // ==============================================================
    console.log("\n--- 1. Pin Oluşturma ve Puan Kazanımı (+10 Pts) Testi ---");

    const [insertedVisit] = await db
      .insert(visits)
      .values({
        userId,
        countryCode: "SE",
        countryName: "İsveç",
        cityName: "Uppsala Test",
        latitude: 59.8586,
        longitude: 17.6389,
        dateType: "timeless",
        visitType: "touristic",
        visibility: "public",
        notes: "Otomatik Test Pini",
      })
      .returning();

    assert(Boolean(insertedVisit?.id), "Test ziyareti (pin) başarıyla oluşturuldu");

    // Puan Motorunu Tetikle (addVisit içinde yapılan işlem)
    const addPinLedger = await awardPoints({
      userId,
      actionType: "create_pin",
      referenceId: insertedVisit.id,
      referenceType: "visit",
      description: `Gezi Pini: ${insertedVisit.cityName}, ${insertedVisit.countryName}`,
      metadata: { countryCode: insertedVisit.countryCode, cityName: insertedVisit.cityName },
    });

    assert(addPinLedger.finalPoints === 10, "Pin oluşturma için +10 Puan tahsis edildi");
    assert(addPinLedger.actionType === "create_pin", "Defter kayıt türü 'create_pin'");

    const afterAddVisitUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    const afterAddVisitPool = (await db.select().from(valueSharePools).where(eq(valueSharePools.year, CURRENT_SEASON_YEAR)))[0];

    assert(
      afterAddVisitUser.travelerScore === startScore + 10,
      `Kullanıcı skoru tam 10 puan arttı (${startScore} -> ${afterAddVisitUser.travelerScore})`
    );
    assert(
      afterAddVisitPool.totalPoolPoints === startPoolPoints + 10,
      `Sezon havuzu tam 10 puan arttı (${startPoolPoints} -> ${afterAddVisitPool.totalPoolPoints})`
    );

    // ==============================================================
    // TEST 2: PİN SİLME VE PUAN İADESİ / GERİ ALMA (-10 Pts)
    // ==============================================================
    console.log("\n--- 2. Pin Silme ve Puan İadesi (-10 Pts) Testi ---");

    // deleteVisit içinde yapılan işlem:
    const awardedVisitEntries = await db
      .select({ finalPoints: userPointsLedger.finalPoints })
      .from(userPointsLedger)
      .where(
        and(
          eq(userPointsLedger.userId, userId),
          eq(userPointsLedger.referenceId, insertedVisit.id),
          sql`${userPointsLedger.finalPoints} > 0`
        )
      );

    const totalVisitAwarded = awardedVisitEntries.reduce((sum, e) => sum + e.finalPoints, 0);
    assert(totalVisitAwarded === 10, "Silinecek pin için kazanılmış 10 puan tespit edildi");

    // Ters işlem kaydı oluştur
    const deletePinLedger = await awardPoints({
      userId,
      actionType: "delete_pin",
      basePoints: -totalVisitAwarded,
      multiplier: 1.0,
      referenceId: insertedVisit.id,
      referenceType: "visit",
      description: `Silinen Gezi Pini İadesi: ${insertedVisit.cityName}, ${insertedVisit.countryName}`,
      metadata: { countryCode: insertedVisit.countryCode, cityName: insertedVisit.cityName },
    });

    assert(deletePinLedger.finalPoints === -10, "Pin silme için -10 Puan negatif defter kaydı oluşturuldu");
    assert(deletePinLedger.actionType === "delete_pin", "Defter kayıt türü 'delete_pin'");

    // Ziyareti sil
    await db.delete(visits).where(eq(visits.id, insertedVisit.id));
    const visitCheck = await db.select().from(visits).where(eq(visits.id, insertedVisit.id));
    assert(visitCheck.length === 0, "Ziyaret kaydı veritabanından tamamen silindi");

    const afterDeleteVisitUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    const afterDeleteVisitPool = (await db.select().from(valueSharePools).where(eq(valueSharePools.year, CURRENT_SEASON_YEAR)))[0];

    assert(
      afterDeleteVisitUser.travelerScore === startScore,
      `Kullanıcı skoru başlangıç seviyesine geri döndü (${afterDeleteVisitUser.travelerScore} == ${startScore})`
    );
    assert(
      afterDeleteVisitPool.totalPoolPoints === startPoolPoints,
      `Sezon havuzu başlangıç seviyesine geri döndü (${afterDeleteVisitPool.totalPoolPoints} == ${startPoolPoints})`
    );

    // ==============================================================
    // TEST 3: ROTA (TRİP) OLUŞTURMA VE PUAN KAZANIMI (+50 Pts)
    // ==============================================================
    console.log("\n--- 3. Rota Oluşturma ve Puan Kazanımı (+50 Pts) Testi ---");

    const [insertedTrip] = await db
      .insert(trips)
      .values({
        userId,
        title: "İskandinavya Test Turu",
        description: "Test amaçlı oluşturulan rota",
        status: "completed", // Tamamlanan rota 50 puan kazandırır
        visibility: "public",
      })
      .returning();

    assert(Boolean(insertedTrip?.id), "Test rotası başarıyla oluşturuldu");

    // Durak ekle
    await db.insert(tripStops).values([
      { tripId: insertedTrip.id, countryCode: "SE", cityName: "Stockholm", latitude: 59.3293, longitude: 18.0686, stopOrder: 1 },
      { tripId: insertedTrip.id, countryCode: "NO", cityName: "Oslo", latitude: 59.9139, longitude: 10.7522, stopOrder: 2 },
    ]);

    // Puan Motorunu Tetikle (createTrip içinde yapılan işlem)
    const addTripLedger = await awardPoints({
      userId,
      actionType: "complete_trip",
      referenceId: insertedTrip.id,
      referenceType: "trip",
      description: `Seyahat Rotası: ${insertedTrip.title}`,
    });

    assert(addTripLedger.finalPoints === 50, "Tamamlanan rota oluşturma için +50 Puan verildi");

    const afterAddTripUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    assert(
      afterAddTripUser.travelerScore === startScore + 50,
      `Kullanıcı skoru tam 50 puan arttı (${afterAddTripUser.travelerScore} == ${startScore + 50})`
    );

    // ==============================================================
    // TEST 4: ROTA DURUM DEĞİŞİMİ (completed -> planned -> completed)
    // ==============================================================
    console.log("\n--- 4. Rota Durumu Değişikliği (+/-50 Pts) Testi ---");

    // Durum 'planned' yapıldığında puan geri alınır
    const statusToPlannedLedger = await awardPoints({
      userId,
      actionType: "delete_trip",
      basePoints: -50,
      multiplier: 1.0,
      referenceId: insertedTrip.id,
      referenceType: "trip",
      description: `Rota Durumu 'Planlandı' Yapıldı (Geri Alma): ${insertedTrip.title}`,
    });
    assert(statusToPlannedLedger.finalPoints === -50, "Durum 'planned' olunca 50 puan düşüldü");

    // Durum tekrar 'completed' yapıldığında puan yeniden verilir
    const statusToCompletedLedger = await awardPoints({
      userId,
      actionType: "complete_trip",
      referenceId: insertedTrip.id,
      referenceType: "trip",
      description: `Tamamlanan Seyahat Rotası: ${insertedTrip.title}`,
    });
    assert(statusToCompletedLedger.finalPoints === 50, "Durum 'completed' olunca tekrar 50 puan verildi");

    // ==============================================================
    // TEST 5: ROTA SİLME VE PUAN İADESİ / GERİ ALMA (-50 Pts)
    // ==============================================================
    console.log("\n--- 5. Rota Silme ve Puan İadesi (-50 Pts) Testi ---");

    const activeTripPoints = await db
      .select({ finalPoints: userPointsLedger.finalPoints })
      .from(userPointsLedger)
      .where(
        and(
          eq(userPointsLedger.userId, userId),
          eq(userPointsLedger.referenceId, insertedTrip.id)
        )
      );
    const netTripPoints = activeTripPoints.reduce((sum, e) => sum + e.finalPoints, 0);
    assert(netTripPoints === 50, "Silinecek rotada net 50 puan tespit edildi");

    // Ters işlem kaydı oluştur (-50 Pts)
    const deleteTripLedger = await awardPoints({
      userId,
      actionType: "delete_trip",
      basePoints: -netTripPoints,
      multiplier: 1.0,
      referenceId: insertedTrip.id,
      referenceType: "trip",
      description: `Silinen Seyahat Rotası İadesi: ${insertedTrip.title}`,
    });

    assert(deleteTripLedger.finalPoints === -50, "Rota silme için -50 Puan negatif defter kaydı oluşturuldu");

    // Rotayı sil
    await db.delete(trips).where(eq(trips.id, insertedTrip.id));
    const tripCheck = await db.select().from(trips).where(eq(trips.id, insertedTrip.id));
    const stopsCheck = await db.select().from(tripStops).where(eq(tripStops.tripId, insertedTrip.id));
    assert(tripCheck.length === 0, "Rota veritabanından tamamen silindi");
    assert(stopsCheck.length === 0, "Rotaya bağlı duraklar (tripStops) cascade ile temizlendi");

    const finalUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    const finalPool = (await db.select().from(valueSharePools).where(eq(valueSharePools.year, CURRENT_SEASON_YEAR)))[0];

    assert(
      finalUser.travelerScore === startScore,
      `Tüm ekleme/silme döngüsü sonrası kullanıcı skoru kusursuz korundu (${finalUser.travelerScore} == ${startScore})`
    );
    assert(
      finalPool.totalPoolPoints === startPoolPoints,
      `Tüm ekleme/silme döngüsü sonrası sezon havuzu kusursuz korundu (${finalPool.totalPoolPoints} == ${startPoolPoints})`
    );

    // ==============================================================
    // TEST 6: SIFIRIN ALTINA DÜŞMEME GÜVENLİK SINIRI VE NEGATİF KORUMASI
    // ==============================================================
    console.log("\n--- 6. Sıfırın Altına Düşmeme Güvenlik Sınırı Testi ---");
    await awardPoints({
      userId,
      actionType: "admin_penalty",
      basePoints: -999999, // Çok yüksek bir ceza denemesi
      multiplier: 1.0,
      description: "Sınır Testi Cezası",
    });

    const boundedUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    assert(boundedUser.travelerScore >= 0, "Kullanıcı skoru sıfırın altına ASLA düşmez (GREATEST(0, ...))");

    // getUserPointsSummary üzerinden negatif koruma testi
    const summary = await getUserPointsSummary(userId);
    assert(summary.totalPoints >= 0, `getUserPointsSummary totalPoints sıfırın altına düşmez (${summary.totalPoints} >= 0)`);

  } finally {
    // ==============================================================
    // TEMİZLİK: TÜM TEST VERİLERİNİ SİL (GERÇEK VERİLER KORUNUR)
    // ==============================================================
    console.log("\n--- 🧹 Test Verilerinin Tam İzolasyonlu Temizliği ---");
    await db.delete(userPointsLedger).where(eq(userPointsLedger.userId, userId));
    await db.delete(visits).where(eq(visits.userId, userId));
    await db.delete(trips).where(eq(trips.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.update(valueSharePools).set({ totalPoolPoints: startPoolPoints }).where(eq(valueSharePools.year, CURRENT_SEASON_YEAR));
    console.log("✅ Geçici test kullanıcısı ve tüm test kayıtları veritabanından tamamen temizlendi.");
  }

  // --- SONUÇ RAPORU ---
  console.log(`\n========================================`);
  console.log(`TOPLAM TEST: ${totalTests} | BAŞARILI: ${passedTests} | HATALI: ${totalTests - passedTests}`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    console.log("🎉 TÜM PIN VE ROTA YAŞAM DÖNGÜSÜ BİRİM TESTLERİ BAŞARIYLA GEÇTİ!");
    process.exit(0);
  } else {
    console.error("💥 BAZI TESTLER BAŞARISIZ OLDU!");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test yürütülürken hata oluştu:", err);
  process.exit(1);
});
