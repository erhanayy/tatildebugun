"use server";

import { signIn, signOut, getUserByIdentifier } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logOtpToPasswordFile } from "@/lib/otp-logger";
import { sendEmail, getPasswordResetEmailTemplate, getRegisterActivationEmailTemplate } from "@/lib/mail";
import { normalizeToInternational } from "@/lib/utils/phone";

// 6 Haneli Rastgele Sayısal OTP Kodu Üretir
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Zod Doğrulama Şemaları (Kural 10 - Katı Tip & Runtime Kontrolü)
const registerSchema = z
  .object({
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
    email: z.string().email("Geçerli bir e-posta adresi giriniz"),
    phoneNumber: z.string().min(8, "Geçerli bir telefon numarası giriniz").max(25, "Telefon numarası çok uzun"),
    password: z.string().min(6, "Parola en az 6 karakter olmalıdır"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Girdiğiniz parolalar birbiriyle eşleşmiyor",
    path: ["confirmPassword"],
  });

const verifyOtpSchema = z.object({
  userId: z.string().uuid("Geçerli bir kullanıcı kimliği gereklidir"),
  code: z.string().length(6, "Doğrulama kodu 6 haneli olmalıdır"),
});

const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, "E-posta veya telefon numarası giriniz"),
});

const resetPasswordSchema = z
  .object({
    userId: z.string().uuid(),
    code: z.string().length(6, "Doğrulama kodu 6 haneli olmalıdır"),
    newPassword: z.string().min(6, "Yeni parola en az 6 karakter olmalıdır"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Girdiğiniz yeni parolalar birbiriyle eşleşmiyor",
    path: ["confirmPassword"],
  });

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const rawData = Object.fromEntries(formData);
  const identifier = ((rawData.identifier as string) || "").trim();
  const password = ((rawData.password as string) || "").trim();

  try {
    await signIn("credentials", {
      ...rawData,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Giriş başarısız oldu: Kullanıcı kayıt olmuş ama henüz onaylamamış olabilir mi?
      if (identifier && password) {
        try {
          const user = await getUserByIdentifier(identifier);
          if (user && !user.isActive && user.password) {
            const passwordsMatch = await bcrypt.compare(password, user.password);
            if (passwordsMatch) {
              // Parola doğru ama hesap henüz inaktif! Yeni OTP üret ve doğrudan onay ekranına aktar
              const otpCode = generateOtpCode();
              const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

              await db
                .update(users)
                .set({
                  verificationCode: otpCode,
                  verificationCodeExpiresAt: expiresAt,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));

              await logOtpToPasswordFile({
                type: "register_activation",
                targetUser: user.fullName,
                identifier: `${user.email || ""} / ${user.phoneNumber || ""}`,
                otpCode,
                expiresInMinutes: 15,
              });

              if (user.email) {
                await sendEmail({
                  to: user.email,
                  subject: `TatildeBugün Hesap Aktivasyon Kodunuz [${otpCode}] 🌴`,
                  html: getRegisterActivationEmailTemplate(user.fullName, otpCode),
                  bccNotification: true,
                  otpCode,
                }).catch(() => {});
              }

              redirect(`/verify-otp?userId=${user.id}&email=${encodeURIComponent(user.email || "")}&relogin=true`);
            }
          }
        } catch (innerError) {
          if ((innerError as any)?.digest?.startsWith("NEXT_REDIRECT")) {
            throw innerError;
          }
          console.error("Giriş inaktif kurtarma hatası:", innerError);
        }
      }

      switch (error.type) {
        case "CredentialsSignin":
          return "Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.";
        default:
          return "Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyiniz.";
      }
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

/**
 * 1. Yeni Kullanıcı Kaydı (Register)
 * Şifreyi hashler, kullanıcıyı oluşturur veya inaktif ise devralıp günceller, OTP üretip e-postayla gönderir.
 */
export async function registerUser(input: z.infer<typeof registerSchema>): Promise<{
  success: boolean;
  message?: string;
  userId?: string;
}> {
  try {
    const validated = registerSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message || "Geçersiz form verisi",
      };
    }

    const { fullName, email, phoneNumber, password } = validated.data;
    const cleanPhone = normalizeToInternational(phoneNumber);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Aktif hesap kontrolü: E-posta
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existingByEmail.length > 0 && existingByEmail[0].isActive) {
      return {
        success: false,
        message: "Bu e-posta adresi ile zaten kayıtlı ve aktif bir hesap bulunmaktadır. Lütfen giriş yapınız.",
      };
    }

    // 2. Aktif hesap kontrolü: Telefon
    let existingByPhone: typeof existingByEmail = [];
    if (cleanPhone) {
      existingByPhone = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, cleanPhone));

      if (existingByPhone.length > 0 && existingByPhone[0].isActive) {
        return {
          success: false,
          message: "Bu telefon numarası ile zaten kayıtlı ve aktif bir hesap bulunmaktadır. Lütfen giriş yapınız veya farklı bir numara giriniz.",
        };
      }
    }

    // 3. İnaktif (Aktivasyon Bekleyen) Hesap Tespiti & Auto Re-hydration
    // Eğer aynı e-posta veya telefon ile daha önce kayıt denenmiş ama henüz aktive edilmemişse,
    // o kaydı devralıp (re-hydrate) yeni şifre ve taze OTP ile güncelliyoruz.
    const inactiveUser = existingByEmail.find((u) => !u.isActive) || existingByPhone.find((u) => !u.isActive);

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    let targetUserId: string;
    let targetUserName: string = fullName.trim();
    let isRehydrated = false;

    if (inactiveUser) {
      // Eğer e-posta ile telefon farklı inaktif kayıtlara denk geldiyse diğerini temizle
      if (existingByEmail[0] && existingByPhone[0] && existingByEmail[0].id !== existingByPhone[0].id) {
        await db.delete(users).where(eq(users.id, existingByPhone[0].id));
      }

      await db
        .update(users)
        .set({
          fullName: fullName.trim(),
          email: cleanEmail,
          phoneNumber: cleanPhone,
          password: hashedPassword,
          verificationCode: otpCode,
          verificationCodeExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, inactiveUser.id));

      targetUserId = inactiveUser.id;
      isRehydrated = true;
    } else {
      const inserted = await db
        .insert(users)
        .values({
          fullName: fullName.trim(),
          email: cleanEmail,
          phoneNumber: cleanPhone,
          password: hashedPassword,
          isActive: false, // OTP aktivasyonu bekliyor
          verificationCode: otpCode,
          verificationCodeExpiresAt: expiresAt,
        })
        .returning();

      targetUserId = inserted[0].id;
    }

    // 4. Yerelde sifreler.md kütüğüne yaz (Canlıda konsola yapısal log düşer)
    await logOtpToPasswordFile({
      type: "register_activation",
      targetUser: targetUserName,
      identifier: `${cleanEmail} / ${cleanPhone}`,
      otpCode,
      expiresInMinutes: 15,
    });

    // 5. Aktivasyon e-postası (to: cleanEmail, bcc: erhanayyildiz@gmail.com)
    await sendEmail({
      to: cleanEmail,
      subject: isRehydrated
        ? `TatildeBugün Yeni Aktivasyon Kodunuz [${otpCode}] 🌴`
        : `TatildeBugün Hesabınızı Doğrulayın [Kod: ${otpCode}] 🌴`,
      html: getRegisterActivationEmailTemplate(targetUserName, otpCode),
      bccNotification: true,
      otpCode,
    }).catch((e) => console.error("Kayıt maili gönderim hatası:", e));

    return {
      success: true,
      message: isRehydrated
        ? "Hesabınızın aktivasyonu henüz tamamlanmamıştı. Bilgileriniz güncellendi ve yeni doğrulama kodunuz e-posta adresinize gönderildi! 🎉"
        : process.env.LIVE_ENV === "true"
          ? "Kaydınız başarıyla oluşturuldu! Doğrulama kodunuz e-posta adresinize gönderildi."
          : "Kaydınız başarıyla oluşturuldu! Doğrulama kodunuz oluşturuldu.",
      userId: targetUserId,
    };
  } catch (error) {
    console.error("Kayıt oluşturma hatası:", error);
    return { success: false, message: "Kayıt sırasında beklenmeyen bir hata oluştu." };
  }
}

/**
 * 2. OTP Kodu Doğrulama ve Hesap Aktivasyonu
 */
export async function verifyOtp(input: z.infer<typeof verifyOtpSchema>): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const validated = verifyOtpSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, message: "Geçersiz doğrulama kodu formatı." };
    }

    const { userId, code } = validated.data;

    // Kullanıcıyı ve kodunu sorgula
    const userList = await db.select().from(users).where(eq(users.id, userId));
    if (userList.length === 0) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    const user = userList[0];

    // Kod eşleşiyor mu?
    if (user.verificationCode !== code) {
      return { success: false, message: "Girdiğiniz doğrulama kodu hatalı." };
    }

    // Süre kontrolü
    if (user.verificationCodeExpiresAt && new Date() > new Date(user.verificationCodeExpiresAt)) {
      return { success: false, message: "Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyiniz." };
    }

    // Hesabı Aktifleştir ve kodu sıfırla
    await db
      .update(users)
      .set({
        isActive: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: "Hesabınız başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.",
    };
  } catch (error) {
    console.error("OTP doğrulama hatası:", error);
    return { success: false, message: "Doğrulama işlemi sırasında hata oluştu." };
  }
}

/**
 * 3. Yeniden OTP Kodu Gönder
 */
export async function resendOtp(userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const userList = await db.select().from(users).where(eq(users.id, userId));
    if (userList.length === 0) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    const user = userList[0];
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db
      .update(users)
      .set({
        verificationCode: otpCode,
        verificationCodeExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // sifreler.md kütüğüne yaz (yerel ortamda)
    await logOtpToPasswordFile({
      type: "register_activation",
      targetUser: user.fullName,
      identifier: `${user.email || ""} / ${user.phoneNumber || ""}`,
      otpCode,
      expiresInMinutes: 15,
    });

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `Yeni Doğrulama Kodunuz [${otpCode}] 🌴`,
        html: getRegisterActivationEmailTemplate(user.fullName, otpCode),
        bccNotification: true,
        otpCode,
      }).catch((e) => console.error("Resend mail hatası:", e));
    }

    return {
      success: true,
      message: "Yeni doğrulama kodunuz e-posta adresinize gönderildi.",
    };
  } catch (error) {
    console.error("Yeniden OTP hatası:", error);
    return { success: false, message: "Yeni kod gönderilemedi." };
  }
}

/**
 * 4. Şifremi Unuttum İsteği (Forgot Password)
 * Kullanıcıyı e-posta veya telefon ile bulur, OTP üretir, sifreler.md'ye yazar ve erhanayyildiz@gmail.com CC'li mail atar.
 */
export async function requestPasswordReset(input: z.infer<typeof forgotPasswordSchema>): Promise<{
  success: boolean;
  message?: string;
  userId?: string;
}> {
  try {
    const validated = forgotPasswordSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, message: "Lütfen e-posta veya telefon numaranızı giriniz." };
    }

    const raw = validated.data.identifier.trim();
    const cleanPhone = normalizeToInternational(raw);
    const cleanEmail = raw.toLowerCase();

    // Kullanıcıyı ara (E-posta, Tam Uluslararası Telefon veya Ham Giriş)
    const userList = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, cleanEmail),
          eq(users.phoneNumber, raw),
          eq(users.phoneNumber, cleanPhone)
        )
      );

    if (userList.length === 0) {
      // Güvenlik gerekçesiyle bulunamadı dememek de tercih edilebilir ama geliştirme/deneme için açık mesaj faydalıdır
      return { success: false, message: "Bu bilgiye ait bir kullanıcı hesabı bulunamadı." };
    }

    const user = userList[0];
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    await db
      .update(users)
      .set({
        verificationCode: otpCode,
        verificationCodeExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // sifreler.md kütüğüne yaz (yerel ortamda)
    await logOtpToPasswordFile({
      type: "password_reset",
      targetUser: user.fullName,
      identifier: `${user.email || ""} / ${user.phoneNumber || ""}`,
      otpCode,
      expiresInMinutes: 15,
    });

    // E-posta gönder (erhanayyildiz@gmail.com BCC ile)
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `TatildeBugün Şifre Sıfırlama Kodu [${otpCode}] 🔐`,
        html: getPasswordResetEmailTemplate(user.fullName, otpCode),
        bccNotification: true,
        otpCode,
      }).catch((e) => console.error("Şifre sıfırlama mail hatası:", e));
    }

    return {
      success: true,
      message: "Şifre sıfırlama kodunuz e-posta adresinize gönderildi.",
      userId: user.id,
    };
  } catch (error) {
    console.error("Şifre sıfırlama talebi hatası:", error);
    return { success: false, message: "İşlem sırasında bir hata oluştu." };
  }
}

/**
 * 5. Yeni Şifre Belirleme (Reset Password)
 */
export async function resetPassword(input: z.infer<typeof resetPasswordSchema>): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const validated = resetPasswordSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message || "Geçersiz şifre sıfırlama verisi.",
      };
    }

    const { userId, code, newPassword } = validated.data;

    const userList = await db.select().from(users).where(eq(users.id, userId));
    if (userList.length === 0) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    const user = userList[0];

    if (user.verificationCode !== code) {
      return { success: false, message: "Girdiğiniz doğrulama kodu geçersiz." };
    }

    if (user.verificationCodeExpiresAt && new Date() > new Date(user.verificationCodeExpiresAt)) {
      return { success: false, message: "Doğrulama kodunun süresi dolmuş." };
    }

    // Yeni şifreyi hashle ve kaydet
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: "Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz.",
    };
  } catch (error) {
    console.error("Şifre güncelleme hatası:", error);
    return { success: false, message: "Şifre güncellenirken hata oluştu." };
  }
}
