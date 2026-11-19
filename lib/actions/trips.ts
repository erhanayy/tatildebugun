"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { trips, tripStops, visits, users, type Trip, type TripStop, userPointsLedger } from "@/lib/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { awardPoints } from "@/lib/points/engine";
import { z } from "zod";

// Zod Doğrulama Şeması (Kural 10 - Katı Tip & Runtime Kontrolü)
const tripStopInputSchema = z.object({
  cityName: z.string().min(1, "Şehir adı zorunludur"),
  countryCode: z.string().min(2, "Geçerli ülke kodu gereklidir").max(10),
  latitude: z.number(),
  longitude: z.number(),
  stopOrder: z.number().int(),
  stopType: z.enum(["origin", "stop", "return"]).default("stop"),
  transportType: z
    .enum(["flight", "car", "train", "bus", "motorbike", "bicycle"])
    .optional()
    .nullable(),
  nights: z.number().int().min(0).optional().nullable(),
  arrivalDate: z.string().optional().nullable(),
  departureDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  visitId: z.string().optional().nullable(),
});

const createTripSchema = z.object({
  title: z.string().min(2, "Rota başlığı en az 2 karakter olmalıdır"),
  description: z.string().optional().nullable(),
  status: z.enum(["planned", "completed"]).default("completed"),
  transportType: z
    .enum(["flight", "car", "train", "bus", "motorbike", "bicycle", "mixed"])
    .default("mixed"),
  visibility: z.enum(["public", "friend", "friends", "relative", "family", "private"]).default("public"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  stops: z.array(tripStopInputSchema).min(2, "Bir rota oluşturmak için en az 2 durak gereklidir"),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

export interface TripWithStops extends Trip {
  stops: TripStop[];
  author?: {
    id: string;
    fullName: string;
    email: string | null;
    avatarUrl: string | null;
  };
}

/**
 * Giriş yapmış kullanıcının oluşturduğu tüm rotaları (Trip) duraklarıyla getirir.
 */
export async function getUserTrips(): Promise<TripWithStops[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const userTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, session.user.id))
      .orderBy(desc(trips.createdAt));

    if (userTrips.length === 0) return [];

    const tripIds = userTrips.map((t) => t.id);
    const allStops = await db
      .select()
      .from(tripStops)
      .orderBy(asc(tripStops.stopOrder));

    const result: TripWithStops[] = userTrips.map((t) => ({
      ...t,
      stops: allStops.filter((s) => s.tripId === t.id),
    }));

    return result;
  } catch (error) {
    console.error("Rotalar getirilirken hata:", error);
    return [];
  }
}

/**
 * Belirli bir rota (tripId) için puan defterindeki (ledger) NET puan bakiyesini hesaplar.
 * Tüm pozitif kazanımlar ve negatif geri almalar birlikte toplanır; çifte kesinti veya çifte ödül önlenir.
 */
async function getTripNetPoints(userId: string, tripId: string): Promise<number> {
  const entries = await db
    .select({ finalPoints: userPointsLedger.finalPoints })
    .from(userPointsLedger)
    .where(
      and(
        eq(userPointsLedger.userId, userId),
        eq(userPointsLedger.referenceId, tripId)
      )
    );
  return entries.reduce((sum, e) => sum + e.finalPoints, 0);
}

/**
 * Yeni rota (Trip) ve duraklarını oluşturur.
 * Yalnızca 'completed' (Tamamlanan) statüsündeki rotalar +50 Puan kazandırır.
 */
export async function createTrip(input: CreateTripInput): Promise<{
  success: boolean;
  message?: string;
  trip?: TripWithStops;
  pointsDelta?: number;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "İşlem için giriş yapmanız gerekmektedir." };
    }

    const validated = createTripSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Geçersiz form verisi";
      return { success: false, message: firstError };
    }

    const {
      title,
      description,
      status,
      transportType,
      visibility,
      startDate,
      endDate,
      stops,
    } = validated.data;

    // 1. Rota Üst Kaydını Oluştur
    const insertedTrip = await db
      .insert(trips)
      .values({
        userId: session.user.id,
        title,
        description: description || null,
        status,
        transportType,
        visibility,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      })
      .returning();

    const createdTrip = insertedTrip[0];

    // 2. Rota Duraklarını Ekle
    const stopsToInsert = stops.map((s, index) => ({
      tripId: createdTrip.id,
      visitId: s.visitId || null,
      cityName: s.cityName,
      countryCode: s.countryCode.toUpperCase(),
      latitude: s.latitude,
      longitude: s.longitude,
      stopOrder: s.stopOrder ?? index + 1,
      stopType: s.stopType || (index === 0 ? "origin" : index === stops.length - 1 ? "return" : "stop"),
      transportType: s.transportType || (index === 0 || index === stops.length - 1 ? null : "flight"),
      arrivalDate: s.arrivalDate ? new Date(s.arrivalDate) : null,
      departureDate: s.departureDate ? new Date(s.departureDate) : null,
      notes: s.notes || null,
    }));

    const insertedStops = await db.insert(tripStops).values(stopsToInsert).returning();

    // 2026 Sezonu Bütünleşik Değer Paylaşımı ve Puan Motoru:
    // Yalnızca tamamlanmış (completed) olarak oluşturulan rotalar +50 Puan kazandırır
    let pointsDelta = 0;
    if (status === "completed") {
      try {
        const ledger = await awardPoints({
          userId: session.user.id,
          actionType: "complete_trip",
          referenceId: createdTrip.id,
          referenceType: "trip",
          description: `Tamamlanan Seyahat Rotası: ${createdTrip.title}`,
          metadata: { stopCount: insertedStops.length, transportType },
        });
        pointsDelta = ledger.finalPoints;
      } catch (ptsErr) {
        console.error("Rota puanı ekleme hatası:", ptsErr);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/passport");
    revalidatePath("/points");
    revalidatePath("/rewards");

    return {
      success: true,
      pointsDelta,
      trip: {
        ...createdTrip,
        stops: insertedStops,
      },
    };
  } catch (error: any) {
    console.error("Rota oluşturma hatası:", error);
    return { success: false, message: "Rota kaydedilirken bir hata oluştu." };
  }
}

/**
 * Rota (Trip) ve bağlı duraklarını siler.
 * Bu rota için defterde aktif NET pozitif puan varsa yalnızca o net tutar ters işlemle (reversal) geri alınır.
 */
export async function deleteTrip(tripId: string): Promise<{
  success: boolean;
  message?: string;
  pointsDelta?: number;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Yetkisiz işlem." };
    }

    // 1. Rotayı ve detaylarını çek
    const existing = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, message: "Rota bulunamadı." };
    }

    const trip = existing[0];

    // 2. Bu rota için defterdeki NET puan bakiyesini hesapla (çifte iade korumalı)
    const netAwarded = await getTripNetPoints(session.user.id, tripId);
    let pointsDelta = 0;

    if (netAwarded > 0) {
      try {
        const ledger = await awardPoints({
          userId: session.user.id,
          actionType: "delete_trip",
          basePoints: -netAwarded,
          multiplier: 1.0,
          referenceId: tripId,
          referenceType: "trip",
          description: `Silinen Seyahat Rotası İadesi: ${trip.title}`,
          metadata: { tripTitle: trip.title },
        });
        pointsDelta = ledger.finalPoints;
      } catch (ptsErr) {
        console.error("Rota silme puan iade hatası:", ptsErr);
      }
    }

    // 3. Rotayı veritabanından sil
    await db
      .delete(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)));

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");
    revalidatePath("/passport");
    revalidatePath("/points");
    revalidatePath("/rewards");

    return { success: true, pointsDelta };
  } catch (error) {
    console.error("Rota silme hatası:", error);
    return { success: false, message: "Rota silinemedi." };
  }
}

/**
 * Rota durumunu günceller (planned <-> completed).
 * Kullanıcı planlanan seyahati tamamladığında "Evet, Gerçekleştirdim" diyerek durumu 'completed' yapabilir.
 */
export async function updateTripStatus(
  tripId: string,
  status: "planned" | "completed"
): Promise<{ success: boolean; trip?: TripWithStops; pointsDelta?: number; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Yetkisiz işlem." };
    }

    const existing = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, message: "Rota bulunamadı veya yetkiniz yok." };
    }

    const oldStatus = existing[0].status;
    let pointsDelta = 0;

    // Puan durum geçişi kontrolü (Net defter bakiyesi korumalı)
    if (oldStatus !== status) {
      const netAwarded = await getTripNetPoints(session.user.id, tripId);

      if (status === "completed" && netAwarded <= 0) {
        // Planlanandan tamamlanmışa geçiş -> +50 Puan (daha önce aktif puanı yoksa)
        try {
          const ledger = await awardPoints({
            userId: session.user.id,
            actionType: "complete_trip",
            referenceId: tripId,
            referenceType: "trip",
            description: `Tamamlanan Seyahat Rotası: ${existing[0].title}`,
            metadata: { previousStatus: oldStatus },
          });
          pointsDelta = ledger.finalPoints;
        } catch (ptsErr) {
          console.error("Rota tamamlama puanı hatası:", ptsErr);
        }
      } else if (oldStatus === "completed" && status === "planned" && netAwarded > 0) {
        // Tamamlanmıştan planlanana geri çekilme -> Yalnızca aktif net puanın iadesi
        try {
          const ledger = await awardPoints({
            userId: session.user.id,
            actionType: "delete_trip",
            basePoints: -netAwarded,
            multiplier: 1.0,
            referenceId: tripId,
            referenceType: "trip",
            description: `Durumu Planlanana Çekilen Rota Puan İadesi: ${existing[0].title}`,
          });
          pointsDelta = ledger.finalPoints;
        } catch (ptsErr) {
          console.error("Rota durum puan iade hatası:", ptsErr);
        }
      }
    }

    const updated = await db
      .update(trips)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)))
      .returning();

    const stops = await db
      .select()
      .from(tripStops)
      .where(eq(tripStops.tripId, tripId))
      .orderBy(asc(tripStops.stopOrder));

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");
    revalidatePath("/passport");
    revalidatePath("/points");
    revalidatePath("/rewards");

    return {
      success: true,
      pointsDelta,
      trip: {
        ...updated[0],
        stops,
      },
    };
  } catch (error) {
    console.error("Rota durumu güncelleme hatası:", error);
    return { success: false, message: "Rota durumu güncellenemedi." };
  }
}

/**
 * Mevcut rotayı ve duraklarını günceller.
 * Düzenleme sırasında statü (planned <-> completed) değişirse puan defteri de senkronize edilir.
 */
export async function updateTrip(
  tripId: string,
  input: CreateTripInput
): Promise<{ success: boolean; trip?: TripWithStops; pointsDelta?: number; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Yetkisiz işlem." };
    }

    const validated = createTripSchema.parse(input);
    const { title, description, status, transportType, visibility, startDate, endDate, stops } =
      validated;

    const existing = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, message: "Rota bulunamadı veya yetkiniz yok." };
    }

    const oldStatus = existing[0].status;

    // 1. Rota ana tablosunu güncelle
    const updatedTrip = await db
      .update(trips)
      .set({
        title,
        description: description || null,
        status,
        transportType,
        visibility,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)))
      .returning();

    // 2. Mevcut durakları sil ve yenilerini ekle
    await db.delete(tripStops).where(eq(tripStops.tripId, tripId));

    const stopsToInsert = stops.map((s, index) => ({
      tripId,
      visitId: s.visitId || null,
      cityName: s.cityName,
      countryCode: s.countryCode.toUpperCase(),
      latitude: s.latitude,
      longitude: s.longitude,
      stopOrder: s.stopOrder ?? index + 1,
      stopType: s.stopType || (index === 0 ? "origin" : index === stops.length - 1 ? "return" : "stop"),
      transportType: s.transportType || (index === 0 ? null : "flight"),
      arrivalDate: s.arrivalDate ? new Date(s.arrivalDate) : null,
      departureDate: s.departureDate ? new Date(s.departureDate) : null,
      notes: s.notes || null,
    }));

    const insertedStops = await db.insert(tripStops).values(stopsToInsert).returning();

    // 3. Düzenleme sırasında statü değiştiyse puan defterini senkronize et
    let pointsDelta = 0;
    if (oldStatus !== status) {
      const netAwarded = await getTripNetPoints(session.user.id, tripId);
      if (status === "completed" && netAwarded <= 0) {
        try {
          const ledger = await awardPoints({
            userId: session.user.id,
            actionType: "complete_trip",
            referenceId: tripId,
            referenceType: "trip",
            description: `Tamamlanan Seyahat Rotası: ${title}`,
            metadata: { previousStatus: oldStatus, source: "updateTrip" },
          });
          pointsDelta = ledger.finalPoints;
        } catch (ptsErr) {
          console.error("Rota güncelleme puan ekleme hatası:", ptsErr);
        }
      } else if (oldStatus === "completed" && status === "planned" && netAwarded > 0) {
        try {
          const ledger = await awardPoints({
            userId: session.user.id,
            actionType: "delete_trip",
            basePoints: -netAwarded,
            multiplier: 1.0,
            referenceId: tripId,
            referenceType: "trip",
            description: `Durumu Planlanana Çekilen Rota Puan İadesi: ${title}`,
            metadata: { previousStatus: oldStatus, source: "updateTrip" },
          });
          pointsDelta = ledger.finalPoints;
        } catch (ptsErr) {
          console.error("Rota güncelleme puan iade hatası:", ptsErr);
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");
    revalidatePath("/passport");
    revalidatePath("/points");
    revalidatePath("/rewards");

    return {
      success: true,
      pointsDelta,
      trip: {
        ...updatedTrip[0],
        stops: insertedStops,
      },
    };
  } catch (error: any) {
    console.error("Rota güncelleme hatası:", error);
    return { success: false, message: "Rota güncellenirken bir hata oluştu." };
  }
}
