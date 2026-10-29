"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  visits,
  trips,
  tripStops,
  users,
  travelMatches,
  type TravelMatch,
} from "@/lib/db/schema";
import { eq, and, ne, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotification } from "@/lib/actions/notifications";

// Zod Doğrulama Şeması (Kural 10)
const sendMatchRequestSchema = z.object({
  receiverId: z.string().uuid("Geçerli kullanıcı ID gereklidir"),
  cityName: z.string().min(1, "Şehir adı zorunludur"),
  overlapStartDate: z.string().optional().nullable(),
  overlapEndDate: z.string().optional().nullable(),
  introMessage: z.string().max(500, "Mesaj en fazla 500 karakter olabilir").optional(),
});

export interface MatchCandidate {
  user: {
    id: string;
    fullName: string;
    email: string | null;
    avatarUrl: string | null;
  };
  cityName: string;
  countryCode: string;
  overlapStartDate: string | null;
  overlapEndDate: string | null;
  dateDescription: string;
  matchType: "exact_date" | "same_destination";
  userVisitCount: number;
  hasExistingRequest: boolean;
  requestStatus?: "pending" | "accepted" | "declined" | null;
}

/**
 * Giriş yapmış kullanıcının rotaları/ziyaretleri ile çakışan diğer gezginleri bulur.
 * Hem ziyaretleri (visits) hem de seyahat rotası duraklarını (trip_stops) durak bazlı tarihlerle tarar.
 */
export async function getTravelMatches(): Promise<MatchCandidate[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const currentUserId = session.user.id;

    // 1. Kullanıcının Ziyaretleri ve Rota Duraklarını Al
    const myVisits = await db
      .select()
      .from(visits)
      .where(eq(visits.userId, currentUserId));

    const myTripStops = await db
      .select({
        stop: tripStops,
        trip: trips,
      })
      .from(tripStops)
      .innerJoin(trips, eq(tripStops.tripId, trips.id))
      .where(eq(trips.userId, currentUserId));

    // 2. Diğer Kullanıcıların Herkese Açık Ziyaretleri ve Rota Duraklarını Al
    const otherVisitsWithUsers = await db
      .select({
        visit: visits,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(visits)
      .innerJoin(users, eq(visits.userId, users.id))
      .where(and(ne(visits.userId, currentUserId), eq(visits.visibility, "public")));

    const otherTripStopsWithUsers = await db
      .select({
        stop: tripStops,
        trip: trips,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(tripStops)
      .innerJoin(trips, eq(tripStops.tripId, trips.id))
      .innerJoin(users, eq(trips.userId, users.id))
      .where(and(ne(trips.userId, currentUserId), eq(trips.visibility, "public")));

    // 3. Mevcut İstekleri Al
    const existingMatches = await db
      .select()
      .from(travelMatches)
      .where(
        sql`${travelMatches.senderId} = ${currentUserId} OR ${travelMatches.receiverId} = ${currentUserId}`
      );

    // Günün başlangıcı (00:00:00) eşiği - Bugünden eski tarih çakışmalarını filtrelemek için
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Kullanıcının seyahat lokasyonları (yalnızca henüz bitmemiş veya gelecekte planlanmış olanlar)
    const myLocations: Array<{
      cityName: string;
      countryCode: string;
      startDate: Date | null;
      endDate: Date | null;
    }> = [
      ...myVisits
        .filter((v) => {
          const end = v.endDate || v.startDate;
          return end && new Date(end).getTime() >= todayStart;
        })
        .map((v) => ({
          cityName: v.cityName,
          countryCode: v.countryCode,
          startDate: v.startDate,
          endDate: v.endDate,
        })),
      ...myTripStops
        .filter((ts) => {
          const end = ts.stop.departureDate || ts.stop.arrivalDate;
          return end && new Date(end).getTime() >= todayStart;
        })
        .map((ts) => ({
          cityName: ts.stop.cityName,
          countryCode: ts.stop.countryCode,
          startDate: ts.stop.arrivalDate,
          endDate: ts.stop.departureDate,
        })),
    ];

    // Diğer gezginlerin seyahat lokasyonları (yalnızca henüz bitmemiş veya gelecekte planlanmış olanlar)
    const otherLocations: Array<{
      user: {
        id: string;
        fullName: string;
        email: string | null;
        avatarUrl: string | null;
      };
      cityName: string;
      countryCode: string;
      startDate: Date | null;
      endDate: Date | null;
    }> = [
      ...otherVisitsWithUsers
        .filter((ov) => {
          const end = ov.visit.endDate || ov.visit.startDate;
          return end && new Date(end).getTime() >= todayStart;
        })
        .map((ov) => ({
          user: ov.user,
          cityName: ov.visit.cityName,
          countryCode: ov.visit.countryCode,
          startDate: ov.visit.startDate,
          endDate: ov.visit.endDate,
        })),
      ...otherTripStopsWithUsers
        .filter((ots) => {
          const end = ots.stop.departureDate || ots.stop.arrivalDate;
          return end && new Date(end).getTime() >= todayStart;
        })
        .map((ots) => ({
          user: ots.user,
          cityName: ots.stop.cityName,
          countryCode: ots.stop.countryCode,
          startDate: ots.stop.arrivalDate,
          endDate: ots.stop.departureDate,
        })),
    ];

    const candidatesMap = new Map<string, MatchCandidate>();

    for (const myLoc of myLocations) {
      if (!myLoc.cityName) continue;

      for (const otherLoc of otherLocations) {
        if (!otherLoc.cityName) continue;

        // Aynı şehir kontrolü (case-insensitive)
        const isSameCity =
          myLoc.cityName.trim().toLowerCase() === otherLoc.cityName.trim().toLowerCase();

        if (!isSameCity) continue;

        const myStart = myLoc.startDate
          ? new Date(myLoc.startDate).getTime()
          : myLoc.endDate
          ? new Date(myLoc.endDate).getTime()
          : null;
        const myEnd = myLoc.endDate
          ? new Date(myLoc.endDate).getTime()
          : myLoc.startDate
          ? new Date(myLoc.startDate).getTime()
          : null;

        const otherStart = otherLoc.startDate
          ? new Date(otherLoc.startDate).getTime()
          : otherLoc.endDate
          ? new Date(otherLoc.endDate).getTime()
          : null;
        const otherEnd = otherLoc.endDate
          ? new Date(otherLoc.endDate).getTime()
          : otherLoc.startDate
          ? new Date(otherLoc.startDate).getTime()
          : null;

        // Her iki tarafın da geçerli bir tarih aralığı olmalıdır
        if (!myStart || !myEnd || !otherStart || !otherEnd) continue;

        // Kesişme kontrolü: StartA <= EndB AND EndA >= StartB
        if (myStart > otherEnd || myEnd < otherStart) continue;

        const overlapStart = new Date(Math.max(myStart, otherStart));
        const overlapEnd = new Date(Math.min(myEnd, otherEnd));

        // Çakışmanın bitiş tarihi de bugünden önce kalmamış olmalı (bugün veya gelecekte)
        if (overlapEnd.getTime() < todayStart) continue;

        const overlapStartStr = overlapStart.toISOString();
        const overlapEndStr = overlapEnd.toISOString();
        const overlapDays = Math.max(
          1,
          Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        const pairKey = `${otherLoc.user.id}-${myLoc.cityName.trim().toLowerCase()}`;

        const existingReq = existingMatches.find(
          (m) =>
            (m.senderId === currentUserId && m.receiverId === otherLoc.user.id) ||
            (m.senderId === otherLoc.user.id && m.receiverId === currentUserId)
        );

        const s = overlapStart.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
        const e = overlapEnd.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
        const dateDescription = `${s} - ${e} (${overlapDays} gün aynı şehirde! ☕)`;

        const candidate: MatchCandidate = {
          user: otherLoc.user,
          cityName: myLoc.cityName,
          countryCode: myLoc.countryCode,
          overlapStartDate: overlapStartStr,
          overlapEndDate: overlapEndStr,
          dateDescription,
          matchType: "exact_date",
          userVisitCount: 1,
          hasExistingRequest: !!existingReq,
          requestStatus: existingReq?.status || null,
        };

        const existingCandidate = candidatesMap.get(pairKey);
        if (!existingCandidate) {
          candidatesMap.set(pairKey, candidate);
        } else if (
          candidate.overlapStartDate &&
          existingCandidate.overlapStartDate &&
          new Date(candidate.overlapStartDate).getTime() <
            new Date(existingCandidate.overlapStartDate).getTime()
        ) {
          // Daha yakın tarihteki çakışmayı önceliklendir
          candidatesMap.set(pairKey, candidate);
        }
      }
    }

    const candidates = Array.from(candidatesMap.values());

    // En yakın tarihte başlayacak çakışmaları en üste alacak şekilde sırala
    return candidates.sort((a, b) => {
      const aTime = a.overlapStartDate ? new Date(a.overlapStartDate).getTime() : 0;
      const bTime = b.overlapStartDate ? new Date(b.overlapStartDate).getTime() : 0;
      return aTime - bTime;
    });
  } catch (error) {
    console.error("Seyahat eşleşmeleri aranırken hata:", error);
    return [];
  }
}

/**
 * Çakışan gezgine tanışma / arkadaşlık teklifi gönderir.
 */
export async function sendMatchRequest(input: z.infer<typeof sendMatchRequestSchema>): Promise<{
  success: boolean;
  message?: string;
  match?: TravelMatch;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "İşlem için giriş yapmanız gerekmektedir." };
    }

    const validated = sendMatchRequestSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, message: "Geçersiz istek parametreleri." };
    }

    const { receiverId, cityName, overlapStartDate, overlapEndDate, introMessage } = validated.data;
    const senderId = session.user.id;

    if (senderId === receiverId) {
      return { success: false, message: "Kendinize arkadaşlık teklifi gönderemezsiniz." };
    }

    // Mevcut istek var mı?
    const existing = await db
      .select()
      .from(travelMatches)
      .where(
        and(
          eq(travelMatches.senderId, senderId),
          eq(travelMatches.receiverId, receiverId),
          eq(travelMatches.cityName, cityName)
        )
      );

    if (existing.length > 0) {
      return { success: false, message: "Bu seyahat için zaten bir teklif gönderilmiş." };
    }

    const defaultIntro = `Merhaba! Ben de ${cityName} seyahati planlıyorum veya oradaydım. Seyahat rotalarımızı birleştirmek ve bir kahve eşliğinde deneyim paylaşmak ister misin?`;

    const inserted = await db
      .insert(travelMatches)
      .values({
        senderId,
        receiverId,
        cityName,
        overlapStartDate: overlapStartDate ? new Date(overlapStartDate) : null,
        overlapEndDate: overlapEndDate ? new Date(overlapEndDate) : null,
        introMessage: introMessage || defaultIntro,
        status: "pending",
      })
      .returning();

    // Alıcıya Bildirim Gönder
    createNotification({
      userId: receiverId,
      actorId: senderId,
      type: "match_request",
      targetType: "match",
      targetId: inserted[0].id,
      title: `${session.user.name || "Bir gezgin"} sizinle ${cityName} seyahati için tanışma teklifi gönderdi ☕`,
      content: introMessage || defaultIntro,
    }).catch((e) => console.error("Tanışma bildirimi hatası:", e));

    revalidatePath("/match");
    revalidatePath("/feed");

    return {
      success: true,
      message: "Tanışma teklifi başarıyla iletildi!",
      match: inserted[0],
    };
  } catch (error) {
    console.error("Tanışma teklifi gönderilirken hata:", error);
    return { success: false, message: "Teklif gönderilemedi." };
  }
}

/**
 * Kullanıcıya gelen ve gönderilen tanışma isteklerini getirir.
 */
export async function getMyMatchRequests() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { incoming: [], outgoing: [] };

    const currentUserId = session.user.id;

    // Gelen istekler
    const incoming = await db
      .select({
        match: travelMatches,
        sender: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(travelMatches)
      .innerJoin(users, eq(travelMatches.senderId, users.id))
      .where(eq(travelMatches.receiverId, currentUserId))
      .orderBy(desc(travelMatches.createdAt));

    // Gönderilen istekler
    const outgoing = await db
      .select({
        match: travelMatches,
        receiver: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(travelMatches)
      .innerJoin(users, eq(travelMatches.receiverId, users.id))
      .where(eq(travelMatches.senderId, currentUserId))
      .orderBy(desc(travelMatches.createdAt));

    return { incoming, outgoing };
  } catch (error) {
    console.error("İstekler listelenirken hata:", error);
    return { incoming: [], outgoing: [] };
  }
}

/**
 * Gelen tanışma teklifini kabul eder veya reddeder.
 */
export async function respondMatchRequest(
  matchId: string,
  action: "accepted" | "declined"
): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Yetkisiz işlem." };
    }

    // İstek bilgilerini al ve kabul edildiyse bildirim gönder
    const m = await db
      .select()
      .from(travelMatches)
      .where(eq(travelMatches.id, matchId))
      .limit(1);

    await db
      .update(travelMatches)
      .set({ status: action })
      .where(
        and(eq(travelMatches.id, matchId), eq(travelMatches.receiverId, session.user.id))
      );

    if (m[0] && action === "accepted") {
      createNotification({
        userId: m[0].senderId,
        actorId: session.user.id,
        type: "match_accepted",
        targetType: "match",
        targetId: matchId,
        title: `${session.user.name || "Gezgin"} ${m[0].cityName} için seyahat teklifinizi kabul etti! 🎉`,
      }).catch((e) => console.error("Kabul bildirimi hatası:", e));
    }

    revalidatePath("/match");
    revalidatePath("/feed");

    return {
      success: true,
      message: action === "accepted" ? "Teklif kabul edildi!" : "Teklif reddedildi.",
    };
  } catch (error) {
    console.error("Teklif yanıtlanırken hata:", error);
    return { success: false, message: "İşlem tamamlanamadı." };
  }
}
