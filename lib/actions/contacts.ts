"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, visits, travelMatches } from "@/lib/db/schema";
import { eq, and, ne, inArray, or, isNotNull, sql } from "drizzle-orm";
import { normalizeToInternational } from "@/lib/utils/phone";
import { z } from "zod";
import { createNotification } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface MatchedContactFriend {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  baseCity: string | null;
  baseCountry: string | null;
  visitedCountriesCount: number;
  visitedCitiesCount: number;
  hasExistingRequest: boolean;
  requestStatus?: "pending" | "accepted" | "declined" | null;
}

const findFriendsHashesSchema = z.object({
  hashes: z
    .array(
      z
        .string()
        .regex(/^[a-f0-9]{64}$/i, "Geçersiz SHA-256 hash formatı")
    )
    .max(1000, "En fazla 1000 numara taranabilir"),
});

const findFriendsRawInputSchema = z.object({
  phoneNumbers: z.array(z.string()).max(1000, "En fazla 1000 numara taranabilir"),
});

/**
 * KVKK & GDPR UYUMLU SIFIR-BİLGİLİ (ZERO-KNOWLEDGE) EŞLEŞTİRME
 * İstemci tarafında WebCrypto ile SHA-256 hash'lenmiş telefon numaralarını sorgular.
 * Sunucuya ASLA açık telefon numarası gelmez; eşleşmeyen hash'ler bellekte tutulmaz.
 */
export async function findFriendsByContactHashes(
  phoneHashes: string[]
): Promise<{ success: boolean; message?: string; friends: MatchedContactFriend[] }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Oturum açmanız gerekmektedir.", friends: [] };
    }

    const validation = findFriendsHashesSchema.safeParse({ hashes: phoneHashes });
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.errors[0]?.message || "Geçersiz hash listesi.",
        friends: [],
      };
    }

    const validHashes = Array.from(new Set(validation.data.hashes.map((h) => h.toLowerCase())));
    if (validHashes.length === 0) {
      return { success: true, friends: [] };
    }

    const currentUserId = session.user.id;

    // 1. Veritabanındaki aktif kullanıcıların SHA-256 indeksli telefonları ile eşleştir
    const matchedUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        baseCity: users.baseCity,
        baseCountry: users.baseCountry,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.phoneNumber),
          inArray(sql`encode(sha256(${users.phoneNumber}::bytea), 'hex')`, validHashes),
          ne(users.id, currentUserId),
          eq(users.isActive, true)
        )
      );

    if (matchedUsers.length === 0) {
      return { success: true, friends: [] };
    }

    const matchedIds = matchedUsers.map((u) => u.id);

    // 2. Kullanıcıların Ziyaret Ettiği Ülke ve Şehir Sayılarını Hesapla
    const userVisits = await db
      .select({
        userId: visits.userId,
        countryCode: visits.countryCode,
        cityName: visits.cityName,
      })
      .from(visits)
      .where(inArray(visits.userId, matchedIds));

    // Her kullanıcı için tekil ülke ve şehir kümeleri
    const userStatsMap: Record<string, { countries: Set<string>; cities: Set<string> }> = {};
    for (const v of userVisits) {
      if (!userStatsMap[v.userId]) {
        userStatsMap[v.userId] = { countries: new Set(), cities: new Set() };
      }
      if (v.countryCode) userStatsMap[v.userId].countries.add(v.countryCode.toUpperCase());
      if (v.cityName) userStatsMap[v.userId].cities.add(v.cityName.toLowerCase());
    }

    // 3. Mevcut Bağlantı / Eşleşme İsteklerini Sorgula
    const existingMatches = await db
      .select({
        senderId: travelMatches.senderId,
        receiverId: travelMatches.receiverId,
        status: travelMatches.status,
      })
      .from(travelMatches)
      .where(
        or(
          and(eq(travelMatches.senderId, currentUserId), inArray(travelMatches.receiverId, matchedIds)),
          and(eq(travelMatches.receiverId, currentUserId), inArray(travelMatches.senderId, matchedIds))
        )
      );

    // 4. Sonuç Listesini Hazırla
    const friends: MatchedContactFriend[] = matchedUsers.map((u) => {
      const stats = userStatsMap[u.id] || { countries: new Set(), cities: new Set() };
      const matchRecord = existingMatches.find(
        (m) =>
          (m.senderId === currentUserId && m.receiverId === u.id) ||
          (m.senderId === u.id && m.receiverId === currentUserId)
      );

      return {
        id: u.id,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        baseCity: u.baseCity,
        baseCountry: u.baseCountry,
        visitedCountriesCount: stats.countries.size,
        visitedCitiesCount: stats.cities.size,
        hasExistingRequest: !!matchRecord,
        requestStatus: matchRecord ? (matchRecord.status as "pending" | "accepted" | "declined") : null,
      };
    });

    return {
      success: true,
      friends,
    };
  } catch (error) {
    console.error("Rehber hash eşleştirme hatası:", error);
    return {
      success: false,
      message: "Rehber eşleştirmesi yapılırken bir hata oluştu.",
      friends: [],
    };
  }
}

/**
 * Ham numaralarla eşleştirme fonksiyonu (Geriye dönük uyumluluk).
 * Numaraları anında bellekte E.164'e çevirip SHA-256 hash'ler ve findFriendsByContactHashes'e devreder.
 */
export async function findFriendsByContacts(
  rawPhoneNumbers: string[]
): Promise<{ success: boolean; message?: string; friends: MatchedContactFriend[] }> {
  try {
    const validation = findFriendsRawInputSchema.safeParse({ phoneNumbers: rawPhoneNumbers });
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.errors[0]?.message || "Geçersiz telefon listesi.",
        friends: [],
      };
    }

    const hashes: string[] = [];
    for (const raw of validation.data.phoneNumbers) {
      if (!raw || typeof raw !== "string") continue;
      const normalized = normalizeToInternational(raw, "+90");
      if (normalized && normalized.length >= 10) {
        const hash = crypto.createHash("sha256").update(normalized).digest("hex");
        hashes.push(hash);
      }
    }

    if (hashes.length === 0) {
      return { success: true, friends: [] };
    }

    return await findFriendsByContactHashes(hashes);
  } catch (error) {
    console.error("Rehber eşleştirme hatası:", error);
    return {
      success: false,
      message: "Rehber eşleştirmesi yapılırken bir hata oluştu.",
      friends: [],
    };
  }
}

/**
 * Rehberden bulunan arkadaşa bağlantı / rota arkadaşlığı teklifi gönderir.
 */
export async function sendContactFriendRequest(targetUserId: string, introMessage?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Oturum açmanız gerekmektedir." };
    }

    const currentUserId = session.user.id;

    if (currentUserId === targetUserId) {
      return { success: false, message: "Kendinize bağlantı isteği gönderemezsiniz." };
    }

    // Hedef kullanıcıyı doğrula
    const targetUser = await db
      .select({ id: users.id, fullName: users.fullName, baseCity: users.baseCity })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (targetUser.length === 0) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    // Mevcut talep var mı?
    const existing = await db
      .select({ id: travelMatches.id, status: travelMatches.status })
      .from(travelMatches)
      .where(
        or(
          and(eq(travelMatches.senderId, currentUserId), eq(travelMatches.receiverId, targetUserId)),
          and(eq(travelMatches.senderId, targetUserId), eq(travelMatches.receiverId, currentUserId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        message:
          existing[0].status === "accepted"
            ? "Zaten rota arkadaşısınız."
            : "Zaten bekleyen bir bağlantı teklifiniz var.",
      };
    }

    const defaultMsg = `Merhaba ${targetUser[0].fullName}! Seni rehberimde gördüm ve TatildeBugün'de rota arkadaşı olarak eklemek istedim 🌴`;
    const finalMsg = introMessage?.trim() || defaultMsg;

    const inserted = await db
      .insert(travelMatches)
      .values({
        senderId: currentUserId,
        receiverId: targetUserId,
        cityName: targetUser[0].baseCity || "Ortak Rota",
        status: "pending",
        introMessage: finalMsg,
      })
      .returning();

    // Bildirim gönder
    createNotification({
      userId: targetUserId,
      actorId: currentUserId,
      type: "match_request",
      targetType: "match",
      targetId: inserted[0].id,
      title: `${session.user.name || "Bir rehber arkadaşınız"} sizinle bağlantı kurmak istiyor 👥`,
      content: finalMsg,
    }).catch((e) => console.error("Rehber arkadaşlığı bildirim hatası:", e));

    revalidatePath("/match");
    revalidatePath("/feed");

    return {
      success: true,
      message: "Bağlantı teklifi iletildi!",
    };
  } catch (error) {
    console.error("Rehber arkadaşlık isteği hatası:", error);
    return { success: false, message: "İstek gönderilemedi." };
  }
}
