import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function getUserByIdentifier(identifier: string) {
  try {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");
    const digits = trimmed.replace(/\D/g, "");
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    let filter;
    if (isEmail) {
      filter = eq(users.email, trimmed.toLowerCase());
    } else if (digits.length >= 7) {
      filter = or(
        eq(users.phoneNumber, trimmed),
        sql`regexp_replace(${users.phoneNumber}, '[^0-9]', '', 'g') LIKE ${"%" + last10}`
      );
    } else {
      filter = eq(users.email, trimmed.toLowerCase());
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
            identifier: z.string().min(1, "E-posta veya telefon gereklidir"),
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
            return {
              id: user.id,
              name: user.fullName,
              email: user.email,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = (user as any).role ?? "guest";
        token.forcePasswordChange = (user as any).forcePasswordChange ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).forcePasswordChange = token.forcePasswordChange as boolean;
      }
      return session;
    },
  },
});

export const { auth, signIn, signOut, handlers } = nextAuthResult;
