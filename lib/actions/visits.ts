"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { visits, type Visit, userPointsLedger } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { awardPoints } from "@/lib/points/engine";
import { z } from "zod";

// Zod Doğrulama Şeması (Kural 10 - Katı Tip ve Runtime Doğrulama)
const createVisitSchema = z
  .object({
    countryCode: z.string().min(2, "Geçerli bir ülke kodu gereklidir").max(10),
    countryName: z.string().min(1, "Ülke adı zorunludur"),
    cityName: z.string().min(1, "Şehir adı zorunludur"),
    districtName: z.string().optional().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    dateType: z.enum(["exact", "month_year", "timeless"]),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    visitYear: z.number().int().min(1950).max(2100).optional().nullable(),
    visitMonth: z.number().int().min(1).max(12).optional().nullable(),
    stayDurationDays: z.number().int().min(0, "Kalış süresi negatif olamaz").default(0),
    count: z.number().int().min(1, "En az 1 adet seçilmelidir").max(50, "Tek seferde en fazla 50 adet girilebilir").default(1),
    visitType: z.enum(["touristic", "business"]).default("touristic"),
    visibility: z.enum(["public", "friend", "friends", "relative", "family", "private"]).default("public"),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.dateType === "exact") {
        return !!data.startDate && !!data.endDate;
      }
      if (data.dateType === "month_year") {
        return !!data.visitYear && !!data.visitMonth;
      }
      if (data.dateType === "timeless") {
        return true;
      }
      return false;
    },
    {
      message:
        "Tarih seçimi zorunludur: Ya kesin Başlangıç-Bitiş tarihi, ya Yıl ve Ay ya da Zamansız seçilmelidir.",
      path: ["dateType"],
    }
  );

export type CreateVisitInput = z.infer<typeof createVisitSchema>;

/**
 * Giriş yapmış kullanıcının seyahat kayıtlarını getirir.
 */
export async function getUserVisits(): Promise<Visit[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    return await db
      .select()
      .from(visits)
      .where(eq(visits.userId, session.user.id))
      .orderBy(desc(visits.createdAt));
  } catch (error) {
    console.error("Ziyaretler getirilirken hata:", error);
    return [];
  }
}

/**
 * Yeni seyahat/bayrak kaydı oluşturur (Toplu adet desteği içerir).
 */
export async function createVisit(input: CreateVisitInput): Promise<{
  success: boolean;
  message?: string;
  visit?: Visit;
  visits?: Visit[];
  createdCount?: number;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "İşlem için giriş yapmanız gerekmektedir." };
    }

    const validated = createVisitSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Geçersiz form verisi";
      return { success: false, message: firstError };
    }

    const {
      countryCode,
      countryName,
      cityName,
      districtName,
      latitude,
      longitude,
      dateType,
      startDate,
      endDate,
      visitYear,
      visitMonth,
      stayDurationDays,
      count = 1,
      visitType,
      visibility,
      notes,
    } = validated.data;

    const baseRecord = {
      userId: session.user.id,
      countryCode: countryCode.toUpperCase(),
      countryName,
      cityName,
      districtName: districtName?.trim() || null,
      latitude,
      longitude,
      dateType,
      startDate: dateType === "exact" && startDate ? new Date(startDate) : null,
      endDate: dateType === "exact" && endDate ? new Date(endDate) : null,
      visitYear: dateType === "month_year" ? visitYear || null : null,
      visitMonth: dateType === "month_year" ? visitMonth || null : null,
      stayDurationDays: dateType === "timeless" ? 0 : stayDurationDays,
      visitType,
      visibility,
      notes: notes || null,
    };

    // Tek seferde toplu kayıt oluşturma (Bulk Insert)
    const recordsToInsert = Array.from({ length: Math.max(1, count) }, () => ({
      ...baseRecord,
    }));

    const inserted = await db.insert(visits).values(recordsToInsert).returning();

    // 2026 Sezonu Bütünleşik Değer Paylaşımı ve Puan Motoru:
    // Her yeni pin için kullanıcıya 10 Pts ekle ve deftere yaz
    for (const v of inserted) {
      try {
        await awardPoints({
          userId: session.user.id,
          actionType: "create_pin",
          referenceId: v.id,
          referenceType: "visit",
          description: `Gezi Pini: ${v.cityName}, ${v.countryName}`,
          metadata: { countryCode: v.countryCode, cityName: v.cityName },
        });
      } catch (ptsErr) {
        console.error("Ziyaret puanı ekleme hatası:", ptsErr);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/tatildeyim");
    revalidatePath("/passport");
    revalidatePath("/rewards");
    return {
      success: true,
      visit: inserted[0],
      visits: inserted,
      createdCount: inserted.length,
    };
  } catch (error: any) {
    console.error("Ziyaret ekleme hatası:", error);
    return {
      success: false,
      message: "Ziyaret kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz.",
    };
  }
}

/**
 * Ziyaret kaydını günceller.
 */
export async function updateVisit(
  visitId: string,
  input: CreateVisitInput
): Promise<{
  success: boolean;
  message?: string;
  visit?: Visit;
  visits?: Visit[];
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "İşlem için giriş yapmanız gerekmektedir." };
    }

    const validated = createVisitSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Geçersiz form verisi";
      return { success: false, message: firstError };
    }

    const {
      countryCode,
      countryName,
      cityName,
      districtName,
      latitude,
      longitude,
      dateType,
      startDate,
      endDate,
      visitYear,
      visitMonth,
      stayDurationDays,
      visitType,
      visibility,
      notes,
    } = validated.data;

    const updated = await db
      .update(visits)
      .set({
        countryCode: countryCode.toUpperCase(),
        countryName,
        cityName,
        districtName: districtName?.trim() || null,
        latitude,
        longitude,
        dateType,
        startDate: dateType === "exact" && startDate ? new Date(startDate) : null,
        endDate: dateType === "exact" && endDate ? new Date(endDate) : null,
        visitYear: dateType === "month_year" ? visitYear || null : null,
        visitMonth: dateType === "month_year" ? visitMonth || null : null,
        stayDurationDays: dateType === "timeless" ? 0 : stayDurationDays,
        visitType,
        visibility,
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(and(eq(visits.id, visitId), eq(visits.userId, session.user.id)))
      .returning();

    if (updated.length === 0) {
      return { success: false, message: "Ziyaret kaydı bulunamadı veya düzenleme yetkiniz yok." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/tatildeyim");
    return { success: true, visit: updated[0], visits: updated };
  } catch (error: any) {
    console.error("Ziyaret güncelleme hatası:", error);
    return {
      success: false,
      message: "Ziyaret güncellenirken bir hata oluştu.",
    };
  }
}

/**
 * Ziyaret kaydını siler.
 */
export async function deleteVisit(visitId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Yetkisiz işlem." };
    }

    // 1. Ziyaret kaydının kullanıcıya ait olup olmadığını ve detaylarını çek
    const existing = await db
      .select()
      .from(visits)
      .where(and(eq(visits.id, visitId), eq(visits.userId, session.user.id)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, message: "Ziyaret kaydı bulunamadı." };
    }

    const visit = existing[0];

    // 2. Bu ziyaret için daha önce verilmiş aktif puanları defterden tespit et
    const awardedEntries = await db
      .select({ finalPoints: userPointsLedger.finalPoints })
      .from(userPointsLedger)
      .where(
        and(
          eq(userPointsLedger.userId, session.user.id),
          eq(userPointsLedger.referenceId, visitId),
          sql`${userPointsLedger.finalPoints} > 0`
        )
      );

    const totalAwarded = awardedEntries.reduce((sum, e) => sum + e.finalPoints, 0);

    // 3. Eğer puan kazanılmışsa ters işlemle (reversal ledger entry) puanı geri al
    if (totalAwarded > 0) {
      try {
        await awardPoints({
          userId: session.user.id,
          actionType: "delete_pin",
          basePoints: -totalAwarded,
          multiplier: 1.0,
          referenceId: visitId,
          referenceType: "visit",
          description: `Silinen Gezi Pini İadesi: ${visit.cityName}, ${visit.countryName}`,
          metadata: { countryCode: visit.countryCode, cityName: visit.cityName },
        });
      } catch (ptsErr) {
        console.error("Ziyaret silme puan iade hatası:", ptsErr);
      }
    }

    // 4. Ziyareti veritabanından sil
    await db
      .delete(visits)
      .where(and(eq(visits.id, visitId), eq(visits.userId, session.user.id)));

    revalidatePath("/dashboard");
    revalidatePath("/tatildeyim");
    revalidatePath("/passport");
    revalidatePath("/rewards");
    return { success: true };
  } catch (error) {
    console.error("Ziyaret silme hatası:", error);
    return { success: false, message: "Ziyaret silinemedi." };
  }
}

import { resolveTurkishCityOrDistrict } from "@/lib/turkey-cities";

/**
 * Koordinatlardan Ülke ve Şehir adını tespit eden Akıllı Ters Coğrafi Kodlama (Reverse Geocoding)
 * İlçe tespit edildiğinde otomatik olarak bağlı olduğu ana İli/Şehri çözer.
 */
export async function reverseGeocodeLocation(
  lat: number,
  lng: number
): Promise<{
  countryName: string;
  countryCode: string;
  cityName: string;
  districtName?: string;
} | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TatildeBugunApp/1.0 (contact@tatildebugun.com)",
        "Accept-Language": "tr,en",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const address = data.address || {};

    const countryName = address.country || "Bilinmeyen Ülke";
    const countryCode = (address.country_code || "TR").toUpperCase();

    // 0. Kuzey Kıbrıs Türk Cumhuriyeti (KKTC) Özel Coğrafi Koruması
    const isNorthernCyprus =
      (lat >= 35.10 && lat <= 35.75 && lng >= 32.70 && lng <= 34.65) ||
      (countryCode === "CY" && lat >= 35.15);

    if (isNorthernCyprus) {
      let kktcCity = "Lefkoşa";
      const rawText = `${address.city || ""} ${address.town || ""} ${address.county || ""} ${address.suburb || ""} ${address.state || ""}`.toLowerCase();

      if (rawText.includes("girne") || rawText.includes("kyrenia") || (lat >= 35.28 && lng <= 33.55 && lng >= 33.15)) {
        kktcCity = "Girne";
      } else if (rawText.includes("magusa") || rawText.includes("mağusa") || rawText.includes("famagusta") || (lat <= 35.25 && lng >= 33.75)) {
        kktcCity = "Gazimağusa";
      } else if (rawText.includes("güzelyurt") || rawText.includes("guzelyurt") || rawText.includes("morphou") || (lng < 33.15 && lat >= 35.15)) {
        kktcCity = "Güzelyurt";
      } else if (rawText.includes("iskele") || rawText.includes("trikomo") || (lat > 35.25 && lng >= 33.75)) {
        kktcCity = "İskele";
      } else if (rawText.includes("lefke") || (lng < 32.90)) {
        kktcCity = "Lefke";
      } else {
        kktcCity = "Lefkoşa";
      }

      return {
        countryName: "Kuzey Kıbrıs Türk Cumhuriyeti (KKTC)",
        countryCode: "KKTC",
        cityName: kktcCity,
        districtName: address.suburb || address.town || undefined,
      };
    }

    // 1. Türkiye İçin Özel İl/İlçe Çözümlemesi
    if (countryCode === "TR") {
      const detectedProvince = address.province || address.state || "";
      const rawDistrict =
        address.town ||
        address.city_district ||
        address.district ||
        address.county ||
        address.suburb ||
        address.municipality ||
        "";

      // İlçe sözlüğümüzden kontrol et (Örn: Bodrum -> Muğla, Çeşme -> İzmir)
      const districtResolved = resolveTurkishCityOrDistrict(rawDistrict);
      if (districtResolved.isDistrict && districtResolved.cityName) {
        return {
          countryName,
          countryCode,
          cityName: districtResolved.cityName,
          districtName: districtResolved.districtName || rawDistrict,
        };
      }

      // Doğrudan il adını çöz
      const provinceResolved = resolveTurkishCityOrDistrict(detectedProvince);
      if (provinceResolved.cityName) {
        return {
          countryName,
          countryCode,
          cityName: provinceResolved.cityName,
          districtName: rawDistrict || undefined,
        };
      }

      // Genel geri dönüş
      const fallbackCity =
        detectedProvince ||
        address.city ||
        rawDistrict ||
        "Bilinmeyen Şehir";

      return {
        countryName,
        countryCode,
        cityName: fallbackCity,
        districtName: rawDistrict || undefined,
      };
    }

    // 2. Uluslararası (Global) Lokasyonlar İçin Hiyerarşik Çözümleme
    // Küçük kasaba/mahalle yerine öncelikle metropol veya eyalet/il seviyesini al
    const globalCity =
      address.city ||
      address.province ||
      address.state ||
      address.region ||
      address.town ||
      address.municipality ||
      "Bilinmeyen Şehir";

    const globalDistrict =
      address.town ||
      address.suburb ||
      address.county ||
      undefined;

    return {
      countryName,
      countryCode,
      cityName: globalCity,
      districtName: globalDistrict && globalDistrict !== globalCity ? globalDistrict : undefined,
    };
  } catch (error) {
    console.warn("Reverse geocode servisine ulaşılamadı:", error);
    return null;
  }
}
