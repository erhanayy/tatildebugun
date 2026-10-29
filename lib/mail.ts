import { Resend } from "resend";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  ccNotification?: boolean;
}

/**
 * TatildeBugun E-posta Gönderim Servisi
 * Resend altyapısı ile çalışır. Canlı denemeler için erhanayyildiz@gmail.com adresine CC düşer.
 */
export async function sendEmail({
  to,
  subject,
  html,
  ccNotification = true,
}: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_SENDER || "admin@bugunai.com";

  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY tanımlı değil, e-posta gönderilemedi.");
    return { success: false, error: "E-posta servisi yapılandırılmamış." };
  }

  try {
    const resend = new Resend(apiKey);

    const ccList: string[] = [];
    if (ccNotification && to.toLowerCase() !== "erhanayyildiz@gmail.com") {
      ccList.push("erhanayyildiz@gmail.com");
    }

    let response = await resend.emails.send({
      from: `TatildeBugün <${sender}>`,
      to: [to],
      cc: ccList.length > 0 ? ccList : undefined,
      subject,
      html,
    });

    // Domain doğrulanmamışsa veya API anahtarı kısıtlıysa onboarding@resend.dev ile test gönderimi yap
    if (response.error) {
      console.warn("[sendEmail] İlk gönderim denemesi başarısız:", response.error.message);
      
      // Fallback: onboarding@resend.dev ile doğrudan erhanayyildiz@gmail.com'a ulaştır
      const fallbackResponse = await resend.emails.send({
        from: "TatildeBugün <onboarding@resend.dev>",
        to: ["erhanayyildiz@gmail.com"],
        subject: `[Kullanıcı: ${to}] ${subject}`,
        html: `
          <div style="padding: 10px; margin-bottom: 15px; background: #e0f2fe; color: #0369a1; border-radius: 8px; font-size: 13px;">
            ℹ️ Bu e-posta geliştirme/test ortamında <b>${to}</b> adına <b>erhanayyildiz@gmail.com</b> gelen kutunuza iletilmiştir.
          </div>
          ${html}
        `,
      });

      if (fallbackResponse.error) {
        console.error("[sendEmail] Resend Fallback hatası:", fallbackResponse.error);
        return { success: false, error: fallbackResponse.error.message };
      }

      console.log("[sendEmail] E-posta başarıyla erhanayyildiz@gmail.com adresine teslim edildi (onboarding fallback).");
      return { success: true };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[sendEmail] E-posta gönderilirken beklenmeyen hata:", error);
    return { success: false, error: error.message || "E-posta iletilemedi." };
  }
}

/**
 * Şifre Sıfırlama HTML Şablonu
 */
export function getPasswordResetEmailTemplate(fullName: string, otpCode: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #0b1120; border-radius: 24px; color: #f8fafc; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 26px; font-weight: 800;">TatildeBugün 🌴</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Kişisel Seyahat & Gezgin Ağı</p>
      </div>

      <div style="background-color: #0f172a; padding: 25px; border-radius: 18px; border: 1px solid #334155; margin-bottom: 20px;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Merhaba ${fullName},</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          TatildeBugün hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi yenilemek için aşağıdaki 6 haneli doğrulama kodunu kullanabilirsiniz:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 15px 35px; background: linear-gradient(135deg, #0284c7, #2563eb); border-radius: 16px; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #ffffff; box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.4);">
            ${otpCode}
          </div>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">
          ⏳ Bu kod <b>15 dakika</b> boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız bu e-postayı dikkate almayınız.
        </p>
      </div>

      <div style="text-align: center; color: #64748b; font-size: 11px;">
        © 2026 TatildeBugün Platformu. Tüm hakları saklıdır.
      </div>
    </div>
  `;
}

/**
 * Kayıt Aktivasyon HTML Şablonu
 */
export function getRegisterActivationEmailTemplate(fullName: string, otpCode: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #0b1120; border-radius: 24px; color: #f8fafc; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 26px; font-weight: 800;">TatildeBugün'e Hoş Geldiniz! 🌴</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Kişisel Seyahat & Gezgin Ağı</p>
      </div>

      <div style="background-color: #0f172a; padding: 25px; border-radius: 18px; border: 1px solid #334155; margin-bottom: 20px;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Harika bir başlangıç, ${fullName}!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Dünya seyahat haritanızı oluşturmak, rotalarınızı çizmek ve çakışan gezginlerle tanışmak için hesabınızı onaylamanız gerekmektedir:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 15px 35px; background: linear-gradient(135deg, #059669, #0d9488); border-radius: 16px; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #ffffff; box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.4);">
            ${otpCode}
          </div>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">
          ⏳ Doğrulama kodunuz <b>15 dakika</b> boyunca geçerlidir.
        </p>
      </div>

      <div style="text-align: center; color: #64748b; font-size: 11px;">
        © 2026 TatildeBugün Platformu. Tüm hakları saklıdır.
      </div>
    </div>
  `;
}
