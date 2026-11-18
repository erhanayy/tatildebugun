"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  getUserPointsSummary,
  getRecentPointActivities,
  getPaginatedPointActivities,
  awardPoints,
  CURRENT_SEASON_YEAR,
} from "@/lib/points/engine";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const referralCodeSchema = z
  .string()
  .min(4, "Davet kodu en az 4 karakter olmalıdır")
  .max(30, "Davet kodu en fazla 30 karakter olabilir")
  .trim()
  .toUpperCase();

/**
 * Oturum açmış kullanıcının sezonluk puan ve değer paylaşımı özetini getirir
 */
export async function getUserPointsSummaryAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Yetkisiz erişim" };
  }

  try {
    const summary = await getUserPointsSummary(session.user.id, CURRENT_SEASON_YEAR);
    return { success: true, summary };
  } catch (error: any) {
    console.error("getUserPointsSummaryAction error:", error);
    return { success: false, error: error.message || "Puan bilgisi yüklenemedi" };
  }
}

/**
 * Kullanıcının son puan defteri (ledger) hareketlerini getirir
 */
export async function getRecentPointActivitiesAction(limit = 10) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Yetkisiz erişim" };
  }

  try {
    const activities = await getRecentPointActivities(session.user.id, limit);
    return { success: true, activities };
  } catch (error: any) {
    console.error("getRecentPointActivitiesAction error:", error);
    return { success: false, error: error.message || "Hareketler yüklenemedi" };
  }
}

/**
 * Kullanıcının Sayfalamalı Puan Defteri Hareketlerini Getirir (Paging Destekli)
 */
export async function getPaginatedPointActivitiesAction(page = 1, pageSize = 8) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Yetkisiz erişim" };
  }

  try {
    const data = await getPaginatedPointActivities(session.user.id, page, pageSize);
    return { success: true, ...data };
  } catch (error: any) {
    console.error("getPaginatedPointActivitiesAction error:", error);
    return { success: false, error: error.message || "Puan hareketleri yüklenemedi" };
  }
}

/**
 * Arkadaş Davet Kodunu Hesaba Bağlama (Referral Link)
 */
export async function applyReferralCodeAction(code: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Yetkisiz erişim" };
  }

  const parsed = referralCodeSchema.safeParse(code);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const cleanCode = parsed.data;
  const currentUserId = session.user.id;

  try {
    // 1. Kullanıcı zaten bir davet koduna bağlı mı?
    const currentUser = await db
      .select({ id: users.id, referredBy: users.referredBy })
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);

    if (currentUser[0]?.referredBy) {
      return { success: false, error: "Hesabınız zaten bir arkadaş davetine bağlı." };
    }

    // 2. Kodu kullanan referans sahibini bul
    const referrer = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.referralCode, cleanCode))
      .limit(1);

    if (referrer.length === 0) {
      return { success: false, error: "Geçersiz davet kodu. Lütfen kontrol ediniz." };
    }

    if (referrer[0].id === currentUserId) {
      return { success: false, error: "Kendi davet kodunuzu kullanamazsınız." };
    }

    // 3. Kullanıcıyı referansa bağla
    await db
      .update(users)
      .set({ referredBy: referrer[0].id, updatedAt: new Date() })
      .where(eq(users.id, currentUserId));

    // 4. Her iki tarafa da hoş geldin bağlantı bonusu ver (Örn: 50 Puan)
    await awardPoints({
      userId: currentUserId,
      actionType: "admin_reward",
      basePoints: 50,
      description: `Arkadaş Daveti ile Katılım Bonusu (${referrer[0].fullName})`,
      metadata: { referrerId: referrer[0].id },
    });

    await awardPoints({
      userId: referrer[0].id,
      actionType: "admin_reward",
      basePoints: 50,
      description: `Yeni Arkadaş Katılım Bonusu (${session.user.name || "Gezgin"})`,
      metadata: { referredUserId: currentUserId },
    });

    revalidatePath("/profile");
    return {
      success: true,
      message: `${referrer[0].fullName} davetiyle başarıyla bağlandınız! Karşılıklı +50 Puan kazandınız.`,
    };
  } catch (error: any) {
    console.error("applyReferralCodeAction error:", error);
    return { success: false, error: "Davet kodu bağlanırken bir hata oluştu." };
  }
}
