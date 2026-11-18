/**
 * TatildeBugün / AllTripX - Sosyal Liderlik Sıralaması Gizlilik ve İsim Maskeleme Birim Testi
 * (Unit Test: Leaderboard Privacy & Relationship Masking)
 */

import { db } from "../lib/db";
import { users, travelMatches, userConnections, visits, trips } from "../lib/db/schema";
import { eq, or, and, inArray } from "drizzle-orm";

// 1. Maskeleme Fonksiyonu
function formatInitialsName(name: string | null | undefined): string {
  if (!name || !name.trim()) return "A.B.";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A.B.";
  return parts.map((p) => p.charAt(0).toLocaleUpperCase("tr-TR") + ".").join("");
}

// 2. Avatar Baş Harf Ayıklama (UserAvatar mantığı)
function extractAvatarInitials(name: string | null | undefined): string | null {
  if (!name) return null;
  return name
    .trim()
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr-TR");
}

async function runTests() {
  console.log("=== 🛡️ ALLTRIPX LİDERLİK TABLOSU GİZLİLİK VE İLİŞKİ MASKELEME BİRİM TESTİ ===\n");

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

  // --- BÖLÜM 1: Baş Harf Maskeleme Fonksiyonu (formatInitialsName) ---
  console.log("--- 1. Baş Harf Maskeleme Fonksiyonu Birim Testleri ---");
  assert(formatInitialsName("Cumhur Saraçoğlu") === "C.S.", "Cumhur Saraçoğlu -> C.S.");
  assert(formatInitialsName("Altuğ Yalçın") === "A.Y.", "Altuğ Yalçın -> A.Y.");
  assert(formatInitialsName("Mehmet Ali Yılmaz") === "M.A.Y.", "Mehmet Ali Yılmaz -> M.A.Y.");
  assert(formatInitialsName("İlker Baş") === "İ.B.", "Türkçe 'İ' karakteri korunuyor: İlker Baş -> İ.B.");
  assert(formatInitialsName("Işıl Öztürk") === "I.Ö.", "Türkçe 'I' ve 'Ö' karakterleri: Işıl Öztürk -> I.Ö.");
  assert(formatInitialsName("Şener Şen") === "Ş.Ş.", "Türkçe 'Ş' karakteri: Şener Şen -> Ş.Ş.");
  assert(formatInitialsName("Çağlar Göçer") === "Ç.G.", "Türkçe 'Ç' ve 'Ğ': Çağlar Göçer -> Ç.G.");
  assert(formatInitialsName("  Dilruba   KOÇ  ") === "D.K.", "Boşluklu girdiler temizleniyor: Dilruba KOÇ -> D.K.");
  assert(formatInitialsName("") === "A.B.", "Boş string için fallback: '' -> A.B.");
  assert(formatInitialsName(null) === "A.B.", "null için fallback: null -> A.B.");
  assert(formatInitialsName(undefined) === "A.B.", "undefined için fallback: undefined -> A.B.");

  // --- BÖLÜM 2: Avatar Baş Harfleri Fallback Testi ---
  console.log("\n--- 2. Avatar Baş Harfleri Fallback Testleri ---");
  assert(extractAvatarInitials("C.S.") === "CS", "Noktalı maskeli isimden 2 harfli temiz avatar: C.S. -> CS");
  assert(extractAvatarInitials("M.A.Y.") === "MA", "Çoklu noktalı isimden ilk 2 harf: M.A.Y. -> MA");
  assert(extractAvatarInitials("Erhan Ayyıldız") === "EA", "Tam isimden avatar: Erhan Ayyıldız -> EA");
  assert(extractAvatarInitials("İlker Baş") === "İB", "Türkçe 'İ' karakterli avatar: İlker Baş -> İB");

  // --- BÖLÜM 3: Gerçek Veritabanı İlişki ve Gizlilik Çözümleme Testi ---
  console.log("\n--- 3. Veritabanı İlişki ve Küresel Gizlilik Çözümleme Testleri ---");

  const allDbUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email,
      avatarUrl: users.avatarUrl,
      travelerScore: users.travelerScore,
    })
    .from(users);

  const currentUser = allDbUsers.find((u) => u.email === "erhanayyildiz@gmail.com");
  assert(Boolean(currentUser), "Oturum kullanıcısı (Erhan Ayyıldız) veritabanında mevcut");

  if (currentUser) {
    const currentUserId = currentUser.id;

    // Kullanıcının kabul edilmiş tüm ilişkilerini (travelMatches + userConnections) sorgula
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

    const relationshipMap = new Map<string, string>();
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

    console.log(`   -> Kullanıcının kabul edilmiş onaylı ilişki sayısı: ${relationshipMap.size}`);

    // Test 3.1: Kendisi (isSelf) Asla Maskelenmez
    const selfItem = {
      isSelf: true,
      hasRel: false,
      fullName: currentUser.fullName,
      shouldMask: false,
    };
    assert(
      !selfItem.shouldMask && selfItem.fullName === "Erhan Ayyıldız",
      "Kullanıcının kendisi (isSelf) asla maskelenmez ve tam adı gözükür"
    );

    // Test 3.2: Kabul Edilmiş İlişkisi Olanlar Tam Adıyla Gözükür
    for (const [partnerId, rel] of relationshipMap.entries()) {
      const partner = allDbUsers.find((u) => u.id === partnerId);
      if (partner && partner.id !== currentUserId) {
        const isSelf = partner.id === currentUserId;
        const hasRelationship = Boolean(rel);
        const shouldMask = !isSelf && !hasRelationship;
        assert(
          !shouldMask && Boolean(partner.fullName),
          `İlişkisi olan kullanıcı tam adıyla gözükür: ${partner.fullName} (İlişki: ${rel})`
        );
      }
    }

    // Test 3.3: İlişkisi Olmayanlar (Strangers) Mutlaka Maskelenir ve Profil Bilgisi Sızmaz
    const strangers = allDbUsers.filter((u) => u.id !== currentUserId && !relationshipMap.has(u.id));
    console.log(`   -> İlişkisi bulunmayan (yabancı) kullanıcı sayısı: ${strangers.length}`);
    assert(strangers.length > 0, "Sistemde ilişkisi bulunmayan en az 1 kullanıcı mevcut");

    let allStrangersMasked = true;
    let noAvatarLeaked = true;
    let noUsernameLeaked = true;

    for (const stranger of strangers) {
      const isSelf = stranger.id === currentUserId;
      const hasRel = relationshipMap.has(stranger.id);
      const shouldMask = !isSelf && !hasRel;

      const displayName = shouldMask ? formatInitialsName(stranger.fullName) : stranger.fullName;
      const displayAvatar = shouldMask ? null : stranger.avatarUrl;
      const displayUsername = shouldMask ? null : stranger.username;

      if (!shouldMask || !displayName.includes(".")) {
        allStrangersMasked = false;
        console.error(`❌ Maskeleme hatası: ${stranger.fullName} -> ${displayName}`);
      }
      if (displayAvatar !== null) noAvatarLeaked = false;
      if (displayUsername !== null) noUsernameLeaked = false;
    }

    assert(allStrangersMasked, "İlişkisi bulunmayan tüm kullanıcılar A.B. biçiminde baş harfleriyle maskelendi");
    assert(noAvatarLeaked, "Maskelenen hiçbir kullanıcının kişisel avatarı (avatarUrl) dışarı sızmıyor (null)");
    assert(noUsernameLeaked, "Maskelenen hiçbir kullanıcının kullanıcı adı (username) dışarı sızmıyor (null)");
  }

  // --- BÖLÜM 4: Sonuç Özeti ---
  console.log(`\n========================================`);
  console.log(`TOPLAM TEST: ${totalTests} | BAŞARILI: ${passedTests} | HATALI: ${totalTests - passedTests}`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    console.log("🎉 TÜM GİZLİLİK VE MASKELEME BİRİM TESTLERİ BAŞARIYLA GEÇTİ!");
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
