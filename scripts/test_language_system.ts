/**
 * TatildeBugün / AllTripX - Çoklu Dil (i18n) Otomatik Doğrulama Testi
 */

import { tr } from "../lib/i18n/dictionaries/tr";
import { en } from "../lib/i18n/dictionaries/en";
import { getPasswordResetEmailTemplate, getRegisterActivationEmailTemplate } from "../lib/mail";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("=== 🌍 ALLTRIPX / TATİLDEBUGÜN ÇOKLU DİL (i18n) DOĞRULAMA TESTİ ===\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? "- " + detail : ""}`);
    }
  }

  // TEST 1: TR ve EN Sözlük Anahtar Paritesi
  console.log("--- 1. Sözlük Anahtar ve Derinlik Paritesi Testi ---");
  function checkParity(trObj: any, enObj: any, path = ""): boolean {
    let allValid = true;
    for (const key of Object.keys(trObj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (!(key in enObj)) {
        assert(false, `Anahtar Paritesi (${fullPath})`, "İngilizce sözlükte eksik anahtar!");
        allValid = false;
      } else if (typeof trObj[key] === "object" && trObj[key] !== null) {
        const subValid = checkParity(trObj[key], enObj[key], fullPath);
        if (!subValid) allValid = false;
      } else {
        const trVal = String(trObj[key]);
        const enVal = String(enObj[key]);
        if (!enVal || enVal.trim() === "") {
          assert(false, `Boş Çeviri Kontrolü (${fullPath})`, "İngilizce çeviri boş bırakılamaz!");
          allValid = false;
        }
      }
    }
    return allValid;
  }

  const parityResult = checkParity(tr, en);
  assert(parityResult, "Türkçe ve İngilizce Sözlük Tüm Anahtarları Birebir Eşleşiyor");

  // TEST 2: E-posta Şablonları Çoklu Dil ve Marka Kontrolü
  console.log("\n--- 2. E-posta Şablonları Çoklu Dil ve Marka Kontrolü ---");
  const trResetHtml = getPasswordResetEmailTemplate("Erhan Ayyıldız", "123456", "tr");
  assert(trResetHtml.includes("AllTripX"), "Türkçe Şifre Sıfırlama E-postası AllTripX Markasını İçeriyor");
  assert(trResetHtml.includes("Merhaba Erhan Ayyıldız"), "Türkçe Şifre Sıfırlama E-postası Türkçe Selamlamayı İçeriyor");
  assert(trResetHtml.includes("123456"), "Türkçe Şifre Sıfırlama E-postası OTP Kodunu İçeriyor");

  const enResetHtml = getPasswordResetEmailTemplate("Erhan Ayyıldız", "654321", "en");
  assert(enResetHtml.includes("AllTripX"), "İngilizce Şifre Sıfırlama E-postası AllTripX Markasını İçeriyor");
  assert(enResetHtml.includes("Hello Erhan Ayyıldız"), "İngilizce Şifre Sıfırlama E-postası İngilizce Selamlamayı İçeriyor");
  assert(enResetHtml.includes("654321"), "İngilizce Şifre Sıfırlama E-postası OTP Kodunu İçeriyor");

  const trRegHtml = getRegisterActivationEmailTemplate("Erhan Ayyıldız", "789012", "tr");
  assert(trRegHtml.includes("AllTripX'e Hoş Geldiniz!"), "Türkçe Kayıt E-postası Türkçe Hoş Geldin Başlığı İçeriyor");
  assert(trRegHtml.includes("789012"), "Türkçe Kayıt E-postası Aktivasyon Kodunu İçeriyor");

  const enRegHtml = getRegisterActivationEmailTemplate("Erhan Ayyıldız", "210987", "en");
  assert(enRegHtml.includes("Welcome to AllTripX!"), "İngilizce Kayıt E-postası Welcome to AllTripX Başlığı İçeriyor");
  assert(enRegHtml.includes("210987"), "İngilizce Kayıt E-postası Aktivasyon Kodunu İçeriyor");

  // TEST 3: Veritabanı preferredLanguage Sütunu ve Güncelleme Testi
  console.log("\n--- 3. Veritabanı preferred_language Sütunu ve Kalıcılık Testi ---");
  const testUser = await db.select().from(users).limit(1);
  if (testUser.length > 0) {
    const u = testUser[0];
    const initialLang = u.preferredLanguage || "tr";

    // EN'ye çevir
    await db.update(users).set({ preferredLanguage: "en" }).where(eq(users.id, u.id));
    const updatedU1 = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    assert(updatedU1[0]?.preferredLanguage === "en", "Kullanıcı dil tercihi veritabanında 'en' olarak güncellendi");

    // Orijinal diline geri döndür
    await db.update(users).set({ preferredLanguage: initialLang }).where(eq(users.id, u.id));
    const updatedU2 = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    assert(updatedU2[0]?.preferredLanguage === initialLang, `Kullanıcı dil tercihi güvenle '${initialLang}' durumuna geri döndürüldü`);
  } else {
    console.log("ℹ️ Veritabanında test edilecek kullanıcı bulunamadı (atlandı).");
  }

  console.log(`\n======================================================`);
  console.log(`🎯 TEST SONUCU: ${passedTests} / ${totalTests} TEST BAŞARIYLA TAMAMLANDI!`);
  console.log(`======================================================\n`);

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test işletilirken hata:", err);
  process.exit(1);
});
