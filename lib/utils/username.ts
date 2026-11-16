/**
 * TatildeBugün - Kullanıcı Adı (Nickname / Handle) Yardımcı Modülü
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql, and, ne } from "drizzle-orm";

// Sistem sayfaları ve ayrılmış anahtar kelimeler (Nickname olarak alınamaz)
export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "login",
  "register",
  "logout",
  "dashboard",
  "match",
  "feed",
  "profile",
  "tatildeyim",
  "messages",
  "davet",
  "verify-otp",
  "forgot-password",
  "reset-password",
  "settings",
  "support",
  "help",
  "terms",
  "privacy",
  "kvkk",
  "root",
  "tatildebugun",
  "tatilde",
  "bugunai",
]);

/**
 * Türkçe karakterleri ve özel işaretleri temizleyerek geçerli bir kullanıcı adı tabanına dönüştürür.
 */
export function slugifyUsername(raw: string): string {
  if (!raw) return "gezgin";

  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    I: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  let cleaned = raw
    .split("")
    .map((char) => trMap[char] || char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "") // Sadece küçük harf, rakam ve alt çizgi
    .trim();

  if (cleaned.length < 3) {
    cleaned = (cleaned + "gezgin").slice(0, 15);
  }

  return cleaned.slice(0, 25);
}

/**
 * Kullanıcı adının müsait olup olmadığını kontrol eder.
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<{ available: boolean; error?: string }> {
  if (!username) {
    return { available: false, error: "Kullanıcı adı boş bırakılamaz." };
  }

  const normalized = username.trim().toLowerCase();

  // Uzunluk kontrolü (3-30 karakter)
  if (normalized.length < 3) {
    return { available: false, error: "Kullanıcı adı en az 3 karakter olmalıdır." };
  }
  if (normalized.length > 30) {
    return { available: false, error: "Kullanıcı adı en fazla 30 karakter olabilir." };
  }

  // Karakter deseni kontrolü (Sadece harf, rakam, alt çizgi, nokta ve tire)
  if (!/^[a-z0-9_.-]+$/.test(normalized)) {
    return {
      available: false,
      error: "Kullanıcı adı sadece harf, rakam, alt çizgi (_), nokta (.) ve tire (-) içerebilir.",
    };
  }

  // Rezerv kelime kontrolü
  if (RESERVED_USERNAMES.has(normalized)) {
    return { available: false, error: "Bu kullanıcı adı sistem tarafından ayrılmıştır." };
  }

  try {
    // Veritabanında mükerrerlik sorgusu (LOWER ile büyük/küçük harf duyarsız)
    const conditions = [sql`LOWER(${users.username}) = ${normalized}`];
    if (excludeUserId) {
      conditions.push(ne(users.id, excludeUserId));
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      return { available: false, error: "Bu kullanıcı adı zaten kullanımda." };
    }

    return { available: true };
  } catch (error) {
    console.error("Kullanıcı adı kontrol hatası:", error);
    return { available: false, error: "Kontrol sırasında bir hata oluştu." };
  }
}

/**
 * İlk kayıt veya geçiş anında Ad-Soyad veya E-postadan benzersiz (Unique) bir kullanıcı adı üretir.
 * Eğer `@erhanayyildiz` doluysa `@erhanayyildiz1`, `@erhanayyildiz2` vb. dener.
 */
export async function generateUniqueUsername(
  fullName?: string | null,
  email?: string | null
): Promise<string> {
  let base = slugifyUsername(fullName || "");
  if ((!base || base.length < 3) && email) {
    base = slugifyUsername(email.split("@")[0]);
  }
  if (!base || base.length < 3) {
    base = "gezgin";
  }

  let candidate = base;
  let counter = 1;

  while (true) {
    // Veritabanında (users tablosunda) bu isim var mı kesin kontrol et
    const check = await isUsernameAvailable(candidate);
    if (check.available) {
      return candidate;
    }
    candidate = `${base}${counter}`;
    counter++;
  }
}
