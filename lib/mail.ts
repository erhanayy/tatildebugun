import { Resend } from "resend";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  bccNotification?: boolean;
  otpCode?: string;
}

/**
 * TatildeBugun E-posta Gönderim Servisi
 * Resend altyapısı ile çalışır. Alıcıya ve her zaman erhanayyildiz@gmail.com adresine BCC gizli kopya düşer.
 */
export async function sendEmail({
  to,
  subject,
  html,
  bccNotification = true,
  otpCode,
}: SendMailOptions): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_SENDER || "bildirim@tatilde.bugunai.com";

  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY tanımlı değil, e-posta gönderilemedi.");
    return { success: false, error: "E-posta servisi yapılandırılmamış." };
  }

  try {
    const resend = new Resend(apiKey);

    const bccList: string[] = [];
    if (bccNotification && to.toLowerCase() !== "erhanayyildiz@gmail.com") {
      bccList.push("erhanayyildiz@gmail.com");
    }

    console.log(`[sendEmail] E-posta gönderimi deneniyor: From=${sender}, To=${to}, BCC=${bccList.join(", ")}`);

    const response = await resend.emails.send({
      from: `TatildeBugün <${sender}>`,
      to: [to],
      bcc: bccList.length > 0 ? bccList : undefined,
      subject,
      html,
    });

    // Domain doğrulanmamışsa (HTTP 400) veya harici alıcı kısıtlıysa (HTTP 403),
    // acil durum fallback olarak onboarding@resend.dev üzerinden doğrudan erhanayyildiz@gmail.com'a ulaştır
    if (response.error) {
      console.warn("[sendEmail] Gönderici adresi veya domain hatası:", response.error.message);

      const emergencySubject = otpCode
        ? `[TatildeBugün Canlı - OTP: ${otpCode}] Kullanıcı: ${to}`
        : `[TatildeBugün Canlı E-posta Bildirimi] ${subject} (Alıcı: ${to})`;

      const fallbackResponse = await resend.emails.send({
        from: "TatildeBugün <onboarding@resend.dev>",
        to: ["erhanayyildiz@gmail.com"],
        subject: emergencySubject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 18px; margin-bottom: 20px; background: #fef2f2; border: 1px solid #f87171; border-radius: 12px; color: #991b1b;">
            <h3 style="margin-top: 0; font-size: 16px; color: #b91c1c;">⚠️ Canlı Sistem E-posta Uyarısı (Resend Domain Doğrulama Bekliyor)</h3>
            <p style="font-size: 13px; line-height: 1.5; margin-bottom: 10px; color: #374151;">
              <b>Gönderici:</b> <code>${sender}</code> alan adı henüz Resend DNS panelinde tam doğrulanmadığı için e-posta alıcıya (<b>${to}</b>) doğrudan iletilememiştir.
            </p>
            ${
              otpCode
                ? `
            <div style="background: #ffffff; padding: 12px; border-radius: 8px; border: 2px dashed #ef4444; text-align: center; margin: 12px 0;">
              <span style="font-size: 12px; color: #64748b; font-weight: 600; display: block;">KULLANICI AKTİVASYON (OTP) KODU:</span>
              <span style="font-size: 28px; font-weight: 900; color: #0284c7; letter-spacing: 5px;">${otpCode}</span>
              <p style="font-size: 12px; color: #475569; margin: 5px 0 0 0;">Kullanıcının sisteme girebilmesi için bu kodu kullanıcıya doğrudan iletebilirsiniz.</p>
            </div>
            `
                : ""
            }
            <small style="font-size: 11px; color: #6b7280;">Hata Detayı: ${response.error.message}</small>
          </div>
          ${html}
        `,
      });

      if (fallbackResponse.error) {
        console.error("[sendEmail] Resend Fallback hatası:", fallbackResponse.error);
        return { success: false, error: response.error.message };
      }

      console.log(`[sendEmail] E-posta kopyası ve OTP başarıyla erhanayyildiz@gmail.com adresine teslim edildi (ID: ${fallbackResponse.data?.id}).`);
      return { success: true, messageId: fallbackResponse.data?.id };
    }

    console.log(`[sendEmail] E-posta başarıyla gönderildi (ID: ${response.data?.id}).`);
    return { success: true, messageId: response.data?.id };
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
