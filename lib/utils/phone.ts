/**
 * TatildeBugün - Uluslararası Telefon & Alan Kodu Yönetim Modülü
 */

export interface CountryInfo {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "TR", name: "Türkiye", dialCode: "+90", flag: "🇹🇷", placeholder: "5XX XXX XX XX" },
  { code: "DE", name: "Almanya", dialCode: "+49", flag: "🇩🇪", placeholder: "151 2345678" },
  { code: "GB", name: "Birleşik Krallık", dialCode: "+44", flag: "🇬🇧", placeholder: "7911 123456" },
  { code: "US", name: "ABD / Kanada", dialCode: "+1", flag: "🇺🇸", placeholder: "202 555 0123" },
  { code: "FR", name: "Fransa", dialCode: "+33", flag: "🇫🇷", placeholder: "6 12 34 56 78" },
  { code: "NL", name: "Hollanda", dialCode: "+31", flag: "🇳🇱", placeholder: "6 12345678" },
  { code: "AZ", name: "Azerbaycan", dialCode: "+994", flag: "🇦🇿", placeholder: "50 123 45 67" },
  { code: "IT", name: "İtalya", dialCode: "+39", flag: "🇮🇹", placeholder: "312 345 6789" },
  { code: "ES", name: "İspanya", dialCode: "+34", flag: "🇪🇸", placeholder: "612 345 678" },
  { code: "AT", name: "Avusturya", dialCode: "+43", flag: "🇦🇹", placeholder: "650 1234567" },
  { code: "BE", name: "Belçika", dialCode: "+32", flag: "🇧🇪", placeholder: "470 12 34 56" },
  { code: "CH", name: "İsviçre", dialCode: "+41", flag: "🇨🇭", placeholder: "78 123 45 67" },
  { code: "GR", name: "Yunanistan", dialCode: "+30", flag: "🇬🇷", placeholder: "691 234 5678" },
  { code: "AE", name: "Birleşik Arap Emirlikleri", dialCode: "+971", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "SA", name: "Suudi Arabistan", dialCode: "+966", flag: "🇸🇦", placeholder: "50 123 4567" },
  { code: "RU", name: "Rusya", dialCode: "+7", flag: "🇷🇺", placeholder: "912 345-67-89" },
  { code: "OTHER", name: "Diğer (Uluslararası)", dialCode: "+", flag: "🌐", placeholder: "Ülke kodu ile numara" },
];

/**
 * Verilen telefon dizesini standart uluslararası E.164 formatına (+XXXXXXXXXXXX) dönüştürür.
 * İster 0090..., ister +90..., ister 05..., ister 5... girilmiş olsun,
 * temiz ve standart formata getirir.
 */
export function normalizeToInternational(rawPhone: string, defaultDialCode = "+90"): string {
  if (!rawPhone) return "";

  const trimmed = rawPhone.trim();

  // 1. 00 ile başlıyorsa (örn: 0090532...) -> +90532...
  if (trimmed.startsWith("00")) {
    const without00 = trimmed.slice(2).replace(/\D/g, "");
    return without00 ? `+${without00}` : "";
  }

  // 2. + ile başlıyorsa (örn: +90 532... veya +49...) -> +90532...
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }

  // Sadece rakamları al
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  // 3. Başında 0 varsa (Türkiye yerel: 05XXXXXXXXX -> 11 hane)
  if (digits.startsWith("0")) {
    const withoutZero = digits.slice(1);
    const cleanDial = defaultDialCode.replace(/\D/g, "");
    return `+${cleanDial}${withoutZero}`;
  }

  // 4. Eğer 90 ile başlıyorsa (örn: 905XXXXXXXXX -> 12 hane)
  if (digits.startsWith("90") && digits.length >= 12) {
    return `+${digits}`;
  }

  // 5. 10 haneli yerel numara ise (5XXXXXXXXX)
  if (digits.length === 10) {
    const cleanDial = defaultDialCode.replace(/\D/g, "");
    return `+${cleanDial}${digits}`;
  }

  // Diğer durumlarda varsayılan alan kodu ekle
  const cleanDial = defaultDialCode.replace(/\D/g, "");
  return `+${cleanDial}${digits}`;
}

/**
 * Veritabanında saklanan E.164 dizesini ülke kodu ve ulusal numaraya ayrıştırır.
 */
export function splitPhone(fullPhone: string, defaultCountryCode = "TR"): { country: CountryInfo; nationalNumber: string } {
  const defaultCountry = COUNTRIES.find((c) => c.code === defaultCountryCode) || COUNTRIES[0];

  if (!fullPhone) {
    return {
      country: defaultCountry,
      nationalNumber: "",
    };
  }

  const normalized = normalizeToInternational(fullPhone, defaultCountry.dialCode);

  // Eşleşen en uzun dialCode'u bul (örn: +994 vs +90 vs +1)
  const matchedCountry = COUNTRIES.filter((c) => c.code !== "OTHER")
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => normalized.startsWith(c.dialCode));

  if (matchedCountry) {
    const national = normalized.slice(matchedCountry.dialCode.length);
    return {
      country: matchedCountry,
      nationalNumber: national,
    };
  }

  // Eşleşmezse varsayılan ülke
  const digits = normalized.replace(/\D/g, "");
  return {
    country: defaultCountry,
    nationalNumber: digits,
  };
}

/**
 * Telefon numarasını arayüzde estetik göstermek için formatlar.
 */
export function formatPhoneDisplay(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";
  const normalized = normalizeToInternational(rawPhone);
  if (!normalized) return rawPhone;

  const { country, nationalNumber } = splitPhone(normalized);

  if (country.code === "TR" && nationalNumber.length === 10) {
    // +90 532 123 45 67
    const p1 = nationalNumber.slice(0, 3);
    const p2 = nationalNumber.slice(3, 6);
    const p3 = nationalNumber.slice(6, 8);
    const p4 = nationalNumber.slice(8, 10);
    return `${country.dialCode} ${p1} ${p2} ${p3} ${p4}`;
  }

  return `${country.dialCode} ${nationalNumber}`;
}
