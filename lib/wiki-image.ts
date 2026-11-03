/**
 * TatildeBugün - Wikipedia & Wikimedia Commons Görsel Çekme Motoru
 * Yerel veya yabancı turistik mekanların telifsiz kapak görsellerini Wikipedia API'den çeker ve önbelleğe alır.
 */

import { db } from "@/lib/db";
import { placesOfInterest } from "@/lib/db/schema";
import { eq, and, isNull, ilike } from "drizzle-orm";

interface WikiPageImage {
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

/**
 * Başlık veya arama terimine göre Wikipedia'dan doğrudan görsel URL'si getirir
 */
export async function fetchWikipediaImage(query: string): Promise<string | null> {
  const clean = query
    .replace(/\(.*?\)/g, "") // Parantez içlerini temizle: "Kolezyum (Colosseum)" -> "Kolezyum"
    .replace(/[,\-–]/g, " ")
    .trim();

  if (!clean || clean.length < 2) return null;

  // 1. Önce Türkçe Wikipedia'da ara
  const trImage = await queryWikiApi(clean, "tr");
  if (trImage) return trImage;

  // 2. Bulunamazsa İngilizce Wikipedia'da dene
  const enImage = await queryWikiApi(clean, "en");
  if (enImage) return enImage;

  // 3. Parantez içindeki yabancı adı varsa onu dene: "Kolezyum (Colosseum)" -> "Colosseum"
  const matchParentheses = query.match(/\((.*?)\)/);
  if (matchParentheses && matchParentheses[1]) {
    const parenthesizedName = matchParentheses[1].trim();
    const enParenthesis = await queryWikiApi(parenthesizedName, "en");
    if (enParenthesis) return enParenthesis;
  }

  return null;
}

async function queryWikiApi(titleOrSearch: string, lang: "tr" | "en"): Promise<string | null> {
  try {
    // Arama bazlı arama yapıp ilk sonucun görselini iste
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      titleOrSearch
    )}&gsrlimit=1&prop=pageimages&pithumbsize=400&format=json`;

    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "TatildeBugunApp/1.0 (info@bugunai.com)" },
      next: { revalidate: 86400 * 7 }, // 7 gün cache
    });

    if (!res.ok) return null;

    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    const pageValues = Object.values(pages) as WikiPageImage[];
    const firstPage = pageValues[0];
    if (firstPage?.thumbnail?.source) {
      return firstPage.thumbnail.source;
    }

    return null;
  } catch (error) {
    console.error(`[WikiImage] ${lang} sorgu hatası (${titleOrSearch}):`, error);
    return null;
  }
}

/**
 * Belirli bir şehrin görseli eksik olan mekanlarını Wikipedia'dan zenginleştirip veritabanına kaydeder
 */
export async function enrichCityPlacesWithImages(cityName: string): Promise<number> {
  try {
    const missingPlaces = await db
      .select({
        id: placesOfInterest.id,
        name: placesOfInterest.name,
      })
      .from(placesOfInterest)
      .where(and(ilike(placesOfInterest.cityName, cityName.trim()), isNull(placesOfInterest.imageUrl)))
      .limit(50);

    if (missingPlaces.length === 0) return 0;

    let updatedCount = 0;

    // Paralel ama Wikipedia rate-limit'ini koruyacak şekilde 5'erli paketlerle tara
    for (let i = 0; i < missingPlaces.length; i += 5) {
      const chunk = missingPlaces.slice(i, i + 5);
      await Promise.all(
        chunk.map(async (p) => {
          const imgUrl = await fetchWikipediaImage(p.name);
          if (imgUrl) {
            await db
              .update(placesOfInterest)
              .set({ imageUrl: imgUrl })
              .where(eq(placesOfInterest.id, p.id));
            updatedCount++;
          }
        })
      );
    }

    console.log(`[enrichCityPlacesWithImages] ${cityName} için ${updatedCount} mekan görseli güncellendi.`);
    return updatedCount;
  } catch (error) {
    console.error(`[enrichCityPlacesWithImages] Hata:`, error);
    return 0;
  }
}
