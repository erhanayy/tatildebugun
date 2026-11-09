import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import { contracts } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Applying contracts migration to database...");

  // 1. DDL: Tablolar ve İndeksler
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "contracts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "type" text NOT NULL,
      "version" varchar(50) NOT NULL,
      "title" text NOT NULL,
      "content" text NOT NULL,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "contracts_type_idx" ON "contracts" ("type");
    CREATE INDEX IF NOT EXISTS "contracts_active_idx" ON "contracts" ("is_active");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_contracts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "contract_id" uuid NOT NULL REFERENCES "contracts"("id") ON DELETE CASCADE,
      "accepted_at" timestamp NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "user_contracts_user_idx" ON "user_contracts" ("user_id");
    CREATE INDEX IF NOT EXISTS "user_contracts_contract_idx" ON "user_contracts" ("contract_id");
  `);

  console.log("Tables created successfully. Checking seed contracts...");

  // 2. Seed Data: KVKK v1.0.0
  const existingKvkk = await db
    .select()
    .from(contracts)
    .where(eq(contracts.type, "KVKK"))
    .limit(1);

  if (existingKvkk.length === 0) {
    await db.insert(contracts).values({
      type: "KVKK",
      version: "1.0.0",
      title: "Kişisel Verilerin Korunması ve İşlenmesi Aydınlatma Metni (KVKK)",
      content: `TATİLDEBUGÜN KİŞİSEL VERİLERİN KORUNMASI VE İŞLENMESİ AYDINLATMA METNİ

1. Veri Sorumlusu
6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, TatildeBugün ("Platform") olarak; kişisel verilerinizin güvenliğine, gizliliğine ve hukuka uygun işlenmesine azami hassasiyet göstermekteyiz.

2. İşlenen Kişisel Verileriniz
Platformumuzu kullandığınızda aşağıdaki verileriniz işlenmektedir:
- Kimlik ve İletişim Bilgileri: Adınız, soyadınız, e-posta adresiniz, telefon numaranız.
- Kullanım ve Seyahat Verileri: Gezdiğiniz/işaretlediğiniz şehirler, ülkeler, seyahat tarihleri, gezi amaçları.
- Konum ve Fotoğraf Verileri: Ziyaret kayıtları oluştururken yüklediğiniz fotoğraflardaki EXIF GPS koordinatları (yalnızca mekan eşleme amacıyla işlenir, kesin kişisel konumunuz üçüncü şahıslara ham veri olarak satılmaz).
- Sosyal ve İletişim Verileri: Gezgin arkadaşlıkları, profil biyografiniz ve platform içi mesajlaşmalarınız.

3. Kişisel Verilerin İşlenme Amaçları
Kişisel verileriniz;
- TatildeBugün platformu üyelik işlemlerinizin yürütülmesi,
- Kişisel seyahat haritanızın ve ziyaret geçmişinizin oluşturulması,
- Fotoğraflarınızdan gezdiğiniz turistik mekanların tespit edilmesi,
- Aynı şehir/tarihte tatil yapan gezginlerle güvenli eşleşme (Radar) sağlanması,
- Sistem güvenliğinin, hesap doğrulamasının (OTP) ve yasal yükümlülüklerin yerine getirilmesi
amaçlarıyla sınırlı olarak işlenmektedir.

4. Kişisel Verilerin Aktarılması
Kişisel verileriniz hiçbir şekilde ticari amaçla üçüncü taraf reklam şirketlerine satılmaz. Yalnızca platform altyapısını sağlayan güvenli bulut sunucuları (Google Cloud Platform - Frankfurt/Avrupa bölgesi) ve SMS/E-posta doğrulama sağlayıcıları ile sınırlı olarak paylaşılmaktadır.

5. Haklarınız (KVKK Madde 11)
KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, verilerinizin silinmesini veya düzeltilmesini talep etme haklarına sahipsiniz. Taleplerinizi profil ayarlarınızdan veya destek@tatildebugun.com adresi üzerinden iletebilirsiniz.`,
      isActive: true,
    });
    console.log("Seeded KVKK v1.0.0 contract.");
  }

  // 3. Seed Data: USER_AGREEMENT v1.0.0
  const existingAgreement = await db
    .select()
    .from(contracts)
    .where(eq(contracts.type, "USER_AGREEMENT"))
    .limit(1);

  if (existingAgreement.length === 0) {
    await db.insert(contracts).values({
      type: "USER_AGREEMENT",
      version: "1.0.0",
      title: "TatildeBugün Gezgin & Kullanıcı Üyelik Sözleşmesi",
      content: `TATİLDEBUGÜN KULLANICI VE GEZGİN ÜYELİK SÖZLEŞMESİ

1. Taraflar ve Amaç
Bu sözleşme; TatildeBugün ("Platform") ile platforma üye olan kullanıcı ("Gezgin/Kullanıcı") arasında, seyahat planlama, rota keşfi ve sosyal gezgin ağından faydalanma koşullarını belirlemek amacıyla akdedilmiştir.

2. Üyelik ve Hesap Güvenliği
- Kullanıcı, üyelik formunda verdiği bilgilerin doğru ve kendisine ait olduğunu beyan eder.
- Şifre ve hesap güvenliğinden Kullanıcı bizzat sorumludur. Hesabınız üzerinden yapılan tüm işlemler sizin adınıza yapılmış sayılır.

3. Kullanım Koşulları ve Gezgin Etik Kuralları
- TatildeBugün; seyahat severlerin dünya haritalarını oluşturduğu, tecrübelerini paylaştığı ve seyahat rotalarını eşleştirdiği saygılı bir topluluktur.
- Kullanıcı; platform üzerinde nefret söylemi, taciz edici içerik, genel ahlaka ve kanunlara aykırı fotoğraf, konum veya yorum paylaşamaz.
- Başkalarının fotoğraflarını izinsiz olarak yüklemek ve sahte konum beyanında bulunmak yasaktır.

4. Fikri Mülkiyet ve İçerik Hakları
Platforma yüklediğiniz fotoğraflar ve seyahat anıları sizin mülkiyetinizde kalır. TatildeBugün'e, bu içerikleri size hizmet sunmak (haritanızda göstermek, gezi rotanızla eşleştirmek) amacıyla işleme ve platform içi görüntüleme lisansı vermiş olursunuz.

5. Hizmet Sürekliliği ve Değişiklikler
TatildeBugün, platform özelliklerini güncelleme, geliştirme veya askıya alma hakkını saklı tutar. Sözleşmede yapılan önemli değişiklikler sistem üzerinden bildirilerek yeniden onayınıza sunulacaktır.`,
      isActive: true,
    });
    console.log("Seeded USER_AGREEMENT v1.0.0 contract.");
  }

  console.log("Contracts migration completed successfully! 🎉");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
