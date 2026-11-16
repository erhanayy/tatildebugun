import { cookies } from "next/headers";
import { Locale, DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from "./types";
import { getDictionary } from "./dictionaries";
import { Dictionary } from "./dictionaries/tr";

/**
 * Server Components & Server Actions için kullanıcının aktif dilini tespit eder.
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value as Locale | undefined;
    if (cookieLocale && (cookieLocale === "tr" || cookieLocale === "en")) {
      return cookieLocale;
    }
  } catch {
    // cookies() istek kapsamı dışında çağrılırsa hata fırlatabilir, fallback döner
  }
  return DEFAULT_LOCALE;
}

/**
 * Server Components için çeviri fonksiyonu ve sözlük nesnesi döner.
 */
export async function getServerTranslation() {
  const locale = await getServerLocale();
  const dictionary: Dictionary = getDictionary(locale);

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split(".");
    let current: any = dictionary;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to Turkish
        let fallback: any = getDictionary("tr");
        for (const fbKey of keys) {
          if (fallback && typeof fallback === "object" && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            fallback = undefined;
            break;
          }
        }
        current = fallback !== undefined ? fallback : path;
        break;
      }
    }

    if (typeof current !== "string") return path;

    let result = current;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return result;
  };

  return { locale, t, dictionary };
}
