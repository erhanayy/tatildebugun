"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  visits,
  trips,
  tripStops,
  users,
  reactions,
  comments,
  type Visit,
  type Trip,
  type TripStop,
  travelMatches,
  feedMutes,
} from "@/lib/db/schema";
import { eq, and, or, desc, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { getStarRating } from "@/lib/constants/gamification";

export type ReactionType = "heart" | "plane" | "palm" | "clap";

export interface FeedItem {
  id: string;
  type: "visit" | "trip";
  title: string;
  subtitle: string;
  countryCode: string;
  cityName?: string;
  districtName?: string | null;
  notes?: string | null;
  dateStr: string;
  stayDurationDays?: number;
  visitType?: string;
  transportType?: string;
  status?: string;
  createdAt: Date;
  author: {
    id: string;
    fullName: string;
    username?: string | null;
    email: string | null;
    avatarUrl: string | null;
    isSelf?: boolean;
    connectionStatus?: "none" | "pending_outgoing" | "pending_incoming" | "accepted";
    relationshipType?: "friend" | "relative" | "family" | null;
    starDisplay?: string;
    starCount?: number;
  };
  stops?: TripStop[];
  reactions: {
    counts: Record<ReactionType, number>;
    total: number;
    userReaction?: ReactionType | null;
  };
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    commentText: string;
    createdAt: Date;
  }>;
}

/**
 * Ziyaret veya Rota için Beğeni / Reaksiyon Verir veya Kaldırır
 */
export async function toggleReaction(
  targetType: "visit" | "trip",
  targetId: string,
  reactionType: ReactionType = "heart"
): Promise<{ success: boolean; activeReaction?: ReactionType | null }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false };
    }

    const existing = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, session.user.id),
          eq(reactions.targetType, targetType),
          eq(reactions.targetId, targetId)
        )
      );

    if (existing.length > 0) {
      const current = existing[0];
      if (current.reactionType === reactionType) {
        // Aynı reaksiyona tekrar tıklandıysa kaldır (Unlike)
        await db.delete(reactions).where(eq(reactions.id, current.id));
        revalidatePath("/feed");
        return { success: true, activeReaction: null };
      } else {
        // Reaksiyon tipini değiştir
        await db
          .update(reactions)
          .set({ reactionType })
          .where(eq(reactions.id, current.id));
        revalidatePath("/feed");
        return { success: true, activeReaction: reactionType };
      }
    } else {
      // Yeni reaksiyon ekle
      await db.insert(reactions).values({
        userId: session.user.id,
        targetType,
        targetId,
        reactionType,
      });

      // Hedef içeriğin sahibini bul ve bildirim gönder
      let targetOwnerId: string | null = null;
      let targetTitle = "seyahatinizi";

      if (targetType === "visit") {
        const v = await db
          .select({ userId: visits.userId, cityName: visits.cityName })
          .from(visits)
          .where(eq(visits.id, targetId))
          .limit(1);
        if (v[0]) {
          targetOwnerId = v[0].userId;
          targetTitle = `${v[0].cityName} seyahatinizi`;
        }
      } else if (targetType === "trip") {
        const t = await db
          .select({ userId: trips.userId, title: trips.title })
          .from(trips)
          .where(eq(trips.id, targetId))
          .limit(1);
        if (t[0]) {
          targetOwnerId = t[0].userId;
          targetTitle = `"${t[0].title}" rotanızı`;
        }
      }

      if (targetOwnerId && targetOwnerId !== session.user.id) {
        const emojiMap: Record<ReactionType, string> = {
          heart: "❤️",
          plane: "✈️",
          palm: "🌴",
          clap: "👏",
        };
        const emoji = emojiMap[reactionType] || "❤️";
        createNotification({
          userId: targetOwnerId,
          actorId: session.user.id,
          type: "reaction",
          targetType,
          targetId,
          title: `${session.user.name || "Bir gezgin"} ${targetTitle} beğendi ${emoji}`,
        }).catch((e) => console.error("Bildirim gönderme hatası:", e));
      }

      revalidatePath("/feed");
      return { success: true, activeReaction: reactionType };
    }
  } catch (error) {
    console.error("Reaksiyon hatası:", error);
    return { success: false };
  }
}

/**
 * Ziyaret veya Rotaya Yorum Ekler
 */
export async function addComment(
  targetType: "visit" | "trip",
  targetId: string,
  commentText: string
): Promise<{ success: boolean; comment?: any; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Giriş yapmanız gerekmektedir." };
    }

    const trimmed = commentText.trim();
    if (!trimmed) {
      return { success: false, message: "Yorum metni boş olamaz." };
    }

    const inserted = await db
      .insert(comments)
      .values({
        userId: session.user.id,
        targetType,
        targetId,
        commentText: trimmed,
      })
      .returning();

    // Hedef seyahatin/rotanın sahibine bildirim gönder
    let commentOwnerId: string | null = null;
    let commentTargetTitle = "seyahatinize";

    if (targetType === "visit") {
      const v = await db
        .select({ userId: visits.userId, cityName: visits.cityName })
        .from(visits)
        .where(eq(visits.id, targetId))
        .limit(1);
      if (v[0]) {
        commentOwnerId = v[0].userId;
        commentTargetTitle = `${v[0].cityName} seyahatinize`;
      }
    } else if (targetType === "trip") {
      const t = await db
        .select({ userId: trips.userId, title: trips.title })
        .from(trips)
        .where(eq(trips.id, targetId))
        .limit(1);
      if (t[0]) {
        commentOwnerId = t[0].userId;
        commentTargetTitle = `"${t[0].title}" rotanıza`;
      }
    }

    if (commentOwnerId && commentOwnerId !== session.user.id) {
      createNotification({
        userId: commentOwnerId,
        actorId: session.user.id,
        type: "comment",
        targetType,
        targetId,
        title: `${session.user.name || "Bir gezgin"} ${commentTargetTitle} yorum yaptı`,
        content: trimmed,
      }).catch((e) => console.error("Yorum bildirimi hatası:", e));
    }

    revalidatePath("/feed");
    return {
      success: true,
      comment: {
        id: inserted[0].id,
        userId: session.user.id,
        userName: session.user.name || "Gezgin",
        commentText: trimmed,
        createdAt: inserted[0].createdAt,
      },
    };
  } catch (error) {
    console.error("Yorum ekleme hatası:", error);
    return { success: false, message: "Yorum kaydedilemedi." };
  }
}

/**
 * Gezgin Akışı (Travel Feed) İçeriklerini Getirir
 */
export async function getFeedPosts(filter: "all" | "friends" | "family" = "all"): Promise<FeedItem[]> {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    // 0. Gizlenen Gezginleri (Feed Mutes) Tespit Et
    const mutedRows = currentUserId
      ? await db
          .select({ mutedUserId: feedMutes.mutedUserId })
          .from(feedMutes)
          .where(eq(feedMutes.userId, currentUserId))
      : [];
    const mutedUserIds = mutedRows.map((m) => m.mutedUserId);

    // 1. Ziyaretleri Çek (Gizlenen kullanıcılar hariç)
    const visitConditions = [eq(visits.visibility, "public")];
    if (mutedUserIds.length > 0) {
      visitConditions.push(notInArray(visits.userId, mutedUserIds));
    }

    const allVisits = await db
      .select({
        visit: visits,
        user: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(visits)
      .innerJoin(users, eq(visits.userId, users.id))
      .where(and(...visitConditions))
      .orderBy(desc(visits.createdAt))
      .limit(30);

    // 2. Rotaları Çek (Gizlenen kullanıcılar hariç)
    const tripConditions = [eq(trips.visibility, "public")];
    if (mutedUserIds.length > 0) {
      tripConditions.push(notInArray(trips.userId, mutedUserIds));
    }

    const allTrips = await db
      .select({
        trip: trips,
        user: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(trips)
      .innerJoin(users, eq(trips.userId, users.id))
      .where(and(...tripConditions))
      .orderBy(desc(trips.createdAt))
      .limit(20);

    // 3. Durakları Çek
    const allStops = await db.select().from(tripStops);

    // 4. Reaksiyonları ve Yorumları Çek
    const allReactions = await db.select().from(reactions);
    const allComments = await db
      .select({
        comment: comments,
        user: {
          fullName: users.fullName,
        },
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .orderBy(desc(comments.createdAt));

    // 5. Yazar Bağlantı / Eşleşme Durumlarını Tek Sorguda Çek
    const authorIds = Array.from(
      new Set([...allVisits.map((v) => v.user.id), ...allTrips.map((t) => t.user.id)])
    );

    const existingMatches =
      currentUserId && authorIds.length > 0
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
                and(eq(travelMatches.senderId, currentUserId), inArray(travelMatches.receiverId, authorIds)),
                and(eq(travelMatches.receiverId, currentUserId), inArray(travelMatches.senderId, authorIds))
              )
            )
        : [];

    // 5.1 Yazar Gezgin Yıldızlarını Hesapla (Her 5 ülke = 1 ⭐)
    const authorVisitsData = authorIds.length > 0
      ? await db
          .select({
            userId: visits.userId,
            countryCode: visits.countryCode,
          })
          .from(visits)
          .where(inArray(visits.userId, authorIds))
      : [];

    const authorCountrySets = new Map<string, Set<string>>();
    for (const v of authorVisitsData) {
      if (!v.countryCode) continue;
      let set = authorCountrySets.get(v.userId);
      if (!set) {
        set = new Set<string>();
        authorCountrySets.set(v.userId, set);
      }
      set.add(v.countryCode.toUpperCase());
    }

    function getAuthorStars(authorId: string) {
      const countryCount = authorCountrySets.get(authorId)?.size || 0;
      const starInfo = getStarRating(countryCount);
      return {
        starCount: starInfo.stars,
        starDisplay: starInfo.starDisplay,
      };
    }

    function getAuthorConnection(authorId: string) {
      const isSelf = Boolean(currentUserId && authorId === currentUserId);
      if (isSelf) {
        return { isSelf: true, connectionStatus: "none" as const, relationshipType: null };
      }
      const match = existingMatches.find(
        (m) =>
          (m.senderId === currentUserId && m.receiverId === authorId) ||
          (m.receiverId === currentUserId && m.senderId === authorId)
      );
      if (!match) {
        return { isSelf: false, connectionStatus: "none" as const, relationshipType: null };
      }
      let connectionStatus: "accepted" | "pending_outgoing" | "pending_incoming" = "none" as any;
      if (match.status === "accepted") {
        connectionStatus = "accepted";
      } else if (match.status === "pending") {
        connectionStatus = match.senderId === currentUserId ? "pending_outgoing" : "pending_incoming";
      }
      return {
        isSelf: false,
        connectionStatus,
        relationshipType: match.relationshipType as "friend" | "relative" | "family",
      };
    }

    // Ziyaretleri FeedItem formatına dönüştür
    const visitItems: FeedItem[] = allVisits.map(({ visit, user }) => {
      const itemReactions = allReactions.filter(
        (r) => r.targetType === "visit" && r.targetId === visit.id
      );

      const counts: Record<ReactionType, number> = {
        heart: itemReactions.filter((r) => r.reactionType === "heart").length,
        plane: itemReactions.filter((r) => r.reactionType === "plane").length,
        palm: itemReactions.filter((r) => r.reactionType === "palm").length,
        clap: itemReactions.filter((r) => r.reactionType === "clap").length,
      };

      const userReaction = currentUserId
        ? itemReactions.find((r) => r.userId === currentUserId)?.reactionType as ReactionType
        : null;

      const itemComments = allComments
        .filter((c) => c.comment.targetType === "visit" && c.comment.targetId === visit.id)
        .map((c) => ({
          id: c.comment.id,
          userId: c.comment.userId,
          userName: c.user.fullName,
          commentText: c.comment.commentText,
          createdAt: c.comment.createdAt,
        }));

      const dateStr =
        visit.dateType === "exact" && visit.startDate && visit.endDate
          ? `${new Date(visit.startDate).toLocaleDateString("tr-TR")} - ${new Date(
              visit.endDate
            ).toLocaleDateString("tr-TR")}`
          : visit.dateType === "timeless"
          ? "Zamansız Ziyaret"
          : `${visit.visitYear || ""} ${visit.visitMonth ? `(${visit.visitMonth}. Ay)` : ""}`;

      const conn = getAuthorConnection(user.id);

      const authorStars = getAuthorStars(user.id);

      return {
        id: visit.id,
        type: "visit",
        title: `${visit.cityName}, ${visit.countryName}`,
        subtitle: visit.districtName ? `📍 ${visit.districtName} bölgesi` : "Yeni Ziyaret Kaydı",
        countryCode: visit.countryCode,
        cityName: visit.cityName,
        districtName: visit.districtName,
        notes: visit.notes,
        dateStr,
        stayDurationDays: visit.stayDurationDays,
        visitType: visit.visitType,
        createdAt: visit.createdAt,
        author: {
          ...user,
          isSelf: conn.isSelf,
          connectionStatus: conn.connectionStatus,
          relationshipType: conn.relationshipType,
          starCount: authorStars.starCount,
          starDisplay: authorStars.starDisplay,
        },
        reactions: {
          counts,
          total: itemReactions.length,
          userReaction,
        },
        comments: itemComments,
      };
    });

    // Rotaları FeedItem formatına dönüştür
    const tripItems: FeedItem[] = allTrips.map(({ trip, user }) => {
      const stops = allStops.filter((s) => s.tripId === trip.id);
      const itemReactions = allReactions.filter(
        (r) => r.targetType === "trip" && r.targetId === trip.id
      );

      const counts: Record<ReactionType, number> = {
        heart: itemReactions.filter((r) => r.reactionType === "heart").length,
        plane: itemReactions.filter((r) => r.reactionType === "plane").length,
        palm: itemReactions.filter((r) => r.reactionType === "palm").length,
        clap: itemReactions.filter((r) => r.reactionType === "clap").length,
      };

      const userReaction = currentUserId
        ? itemReactions.find((r) => r.userId === currentUserId)?.reactionType as ReactionType
        : null;

      const itemComments = allComments
        .filter((c) => c.comment.targetType === "trip" && c.comment.targetId === trip.id)
        .map((c) => ({
          id: c.comment.id,
          userId: c.comment.userId,
          userName: c.user.fullName,
          commentText: c.comment.commentText,
          createdAt: c.comment.createdAt,
        }));

      const dateStr =
        trip.startDate && trip.endDate
          ? `${new Date(trip.startDate).toLocaleDateString("tr-TR")} - ${new Date(
              trip.endDate
            ).toLocaleDateString("tr-TR")}`
          : "Tarihsiz Rota";

      const conn = getAuthorConnection(user.id);
      const authorStars = getAuthorStars(user.id);

      return {
        id: trip.id,
        type: "trip",
        title: trip.title,
        subtitle: `${stops.length} Duraklı Rota (${stops.map((s) => s.cityName).join(" ➔ ")})`,
        countryCode: stops[0]?.countryCode || "TR",
        notes: trip.description,
        dateStr,
        transportType: trip.transportType,
        status: trip.status,
        createdAt: trip.createdAt,
        author: {
          ...user,
          isSelf: conn.isSelf,
          connectionStatus: conn.connectionStatus,
          relationshipType: conn.relationshipType,
          starCount: authorStars.starCount,
          starDisplay: authorStars.starDisplay,
        },
        stops,
        reactions: {
          counts,
          total: itemReactions.length,
          userReaction,
        },
        comments: itemComments,
      };
    });

    // Tümünü tarihe göre sırala
    const combined = [...visitItems, ...tripItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return combined;
  } catch (error) {
    console.error("Akış getirilirken hata:", error);
    return [];
  }
}

/**
 * Gezgini Akıştan Kalıcı Olarak Gizler (Mute)
 */
export async function muteTravelerAction(targetUserId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Lütfen önce giriş yapınız." };
    }

    if (session.user.id === targetUserId) {
      return { success: false, message: "Kendinizi akışınızdan gizleyemezsiniz." };
    }

    await db
      .insert(feedMutes)
      .values({
        userId: session.user.id,
        mutedUserId: targetUserId,
      })
      .onConflictDoNothing();

    revalidatePath("/feed");
    revalidatePath("/profile");

    return { success: true, message: "Gezgin akışınızdan başarıyla gizlendi." };
  } catch (error) {
    console.error("Gezgin gizleme hatası:", error);
    return { success: false, message: "Gezgin gizlenirken bir hata oluştu." };
  }
}

/**
 * Akıştan Gizlenen Gezginin Gizlemesini Kaldırır (Unmute)
 */
export async function unmuteTravelerAction(targetUserId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Lütfen önce giriş yapınız." };
    }

    await db
      .delete(feedMutes)
      .where(
        and(
          eq(feedMutes.userId, session.user.id),
          eq(feedMutes.mutedUserId, targetUserId)
        )
      );

    revalidatePath("/feed");
    revalidatePath("/profile");

    return { success: true, message: "Gezgin tekrar akışınızda gösterilecek." };
  } catch (error) {
    console.error("Gizleme kaldırma hatası:", error);
    return { success: false, message: "Gizleme kaldırılırken bir hata oluştu." };
  }
}

/**
 * Giriş Yapan Kullanıcının Gizlediği Gezginlerin Listesini Getirir
 */
export async function getMutedTravelersAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const list = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        mutedAt: feedMutes.createdAt,
      })
      .from(feedMutes)
      .innerJoin(users, eq(feedMutes.mutedUserId, users.id))
      .where(eq(feedMutes.userId, session.user.id))
      .orderBy(desc(feedMutes.createdAt));

    return list;
  } catch (error) {
    console.error("Gizlenen gezginleri çekme hatası:", error);
    return [];
  }
}

/**
 * Gezginle Olan Bağlantıyı / Arkadaşlığı Kaldırır (Disconnect)
 */
export async function disconnectTravelerAction(targetUserId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Lütfen önce giriş yapınız." };
    }

    const currentUserId = session.user.id;

    await db
      .delete(travelMatches)
      .where(
        or(
          and(eq(travelMatches.senderId, currentUserId), eq(travelMatches.receiverId, targetUserId)),
          and(eq(travelMatches.senderId, targetUserId), eq(travelMatches.receiverId, currentUserId))
        )
      );

    revalidatePath("/feed");
    revalidatePath("/match");
    revalidatePath("/messages");

    return { success: true, message: "Bağlantı başarıyla kaldırıldı." };
  } catch (error) {
    console.error("Bağlantı kaldırma hatası:", error);
    return { success: false, message: "Bağlantı kaldırılırken bir hata oluştu." };
  }
}

