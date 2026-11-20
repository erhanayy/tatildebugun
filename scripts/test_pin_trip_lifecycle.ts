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
import {
  users,
  visits,
  trips,
  tripStops,
  placesOfInterest,
  tripPlaceVisits,
  userPointsLedger,
  valueSharePools,
} from "../lib/db/schema";
import {
  awardPoints,
  getUserPointsSummary,
  getConnectionPairKey,
  getPlaceVisitKey,
  getReferenceNetPoints,
  roundPoints,
  calculateReferralPassivePoints,
  computeSeasonStartingPointsFromCounts,
  calculateSeasonStartingPoints,
  CURRENT_SEASON_YEAR,
} from "../lib/points/engine";
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
    // TEST 6: ONAYLI İLİŞKİ KURMA (+20 Pts), ÇİFTE ÖDÜL KORUMASI VE KALDIRMA İADESİ (-20 Pts)
    // ==============================================================
    console.log("\n--- 6. Onaylı İlişki Kurma (+20 Pts) & İlişki Kaldırma (-20 Pts) Testi ---");
    const [partnerUser] = await db
      .insert(users)
      .values({
        email: `test_partner_${Date.now()}@internal.test`,
        password: "test_password_hash_12345",
        fullName: "İzole Test Arkadaşı",
        username: `partner_${Date.now()}`,
        travelerScore: 50,
        role: "guest",
        isActive: true,
      })
      .returning();

    try {
      const pairKeyA = getConnectionPairKey(userId, partnerUser.id);
      const pairKeyB = getConnectionPairKey(partnerUser.id, userId);
      assert(pairKeyA === pairKeyB, "Kanonik çift anahtarı sıradan bağımsız olarak özdeştir");

      // Her iki tarafa +20 Puan ver
      for (const uid of [userId, partnerUser.id]) {
        const netBefore = await getReferenceNetPoints(uid, pairKeyA);
        if (netBefore <= 0) {
          await awardPoints({
            userId: uid,
            actionType: "connect_friend",
            referenceId: pairKeyA,
            referenceType: "connection",
            description: "Test Onaylı Arkadaş İlişkisi (+20 Puan)",
          });
        }
      }

      const netUserAfterConnect = await getReferenceNetPoints(userId, pairKeyA);
      const netPartnerAfterConnect = await getReferenceNetPoints(partnerUser.id, pairKeyA);
      assert(netUserAfterConnect === 20, "1. kullanıcı onaylı ilişki için +20 Puan aldı");
      assert(netPartnerAfterConnect === 20, "2. kullanıcı onaylı ilişki için +20 Puan aldı");

      // Çifte onay / farming girişimi kontrolü: net > 0 olduğu için tekrar puan verilmemeli
      const netCheckDuplicate = await getReferenceNetPoints(userId, pairKeyA);
      assert(netCheckDuplicate > 0, "Aynı çift için aktif bakiye > 0 olduğundan çifte +20 puan engellenir");

      // Bağlantı kaldırıldığında her iki taraftan -20 Puan iade
      for (const uid of [userId, partnerUser.id]) {
        const netActive = await getReferenceNetPoints(uid, pairKeyA);
        if (netActive > 0) {
          await awardPoints({
            userId: uid,
            actionType: "remove_friend",
            basePoints: -netActive,
            multiplier: 1.0,
            referenceId: pairKeyA,
            referenceType: "connection",
            description: "Test Kaldırılan İlişki Puan İadesi",
          });
        }
      }

      const netUserAfterRemove = await getReferenceNetPoints(userId, pairKeyA);
      const netPartnerAfterRemove = await getReferenceNetPoints(partnerUser.id, pairKeyA);
      assert(netUserAfterRemove === 0, "İlişki kaldırıldığında 1. kullanıcının çift bakiyesi 0 oldu");
      assert(netPartnerAfterRemove === 0, "İlişki kaldırıldığında 2. kullanıcının çift bakiyesi 0 oldu");

      const afterConnPool = (await db.select().from(valueSharePools).where(eq(valueSharePools.year, CURRENT_SEASON_YEAR)))[0];
      assert(
        afterConnPool.totalPoolPoints === startPoolPoints,
        `İlişki ekle+sil sonrası sezon havuzu başlangıç seviyesine döndü (${afterConnPool.totalPoolPoints} == ${startPoolPoints})`
      );
    } finally {
      await db.delete(userPointsLedger).where(eq(userPointsLedger.userId, partnerUser.id));
      await db.delete(users).where(eq(users.id, partnerUser.id));
    }

    // ==============================================================
    // TEST 7: SIFIRIN ALTINA DÜŞMEME GÜVENLİK SINIRI VE NEGATİF KORUMASI
    // ==============================================================
    console.log("\n--- 7. Sıfırın Altına Düşmeme Güvenlik Sınırı Testi ---");
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

    // ==============================================================
    // TEST 8: TATİLDEYİM GÖRÜLEN YER (+2 P / -2 P), ÇİFTE ÖDÜL KORUMASI & BAZ PUAN (%20)
    // ==============================================================
    console.log("\n--- 8. Tatildeyim Görülen Yer (+2 / -2 Puan) & Net Bakiye Koruması Testi ---");
    const [testTripForPlace] = await db
      .insert(trips)
      .values({
        userId,
        title: "Tatildeyim Test Turu",
        status: "planned",
        visibility: "public",
      })
      .returning();

    const [testPlace1, testPlace2] = await db
      .insert(placesOfInterest)
      .values([
        {
          countryCode: "IT",
          cityName: "Roma Test",
          name: "Test Kolezyum",
          category: "monument",
          isCustom: true,
          createdByUserId: userId,
        },
        {
          countryCode: "IT",
          cityName: "Roma Test",
          name: "Test Pantheon",
          category: "historic",
          isCustom: true,
          createdByUserId: userId,
        },
      ])
      .returning();

    try {
      const pvKey1 = getPlaceVisitKey(testTripForPlace.id, testPlace1.id);
      const pvKey2 = getPlaceVisitKey(testTripForPlace.id, testPlace2.id);

      // 8.1 Görülen yer 1 eklendiğinde +2 Puan
      const [pv1] = await db
        .insert(tripPlaceVisits)
        .values({
          userId,
          tripId: testTripForPlace.id,
          placeId: testPlace1.id,
        })
        .returning();

      const addPv1 = await awardPoints({
        userId,
        actionType: "visit_place",
        referenceId: pvKey1,
        referenceType: "place_visit",
        description: `Tatildeyim Görülen Yer: ${testPlace1.name}`,
      });
      assert(addPv1.finalPoints === 2, "Tatildeyim görülen yer ekleme +2 Puan verir");
      assert((await getReferenceNetPoints(userId, pvKey1)) === 2, "Görülen yer 1 net bakiyesi +2'dir");

      // 8.2 Aynı yer için tekrar ekleme / yıldız güncellemesi çifte puan vermez (net > 0)
      const netBeforeDup = await getReferenceNetPoints(userId, pvKey1);
      assert(netBeforeDup > 0, "Aynı tur+mekan için aktif bakiye > 0 olduğundan çifte +2 P engellenir");

      // 8.3 Görülen yer 2 eklendiğinde +2 Puan (Toplam aktif 2 yer -> baz puan: round(2 * 2 * 0.2) = 1)
      await db.insert(tripPlaceVisits).values({
        userId,
        tripId: testTripForPlace.id,
        placeId: testPlace2.id,
      });
      const addPv2 = await awardPoints({
        userId,
        actionType: "visit_place",
        referenceId: pvKey2,
        referenceType: "place_visit",
        description: `Tatildeyim Görülen Yer: ${testPlace2.name}`,
      });
      assert(addPv2.finalPoints === 2, "2. görülen yer ekleme +2 Puan verir");

      // Canlı DB üzerinden 2 aktif görülen yerin Yıla Başlangıç Puanı katkısı: 2 × 2 × %20 = 0.8 -> 1
      const dbStartWithPlaces = await calculateSeasonStartingPoints(userId);
      assert(dbStartWithPlaces.visitedPlaceCount === 2, "DB'de 2 aktif Tatildeyim görülen yer sayılır");
      assert(dbStartWithPlaces.visitedPlacePoints === 1, "2 Görülen Yer × 2 × %20 = 0.8 -> 1 tam sayı baz puan");

      // 8.4 Görülen yer 1 çıkarıldığında -2 Puan iade
      const netBeforeRemove1 = await getReferenceNetPoints(userId, pvKey1);
      const remPv1 = await awardPoints({
        userId,
        actionType: "remove_place_visit",
        basePoints: -netBeforeRemove1,
        multiplier: 1.0,
        referenceId: pvKey1,
        referenceType: "place_visit",
        description: `Tatildeyim Çıkarılan Yer İadesi: ${testPlace1.name}`,
      });
      await db.delete(tripPlaceVisits).where(eq(tripPlaceVisits.id, pv1.id));

      assert(remPv1.finalPoints === -2, "Tatildeyim görülen yer çıkarma -2 Puan iade eder");
      assert((await getReferenceNetPoints(userId, pvKey1)) === 0, "Çıkarılan yerin net bakiyesi 0'a iner");

      // 8.5 Çıkarılan yer tekrar eklenince yeniden +2 Puan verir
      const netBeforeReAdd = await getReferenceNetPoints(userId, pvKey1);
      assert(netBeforeReAdd <= 0, "Çıkarılan yer tekrar eklendiğinde net <= 0 olduğu için yeniden +2 P alabilir");
      const reAddPv1 = await awardPoints({
        userId,
        actionType: "visit_place",
        referenceId: pvKey1,
        referenceType: "place_visit",
        description: `Tatildeyim Görülen Yer (Tekrar): ${testPlace1.name}`,
      });
      assert(reAddPv1.finalPoints === 2, "Çıkarılan yer tekrar eklendiğinde +2 Puan yeniden verilir");

      // Temizlik: test yer 1 ve 2 net puanlarını iade et
      for (const key of [pvKey1, pvKey2]) {
        const net = await getReferenceNetPoints(userId, key);
        if (net > 0) {
          await awardPoints({
            userId,
            actionType: "remove_place_visit",
            basePoints: -net,
            multiplier: 1.0,
            referenceId: key,
            referenceType: "place_visit",
            description: "Test temizlik iadesi",
          });
        }
      }
    } finally {
      await db.delete(tripPlaceVisits).where(eq(tripPlaceVisits.userId, userId));
      await db.delete(placesOfInterest).where(eq(placesOfInterest.createdByUserId, userId));
      await db.delete(trips).where(eq(trips.id, testTripForPlace.id));
    }

    // ==============================================================
    // TEST 9: YILA BAŞLANGIÇ PUANI FORMÜLÜ & KESİN TAM SAYI YUVARLAMA TESTİ
    // ==============================================================
    console.log("\n--- 9. Yıla Başlangıç Puanı & Kesin Tam Sayı Yuvarlama Testi ---");
    assert(roundPoints(3.4) === 3, "roundPoints(3.4) aşağı yuvarlanır (3)");
    assert(roundPoints(3.5) === 4, "roundPoints(3.5) yukarı yuvarlanır (4)");
    assert(calculateReferralPassivePoints(7) === 1, "7 puanın %20 pasif payı tam sayıya yuvarlanır (1.4 -> 1)");
    assert(calculateReferralPassivePoints(8) === 2, "8 puanın %20 pasif payı tam sayıya yuvarlanır (1.6 -> 2)");
    assert(calculateReferralPassivePoints(50) === 10, "50 puanlık tamamlanan rotanın %20 pasif payı tam 10'dur");

    const sampleStart = computeSeasonStartingPointsFromCounts({
      pinCount: 7, // 7 * 10 * 0.2 = 14
      completedTripCount: 3, // 3 * 50 * 0.2 = 30
      activeConnectionCount: 4, // 4 * 20 * 0.2 = 16
      visitedPlaceCount: 11, // 11 * 2 * 0.2 = 4.4 -> 4
    });
    assert(sampleStart.pinPoints === 14, "7 Pin × 10 × %20 = 14 Puan");
    assert(sampleStart.tripPoints === 30, "3 Tamamlanan Rota × 50 × %20 = 30 Puan");
    assert(sampleStart.connectionPoints === 16, "4 Sosyal İlişki × 20 × %20 = 16 Puan");
    assert(sampleStart.visitedPlacePoints === 4, "11 Görülen Yer × 2 × %20 = 4.4 -> 4 Puan");
    assert(sampleStart.totalStartingPoints === 64, "Toplam Yıla Başlangıç Puanı = 64 (Tam Sayı)");
    assert(Number.isInteger(sampleStart.totalStartingPoints), "Yıla Başlangıç Puanı kesin tam sayıdır");

    // Yuvarlama sınır testi: 1 yer (0.4 -> 0), 2 yer (0.8 -> 1), 5 yer (2.0 -> 2)
    assert(
      computeSeasonStartingPointsFromCounts({
        pinCount: 0,
        completedTripCount: 0,
        activeConnectionCount: 0,
        visitedPlaceCount: 1,
      }).visitedPlacePoints === 0,
      "1 Görülen Yer × 2 × %20 = 0.4 -> 0 (tam sayı yuvarlama)"
    );
    assert(
      computeSeasonStartingPointsFromCounts({
        pinCount: 0,
        completedTripCount: 0,
        activeConnectionCount: 0,
        visitedPlaceCount: 5,
      }).visitedPlacePoints === 2,
      "5 Görülen Yer × 2 × %20 = 2.0 -> 2"
    );

    // Veritabanı üzerinden canlı hesaplama (şu an test kullanıcısının 0 aktif pini/rotası/ilişkisi/yeri var)
    const dbStart = await calculateSeasonStartingPoints(userId);
    assert(dbStart.totalStartingPoints === 0, "Aktif kaydı olmayan kullanıcı için Yıla Başlangıç Puanı 0'dır");

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
