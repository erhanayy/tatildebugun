import "dotenv/config";
import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 TatildeBugun tohumlama (seed) başlatılıyor...");

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@tatildebugun.com"))
    .limit(1);

  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("123456", 10);
    await db.insert(users).values({
      fullName: "TatildeBugün Yöneticisi",
      email: "admin@tatildebugun.com",
      phoneNumber: "05555555555",
      password: hashedPassword,
      role: "admin",
      forcePasswordChange: false,
      isActive: true,
    });
    console.log("✅ Örnek yönetici oluşturuldu: admin@tatildebugun.com / 123456 (Tel: 05555555555)");
  } else {
    console.log("ℹ️ Yönetici kullanıcısı zaten mevcut.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Tohumlama hatası:", err);
  process.exit(1);
});
