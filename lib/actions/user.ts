"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, visits, trips } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { normalizeToInternational } from "@/lib/utils/phone";

import { isUsernameAvailable } from "@/lib/utils/username";

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır").max(30, "Kullanıcı adı en fazla 30 karakter olabilir").optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  bio: z.string().max(500, "Biyografi en fazla 500 karakter olabilir").optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  baseCountry: z.string().length(2).optional().nullable(),
  baseCity: z.string().min(1, "Ana şehir boş bırakılamaz").max(100).optional().nullable(),
  preferredLanguage: z.enum(["tr", "en"]).optional(),
  showFullName: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  searchPrivacy: z.enum(["public", "friend", "relative", "family", "private"]).optional(),
  radarPrivacy: z.enum(["public", "friend", "relative", "family", "private"]).optional(),
  mapPrivacy: z.enum(["public", "friend", "relative", "family", "private"]).optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifrenizi giriniz"),
    newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Yeni şifreler birbiriyle eşleşmiyor",
    path: ["confirmNewPassword"],
  });

export interface UserProfileData {
  user: {
    id: string;
    fullName: string;
    username: string | null;
    email: string | null;
    phoneNumber: string | null;
    bio: string | null;
    avatarUrl: string | null;
    role: string;
    baseCountry: string | null;
    baseCity: string | null;
    preferredLanguage: "tr" | "en";
    showFullName: boolean;
    showEmail: boolean;
    showPhone: boolean;
    searchPrivacy: string;
    radarPrivacy: string;
    mapPrivacy: string;
    onboardingCompleted: boolean;
    createdAt: Date;
  };
  stats: {
    countryCount: number;
    cityCount: number;
    visitCount: number;
    tripCount: number;
    totalDays: number;
  };
}

/**
 * Giriş yapmış kullanıcının ana ikametgah şehir ve ülkesini getirir.
 */
export async function getUserBaseLocation(): Promise<{ baseCountry: string; baseCity: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { baseCountry: "TR", baseCity: "İstanbul" };

    const u = await db
      .select({ baseCountry: users.baseCountry, baseCity: users.baseCity })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return {
      baseCountry: u[0]?.baseCountry || "TR",
      baseCity: u[0]?.baseCity || "İstanbul",
    };
  } catch {
    return { baseCountry: "TR", baseCity: "İstanbul" };
  }
}

/**
 * Giriş yapmış kullanıcının profil ve seyahat istatistiklerini getirir.
 */
export async function getUserProfile(): Promise<UserProfileData | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userList = await db.select().from(users).where(eq(users.id, session.user.id));
    if (userList.length === 0) return null;

    const user = userList[0];

    // Seyahat istatistikleri
    const userVisits = await db.select().from(visits).where(eq(visits.userId, user.id));
    const userTrips = await db.select().from(trips).where(eq(trips.userId, user.id));

    const uniqueCountries = new Set(userVisits.map((v) => v.countryCode.toUpperCase()));
    const uniqueCities = new Set(userVisits.map((v) => `${v.countryCode}_${v.cityName.toLowerCase().trim()}`));
    const totalDays = userVisits.reduce((acc, v) => acc + (v.stayDurationDays || 1), 0);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        baseCountry: user.baseCountry || "TR",
        baseCity: user.baseCity || "İstanbul",
        preferredLanguage: (user.preferredLanguage as "tr" | "en") || "tr",
        showFullName: user.showFullName ?? true,
        showEmail: user.showEmail ?? true,
        showPhone: user.showPhone ?? false,
        searchPrivacy: user.searchPrivacy || "public",
        radarPrivacy: user.radarPrivacy || "public",
        mapPrivacy: user.mapPrivacy || "public",
        onboardingCompleted: user.onboardingCompleted ?? false,
        createdAt: user.createdAt,
      },
      stats: {
        countryCount: uniqueCountries.size,
        cityCount: uniqueCities.size,
        visitCount: userVisits.length,
        tripCount: userTrips.length,
        totalDays,
      },
    };
  } catch (error) {
    console.error("Profil getirilirken hata:", error);
    return null;
  }
}

/**
 * Kullanıcı adının müsaitliğini istemciye bildiren server action.
 */
export async function checkUsernameAction(username: string): Promise<{ available: boolean; error?: string }> {
  const session = await auth();
  return await isUsernameAvailable(username, session?.user?.id);
}

/**
 * Kullanıcının ilk kurulum sihirbazını (Onboarding Wizard) tamamlayıp tamamlamadığını sorgular.
 */
export async function getOnboardingStatus(): Promise<{
  needsOnboarding: boolean;
  user?: {
    id: string;
    fullName: string;
    username: string | null;
    baseCountry: string | null;
    baseCity: string | null;
    showFullName: boolean;
    showEmail: boolean;
    showPhone: boolean;
    radarPrivacy: string;
  };
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { needsOnboarding: false };

    const u = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        baseCountry: users.baseCountry,
        baseCity: users.baseCity,
        onboardingCompleted: users.onboardingCompleted,
        showFullName: users.showFullName,
        showEmail: users.showEmail,
        showPhone: users.showPhone,
        radarPrivacy: users.radarPrivacy,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (u.length === 0) return { needsOnboarding: false };

    const user = u[0];
    const needsOnboarding = !user.onboardingCompleted || !user.baseCity;

    return {
      needsOnboarding,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        baseCountry: user.baseCountry || "TR",
        baseCity: user.baseCity || "İstanbul",
        showFullName: user.showFullName ?? true,
        showEmail: user.showEmail ?? true,
        showPhone: user.showPhone ?? false,
        radarPrivacy: user.radarPrivacy || "public",
      },
    };
  } catch (error) {
    console.error("Onboarding durumu sorgulanırken hata:", error);
    return { needsOnboarding: false };
  }
}

/**
 * Gezgin Kurulum Sihirbazı (Onboarding Wizard) Tamamlama Eylemi
 */
export async function completeOnboardingAction(data: {
  username?: string;
  baseCountry: string;
  baseCity: string;
  showFullName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  radarPrivacy?: "public" | "friend" | "relative" | "family" | "private";
}): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Oturum açmanız gerekmektedir." };
    }

    if (!data.baseCity || !data.baseCity.trim()) {
      return { success: false, message: "Lütfen ana ikamet şehrinizi seçiniz." };
    }

    let cleanUsername: string | undefined = undefined;
    if (data.username && data.username.trim()) {
      const avail = await isUsernameAvailable(data.username.trim(), session.user.id);
      if (!avail.available) {
        return { success: false, message: avail.error || "Kullanıcı adı kullanılamaz." };
      }
      cleanUsername = data.username.trim().toLowerCase();
    }

    await db
      .update(users)
      .set({
        ...(cleanUsername ? { username: cleanUsername } : {}),
        baseCountry: data.baseCountry || "TR",
        baseCity: data.baseCity.trim(),
        showFullName: data.showFullName !== undefined ? data.showFullName : true,
        showEmail: data.showEmail !== undefined ? data.showEmail : true,
        showPhone: data.showPhone !== undefined ? data.showPhone : false,
        radarPrivacy: data.radarPrivacy || "public",
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/match");

    return { success: true, message: "Kurulum tamamlandı! Hoş geldiniz 🌴" };
  } catch (error) {
    console.error("Onboarding tamamlama hatası:", error);
    return { success: false, message: "Kurulum kaydedilirken bir hata oluştu." };
  }
}

/**
 * Kullanıcı profil bilgilerini günceller.
 */
export async function updateProfile(input: z.infer<typeof updateProfileSchema>): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "İşlem için giriş yapmanız gerekmektedir." };
    }

    const validated = updateProfileSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message || "Geçersiz profil verisi",
      };
    }

    const {
      fullName,
      username,
      phoneNumber,
      bio,
      avatarUrl,
      baseCountry,
      baseCity,
      preferredLanguage,
      showFullName,
      showEmail,
      showPhone,
      searchPrivacy,
      radarPrivacy,
      mapPrivacy,
    } = validated.data;

    // Kullanıcı adı değiştiyse müsaitlik kontrolü
    let cleanUsername: string | undefined = undefined;
    if (username && username.trim()) {
      const avail = await isUsernameAvailable(username.trim(), session.user.id);
      if (!avail.available) {
        return { success: false, message: avail.error || "Bu kullanıcı adı kullanılamaz." };
      }
      cleanUsername = username.trim().toLowerCase();
    }

    const cleanPhone = phoneNumber ? normalizeToInternational(phoneNumber) : null;

    if (cleanPhone) {
      const existing = await db
        .select()
        .from(users)
        .where(and(eq(users.phoneNumber, cleanPhone), ne(users.id, session.user.id)));

      if (existing.length > 0) {
        return {
          success: false,
          message: "Bu telefon numarası başka bir kullanıcı tarafından kullanılmaktadır. Lütfen farklı bir numara giriniz.",
        };
      }
    }

    await db
      .update(users)
      .set({
        fullName: fullName.trim(),
        ...(cleanUsername ? { username: cleanUsername } : {}),
        phoneNumber: cleanPhone,
        bio: bio?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null,
        baseCountry: baseCountry || "TR",
        baseCity: baseCity?.trim() || "İstanbul",
        ...(preferredLanguage ? { preferredLanguage } : {}),
        ...(showFullName !== undefined ? { showFullName } : {}),
        ...(showEmail !== undefined ? { showEmail } : {}),
        ...(showPhone !== undefined ? { showPhone } : {}),
        ...(searchPrivacy ? { searchPrivacy } : {}),
        ...(radarPrivacy ? { radarPrivacy } : {}),
        ...(mapPrivacy ? { mapPrivacy } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");

    return { success: true, message: "Profil bilgileriniz başarıyla güncellendi! ✅" };
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    return { success: false, message: "Profil kaydedilirken bir hata oluştu." };
  }
}

/**
 * Profil fotoğrafını veya avatar emojisini anında veritabanına kaydeder.
 */
export async function updateAvatarAction(avatarUrl: string | null) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Oturum bulunamadı." };
    }

    const cleanAvatar = avatarUrl ? avatarUrl.trim() : null;

    await db
      .update(users)
      .set({
        avatarUrl: cleanAvatar,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");
    revalidatePath("/messages");

    return { success: true, message: "Profil fotoğrafı başarıyla kaydedildi! 📸" };
  } catch (error) {
    console.error("Avatar kaydetme hatası:", error);
    return { success: false, message: "Profil fotoğrafı kaydedilirken bir hata oluştu." };
  }
}

/**
 * Giriş yapmış kullanıcının şifresini değiştirir.
 */
export async function changePassword(input: z.infer<typeof changePasswordSchema>): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Yetkisiz işlem." };
    }

    const validated = changePasswordSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0]?.message || "Geçersiz şifre verisi",
      };
    }

    const { currentPassword, newPassword } = validated.data;

    const userList = await db.select().from(users).where(eq(users.id, session.user.id));
    if (userList.length === 0) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    const user = userList[0];

    // Mevcut şifre kontrolü
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return { success: false, message: "Mevcut şifrenizi hatalı girdiniz." };
    }

    // Yeni şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return { success: true, message: "Şifreniz başarıyla değiştirildi! 🔒" };
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    return { success: false, message: "Şifre değiştirilemedi." };
  }
}

/**
 * Kullanıcının dil tercihini günceller.
 */
export async function setLanguagePreference(lang: "tr" | "en"): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Oturum açmanız gerekmektedir." };
    }

    await db
      .update(users)
      .set({
        preferredLanguage: lang,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Dil tercihi güncellenirken hata:", error);
    return { success: false, message: "Dil tercihi güncellenemedi." };
  }
}

