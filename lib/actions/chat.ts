"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { messages, travelMatches, users } from "@/lib/db/schema";
import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotification } from "@/lib/actions/notifications";

// Zod Doğrulama Şeması (Kural 10)
const sendMessageSchema = z.object({
  receiverId: z.string().uuid("Geçerli bir kullanıcı kimliği gereklidir"),
  messageText: z.string().min(1, "Mesaj boş olamaz").max(2000, "Mesaj en fazla 2000 karakter olabilir"),
  matchId: z.string().uuid().optional().nullable(),
});

export interface ConversationItem {
  partner: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email: string | null;
  };
  matchInfo: {
    matchId: string;
    cityName: string;
    overlapDates: string | null;
  };
  lastMessage: {
    id: string;
    senderId: string;
    messageText: string;
    createdAt: Date;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  isRead: boolean;
  createdAt: Date;
  isMine: boolean;
}

/**
 * 1. Kullanıcının Eşleştiği ve Sohbet Edebileceği Arkadaşların Listesini Getirir
 */
export async function getConversationList(): Promise<ConversationItem[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const currentUserId = session.user.id;

    // Sadece karşılıklı kabul edilmiş (accepted) eşleşmeleri getir
    const matches = await db
      .select()
      .from(travelMatches)
      .where(
        and(
          or(eq(travelMatches.senderId, currentUserId), eq(travelMatches.receiverId, currentUserId)),
          eq(travelMatches.status, "accepted")
        )
      )
      .orderBy(desc(travelMatches.createdAt));

    if (matches.length === 0) return [];

    // Partner ID'lerini topla
    const partnerIds = Array.from(
      new Set(
        matches.map((m) => (m.senderId === currentUserId ? m.receiverId : m.senderId))
      )
    );

    // Partner kullanıcı kayıtlarını çek
    const partnerUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, partnerIds));

    const userMap = new Map(partnerUsers.map((u) => [u.id, u]));

    const conversations: ConversationItem[] = [];

    for (const match of matches) {
      const partnerId = match.senderId === currentUserId ? match.receiverId : match.senderId;
      const partner = userMap.get(partnerId);
      if (!partner) continue;

      // Son mesajı çek
      const lastMsgRows = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, currentUserId), eq(messages.receiverId, partnerId)),
            and(eq(messages.senderId, partnerId), eq(messages.receiverId, currentUserId))
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Okunmamış mesaj sayısını çek (partnerin bana attığı okunmamışlar)
      const unreadResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.senderId, partnerId),
            eq(messages.receiverId, currentUserId),
            eq(messages.isRead, false)
          )
        );

      let overlapDates: string | null = null;
      if (match.overlapStartDate && match.overlapEndDate) {
        overlapDates = `${new Date(match.overlapStartDate).toLocaleDateString("tr-TR")} - ${new Date(
          match.overlapEndDate
        ).toLocaleDateString("tr-TR")}`;
      }

      conversations.push({
        partner,
        matchInfo: {
          matchId: match.id,
          cityName: match.cityName,
          overlapDates,
        },
        lastMessage: lastMsgRows[0]
          ? {
              id: lastMsgRows[0].id,
              senderId: lastMsgRows[0].senderId,
              messageText: lastMsgRows[0].messageText,
              createdAt: lastMsgRows[0].createdAt,
              isRead: lastMsgRows[0].isRead,
            }
          : null,
        unreadCount: unreadResult[0]?.count || 0,
      });
    }

    // En son mesajı veya en son eşleşmesi olana göre sırala
    conversations.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt.getTime() || 0;
      const timeB = b.lastMessage?.createdAt.getTime() || 0;
      return timeB - timeA;
    });

    return conversations;
  } catch (error) {
    console.error("[getConversationList] Hata:", error);
    return [];
  }
}

/**
 * 2. Belirli Bir Arkadaşla Olan Sohbet Geçmişini Getirir
 */
export async function getMessages(partnerId: string): Promise<ChatMessageItem[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const currentUserId = session.user.id;

    // Mesaj geçmişini çek
    const rows = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, currentUserId), eq(messages.receiverId, partnerId)),
          and(eq(messages.senderId, partnerId), eq(messages.receiverId, currentUserId))
        )
      )
      .orderBy(asc(messages.createdAt));

    // Partnerden gelen okunmamış mesajları anında okundu olarak işaretle
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, partnerId),
          eq(messages.receiverId, currentUserId),
          eq(messages.isRead, false)
        )
      );

    revalidatePath("/messages");

    return rows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      messageText: m.messageText,
      isRead: m.isRead,
      createdAt: m.createdAt,
      isMine: m.senderId === currentUserId,
    }));
  } catch (error) {
    console.error("[getMessages] Hata:", error);
    return [];
  }
}

/**
 * 3. Yeni Mesaj Gönderir
 */
export async function sendMessage(input: z.infer<typeof sendMessageSchema>): Promise<{
  success: boolean;
  message?: string;
  data?: ChatMessageItem;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Oturum açmanız gerekmektedir." };
    }

    const validated = sendMessageSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, message: validated.error.errors[0]?.message || "Geçersiz veri." };
    }

    const { receiverId, messageText, matchId } = validated.data;
    const senderId = session.user.id;

    if (senderId === receiverId) {
      return { success: false, message: "Kendinize mesaj gönderemezsiniz." };
    }

    // Eşleşme kontrolü (Kural: Yalnızca accepted olanlar mesajlaşabilir)
    const match = await db
      .select()
      .from(travelMatches)
      .where(
        and(
          or(
            and(eq(travelMatches.senderId, senderId), eq(travelMatches.receiverId, receiverId)),
            and(eq(travelMatches.senderId, receiverId), eq(travelMatches.receiverId, senderId))
          ),
          eq(travelMatches.status, "accepted")
        )
      )
      .limit(1);

    if (match.length === 0) {
      return {
        success: false,
        message: "Yalnızca seyahat teklifini kabul etmiş arkadaşlarınızla mesajlaşabilirsiniz.",
      };
    }

    const inserted = await db
      .insert(messages)
      .values({
        senderId,
        receiverId,
        matchId: matchId || match[0].id,
        messageText: messageText.trim(),
        isRead: false,
      })
      .returning();

    const newMsg = inserted[0];

    // Alıcıya Bildirim Gönder
    createNotification({
      userId: receiverId,
      actorId: senderId,
      type: "comment",
      title: `${session.user.name || "Seyahat arkadaşınız"} size bir mesaj gönderdi 💬`,
      content: messageText.trim().slice(0, 120),
    }).catch((e) => console.error("Mesaj bildirimi hatası:", e));

    revalidatePath("/messages");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        id: newMsg.id,
        senderId: newMsg.senderId,
        receiverId: newMsg.receiverId,
        messageText: newMsg.messageText,
        isRead: newMsg.isRead,
        createdAt: newMsg.createdAt,
        isMine: true,
      },
    };
  } catch (error) {
    console.error("[sendMessage] Hata:", error);
    return { success: false, message: "Mesaj gönderilemedi." };
  }
}

/**
 * 4. Kullanıcının Toplam Okunmamış Mesaj Sayısını Getirir (Mesaj Rozeti / Badge için)
 */
export async function getUnreadChatCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) return 0;

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.receiverId, session.user.id), eq(messages.isRead, false)));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("[getUnreadChatCount] Hata:", error);
    return 0;
  }
}
