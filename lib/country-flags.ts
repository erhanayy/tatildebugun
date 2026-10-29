/**
 * ISO 3166-1 alpha-2 ülke kodunu bayrak emojisine dönüştürür.
 * Örn: 'TR' -> 🇹🇷, 'ES' -> 🇪🇸, 'IT' -> 🇮🇹
 */
export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode) return "🚩";
  const code = countryCode.toUpperCase();
  if (code === "KKTC" || code === "TRNC" || code === "NC") {
    return "🇹🇷";
  }
  if (code.length !== 2) return "🚩";
  const codePoints = code
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Ülke merkez koordinatları (Zoom/flyTo için referans)
 */
export const COUNTRY_CENTERS: Record<string, { lat: number; lng: number; zoom: number; name: string }> = {
  TR: { lat: 39.0, lng: 35.2, zoom: 6, name: "Türkiye" },
  KKTC: { lat: 35.25, lng: 33.55, zoom: 9, name: "Kuzey Kıbrıs Türk Cumhuriyeti (KKTC)" },
  ES: { lat: 40.4, lng: -3.7, zoom: 6, name: "İspanya" },
  IT: { lat: 41.9, lng: 12.6, zoom: 6, name: "İtalya" },
  FR: { lat: 46.2, lng: 2.2, zoom: 6, name: "Fransa" },
  DE: { lat: 51.1, lng: 10.4, zoom: 6, name: "Almanya" },
  GR: { lat: 39.0, lng: 22.0, zoom: 6, name: "Yunanistan" },
  GB: { lat: 55.3, lng: -3.4, zoom: 6, name: "Birleşik Krallık" },
  US: { lat: 37.0, lng: -95.7, zoom: 4, name: "Amerika Birleşik Devletleri" },
  JP: { lat: 36.2, lng: 138.2, zoom: 6, name: "Japonya" },
  TH: { lat: 15.8, lng: 100.9, zoom: 6, name: "Tayland" },
  PT: { lat: 39.3, lng: -8.2, zoom: 7, name: "Portekiz" },
  NL: { lat: 52.1, lng: 5.2, zoom: 7, name: "Hollanda" },
  EG: { lat: 26.8, lng: 30.8, zoom: 6, name: "Mısır" },
  AE: { lat: 23.4, lng: 53.8, zoom: 7, name: "Birleşik Arap Emirlikleri" },
  CH: { lat: 46.8, lng: 8.2, zoom: 7, name: "İsviçre" },
  AT: { lat: 47.5, lng: 14.5, zoom: 7, name: "Avusturya" },
  HR: { lat: 45.1, lng: 15.2, zoom: 7, name: "Hırvatistan" },
  ME: { lat: 42.7, lng: 19.3, zoom: 8, name: "Karadağ" },
  GE: { lat: 42.0, lng: 43.5, zoom: 7, name: "Gürcistan" },
  AZ: { lat: 40.4, lng: 47.5, zoom: 7, name: "Azerbaycan" },
  UA: { lat: 48.4, lng: 31.2, zoom: 6, name: "Ukrayna" },
  MT: { lat: 35.9, lng: 14.4, zoom: 10, name: "Malta" },
  CY: { lat: 34.9, lng: 33.1, zoom: 9, name: "Güney Kıbrıs Rum Yönetimi (GKRY)" },
};
