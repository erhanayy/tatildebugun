/**
 * TatildeBugün / AllTripX - Uluslararasılaştırma (i18n) Tip Tanımları
 */

export type Locale = "tr" | "en";

export interface SupportedLocale {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string; // ISO 3166-1 alpha-2 for CountryFlag
  dir: "ltr" | "rtl";
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    flag: "TR",
    dir: "ltr",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "GB",
    dir: "ltr",
  },
];

export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

// Yardımcı tip: Nested key erişimi (Örn: "nav.dashboard", "profile.title")
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];
