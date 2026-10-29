"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface NotificationItem {
  id: string;
  type: string;
  targetType: string | null;
  targetId: string | null;
  title: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
  actor: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email: string | null;
  };
}

export interface CreateNotificationParams {
  userId: string;
  actorId: string;
  type: "reaction" | "comment" | "match_request" | "match_accepted";
  targetType?: "visit" | "trip" | "match";
  targetId?: string;
  title: string;
  content?: string;
}

/**
 * Güvenli Bildirim Oluşturucu (İç Servis)
 * Kendi kendine bildirim oluşturulmasını engeller.
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    if (!params.userId || !params.actorId || params.userId === params.actorId) {
      return false;
    }

    await db.insert(notifications).values({
      userId: params.userId,
      actorId: params.actorId,
      type: params.type,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      title: params.title,
      content: params.content ? params.content.slice(0, 300) : null,
      isRead: false,
    });

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");
    return true;
  } catch (error) {
    console.error("[createNotification] Bildirim oluşturulamadı:", error);
    return false;
  }
}

/**
 * Kullanıcının Bildirimlerini Getirir (Son 30 bildirim)
 */
export async function getUserNotifications(): Promise<NotificationItem[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        targetType: notifications.targetType,
        targetId: notifications.targetId,
        title: notifications.title,
        content: notifications.content,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        actorId: users.id,
        actorName: users.fullName,
        actorAvatar: users.avatarUrl,
        actorEmail: users.email,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      targetType: r.targetType,
      targetId: r.targetId,
      title: r.title,
      content: r.content,
      isRead: r.isRead,
      createdAt: r.createdAt,
      actor: {
        id: r.actorId,
        fullName: r.actorName,
        avatarUrl: r.actorAvatar,
        email: r.actorEmail,
      },
    }));
  } catch (error) {
    console.error("[getUserNotifications] Bildirimler çekilemedi:", error);
    return [];
  }
}

/**
 * Okunmamış Bildirim Sayısını Getirir (Rozet / Badge için)
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return 0;
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("[getUnreadNotificationCount] Sayı alınamadı:", error);
    return 0;
  }
}

/**
 * Tek Bir Bildirimi Okundu Olarak İşaretler
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, session.user.id)));

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");
    return true;
  } catch (error) {
    console.error("[markNotificationAsRead] Hata:", error);
    return false;
  }
}

/**
 * Kullanıcının Tüm Bildirimlerini Okundu Olarak İşaretler
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)));

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");
    return true;
  } catch (error) {
    console.error("[markAllNotificationsAsRead] Hata:", error);
    return false;
  }
}
