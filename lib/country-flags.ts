/**
 * Desteklenen alt bölge / kurucu ülke kodları (FlagCDN uyumlu)
 */
const SUBDIVISION_FLAG_CODES = new Set(["GB-SCT", "GB-WLS", "GB-ENG", "GB-NIR"]);

const SUBDIVISION_FLAG_EMOJIS: Record<string, string> = {
  "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "GB-WLS": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "GB-NIR": "🇬🇧",
};

/**
 * ISO 3166-1 alpha-2 veya desteklenen alt bölge ülke kodunu bayrak emojisine dönüştürür.
 * Örn: 'TR' -> 🇹🇷, 'GB-SCT' -> 🏴󠁧󠁢󠁳󠁣󠁴󠁿
 */
export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode) return "🚩";
  const code = countryCode.toUpperCase();
  if (code === "KKTC" || code === "TRNC" || code === "NC") {
    return "🇹🇷";
  }
  if (SUBDIVISION_FLAG_EMOJIS[code]) {
    return SUBDIVISION_FLAG_EMOJIS[code];
  }
  if (code.length !== 2) return "🚩";
  const codePoints = code
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Ülke kodunun yüksek çözünürlüklü CDN bayrak görsel URL'ini döner.
 * Standart 2 haneli ISO kodları ile GB-SCT, GB-WLS, GB-ENG, GB-NIR desteklenir.
 */
export function getCountryFlagUrl(
  countryCode: string,
  size: "w40" | "w80" | "w160" = "w80"
): string | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  if (code === "KKTC" || code === "TRNC" || code === "NC") {
    return null; // KKTC için dahili vektörel SVG kullanılır
  }
  if (SUBDIVISION_FLAG_CODES.has(code)) {
    return `https://flagcdn.com/${size}/${code.toLowerCase()}.png`;
  }
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return null;
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

  // 2. Standart 2 Haneli ISO ve Desteklenen Alt Bölge Kodları (FlagCDN Retina PNG)
  const url = getCountryFlagUrl(code, "w80");
  if (url) {
    const fallbackEmoji = getCountryFlagEmoji(code);
    return `<img src="${url}" width="${width}" height="${height}" alt="${alt}" class="${className}" style="width:${width}px; height:${height}px; object-fit: cover; border-radius: 3px; border: 1px solid rgba(0,0,0,0.12); display: inline-block; vertical-align: middle; box-shadow: 0 1px 2px rgba(0,0,0,0.08); flex-shrink: 0;" loading="lazy" onerror="this.outerHTML='<span style=\\'font-size:${Math.round(height * 0.85)}px;\\'>${fallbackEmoji}</span>'" />`;
  }

  // 3. Bilinmeyen veya Genel Kodlar
  return `<span class="${className}" style="display:inline-block; font-size:${Math.round(height * 0.85)}px; line-height:1;">🌍</span>`;
}

/**
 * Tüm Dünya Ülkeleri ve Özerk Destinasyonların Merkez Koordinatları (Harita zoom/flyTo ve koordinat fallback için)
 */
export const COUNTRY_CENTERS: Record<string, { lat: number; lng: number; zoom: number; name: string }> = {
  // Popüler & Kurucu / Özerk Bölgeler
  TR: { lat: 39.0, lng: 35.2, zoom: 6, name: "Türkiye" },
  KKTC: { lat: 35.25, lng: 33.55, zoom: 9, name: "Kuzey Kıbrıs Türk Cumhuriyeti (KKTC)" },
  "GB-SCT": { lat: 56.4907, lng: -4.2026, zoom: 7, name: "İskoçya" },
  "GB-ENG": { lat: 52.3555, lng: -1.1743, zoom: 7, name: "İngiltere" },
  "GB-WLS": { lat: 52.1307, lng: -3.7837, zoom: 8, name: "Galler" },
  "GB-NIR": { lat: 54.7877, lng: -6.4923, zoom: 8, name: "Kuzey İrlanda" },
  GB: { lat: 55.3781, lng: -3.436, zoom: 6, name: "Birleşik Krallık" },

  // Avrupa
  AD: { lat: 42.5462, lng: 1.6016, zoom: 11, name: "Andorra" },
  AL: { lat: 41.1533, lng: 20.1683, zoom: 8, name: "Arnavutluk" },
  AT: { lat: 47.5162, lng: 14.5501, zoom: 7, name: "Avusturya" },
  BA: { lat: 43.9159, lng: 17.6791, zoom: 7, name: "Bosna-Hersek" },
  BE: { lat: 50.5039, lng: 4.4699, zoom: 8, name: "Belçika" },
  BG: { lat: 42.7339, lng: 25.4858, zoom: 7, name: "Bulgaristan" },
  BY: { lat: 53.7098, lng: 27.9534, zoom: 6, name: "Belarus" },
  CH: { lat: 46.8182, lng: 8.2275, zoom: 7, name: "İsviçre" },
  CY: { lat: 34.9167, lng: 33.15, zoom: 9, name: "Güney Kıbrıs Rum Yönetimi (GKRY)" },
  CZ: { lat: 49.8175, lng: 15.473, zoom: 7, name: "Çekya" },
  DE: { lat: 51.1657, lng: 10.4515, zoom: 6, name: "Almanya" },
  DK: { lat: 56.2639, lng: 9.5018, zoom: 7, name: "Danimarka" },
  EE: { lat: 58.5953, lng: 25.0136, zoom: 7, name: "Estonya" },
  ES: { lat: 40.4637, lng: -3.7492, zoom: 6, name: "İspanya" },
  FI: { lat: 61.9241, lng: 25.7482, zoom: 5, name: "Finlandiya" },
  FO: { lat: 61.8926, lng: -6.9118, zoom: 9, name: "Faroe Adaları" },
  FR: { lat: 46.2276, lng: 2.2137, zoom: 6, name: "Fransa" },
  GI: { lat: 36.1408, lng: -5.3536, zoom: 13, name: "Cebelitarık" },
  GL: { lat: 71.7069, lng: -42.6043, zoom: 4, name: "Grönland" },
  GR: { lat: 39.0742, lng: 21.8243, zoom: 6, name: "Yunanistan" },
  HR: { lat: 45.1, lng: 15.2, zoom: 7, name: "Hırvatistan" },
  HU: { lat: 47.1625, lng: 19.5033, zoom: 7, name: "Macaristan" },
  IE: { lat: 53.1424, lng: -7.6921, zoom: 7, name: "İrlanda" },
  IS: { lat: 64.9631, lng: -19.0208, zoom: 6, name: "İzlanda" },
  IT: { lat: 41.8719, lng: 12.5674, zoom: 6, name: "İtalya" },
  LI: { lat: 47.166, lng: 9.5554, zoom: 11, name: "Lihtenştayn" },
  LT: { lat: 55.1694, lng: 23.8813, zoom: 7, name: "Litvanya" },
  LU: { lat: 49.8153, lng: 6.1296, zoom: 9, name: "Lüksemburg" },
  LV: { lat: 56.8796, lng: 24.6032, zoom: 7, name: "Letonya" },
  MC: { lat: 43.7384, lng: 7.4246, zoom: 13, name: "Monako" },
  MD: { lat: 47.4116, lng: 28.3699, zoom: 7, name: "Moldova" },
  ME: { lat: 42.7087, lng: 19.3744, zoom: 8, name: "Karadağ" },
  MK: { lat: 41.6086, lng: 21.7453, zoom: 8, name: "Kuzey Makedonya" },
  MT: { lat: 35.9375, lng: 14.3754, zoom: 10, name: "Malta" },
  NL: { lat: 52.1326, lng: 5.2913, zoom: 7, name: "Hollanda" },
  NO: { lat: 60.472, lng: 8.4689, zoom: 5, name: "Norveç" },
  PL: { lat: 51.9194, lng: 19.1451, zoom: 6, name: "Polonya" },
  PT: { lat: 39.3999, lng: -8.2245, zoom: 7, name: "Portekiz" },
  RO: { lat: 45.9432, lng: 24.9668, zoom: 7, name: "Romanya" },
  RS: { lat: 44.0165, lng: 21.0059, zoom: 7, name: "Sırbistan" },
  RU: { lat: 61.524, lng: 105.3188, zoom: 3, name: "Rusya" },
  SE: { lat: 60.1282, lng: 18.6435, zoom: 5, name: "İsveç" },
  SI: { lat: 46.1512, lng: 14.9955, zoom: 8, name: "Slovenya" },
  SK: { lat: 48.669, lng: 19.699, zoom: 7, name: "Slovakya" },
  SM: { lat: 43.9424, lng: 12.4578, zoom: 12, name: "San Marino" },
  UA: { lat: 48.3794, lng: 31.1656, zoom: 6, name: "Ukrayna" },
  VA: { lat: 41.9029, lng: 12.4534, zoom: 15, name: "Vatikan" },
  XK: { lat: 42.6026, lng: 20.903, zoom: 9, name: "Kosova" },

  // Asya & Orta Doğu & Kafkasya
  AE: { lat: 23.4241, lng: 53.8478, zoom: 7, name: "Birleşik Arap Emirlikleri" },
  AF: { lat: 33.9391, lng: 67.71, zoom: 6, name: "Afganistan" },
  AM: { lat: 40.0691, lng: 45.0382, zoom: 8, name: "Ermenistan" },
  AZ: { lat: 40.1431, lng: 47.5769, zoom: 7, name: "Azerbaycan" },
  BD: { lat: 23.685, lng: 90.3563, zoom: 7, name: "Bangladeş" },
  BH: { lat: 26.0667, lng: 50.5577, zoom: 10, name: "Bahreyn" },
  BN: { lat: 4.5353, lng: 114.7277, zoom: 9, name: "Brunei" },
  BT: { lat: 27.5142, lng: 90.4336, zoom: 8, name: "Bhutan" },
  CN: { lat: 35.8617, lng: 104.1954, zoom: 4, name: "Çin" },
  GE: { lat: 42.3154, lng: 43.3569, zoom: 7, name: "Gürcistan" },
  HK: { lat: 22.3193, lng: 114.1694, zoom: 11, name: "Hong Kong" },
  ID: { lat: -0.7893, lng: 113.9213, zoom: 5, name: "Endonezya" },
  IL: { lat: 31.0461, lng: 34.8516, zoom: 7, name: "İsrail" },
  IN: { lat: 20.5937, lng: 78.9629, zoom: 5, name: "Hindistan" },
  IQ: { lat: 33.2232, lng: 43.6793, zoom: 6, name: "Irak" },
  IR: { lat: 32.4279, lng: 53.688, zoom: 5, name: "İran" },
  JO: { lat: 30.5852, lng: 36.2384, zoom: 7, name: "Ürdün" },
  JP: { lat: 36.2048, lng: 138.2529, zoom: 6, name: "Japonya" },
  KG: { lat: 41.2044, lng: 74.7661, zoom: 7, name: "Kırgızistan" },
  KH: { lat: 12.5657, lng: 104.991, zoom: 7, name: "Kamboçya" },
  KP: { lat: 40.3399, lng: 127.5101, zoom: 7, name: "Kuzey Kore" },
  KR: { lat: 35.9078, lng: 127.7669, zoom: 7, name: "Güney Kore" },
  KW: { lat: 29.3117, lng: 47.4818, zoom: 8, name: "Kuveyt" },
  KZ: { lat: 48.0196, lng: 66.9237, zoom: 5, name: "Kazakistan" },
  LA: { lat: 19.8563, lng: 102.4955, zoom: 6, name: "Laos" },
  LB: { lat: 33.8547, lng: 35.8623, zoom: 8, name: "Lübnan" },
  LK: { lat: 7.8731, lng: 80.7718, zoom: 7, name: "Sri Lanka" },
  MM: { lat: 21.9162, lng: 95.956, zoom: 6, name: "Myanmar" },
  MN: { lat: 46.8625, lng: 103.8467, zoom: 5, name: "Moğolistan" },
  MO: { lat: 22.1987, lng: 113.5439, zoom: 12, name: "Makao" },
  MV: { lat: 3.2028, lng: 73.2207, zoom: 7, name: "Maldivler" },
  MY: { lat: 4.2105, lng: 101.9758, zoom: 6, name: "Malezya" },
  NP: { lat: 28.3949, lng: 84.124, zoom: 7, name: "Nepal" },
  OM: { lat: 21.4735, lng: 55.9754, zoom: 6, name: "Umman" },
  PH: { lat: 12.8797, lng: 121.774, zoom: 6, name: "Filipinler" },
  PK: { lat: 30.3753, lng: 69.3451, zoom: 5, name: "Pakistan" },
  PS: { lat: 31.9522, lng: 35.2332, zoom: 8, name: "Filistin" },
  QA: { lat: 25.3548, lng: 51.1839, zoom: 8, name: "Katar" },
  SA: { lat: 23.8859, lng: 45.0792, zoom: 5, name: "Suudi Arabistan" },
  SG: { lat: 1.3521, lng: 103.8198, zoom: 11, name: "Singapur" },
  SY: { lat: 34.8021, lng: 38.9968, zoom: 7, name: "Suriye" },
  TH: { lat: 15.87, lng: 100.9925, zoom: 6, name: "Tayland" },
  TJ: { lat: 38.861, lng: 71.2761, zoom: 7, name: "Tacikistan" },
  TL: { lat: -8.8742, lng: 125.7275, zoom: 8, name: "Doğu Timor" },
  TM: { lat: 38.9697, lng: 59.5563, zoom: 6, name: "Türkmenistan" },
  TW: { lat: 23.6978, lng: 120.9605, zoom: 7, name: "Tayvan" },
  UZ: { lat: 41.3775, lng: 64.5853, zoom: 6, name: "Özbekistan" },
  VN: { lat: 14.0583, lng: 108.2772, zoom: 6, name: "Vietnam" },
  YE: { lat: 15.5527, lng: 48.5164, zoom: 6, name: "Yemen" },

  // Kuzey & Orta Amerika ve Karayipler
  AG: { lat: 17.0608, lng: -61.7964, zoom: 10, name: "Antigua ve Barbuda" },
  AW: { lat: 12.5211, lng: -69.9683, zoom: 11, name: "Aruba" },
  BB: { lat: 13.1939, lng: -59.5432, zoom: 10, name: "Barbados" },
  BM: { lat: 32.3078, lng: -64.7505, zoom: 11, name: "Bermuda" },
  BS: { lat: 25.0343, lng: -77.3963, zoom: 7, name: "Bahamalar" },
  BZ: { lat: 17.1899, lng: -88.4976, zoom: 8, name: "Belize" },
  CA: { lat: 56.1304, lng: -106.3468, zoom: 4, name: "Kanada" },
  CR: { lat: 9.7489, lng: -83.7534, zoom: 8, name: "Kosta Rika" },
  CU: { lat: 21.5218, lng: -77.7812, zoom: 6, name: "Küba" },
  CW: { lat: 12.1696, lng: -68.99, zoom: 11, name: "Curaçao" },
  DM: { lat: 15.415, lng: -61.371, zoom: 10, name: "Dominika" },
  DO: { lat: 18.7357, lng: -70.1627, zoom: 8, name: "Dominik Cumhuriyeti" },
  GD: { lat: 12.1165, lng: -61.679, zoom: 10, name: "Grenada" },
  GT: { lat: 15.7835, lng: -90.2308, zoom: 7, name: "Guatemala" },
  HN: { lat: 15.2, lng: -86.2419, zoom: 7, name: "Honduras" },
  HT: { lat: 18.9712, lng: -72.2852, zoom: 8, name: "Haiti" },
  JM: { lat: 18.1096, lng: -77.2975, zoom: 8, name: "Jamaika" },
  KN: { lat: 17.3578, lng: -62.783, zoom: 10, name: "Saint Kitts ve Nevis" },
  KY: { lat: 19.3133, lng: -81.2546, zoom: 10, name: "Cayman Adaları" },
  LC: { lat: 13.9094, lng: -60.9789, zoom: 10, name: "Saint Lucia" },
  MX: { lat: 23.6345, lng: -102.5528, zoom: 5, name: "Meksika" },
  NI: { lat: 12.8654, lng: -85.2072, zoom: 7, name: "Nikaragua" },
  PA: { lat: 8.538, lng: -80.7821, zoom: 7, name: "Panama" },
  PR: { lat: 18.2208, lng: -66.5901, zoom: 9, name: "Porto Riko" },
  SV: { lat: 13.7942, lng: -88.8965, zoom: 8, name: "El Salvador" },
  TT: { lat: 10.6918, lng: -61.2225, zoom: 9, name: "Trinidad ve Tobago" },
  US: { lat: 37.0902, lng: -95.7129, zoom: 4, name: "Amerika Birleşik Devletleri" },
  VC: { lat: 12.9843, lng: -61.2872, zoom: 10, name: "Saint Vincent ve Grenadinler" },

  // Güney Amerika
  AR: { lat: -38.4161, lng: -63.6167, zoom: 4, name: "Arjantin" },
  BO: { lat: -16.2902, lng: -63.5887, zoom: 6, name: "Bolivya" },
  BR: { lat: -14.235, lng: -51.9253, zoom: 4, name: "Brezilya" },
  CL: { lat: -35.6751, lng: -71.543, zoom: 4, name: "Şili" },
  CO: { lat: 4.5709, lng: -74.2973, zoom: 6, name: "Kolombiya" },
  EC: { lat: -1.8312, lng: -78.1834, zoom: 7, name: "Ekvador" },
  GY: { lat: 4.8604, lng: -58.9302, zoom: 7, name: "Guyana" },
  PE: { lat: -9.19, lng: -75.0152, zoom: 5, name: "Peru" },
  PY: { lat: -23.4425, lng: -58.4438, zoom: 6, name: "Paraguay" },
  SR: { lat: 3.9193, lng: -56.0278, zoom: 7, name: "Surinam" },
  UY: { lat: -32.5228, lng: -55.7658, zoom: 7, name: "Uruguay" },
  VE: { lat: 6.4238, lng: -66.5897, zoom: 6, name: "Venezuela" },

  // Afrika
  AO: { lat: -11.2027, lng: 17.8739, zoom: 6, name: "Angola" },
  BF: { lat: 12.2383, lng: -1.5616, zoom: 7, name: "Burkina Faso" },
  BI: { lat: -3.3731, lng: 29.9189, zoom: 8, name: "Burundi" },
  BJ: { lat: 9.3077, lng: 2.3158, zoom: 7, name: "Benin" },
  BW: { lat: -22.3285, lng: 24.6849, zoom: 6, name: "Botsvana" },
  CD: { lat: -4.0383, lng: 21.7587, zoom: 5, name: "Kongo Demokratik Cumhuriyeti" },
  CF: { lat: 6.6111, lng: 20.9394, zoom: 6, name: "Orta Afrika Cumhuriyeti" },
  CG: { lat: -0.228, lng: 15.8277, zoom: 6, name: "Kongo Cumhuriyeti" },
  CI: { lat: 7.54, lng: -5.5471, zoom: 7, name: "Fildişi Sahili" },
  CM: { lat: 7.3697, lng: 12.3547, zoom: 6, name: "Kamerun" },
  CV: { lat: 16.5388, lng: -23.0418, zoom: 8, name: "Yeşil Burun Adaları" },
  DJ: { lat: 11.8251, lng: 42.5903, zoom: 8, name: "Cibuti" },
  DZ: { lat: 28.0339, lng: 1.6596, zoom: 5, name: "Cezayir" },
  EG: { lat: 26.8206, lng: 30.8025, zoom: 6, name: "Mısır" },
  ER: { lat: 15.1794, lng: 39.7823, zoom: 7, name: "Eritre" },
  ET: { lat: 9.145, lng: 40.4897, zoom: 6, name: "Etiyopya" },
  GA: { lat: -0.8037, lng: 11.6094, zoom: 7, name: "Gabon" },
  GH: { lat: 7.9465, lng: -1.0232, zoom: 7, name: "Gana" },
  GM: { lat: 13.4432, lng: -15.3101, zoom: 8, name: "Gambiya" },
  GN: { lat: 9.9456, lng: -9.6966, zoom: 7, name: "Gine" },
  GQ: { lat: 1.6508, lng: 10.2679, zoom: 8, name: "Ekvator Ginesi" },
  GW: { lat: 11.8037, lng: -15.1804, zoom: 8, name: "Gine-Bissau" },
  KE: { lat: -0.0236, lng: 37.9062, zoom: 6, name: "Kenya" },
  KM: { lat: -11.6455, lng: 43.3333, zoom: 9, name: "Komorlar" },
  LR: { lat: 6.4281, lng: -9.4295, zoom: 7, name: "Liberya" },
  LS: { lat: -29.61, lng: 28.2336, zoom: 8, name: "Lesotho" },
  LY: { lat: 26.3351, lng: 17.2283, zoom: 5, name: "Libya" },
  MA: { lat: 31.7917, lng: -7.0926, zoom: 6, name: "Fas" },
  MG: { lat: -18.7669, lng: 46.8691, zoom: 6, name: "Madagaskar" },
  ML: { lat: 17.5707, lng: -3.9962, zoom: 6, name: "Mali" },
  MR: { lat: 21.0079, lng: -10.9408, zoom: 6, name: "Moritanya" },
  MU: { lat: -20.3484, lng: 57.5522, zoom: 10, name: "Mauritius" },
  MW: { lat: -13.2543, lng: 34.3015, zoom: 7, name: "Malavi" },
  MZ: { lat: -18.6657, lng: 35.5296, zoom: 6, name: "Mozambik" },
  NA: { lat: -22.9576, lng: 18.4904, zoom: 6, name: "Namibya" },
  NE: { lat: 17.6078, lng: 8.0817, zoom: 6, name: "Nijer" },
  NG: { lat: 9.082, lng: 8.6753, zoom: 6, name: "Nijerya" },
  RW: { lat: -1.9403, lng: 29.8739, zoom: 8, name: "Ruanda" },
  SC: { lat: -4.6796, lng: 55.492, zoom: 10, name: "Seyşeller" },
  SD: { lat: 12.8628, lng: 30.2176, zoom: 5, name: "Sudan" },
  SL: { lat: 8.4606, lng: -11.7799, zoom: 8, name: "Sierra Leone" },
  SN: { lat: 14.4974, lng: -14.4524, zoom: 7, name: "Senegal" },
  SO: { lat: 5.1521, lng: 46.1996, zoom: 6, name: "Somali" },
  SS: { lat: 6.877, lng: 31.307, zoom: 6, name: "Güney Sudan" },
  ST: { lat: 0.1864, lng: 6.6131, zoom: 9, name: "São Tomé ve Príncipe" },
  SZ: { lat: -26.5225, lng: 31.4659, zoom: 8, name: "Esvatini" },
  TD: { lat: 15.4542, lng: 18.7322, zoom: 6, name: "Çad" },
  TG: { lat: 8.6195, lng: 0.8248, zoom: 7, name: "Togo" },
  TN: { lat: 33.8869, lng: 9.5375, zoom: 7, name: "Tunus" },
  TZ: { lat: -6.369, lng: 34.8888, zoom: 6, name: "Tanzanya" },
  UG: { lat: 1.3733, lng: 32.2903, zoom: 7, name: "Uganda" },
  ZA: { lat: -30.5595, lng: 22.9375, zoom: 5, name: "Güney Afrika" },
  ZM: { lat: -13.1339, lng: 27.8493, zoom: 6, name: "Zambiya" },
  ZW: { lat: -19.0154, lng: 29.1549, zoom: 6, name: "Zimbabve" },

  // Okyanusya
  AU: { lat: -25.2744, lng: 133.7751, zoom: 4, name: "Avustralya" },
  FJ: { lat: -17.7134, lng: 178.065, zoom: 7, name: "Fiji" },
  FM: { lat: 7.4256, lng: 150.5508, zoom: 7, name: "Mikronezya" },
  KI: { lat: -3.3704, lng: -168.734, zoom: 6, name: "Kiribati" },
  MH: { lat: 7.1315, lng: 171.1845, zoom: 7, name: "Marshall Adaları" },
  NR: { lat: -0.5228, lng: 166.9315, zoom: 12, name: "Nauru" },
  NZ: { lat: -40.9006, lng: 174.886, zoom: 5, name: "Yeni Zelanda" },
  PF: { lat: -17.6797, lng: -149.4068, zoom: 8, name: "Fransız Polinezyası" },
  PG: { lat: -6.315, lng: 143.9555, zoom: 6, name: "Papua Yeni Gine" },
  PW: { lat: 7.515, lng: 134.5825, zoom: 9, name: "Palau" },
  SB: { lat: -9.6457, lng: 160.1562, zoom: 7, name: "Solomon Adaları" },
  TO: { lat: -21.179, lng: -175.1982, zoom: 8, name: "Tonga" },
  TV: { lat: -7.1095, lng: 177.6493, zoom: 9, name: "Tuvalu" },
  VU: { lat: -15.3767, lng: 166.9592, zoom: 7, name: "Vanuatu" },
  WS: { lat: -13.759, lng: -172.1046, zoom: 9, name: "Samoa" },
};
