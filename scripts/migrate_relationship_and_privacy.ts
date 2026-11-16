import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { sql, eq } from "drizzle-orm";
import fs from "fs";
import { generateUniqueUsername } from "../lib/utils/username";

async function main() {
  console.log("1. DDL Scripti uygulanıyor...");
  const sqlContent = fs.readFileSync("./scripts/create_relationship_and_privacy_system.sql", "utf-8");
  await db.execute(sql.raw(sqlContent));
  console.log("DDL Scripti başarıyla uygulandı.");

  console.log("2. Mevcut kullanıcılar taranıyor ve unique username atanıyor...");
  const allUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      username: users.username,
      baseCity: users.baseCity,
    })
    .from(users);

  for (const u of allUsers) {
    if (!u.username) {
      const generated = await generateUniqueUsername(u.fullName, u.email);
      console.log(`Kullanıcı ${u.fullName} (${u.email}) -> @${generated}`);
      await db
        .update(users)
        .set({
          username: generated,
          showFullName: true,
          showEmail: true,
          showPhone: false,
          searchPrivacy: "public",
          radarPrivacy: "public",
          mapPrivacy: "public",
          onboardingCompleted: true, // Mevcut kullanıcılar için açık
        })
        .where(eq(users.id, u.id));
    }
  }

  console.log("Tüm kullanıcılar başarıyla güncellendi!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migrasyon hatası:", err);
  process.exit(1);
});
