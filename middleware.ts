import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const host = req.headers.get("host") || "";

  // 1. tatilde.bugunai.com veya www.alltripx.com gelen istekleri 301 kalıcı olarak alltripx.com'a yönlendir
  if (host.includes("tatilde.bugunai.com") || host === "www.alltripx.com") {
    const targetUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, "https://alltripx.com");
    return NextResponse.redirect(targetUrl, 301);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files with extensions (e.g. .png, .jpg, .svg, .css, .js)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
