"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, visits, trips, travelMatches, userConnections } from "@/lib/db/schema";
import { eq, and, ne, or, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotification } from "@/lib/actions/notifications";
import { PRIVACY_LEVELS } from "@/lib/constants/privacy";

export interface SearchedTraveler {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  baseCountry: string | null;
  baseCity: string | null;
  visitCount: number;
  tripCount: number;
  connectionStatus: "none" | "pending_outgoing" | "pending_incoming" | "accepted";
  relationshipType?: "friend" | "relative" | "family" | null;
  matchId?: string | null;
}

const sendConnectionSchema = z.object({
  targetUserId: z.string().uuid("Geçerli bir kullanıcı kimliği giriniz"),
  relationshipType: z.enum(["friend", "relative", "family"]).default("friend"),
  introMessage: z.string().max(500, "Mesaj en fazla 500 karakter olabilir").optional(),
});

/**
 * İki kullanıcı arasındaki ilişki türünü ve seviyesini belirler.
 */
export async function getRelationshipWeight(userId1: string, userId2: string): Promise<number> {
  if (userId1 === userId2) return 0; // Kendisi

  const conn = await db
    .select({ relationshipType: userConnections.relationshipType })
    .from(userConnections)
    .where(
      and(
        eq(userConnections.userId, userId1),
        eq(userConnections.targetUserId, userId2),
        eq(userConnections.status, "accepted")
      )
    )
    .limit(1);

  if (conn.length > 0) {
    return PRIVACY_LEVELS[conn[0].relationshipType] ?? 3;
  }

  // travelMatches tablosunda da kabul edilmiş ilişki kontrolü
  const match = await db
    .select({ relationshipType: travelMatches.relationshipType })
    .from(travelMatches)
    .where(
      and(
        or(
          and(eq(travelMatches.senderId, userId1), eq(travelMatches.receiverId, userId2)),
          and(eq(travelMatches.senderId, userId2), eq(travelMatches.receiverId, userId1))
        ),
        eq(travelMatches.status, "accepted")
      )
    )
    .limit(1);

  if (match.length > 0) {
    return PRIVACY_LEVELS[match[0].relationshipType] ?? 3;
  }

  return 4; // public (bağlantı yok / yabancı)
}

/**
 * Ad, @kullanıcı_adı veya E-posta ile Gezgin Arama
 * Katı Gizlilik ve İletişim Tercihleri Filtrelemesi:
 * - Nickname her zaman aranabilir ve görünür.
 * - Ad-Soyad showFullName=true ise aranabilir ve görünür.
 * - E-posta showEmail=true ise aranabilir ve görünür.
 * - searchPrivacy hiyerarşik kontrolü: Yalnızca kullanıcının izin verdiği ilişki derecesi arama yapabilir.
 */
export async function searchTravelers(
  query: string,
  overrideUserId?: string
): Promise<SearchedTraveler[]> {
  try {
    let currentUserId = overrideUserId;
    if (!currentUserId) {
      try {
        const session = await auth();
        currentUserId = session?.user?.id;
      } catch {
        // Oturum çözülemezse public modda arama yapılır
      }
    }

    const cleanQuery = query.trim().toLowerCase().replace(/^@/, "");

    if (cleanQuery.length < 2) {
      return [];
    }

    const noSpaceQuery = cleanQuery.replace(/\s+/g, "");
    const turkishNorm = (str: string) =>
      str
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");
    const normalizedNoSpace = turkishNorm(noSpaceQuery);

    const pattern = `%${cleanQuery}%`;
    const noSpacePattern = `%${noSpaceQuery}%`;
    const normNoSpacePattern = `%${normalizedNoSpace}%`;

    // 1. Arama Kriterlerine Göre Adayları Çek
    // Nickname her zaman aranabilir. Ad-Soyad ve Email izin bayraklarına tabidir.
    // Akıllı Eşleşme: Boşluksuz ve Türkçe karakterden bağımsız (TRANSLATE)
    const baseConditions = [eq(users.isActive, true)];
    if (currentUserId) {
      baseConditions.push(ne(users.id, currentUserId));
    }

    const searchConditions = or(
      sql`LOWER(${users.username}) LIKE ${pattern}`,
      sql`LOWER(REPLACE(${users.username}, ' ', '')) LIKE ${noSpacePattern}`,
      sql`LOWER(${users.email}) LIKE ${pattern}`,
      and(
        eq(users.showFullName, true),
        or(
          sql`LOWER(${users.fullName}) LIKE ${pattern}`,
          sql`LOWER(REPLACE(${users.fullName}, ' ', '')) LIKE ${noSpacePattern}`,
          sql`TRANSLATE(LOWER(REPLACE(${users.fullName}, ' ', '')), 'ığüşöç', 'igusoc') LIKE ${normNoSpacePattern}`
        )
      ),
      and(
        eq(users.showEmail, true),
        sql`LOWER(${users.email}) LIKE ${pattern}`
      )
    );

    if (searchConditions) {
      baseConditions.push(searchConditions);
    }

    const candidateUsers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        avatarUrl: users.avatarUrl,
        baseCountry: users.baseCountry,
        baseCity: users.baseCity,
        showFullName: users.showFullName,
        showEmail: users.showEmail,
        showPhone: users.showPhone,
        searchPrivacy: users.searchPrivacy,
      })
      .from(users)
      .where(and(...baseConditions))
      .limit(30);

    if (candidateUsers.length === 0) {
      return [];
    }

    const candidateIds = candidateUsers.map((u) => u.id);

    // 2. Mevcut Bağlantı ve İstek Durumlarını Tek Seferde Çek
    const existingMatches = currentUserId
      ? await db
          .select({
            id: travelMatches.id,
            senderId: travelMatches.senderId,
            receiverId: travelMatches.receiverId,
            status: travelMatches.status,
            relationshipType: travelMatches.relationshipType,
          })
          .from(travelMatches)
          .where(
            or(
              and(eq(travelMatches.senderId, currentUserId), inArray(travelMatches.receiverId, candidateIds)),
              and(eq(travelMatches.receiverId, currentUserId), inArray(travelMatches.senderId, candidateIds))
            )
          )
      : [];

    // 3. Gezgin İstatistiklerini (Visits & Trips) Çek
    const userVisits = await db
      .select({ userId: visits.userId })
      .from(visits)
      .where(inArray(visits.userId, candidateIds));

    const userTrips = await db
      .select({ userId: trips.userId })
      .from(trips)
      .where(inArray(trips.userId, candidateIds));

    const visitCounts: Record<string, number> = {};
    for (const v of userVisits) {
      visitCounts[v.userId] = (visitCounts[v.userId] || 0) + 1;
    }

    const tripCounts: Record<string, number> = {};
    for (const t of userTrips) {
      tripCounts[t.userId] = (tripCounts[t.userId] || 0) + 1;
    }

    // 4. Hiyerarşik Gizlilik Filtrelemesi ve Maskeleme
    const results: SearchedTraveler[] = [];

    for (const target of candidateUsers) {
      // Kullanıcının searchPrivacy gereksinimi:
      const requiredPrivacyLevel = PRIVACY_LEVELS[target.searchPrivacy || "public"] ?? 4;

      // İstek yapanın bu kullanıcıya göre ilişki seviyesi
      const viewerWeight = currentUserId
        ? await getRelationshipWeight(currentUserId, target.id)
        : 4; // anonim / public

      // Kural: viewerWeight <= requiredPrivacyLevel olmalı
      if (viewerWeight > requiredPrivacyLevel) {
        // İzin verilen seviyeden daha uzak bir ilişkide (Örn: searchPrivacy 'friend' (3) ama viewer 'public' (4))
        continue;
      }

      // Mevcut eşleşme/istek durumu bul
      const match = existingMatches.find(
        (m) =>
          (m.senderId === currentUserId && m.receiverId === target.id) ||
          (m.receiverId === currentUserId && m.senderId === target.id)
      );

      let connectionStatus: SearchedTraveler["connectionStatus"] = "none";
      let relType: SearchedTraveler["relationshipType"] = null;
      let matchId: string | null = null;

      if (match) {
        matchId = match.id;
        relType = match.relationshipType as any;
        if (match.status === "accepted") {
          connectionStatus = "accepted";
        } else if (match.status === "pending") {
          connectionStatus = match.senderId === currentUserId ? "pending_outgoing" : "pending_incoming";
        }
      }

      // Maskeleme
      results.push({
        id: target.id,
        username: target.username || "gezgin",
        fullName: target.showFullName ? target.fullName : null,
        email: target.showEmail ? target.email : null,
        phoneNumber: target.showPhone ? target.phoneNumber : null,
        avatarUrl: target.avatarUrl,
        baseCountry: target.baseCountry || "TR",
        baseCity: target.baseCity || "İstanbul",
        visitCount: visitCounts[target.id] || 0,
        tripCount: tripCounts[target.id] || 0,
        connectionStatus,
        relationshipType: relType,
        matchId,
      });
    }

    return results;
  } catch (error) {
    console.error("Gezgin arama hatası:", error);
    return [];
  }
}

/**
 * Belirli bir kullanıcıya doğrudan bağlantı / arkadaşlık isteği gönderir.
 * İlişki türü: 'friend' (Arkadaş) | 'relative' (Akraba) | 'family' (Aile)
 */
export async function sendTravelerConnectionRequest(
  input: z.infer<typeof sendConnectionSchema>
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Lütfen önce giriş yapınız." };
    }

    const validated = sendConnectionSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, message: validated.error.issues[0]?.message || "Geçersiz veri." };
    }

    const { targetUserId, relationshipType, introMessage } = validated.data;
    const currentUserId = session.user.id;

    if (currentUserId === targetUserId) {
      return { success: false, message: "Kendinize bağlantı isteği gönderemezsiniz." };
    }

    // Hedef kullanıcıyı kontrol et
    const targetUser = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        baseCity: users.baseCity,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (targetUser.length === 0) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    // Mevcut bağlantı veya istek var mı?
    const existing = await db
      .select({ id: travelMatches.id, status: travelMatches.status, senderId: travelMatches.senderId })
      .from(travelMatches)
      .where(
        or(
          and(eq(travelMatches.senderId, currentUserId), eq(travelMatches.receiverId, targetUserId)),
          and(eq(travelMatches.senderId, targetUserId), eq(travelMatches.receiverId, currentUserId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].status === "accepted") {
        return { success: false, message: "Bu kullanıcıyla zaten bağlantınız bulunmaktadır." };
      }
      if (existing[0].status === "pending") {
        return {
          success: false,
          message:
            existing[0].senderId === currentUserId
              ? "Bu kullanıcıya zaten bekleyen bir bağlantı isteğiniz bulunmaktadır."
              : "Bu kullanıcı size zaten bir istek göndermiş! 'Gelen Teklifler' sekmesinden kabul edebilirsiniz.",
        };
      }
    }

    const relLabels: Record<string, string> = {
      family: "Ailem 🏡",
      relative: "Akrabam 🤝",
      friend: "Arkadaşım 👥",
    };

    const label = relLabels[relationshipType] || "Arkadaşım";
    const defaultMsg = `Merhaba @${targetUser[0].username || targetUser[0].fullName}! Seni TatildeBugün'de ${label} olarak eklemek istedim 🌴`;
    const finalMsg = introMessage?.trim() || defaultMsg;

    const inserted = await db
      .insert(travelMatches)
      .values({
        senderId: currentUserId,
        receiverId: targetUserId,
        cityName: targetUser[0].baseCity || "Gezgin Ağı",
        status: "pending",
        relationshipType,
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
      title: `${session.user.name || "Bir gezgin"} size ${label} bağlantı isteği gönderdi! 🤝`,
      content: finalMsg,
    }).catch((e) => console.error("Bağlantı isteği bildirimi gönderilemedi:", e));

    revalidatePath("/match");
    revalidatePath("/feed");

    return {
      success: true,
      message: `${label} bağlantı isteğiniz başarıyla iletildi! 🎉`,
    };
  } catch (error) {
    console.error("Bağlantı isteği gönderilirken hata:", error);
    return { success: false, message: "Bağlantı isteği iletilemedi." };
  }
}
