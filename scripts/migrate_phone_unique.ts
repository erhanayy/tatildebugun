import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { normalizeToInternational } from "../lib/utils/phone";
import { sql, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function main() {
  console.log("=== TatildeBugün: Telefon Numaraları Standardizasyonu & Unique Index Migrasyonu ===");

  // 1. Mevcut tüm kullanıcıları çek
  const allUsers = await db.select({
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    phoneNumber: users.phoneNumber,
  }).from(users);

  console.log(`Toplam kullanıcı sayısı: ${allUsers.length}`);

  const phoneMap = new Map<string, string[]>();

  for (const user of allUsers) {
    if (!user.phoneNumber) continue;

    const normalized = normalizeToInternational(user.phoneNumber);
    console.log(`[Dönüşüm] ${user.fullName} (${user.email}): '${user.phoneNumber}' -> '${normalized}'`);

    const existing = phoneMap.get(normalized) || [];
    existing.push(user.email || user.id);
    phoneMap.set(normalized, existing);

    // DB'deki numarayı güncelle
    if (user.phoneNumber !== normalized) {
      await db.update(users)
        .set({ phoneNumber: normalized })
        .where(eq(users.id, user.id));
      console.log(`  -> Güncellendi: ${user.id}`);
    }
  }

  // Çakışma kontrolü
  let conflictFound = false;
  for (const [phone, emails] of phoneMap.entries()) {
    if (emails.length > 1) {
      console.error(`⚠️ ÇAKIŞMA TESPİT EDİLDİ! Numara: ${phone}, Kullanıcılar: ${emails.join(", ")}`);
      conflictFound = true;
    }
  }

  if (conflictFound) {
    console.error("Çakışmalar nedeniyle unique index oluşturulamadı! Lütfen çakışan kayıtları kontrol edin.");
    process.exit(1);
  }

  // 2. DDL SQL dosyasını çalıştır
  const sqlPath = path.join(__dirname, "create_users_phone_unique.sql");
  const ddl = fs.readFileSync(sqlPath, "utf-8");

  console.log("DDL uygulanıyor...");
  await db.execute(sql.raw(ddl));
  console.log("✅ Unique Index (users_phone_number_unique_idx) başarıyla oluşturuldu!");

  // 3. Doğrulama
  const updatedUsers = await db.select({
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    phoneNumber: users.phoneNumber,
  }).from(users);

  console.log("\n--- Güncel Kullanıcı Listesi ---");
  console.table(updatedUsers);

  console.log("Migrasyon başarıyla tamamlandı!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migrasyon hatası:", err);
  process.exit(1);
});
