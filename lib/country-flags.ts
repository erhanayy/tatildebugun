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
 * Ülke kodunun yüksek çözünürlüklü CDN bayrak görsel URL'ini döner.
 * Windows ve tüm platformlarda %100 kusursuz görüntüleme sağlar.
 */
export function getCountryFlagUrl(countryCode: string, size: "w40" | "w80" | "w160" = "w80"): string | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  if (code === "KKTC" || code === "TRNC" || code === "NC") {
    return null; // KKTC için dahili vektörel SVG kullanılır
  }
  if (code.length !== 2) return null;
  return `https://flagcdn.com/${size}/${code.toLowerCase()}.png`;
}

/**
 * Leaflet DivIcon, Popup veya doğrudan HTML içine yerleştirilmeye hazır
 * vektörel / CDN bayrak HTML dizesi üretir.
 * Windows'ta emoji yazı tipi eksikliğini tamamen ortadan kaldırır.
 */
export function getCountryFlagHtml(
  countryCode: string,
  options: {
    width?: number;
    height?: number;
    className?: string;
    alt?: string;
  } = {}
): string {
  const width = options.width || 26;
  const height = options.height || 18;
  const className = options.className || "";
  const alt = options.alt || countryCode || "Bayrak";

  if (!countryCode) {
    return `<span class="${className}" style="display:inline-block; font-size:${Math.round(height * 0.85)}px; line-height:1;">🌍</span>`;
  }

  const code = countryCode.toUpperCase();

  // 1. KKTC Özel Vektörel SVG Çizimi
  if (code === "KKTC" || code === "TRNC" || code === "NC") {
    return `<svg width="${width}" height="${height}" viewBox="0 0 30 20" class="${className}" style="border: 1px solid rgba(0,0,0,0.12); border-radius: 3px; display: inline-block; vertical-align: middle; box-shadow: 0 1px 2px rgba(0,0,0,0.08); flex-shrink: 0;" alt="${alt}">
      <rect width="30" height="20" fill="#fff"/>
      <rect y="2" width="30" height="2.5" fill="#e30a17"/>
      <rect y="15.5" width="30" height="2.5" fill="#e30a17"/>
      <circle cx="12" cy="10" r="4.2" fill="#e30a17"/>
      <circle cx="13.2" cy="10" r="3.3" fill="#fff"/>
      <polygon points="16.5,10 14.5,10.6 15.2,12 13.8,11 13.2,12.5 13,10.7 11.5,10.7 12.7,9.7 11.8,8.5 13.4,9.1 14.2,7.7 14.2,9.5" fill="#e30a17"/>
    </svg>`;
  }

  // 2. Standart 2 Haneli Ülke Kodları (FlagCDN Retina PNG - ortalama 400 byte)
  if (code.length === 2) {
    const url = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
    const fallbackEmoji = getCountryFlagEmoji(code);
    return `<img src="${url}" width="${width}" height="${height}" alt="${alt}" class="${className}" style="width:${width}px; height:${height}px; object-fit: cover; border-radius: 3px; border: 1px solid rgba(0,0,0,0.12); display: inline-block; vertical-align: middle; box-shadow: 0 1px 2px rgba(0,0,0,0.08); flex-shrink: 0;" loading="lazy" onerror="this.outerHTML='<span style=\\'font-size:${Math.round(height * 0.85)}px;\\'>${fallbackEmoji}</span>'" />`;
  }

  // 3. Bilinmeyen veya Genel Kodlar
  return `<span class="${className}" style="display:inline-block; font-size:${Math.round(height * 0.85)}px; line-height:1;">🌍</span>`;
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
