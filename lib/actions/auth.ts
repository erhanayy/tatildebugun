"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logOtpToPasswordFile } from "@/lib/otp-logger";
import { sendEmail, getPasswordResetEmailTemplate, getRegisterActivationEmailTemplate } from "@/lib/mail";

// Telefon Numarası Normalizasyonu (Son 10 Hane - BurstaBugun Uyumu)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

// 6 Haneli Rastgele Sayısal OTP Kodu Üretir
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Zod Doğrulama Şemaları (Kural 10 - Katı Tip & Runtime Kontrolü)
const registerSchema = z
  .object({
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
    email: z.string().email("Geçerli bir e-posta adresi giriniz"),
    phoneNumber: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
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
  try {
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
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
 * Şifreyi hashler, kullanıcıyı oluşturur, 6 haneli OTP üretip sifreler.md kütüğüne yazar.
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
    const cleanPhone = normalizePhone(phoneNumber);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Mevcut e-posta veya telefon kontrolü
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.email, cleanEmail), eq(users.phoneNumber, cleanPhone)));

    if (existing.length > 0) {
      const match = existing[0];
      if (match.email === cleanEmail) {
        return { success: false, message: "Bu e-posta adresi ile zaten kayıtlı bir hesap var." };
      }
      return { success: false, message: "Bu telefon numarası ile zaten kayıtlı bir hesap var." };
    }

    // 2. Parolayı Hashle & OTP Üret
    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    // 3. Kullanıcıyı Veritabanına Ekle (İlk başta isActive: false)
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

    const newUser = inserted[0];

    // 4. sifreler.md Kütüğüne Yaz (Test & İzleme İçin)
    await logOtpToPasswordFile({
      type: "register_activation",
      targetUser: newUser.fullName,
      identifier: `${newUser.email} / ${newUser.phoneNumber}`,
      otpCode,
      expiresInMinutes: 15,
    });

    // 5. Opsiyonel: Hoş geldin e-postası (Arka planda gönder, hata olursa akışı bozma)
    sendEmail({
      to: cleanEmail,
      subject: "TatildeBugün Hesabınızı Doğrulayın 🌴",
      html: getRegisterActivationEmailTemplate(newUser.fullName, otpCode),
      ccNotification: true, // erhanayyildiz@gmail.com CC
    }).catch((e) => console.error("Kayıt maili gönderim hatası:", e));

    return {
      success: true,
      message: "Kaydınız başarıyla oluşturuldu! Doğrulama kodunuz oluşturuldu.",
      userId: newUser.id,
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

    // sifreler.md kütüğüne yaz
    await logOtpToPasswordFile({
      type: "register_activation",
      targetUser: user.fullName,
      identifier: `${user.email || ""} / ${user.phoneNumber || ""}`,
      otpCode,
      expiresInMinutes: 15,
    });

    if (user.email) {
      sendEmail({
        to: user.email,
        subject: "Yeni Doğrulama Kodunuz 🌴",
        html: getRegisterActivationEmailTemplate(user.fullName, otpCode),
        ccNotification: true,
      }).catch((e) => console.error("Resend mail hatası:", e));
    }

    return {
      success: true,
      message: "Yeni doğrulama kodunuz üretildi ve sifreler.md dosyasına işlendi.",
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
    const cleanPhone = normalizePhone(raw);
    const cleanEmail = raw.toLowerCase();

    // Kullanıcıyı ara
    const userList = await db
      .select()
      .from(users)
      .where(or(eq(users.email, cleanEmail), eq(users.phoneNumber, cleanPhone)));

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

    // sifreler.md kütüğüne yaz
    await logOtpToPasswordFile({
      type: "password_reset",
      targetUser: user.fullName,
      identifier: `${user.email || ""} / ${user.phoneNumber || ""}`,
      otpCode,
      expiresInMinutes: 15,
    });

    // E-posta gönder (erhanayyildiz@gmail.com CC ile)
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "TatildeBugün Şifre Sıfırlama Kodu 🔐",
        html: getPasswordResetEmailTemplate(user.fullName, otpCode),
        ccNotification: true, // erhanayyildiz@gmail.com CC
      });
    }

    return {
      success: true,
      message: "Şifre sıfırlama kodunuz üretildi! sifreler.md dosyasından inceleyebilirsiniz.",
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
