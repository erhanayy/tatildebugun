"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  placesOfInterest,
  tripPlaceVisits,
  trips,
  tripStops,
  type PlaceOfInterest,
  type TripPlaceVisit,
} from "@/lib/db/schema";
import { CURATED_PLACES } from "@/lib/poi-data";
import { eq, and, sql, desc, asc, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod Doğrulama Şemaları (Kural 10 - Katı Tip Güvenliği)
const togglePlaceVisitSchema = z.object({
  tripId: z.string().uuid("Geçerli bir rota kimliği gereklidir"),
  stopId: z.string().uuid().optional().nullable(),
  placeId: z.string().uuid("Geçerli bir mekan kimliği gereklidir"),
  userRating: z.number().int().min(1).max(5).optional().nullable(),
  visitedAt: z.string().optional().nullable(),
});

const updatePlaceVisitSchema = z.object({
  visitId: z.string().uuid("Geçerli bir ziyaret kimliği gereklidir"),
  visitedAt: z.string().optional().nullable(),
  userRating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const setPlaceRatingSchema = z.object({
  tripId: z.string().uuid("Geçerli bir rota kimliği gereklidir"),
  placeId: z.string().uuid("Geçerli bir mekan kimliği gereklidir"),
  stopId: z.string().uuid().optional().nullable(),
  userRating: z.number().int().min(1).max(5).optional().nullable(),
});

const createCustomPlaceSchema = z.object({
  tripId: z.string().uuid(),
  stopId: z.string().uuid().optional().nullable(),
  cityName: z.string().min(1, "Şehir adı zorunludur"),
  countryCode: z.string().min(2).max(10),
  name: z.string().min(2, "Mekan adı en az 2 karakter olmalıdır"),
  category: z.enum([
    "monument",
    "museum",
    "historic",
    "cafe",
    "restaurant",
    "shop",
    "nature",
    "view",
    "other",
  ]),
  notes: z.string().optional().nullable(),
  userRating: z.number().int().min(1).max(5).optional().nullable(),
});

export interface CityPlaceItem extends PlaceOfInterest {
  isVisited: boolean;
  visitId: string | null;
  visitedAt: Date | null;
  userRating: number | null;
  notes: string | null;
}

/**
 * Şehir için kürate edilmiş yerleri garanti eder (yoksa veritabanına ekler).
 */
async function ensureCityPlacesSeeded(cityName: string, countryCode: string, latitude?: number, longitude?: number) {
  const normalizedCity = cityName.trim();
  const normalizedCountry = countryCode.trim().toUpperCase();

  // 1. Önce bu şehir için veritabanında kayıt var mı kontrol et
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(placesOfInterest)
    .where(
      and(
        ilike(placesOfInterest.cityName, normalizedCity),
        eq(placesOfInterest.countryCode, normalizedCountry)
      )
    );

  if (Number(existing[0]?.count || 0) > 0) {
    return;
  }

  // 2. Kürate listemizde bu şehir var mı?
  const matched = CURATED_PLACES.filter(
    (p) =>
      p.cityName.toLowerCase() === normalizedCity.toLowerCase() &&
      p.countryCode.toUpperCase() === normalizedCountry
  );

  if (matched.length > 0) {
    // Toplu ekle
    await db.insert(placesOfInterest).values(
      matched.map((m) => ({
        externalApiId: m.externalApiId,
        apiSource: "wikidata",
        countryCode: m.countryCode,
        cityName: m.cityName,
        name: m.name,
        category: m.category,
        description: m.description,
        latitude: m.latitude,
        longitude: m.longitude,
        isCustom: false,
      }))
    );
    return;
  }

  // 3. Egzotik/yeni şehir ve koordinatlar mevcut ise Wikipedia GeoSearch'ten dinamik çekim dene
  if (latitude && longitude) {
    try {
      const geoUrl = `https://tr.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${latitude}|${longitude}&gsradius=10000&gslimit=10&format=json`;
      const res = await fetch(geoUrl, {
        headers: { "User-Agent": "TatildeBugunApp/1.0" },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = await res.json();
        const results = data?.query?.geosearch || [];
        if (Array.isArray(results) && results.length > 0) {
          const validItems = results
            .filter((r: { title?: string }) => r.title && !r.title.toLowerCase().includes(normalizedCity.toLowerCase()))
            .slice(0, 10);

          if (validItems.length > 0) {
            await db.insert(placesOfInterest).values(
              validItems.map((v: { pageid: number; title: string; lat: number; lon: number }) => ({
                externalApiId: `WP_${v.pageid}`,
                apiSource: "wikipedia",
                countryCode: normalizedCountry,
                cityName: normalizedCity,
                name: v.title,
                category: "monument" as const,
                description: `${normalizedCity} bölgesinde tarihi/turistik ilgi noktası`,
                latitude: v.lat,
                longitude: v.lon,
                isCustom: false,
              }))
            );
          }
        }
      }
    } catch (e) {
      console.warn("Wikipedia GeoSearch fallback sessizce atlandı:", e);
    }
  }
}

/**
 * Belirli bir durak/şehir için tüm turistik yerleri ve kullanıcının ziyaret durumunu getirir.
 */
export async function getCityPlaces(
  cityName: string,
  countryCode: string,
  tripId?: string,
  latitude?: number,
  longitude?: number
): Promise<{ success: boolean; places: CityPlaceItem[]; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Kürasyon veya tohum kontrolü
    await ensureCityPlacesSeeded(cityName, countryCode, latitude, longitude);

    // Mekanları veritabanından çek
    const places = await db
      .select()
      .from(placesOfInterest)
      .where(
        and(
          ilike(placesOfInterest.cityName, cityName.trim()),
          eq(placesOfInterest.countryCode, countryCode.trim().toUpperCase())
        )
      )
      .orderBy(asc(placesOfInterest.name));

    // Kullanıcının bu turdaki ziyaretlerini çek (eğer tripId ve userId varsa)
    let userVisitsMap = new Map<string, TripPlaceVisit>();
    if (userId && tripId) {
      const visits = await db
        .select()
        .from(tripPlaceVisits)
        .where(
          and(
            eq(tripPlaceVisits.userId, userId),
            eq(tripPlaceVisits.tripId, tripId)
          )
        );

      visits.forEach((v) => userVisitsMap.set(v.placeId, v));
    }

    const result: CityPlaceItem[] = places.map((place) => {
      const userVisit = userVisitsMap.get(place.id);
      return {
        ...place,
        isVisited: !!userVisit,
        visitId: userVisit?.id || null,
        visitedAt: userVisit?.visitedAt || null,
        userRating: userVisit?.userRating || null,
        notes: userVisit?.notes || null,
      };
    });

    return { success: true, places: result };
  } catch (error) {
    console.error("getCityPlaces hatası:", error);
    return { success: false, places: [], error: "Mekanlar yüklenirken bir hata oluştu" };
  }
}

/**
 * Mekan ziyaretini aç/kapat (Tik at veya tiki kaldır).
 * Tik atıldığında o anki zaman damgası (visitedAt) ve varsa puan loglanır.
 */
export async function togglePlaceVisit(input: {
  tripId: string;
  stopId?: string | null;
  placeId: string;
  userRating?: number | null;
  visitedAt?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Lütfen önce giriş yapınız" };
  }

  const parsed = togglePlaceVisitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { tripId, stopId, placeId, userRating, visitedAt } = parsed.data;
  const userId = session.user.id;

  try {
    // Daha önce ziyaret edilmiş mi?
    const existing = await db
      .select()
      .from(tripPlaceVisits)
      .where(
        and(
          eq(tripPlaceVisits.userId, userId),
          eq(tripPlaceVisits.tripId, tripId),
          eq(tripPlaceVisits.placeId, placeId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Tiki kaldır (Sil)
      await db.delete(tripPlaceVisits).where(eq(tripPlaceVisits.id, existing[0].id));
      revalidatePath("/tatildeyim");
      return { success: true, action: "removed", visitId: null };
    } else {
      // Ziyaret kaydet (Yeni tik)
      const visitDate = visitedAt ? new Date(visitedAt) : new Date();
      const [inserted] = await db
        .insert(tripPlaceVisits)
        .values({
          userId,
          tripId,
          stopId: stopId || null,
          placeId,
          visitedAt: visitDate,
          userRating: userRating || null,
        })
        .returning();

      revalidatePath("/tatildeyim");
      return {
        success: true,
        action: "added",
        visitId: inserted.id,
        visitedAt: inserted.visitedAt,
        userRating: inserted.userRating,
      };
    }
  } catch (error) {
    console.error("togglePlaceVisit hatası:", error);
    return { success: false, error: "Ziyaret durumu güncellenemedi" };
  }
}

/**
 * Ziyaret tarihini (zaman damgasını), puanını veya notunu güncelle.
 */
export async function updatePlaceVisit(input: {
  visitId: string;
  visitedAt?: string | null;
  userRating?: number | null;
  notes?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Lütfen önce giriş yapınız" };
  }

  const parsed = updatePlaceVisitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { visitId, visitedAt, userRating, notes } = parsed.data;

  try {
    const updateData: Partial<typeof tripPlaceVisits.$inferInsert> = {};
    if (visitedAt) updateData.visitedAt = new Date(visitedAt);
    if (userRating !== undefined) updateData.userRating = userRating;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(tripPlaceVisits)
      .set(updateData)
      .where(
        and(
          eq(tripPlaceVisits.id, visitId),
          eq(tripPlaceVisits.userId, session.user.id)
        )
      )
      .returning();

    revalidatePath("/tatildeyim");
    return { success: true, visit: updated };
  } catch (error) {
    console.error("updatePlaceVisit hatası:", error);
    return { success: false, error: "Ziyaret güncellenemedi" };
  }
}

/**
 * Mekan yıldız puanını doğrudan tripId ve placeId ile güncelle veya oluştur.
 * Client tarafındaki visitId senkronizasyon gecikmelerini tamamen ortadan kaldırır.
 */
export async function setPlaceRating(input: {
  tripId: string;
  placeId: string;
  stopId?: string | null;
  userRating?: number | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Lütfen önce giriş yapınız" };
  }

  const parsed = setPlaceRatingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { tripId, placeId, stopId, userRating } = parsed.data;
  const userId = session.user.id;

  try {
    const existing = await db
      .select()
      .from(tripPlaceVisits)
      .where(
        and(
          eq(tripPlaceVisits.userId, userId),
          eq(tripPlaceVisits.tripId, tripId),
          eq(tripPlaceVisits.placeId, placeId)
        )
      )
      .limit(1);

    let visitId: string;

    if (existing.length > 0) {
      const [updated] = await db
        .update(tripPlaceVisits)
        .set({ userRating: userRating ?? null })
        .where(eq(tripPlaceVisits.id, existing[0].id))
        .returning();
      visitId = updated.id;
    } else {
      const [inserted] = await db
        .insert(tripPlaceVisits)
        .values({
          userId,
          tripId,
          stopId: stopId ?? null,
          placeId,
          visitedAt: new Date(),
          userRating: userRating ?? null,
        })
        .returning();
      visitId = inserted.id;
    }

    revalidatePath("/tatildeyim");
    return { success: true, visitId, userRating };
  } catch (error) {
    console.error("setPlaceRating hatası:", error);
    return { success: false, error: "Puan kaydedilemedi" };
  }
}

/**
 * Kullanıcının serbestçe özel mekan (Kafe, Butik, Shop, Restoran vb.) eklemesi.
 * Eklendiği an otomatik olarak o durakta ziyaret edilmiş (tik atılmış) sayılır.
 */
export async function createCustomPlace(input: {
  tripId: string;
  stopId?: string | null;
  cityName: string;
  countryCode: string;
  name: string;
  category: "monument" | "museum" | "historic" | "cafe" | "restaurant" | "shop" | "nature" | "view" | "other";
  notes?: string | null;
  userRating?: number | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Lütfen önce giriş yapınız" };
  }

  const parsed = createCustomPlaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { tripId, stopId, cityName, countryCode, name, category, notes, userRating } = parsed.data;
  const userId = session.user.id;

  try {
    // 1. Mekanı places_of_interest'e ekle
    const [place] = await db
      .insert(placesOfInterest)
      .values({
        countryCode: countryCode.toUpperCase(),
        cityName: cityName.trim(),
        name: name.trim(),
        category,
        description: notes || "Kullanıcı tarafından özel olarak eklenen mekan",
        isCustom: true,
        createdByUserId: userId,
      })
      .returning();

    // 2. Anında bu tur için ziyaret edildi kaydı oluştur
    const [visit] = await db
      .insert(tripPlaceVisits)
      .values({
        userId,
        tripId,
        stopId: stopId || null,
        placeId: place.id,
        visitedAt: new Date(),
        notes: notes || null,
        userRating: userRating || null,
      })
      .returning();

    revalidatePath("/tatildeyim");

    const placeItem: CityPlaceItem = {
      ...place,
      isVisited: true,
      visitId: visit.id,
      visitedAt: visit.visitedAt,
      userRating: visit.userRating,
      notes: visit.notes,
    };

    return { success: true, place: placeItem };
  } catch (error) {
    console.error("createCustomPlace hatası:", error);
    return { success: false, error: "Özel mekan eklenirken bir hata oluştu" };
  }
}

/**
 * Kullanıcının turlarını (rehberde seçebilmek için) getirir.
 */
export async function getUserTripsForGuide() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userTrips = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, session.user.id))
    .orderBy(desc(trips.createdAt));

  return userTrips;
}

/**
 * Bir turun tüm duraklarını ve durak bazlı görülen mekan istatistiğini getirir.
 */
export async function getTripGuideDetails(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, session.user.id)))
    .limit(1);

  if (!trip) return null;

  const stops = await db
    .select()
    .from(tripStops)
    .where(eq(tripStops.tripId, tripId))
    .orderBy(asc(tripStops.stopOrder));

  // Bu turda işaretlenen toplam mekan ziyaretleri
  const visits = await db
    .select({
      placeId: tripPlaceVisits.placeId,
      stopId: tripPlaceVisits.stopId,
      visitedAt: tripPlaceVisits.visitedAt,
      userRating: tripPlaceVisits.userRating,
      cityName: placesOfInterest.cityName,
      placeName: placesOfInterest.name,
      category: placesOfInterest.category,
    })
    .from(tripPlaceVisits)
    .innerJoin(placesOfInterest, eq(tripPlaceVisits.placeId, placesOfInterest.id))
    .where(eq(tripPlaceVisits.tripId, tripId))
    .orderBy(asc(tripPlaceVisits.visitedAt));

  return {
    trip,
    stops,
    timeline: visits,
  };
}
