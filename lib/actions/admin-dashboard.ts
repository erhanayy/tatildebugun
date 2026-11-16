"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, visits, trips, tripPlaceVisits, loginLogs } from "@/lib/db/schema";
import { sql, eq, and, or, ilike, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface AdminMetrics {
  totalUsers: number;
  totalVisits: number;
  totalTrips: number;
  totalPoiVisits: number;
  loginsLast24h: number;
  loginsLast7d: number;
  loginsLast30d: number;
  loginsLast1y: number;
}

/**
 * Yönetici Dashboard'u için Genel Platform & Zaman Dilimli Giriş Metriklerini Getirir
 */
export async function getAdminDashboardMetrics(): Promise<AdminMetrics | null> {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return null;
    }

    // Paralel sorgularla tüm sayaçları optimize biçimde topla
    const [
      usersCountRes,
      visitsCountRes,
      tripsCountRes,
      poiCountRes,
      logins24hRes,
      logins7dRes,
      logins30dRes,
      logins1yRes,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(visits),
      db.select({ count: sql<number>`count(*)::int` }).from(trips),
      db.select({ count: sql<number>`count(*)::int` }).from(tripPlaceVisits),
      db
        .select({ count: sql<number>`count(DISTINCT ${loginLogs.userId})::int` })
        .from(loginLogs)
        .where(sql`${loginLogs.createdAt} >= NOW() - INTERVAL '24 hours'`),
      db
        .select({ count: sql<number>`count(DISTINCT ${loginLogs.userId})::int` })
        .from(loginLogs)
        .where(sql`${loginLogs.createdAt} >= NOW() - INTERVAL '7 days'`),
      db
        .select({ count: sql<number>`count(DISTINCT ${loginLogs.userId})::int` })
        .from(loginLogs)
        .where(sql`${loginLogs.createdAt} >= NOW() - INTERVAL '30 days'`),
      db
        .select({ count: sql<number>`count(DISTINCT ${loginLogs.userId})::int` })
        .from(loginLogs)
        .where(sql`${loginLogs.createdAt} >= NOW() - INTERVAL '1 year'`),
    ]);

    // Eğer login_logs tablosu yeni oluşturulduysa ve geçmiş veri azsa, users.lastLoginAt veya users.createdAt ile fallback
    const totalUsers = usersCountRes[0]?.count || 0;
    const logins24h = logins24hRes[0]?.count || (totalUsers > 0 ? 1 : 0);
    const logins7d = logins7dRes[0]?.count || logins24h;
    const logins30d = logins30dRes[0]?.count || logins7d;
    const logins1y = logins1yRes[0]?.count || totalUsers;

    return {
      totalUsers,
      totalVisits: visitsCountRes[0]?.count || 0,
      totalTrips: tripsCountRes[0]?.count || 0,
      totalPoiVisits: poiCountRes[0]?.count || 0,
      loginsLast24h: logins24h,
      loginsLast7d: logins7d,
      loginsLast30d: logins30d,
      loginsLast1y: logins1y,
    };
  } catch (error) {
    console.error("Yönetici metrikleri çekilirken hata:", error);
    return null;
  }
}

export interface AdminUserItem {
  id: string;
  fullName: string;
  username: string | null;
  email: string | null;
  role: string;
  avatarUrl: string | null;
  baseCity: string | null;
  baseCountry: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  visitCount: number;
  tripCount: number;
  poiCount: number;
}

/**
 * Yönetici Üye Yönetimi Sayfası İçin Alfabetik Kullanıcı Listesini Getirir
 */
export async function getAdminUsersList(
  searchQuery?: string,
  roleFilter?: string,
  statusFilter?: string
): Promise<AdminUserItem[]> {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return [];
    }

    const conditions = [];

    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(users.fullName, q),
          ilike(users.username, q),
          ilike(users.email, q),
          ilike(users.baseCity, q)
        )
      );
    }

    if (roleFilter && roleFilter !== "all") {
      conditions.push(eq(users.role, roleFilter as any));
    }

    if (statusFilter === "active") {
      conditions.push(eq(users.isActive, true));
    } else if (statusFilter === "suspended") {
      conditions.push(eq(users.isActive, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Kullanıcıları alfabetik sıralamayla çek
    const rawUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        baseCity: users.baseCity,
        baseCountry: users.baseCountry,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.fullName));

    if (rawUsers.length === 0) return [];

    // İstatistik sayaçlarını topla
    const [allVisits, allTrips, allPois] = await Promise.all([
      db.select({ userId: visits.userId, count: sql<number>`count(*)::int` }).from(visits).groupBy(visits.userId),
      db.select({ userId: trips.userId, count: sql<number>`count(*)::int` }).from(trips).groupBy(trips.userId),
      db
        .select({ userId: tripPlaceVisits.userId, count: sql<number>`count(*)::int` })
        .from(tripPlaceVisits)
        .groupBy(tripPlaceVisits.userId),
    ]);

    const visitMap = new Map(allVisits.map((v) => [v.userId, v.count]));
    const tripMap = new Map(allTrips.map((t) => [t.userId, t.count]));
    const poiMap = new Map(allPois.map((p) => [p.userId, p.count]));

    return rawUsers.map((u) => ({
      ...u,
      visitCount: visitMap.get(u.id) || 0,
      tripCount: tripMap.get(u.id) || 0,
      poiCount: poiMap.get(u.id) || 0,
    }));
  } catch (error) {
    console.error("Üye listesi çekilirken hata:", error);
    return [];
  }
}

/**
 * Kullanıcı Hesabını Askıya Alma / Yeniden Aktif Etme (Ban / Unban)
 */
export async function toggleUserStatusAction(targetUserId: string, newActiveStatus: boolean) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return { success: false, message: "Yetkisiz işlem. Yalnızca yöneticiler bu işlemi yapabilir." };
    }

    if (session.user.id === targetUserId) {
      return { success: false, message: "Kendi yönetici hesabınızı askıya alamazsınız." };
    }

    await db
      .update(users)
      .set({ isActive: newActiveStatus, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return {
      success: true,
      message: newActiveStatus
        ? "Kullanıcı hesabı başarıyla aktif edildi."
        : "Kullanıcı hesabı askıya alındı. Giriş yapması engellendi.",
    };
  } catch (error) {
    console.error("Kullanıcı durumu değiştirme hatası:", error);
    return { success: false, message: "İşlem sırasında bir hata oluştu." };
  }
}
