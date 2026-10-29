"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { trips, tripStops, visits, users, type Trip, type TripStop } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
  visibility: z.enum(["public", "friends", "family"]).default("public"),
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
 * Yeni rota (Trip) ve duraklarını oluşturur.
 */
export async function createTrip(input: CreateTripInput): Promise<{
  success: boolean;
  message?: string;
  trip?: TripWithStops;
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

    revalidatePath("/dashboard");
    revalidatePath("/feed");

    return {
      success: true,
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
 */
export async function deleteTrip(tripId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Yetkisiz işlem." };
    }

    await db
      .delete(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)));

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");

    return { success: true };
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
): Promise<{ success: boolean; trip?: TripWithStops; message?: string }> {
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

    return {
      success: true,
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
 */
export async function updateTrip(
  tripId: string,
  input: CreateTripInput
): Promise<{ success: boolean; trip?: TripWithStops; message?: string }> {
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

    revalidatePath("/dashboard");
    revalidatePath("/feed");
    revalidatePath("/match");

    return {
      success: true,
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
