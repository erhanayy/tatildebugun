import fs from "fs";
import path from "path";

export interface LogOtpOptions {
  type: "register_activation" | "password_reset";
  targetUser: string; // Ad Soyad
  identifier: string; // E-posta veya Telefon
  otpCode: string;
  expiresInMinutes?: number;
}

/**
 * Üretilen OTP kodlarını geliştirici/canlı test için sifreler.md dosyasına güvenle kaydeder.
 */
export async function logOtpToPasswordFile(options: LogOtpOptions): Promise<void> {
  try {
    const { type, targetUser, identifier, otpCode, expiresInMinutes = 15 } = options;
    const filePath = path.join(process.cwd(), "sifreler.md");

    const now = new Date();
    const formattedDate = now.toLocaleString("tr-TR", {
      dateStyle: "short",
      timeStyle: "medium",
    });

    const actionTitle =
      type === "register_activation"
        ? "Yeni Kayıt Hesap Aktivasyonu (OTP)"
        : "Şifremi Unuttum Sıfırlama Kodu (OTP)";

    const entry = `
### [${formattedDate}] ${actionTitle}
- **Kullanıcı:** ${targetUser} (${identifier})
- **Doğrulama Kodu (OTP):** \`${otpCode}\`
- **Geçerlilik Süresi:** ${expiresInMinutes} Dakika
- **İşlem Türü:** ${type}
- **Durum:** Bekliyor ⏳
---
`;

    // Dosya varsa sonuna ekle, yoksa oluştur
    fs.appendFileSync(filePath, entry, "utf-8");
  } catch (error) {
    console.error("OTP sifreler.md dosyasına yazılamadı:", error);
  }
}
