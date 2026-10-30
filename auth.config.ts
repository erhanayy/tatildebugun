import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 saat (7.200 saniye)
    updateAge: 15 * 60,  // 15 dakika aktif gezindikçe süreyi yeniler
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/feed") ||
        nextUrl.pathname.startsWith("/match") ||
        nextUrl.pathname.startsWith("/messages") ||
        nextUrl.pathname.startsWith("/profile");
      const isOnChangePassword = nextUrl.pathname === "/change-password";

      if (isProtected) {
        if (isLoggedIn) {
          if (auth?.user?.forcePasswordChange) {
            return Response.redirect(new URL("/change-password", nextUrl));
          }
          return true;
        }
        return false; // Yetkisiz kullanıcıyı /login sayfasına yönlendir
      } else if (isLoggedIn) {
        if (auth?.user?.forcePasswordChange && !isOnChangePassword) {
          return Response.redirect(new URL("/change-password", nextUrl));
        }
        // Giriş yapmış kullanıcıyı /login veya /register sayfasından /dashboard'a yönlendir
        if (nextUrl.pathname === "/login" || nextUrl.pathname === "/register") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
