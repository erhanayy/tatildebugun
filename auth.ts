import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "./lib/db";
import { users, loginLogs } from "./lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { normalizeToInternational } from "./lib/utils/phone";

import { generateUniqueUsername } from "./lib/utils/username";

export async function getUserByIdentifier(identifier: string) {
  try {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@") && !trimmed.startsWith("@");
    const digits = trimmed.replace(/\D/g, "");
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    let filter;
    if (trimmed.startsWith("@")) {
      filter = sql`LOWER(${users.username}) = ${trimmed.slice(1).toLowerCase()}`;
    } else if (isEmail) {
      filter = eq(users.email, trimmed.toLowerCase());
    } else if (digits.length >= 7) {
      const normalized = normalizeToInternational(trimmed);
      filter = or(
        eq(users.phoneNumber, trimmed),
        eq(users.phoneNumber, normalized),
        sql`regexp_replace(${users.phoneNumber}, '[^0-9]', '', 'g') LIKE ${"%" + last10}`,
        sql`LOWER(${users.username}) = ${trimmed.toLowerCase()}`
      );
    } else {
      filter = or(
        eq(users.email, trimmed.toLowerCase()),
        sql`LOWER(${users.username}) = ${trimmed.toLowerCase()}`
      );
    }

    const result = await db.select().from(users).where(filter).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Kullanıcı arama hatası:", error);
    return null;
  }
}

const nextAuthResult = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            identifier: z.string().min(1, "E-posta, telefon veya kullanıcı adı gereklidir"),
            password: z.string().min(4, "Şifre en az 4 karakter olmalıdır"),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { identifier, password } = parsedCredentials.data;
          const user = await getUserByIdentifier(identifier);

          if (!user || !user.password) return null;
          if (!user.isActive) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) {
            // İlk giriş veya login anında nickname yoksa tabloda mükerrerlik kontrolü yaparak üret
            if (!user.username) {
              try {
                const uniqueNick = await generateUniqueUsername(user.fullName, user.email || "gezgin");
                await db
                  .update(users)
                  .set({ username: uniqueNick, updatedAt: new Date() })
                  .where(eq(users.id, user.id));
                user.username = uniqueNick;
              } catch (nickErr) {
                console.error("Login anında username üretme hatası:", nickErr);
              }
            }

            // Güvenlik & Cookie Boyutu Koruyucu: Base64 data URL asla cookie'ye konulmaz (HTTP 431 önleyici)
            const cleanImage =
              user.avatarUrl && user.avatarUrl.startsWith("data:image")
                ? `/api/user/avatar?id=${user.id}`
                : user.avatarUrl;

            // Giriş zamanını ve logunu kaydet (DAU / MAU Analitiği)
            try {
              await db.insert(loginLogs).values({
                userId: user.id,
                userAgent: "web",
              });
              await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
            } catch (logErr) {
              console.error("Giriş loglama hatası:", logErr);
            }

            return {
              id: user.id,
              name: user.fullName,
              email: user.email,
              image: cleanImage,
              role: user.role,
              forcePasswordChange: user.forcePasswordChange,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = (user as any).role ?? "guest";
        const rawImg = (user as any).image ?? (user as any).avatarUrl ?? null;
        token.picture =
          rawImg && rawImg.startsWith("data:image")
            ? `/api/user/avatar?id=${user.id}`
            : rawImg;
        token.forcePasswordChange = (user as any).forcePasswordChange ?? false;
      }
      if (trigger === "update" && session?.user?.image) {
        const sImg = session.user.image;
        token.picture =
          sImg && sImg.startsWith("data:image")
            ? `/api/user/avatar?id=${token.id}`
            : sImg;
      }
      // Kendi Kendini Onarma: Eğer token.picture içinde eski bir data:image kalmışsa anında endpoint'e çevirip cookie'yi küçült
      if (typeof token.picture === "string" && token.picture.startsWith("data:image")) {
        token.picture = token.id ? `/api/user/avatar?id=${token.id}` : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).forcePasswordChange = token.forcePasswordChange as boolean;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
});

export const { auth, signIn, signOut, handlers } = nextAuthResult;
