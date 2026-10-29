"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, visits, trips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  phoneNumber: z.string().optional().nullable(),
  bio: z.string().max(500, "Biyografi en fazla 500 karakter olabilir").optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  baseCountry: z.string().length(2).optional().nullable(),
  baseCity: z.string().max(100).optional().nullable(),
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
    email: string | null;
    phoneNumber: string | null;
    bio: string | null;
    avatarUrl: string | null;
    role: string;
    baseCountry: string | null;
    baseCity: string | null;
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
        email: user.email,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        baseCountry: user.baseCountry || "TR",
        baseCity: user.baseCity || "İstanbul",
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

    const { fullName, phoneNumber, bio, avatarUrl, baseCountry, baseCity } = validated.data;

    await db
      .update(users)
      .set({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber?.trim() || null,
        bio: bio?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null,
        baseCountry: baseCountry || "TR",
        baseCity: baseCity?.trim() || "İstanbul",
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/feed");

    return { success: true, message: "Profil bilgileriniz başarıyla güncellendi! ✅" };
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    return { success: false, message: "Profil kaydedilirken bir hata oluştu." };
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
