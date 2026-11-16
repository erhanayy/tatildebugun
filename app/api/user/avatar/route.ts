import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Kullanıcı profil fotoğrafını doğrudan veritabanından binary olarak sunar.
 * Bu sayede JWT ve Session Cookie'leri asla base64 verisiyle şişmez (HTTP 431 hatasını önler).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("User ID required", { status: 400 });
    }

    const userList = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!userList.length || !userList[0].avatarUrl) {
      return new NextResponse("Avatar not found", { status: 404 });
    }

    const avatarUrl = userList[0].avatarUrl;

    // 1. Data URL (Base64 JPEG/PNG/WEBP)
    if (avatarUrl.startsWith("data:image/")) {
      const parts = avatarUrl.split(",");
      if (parts.length === 2) {
        const mimeType = parts[0].match(/data:(.*?);base64/)?.[1] || "image/jpeg";
        const buffer = Buffer.from(parts[1], "base64");

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    }

    // 2. Harici URL (Cloud Storage, CDN vb.)
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      return NextResponse.redirect(avatarUrl);
    }

    return new NextResponse("Invalid avatar format", { status: 400 });
  } catch (error) {
    console.error("Avatar sunma hatası:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
