"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Locale, DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, SupportedLocale } from "./types";
import { getDictionary } from "./dictionaries";
import { Dictionary } from "./dictionaries/tr";
import { setLanguagePreference } from "@/lib/actions/user";

interface LanguageContextType {
  locale: Locale;
  setLanguage: (lang: Locale) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  supportedLocales: SupportedLocale[];
  currentLocaleMeta: SupportedLocale;
  dir: "ltr" | "rtl";
  dictionary: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  // Sayfa yüklendiğinde çerezi kontrol et
  useEffect(() => {
    const cookieLocale = getCookie(LOCALE_COOKIE_NAME) as Locale | null;
    if (cookieLocale && (cookieLocale === "tr" || cookieLocale === "en")) {
      if (cookieLocale !== locale) {
        setLocaleState(cookieLocale);
      }
    }
  }, []);

  const currentLocaleMeta = useMemo(() => {
    return SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];
  }, [locale]);

  // HTML lang ve dir etiketlerini güncelle
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = currentLocaleMeta.dir;
    }
  }, [locale, currentLocaleMeta]);

  const dictionary = useMemo(() => {
    return getDictionary(locale);
  }, [locale]);

  const setLanguage = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);

    // Çerezi 1 yıl süreliğine kaydet
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      const meta = SUPPORTED_LOCALES.find((l) => l.code === newLocale);
      document.documentElement.lang = newLocale;
      if (meta) {
        document.documentElement.dir = meta.dir;
      }
    }

    // Kullanıcı oturum açmışsa veritabanındaki preferredLanguage alanını arka planda güncelle
    try {
      await setLanguagePreference(newLocale);
    } catch {
      // Oturum açık değilse veya çevrimdışıysa sessizce devam et
    }

    // Sunucu bileşenlerinin yeni dil çereziyle yenilenmesi için
    try {
      router.refresh();
    } catch {
      // sessizce devam et
    }
  }, [router]);

  // Nokta notasyonuyla anahtar çözümleme (Örn: t("nav.dashboard") veya t("mail.greeting", { fullName: "Erhan" }))
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let current: any = dictionary;

      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = current[key];
        } else {
          // Seçili dilde yoksa Türkçe sözlüğe fallback yap
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

      if (typeof current !== "string") {
        return path;
      }

      let result = current;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
        });
      }

      return result;
    },
    [dictionary]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLanguage,
        t,
        supportedLocales: SUPPORTED_LOCALES,
        currentLocaleMeta,
        dir: currentLocaleMeta.dir,
        dictionary,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    const fallbackDict = getDictionary("tr");
    return {
      locale: DEFAULT_LOCALE,
      setLanguage: async () => {},
      t: (path: string) => path,
      supportedLocales: SUPPORTED_LOCALES,
      currentLocaleMeta: SUPPORTED_LOCALES[0],
      dir: "ltr" as const,
      dictionary: fallbackDict,
    };
  }
  return context;
}
