"use server";

import { db } from "@/lib/db";
import { contracts, userContracts, Contract } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { z } from "zod";

/**
 * 1. Kullanıcının İmzalaması Gereken Eksik Aktif Sözleşmeleri Getirir
 */
export async function getMissingContracts(userId: string): Promise<Contract[]> {
  if (!userId) return [];

  // Sistemdeki tüm aktif (en güncel yayındaki) sözleşmeleri al
  const activeContracts = await db
    .select()
    .from(contracts)
    .where(eq(contracts.isActive, true))
    .orderBy(desc(contracts.createdAt));

  if (activeContracts.length === 0) return [];

  // Kullanıcının daha önce onayladığı sözleşmelerin ID listesini al
  const signedList = await db
    .select({ contractId: userContracts.contractId })
    .from(userContracts)
    .where(eq(userContracts.userId, userId));

  const signedContractIds = new Set(signedList.map((s) => s.contractId));

  // Kullanıcının henüz onaylamadığı aktif sözleşmeleri döndür
  return activeContracts.filter((c) => !signedContractIds.has(c.id));
}

/**
 * 2. Sözleşmeyi Kullanıcı Adına İmzalar ve Onaylar
 */
export async function signContract(userId: string, contractId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.id !== userId) {
    return { success: false, error: "Yetkisiz işlem! Oturum doğrulanamadı." };
  }

  if (!userId || !contractId) {
    return { success: false, error: "Kullanıcı veya Sözleşme ID bilgisi eksik." };
  }

  // Zaten imzalanmış mı kontrol et
  const existing = await db
    .select()
    .from(userContracts)
    .where(eq(userContracts.userId, userId))
    .limit(100);

  const alreadySigned = existing.some((c) => c.contractId === contractId);
  if (alreadySigned) {
    return { success: true };
  }

  await db.insert(userContracts).values({
    userId,
    contractId,
    acceptedAt: new Date(),
  });

  // Tüm rotalardaki önbelleği tazele
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/tatildeyim");
  revalidatePath("/feed");
  revalidatePath("/match");
  revalidatePath("/profile");

  return { success: true };
}

/**
 * 3. Yönetici İçin Tüm Sözleşme Versiyonlarını Listeler
 */
export async function getAdminContracts(): Promise<Contract[]> {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    throw new Error("Bu işlemi yalnızca sistem yöneticileri gerçekleştirebilir.");
  }

  return await db
    .select()
    .from(contracts)
    .orderBy(desc(contracts.createdAt));
}

const createContractSchema = z.object({
  type: z.enum(["KVKK", "USER_AGREEMENT", "PRIVACY_POLICY", "OTHER"]),
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  version: z.string().min(1, "Versiyon bilgisi zorunludur."),
  content: z.string().min(10, "Sözleşme içeriği en az 10 karakter olmalıdır."),
});

/**
 * 4. Yeni Bir Sözleşme Versiyonu Yayınlar (Eski versiyonları arşive alır)
 */
export async function createContractVersion(input: z.infer<typeof createContractSchema>): Promise<{ success: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return { success: false, message: "Bu işlemi yalnızca sistem yöneticileri gerçekleştirebilir." };
  }

  const validated = createContractSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, message: validated.error.errors[0]?.message || "Geçersiz veri girişi." };
  }

  const { type, title, version, content } = validated.data;

  // Aynı tipteki eski tüm sözleşmeleri deaktif et (isActive: false)
  await db
    .update(contracts)
    .set({ isActive: false })
    .where(eq(contracts.type, type));

  // Yeni versiyonu aktif olarak ekle
  await db.insert(contracts).values({
    type,
    title: title.trim(),
    version: version.trim(),
    content: content.trim(),
    isActive: true,
  });

  revalidatePath("/admin/agreements");
  revalidatePath("/dashboard");
  revalidatePath("/");

  return { success: true, message: `Yeni ${type} versiyonu (v${version}) başarıyla yayına alındı!` };
}
