/**
 * Türkiye 81 İl ve Popüler İlçe Eşleştirme Sözlüğü
 * TatildeBugun Şehir Normalizasyonu ve Akıllı Arama Motoru
 */

export interface TurkeyCity {
  plate: number;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export const TURKEY_PROVINCES: TurkeyCity[] = [
  { plate: 1, name: "Adana", region: "Akdeniz", lat: 37.0, lng: 35.3213 },
  { plate: 2, name: "Adıyaman", region: "Güneydoğu Anadolu", lat: 37.7648, lng: 38.2786 },
  { plate: 3, name: "Afyonkarahisar", region: "Ege", lat: 38.7507, lng: 30.5567 },
  { plate: 4, name: "Ağrı", region: "Doğu Anadolu", lat: 39.7191, lng: 43.0503 },
  { plate: 5, name: "Amasya", region: "Karadeniz", lat: 40.6501, lng: 35.8353 },
  { plate: 6, name: "Ankara", region: "İç Anadolu", lat: 39.9334, lng: 32.8597 },
  { plate: 7, name: "Antalya", region: "Akdeniz", lat: 36.8969, lng: 30.7133 },
  { plate: 8, name: "Artvin", region: "Karadeniz", lat: 41.1828, lng: 41.8183 },
  { plate: 9, name: "Aydın", region: "Ege", lat: 37.856, lng: 27.8416 },
  { plate: 10, name: "Balıkesir", region: "Marmara", lat: 39.6484, lng: 27.8826 },
  { plate: 11, name: "Bilecik", region: "Marmara", lat: 40.1451, lng: 29.9799 },
  { plate: 12, name: "Bingöl", region: "Doğu Anadolu", lat: 38.8847, lng: 40.4939 },
  { plate: 13, name: "Bitlis", region: "Doğu Anadolu", lat: 38.4006, lng: 42.1095 },
  { plate: 14, name: "Bolu", region: "Karadeniz", lat: 40.7358, lng: 31.6061 },
  { plate: 15, name: "Burdur", region: "Akdeniz", lat: 37.7203, lng: 30.2908 },
  { plate: 16, name: "Bursa", region: "Marmara", lat: 40.1885, lng: 29.061 },
  { plate: 17, name: "Çanakkale", region: "Marmara", lat: 40.1553, lng: 26.4142 },
  { plate: 18, name: "Çankırı", region: "İç Anadolu", lat: 40.6013, lng: 33.6134 },
  { plate: 19, name: "Çorum", region: "Karadeniz", lat: 40.5506, lng: 34.9556 },
  { plate: 20, name: "Denizli", region: "Ege", lat: 37.7765, lng: 29.0864 },
  { plate: 21, name: "Diyarbakır", region: "Güneydoğu Anadolu", lat: 37.9144, lng: 40.2306 },
  { plate: 22, name: "Edirne", region: "Marmara", lat: 41.6772, lng: 26.5557 },
  { plate: 23, name: "Elazığ", region: "Doğu Anadolu", lat: 38.681, lng: 39.2264 },
  { plate: 24, name: "Erzincan", region: "Doğu Anadolu", lat: 39.75, lng: 39.5 },
  { plate: 25, name: "Erzurum", region: "Doğu Anadolu", lat: 39.9043, lng: 41.2679 },
  { plate: 26, name: "Eskişehir", region: "İç Anadolu", lat: 39.7767, lng: 30.5206 },
  { plate: 27, name: "Gaziantep", region: "Güneydoğu Anadolu", lat: 37.0662, lng: 37.3833 },
  { plate: 28, name: "Giresun", region: "Karadeniz", lat: 40.9128, lng: 38.3895 },
  { plate: 29, name: "Gümüşhane", region: "Karadeniz", lat: 40.4603, lng: 39.4817 },
  { plate: 30, name: "Hakkari", region: "Doğu Anadolu", lat: 37.5833, lng: 43.7333 },
  { plate: 31, name: "Hatay", region: "Akdeniz", lat: 36.4018, lng: 36.3498 },
  { plate: 32, name: "Isparta", region: "Akdeniz", lat: 37.7648, lng: 30.5566 },
  { plate: 33, name: "Mersin", region: "Akdeniz", lat: 36.8, lng: 34.6333 },
  { plate: 34, name: "İstanbul", region: "Marmara", lat: 41.0082, lng: 28.9784 },
  { plate: 35, name: "İzmir", region: "Ege", lat: 38.4192, lng: 27.1287 },
  { plate: 36, name: "Kars", region: "Doğu Anadolu", lat: 40.6167, lng: 43.1 },
  { plate: 37, name: "Kastamonu", region: "Karadeniz", lat: 41.3887, lng: 33.7827 },
  { plate: 38, name: "Kayseri", region: "İç Anadolu", lat: 38.7312, lng: 35.4787 },
  { plate: 39, name: "Kırklareli", region: "Marmara", lat: 41.7333, lng: 27.2167 },
  { plate: 40, name: "Kırşehir", region: "İç Anadolu", lat: 39.1425, lng: 34.1709 },
  { plate: 41, name: "Kocaeli", region: "Marmara", lat: 40.8533, lng: 29.8815 },
  { plate: 42, name: "Konya", region: "İç Anadolu", lat: 37.8667, lng: 32.4833 },
  { plate: 43, name: "Kütahya", region: "Ege", lat: 39.4167, lng: 29.9833 },
  { plate: 44, name: "Malatya", region: "Doğu Anadolu", lat: 38.3552, lng: 38.3095 },
  { plate: 45, name: "Manisa", region: "Ege", lat: 38.6191, lng: 27.4289 },
  { plate: 46, name: "Kahramanmaraş", region: "Akdeniz", lat: 37.5858, lng: 36.9371 },
  { plate: 47, name: "Mardin", region: "Güneydoğu Anadolu", lat: 37.3212, lng: 40.7245 },
  { plate: 48, name: "Muğla", region: "Ege", lat: 37.2153, lng: 28.3636 },
  { plate: 49, name: "Muş", region: "Doğu Anadolu", lat: 38.7432, lng: 41.5064 },
  { plate: 50, name: "Nevşehir", region: "İç Anadolu", lat: 38.6244, lng: 34.7239 },
  { plate: 51, name: "Niğde", region: "İç Anadolu", lat: 37.9667, lng: 34.6833 },
  { plate: 52, name: "Ordu", region: "Karadeniz", lat: 40.9839, lng: 37.8764 },
  { plate: 53, name: "Rize", region: "Karadeniz", lat: 41.0201, lng: 40.5234 },
  { plate: 54, name: "Sakarya", region: "Marmara", lat: 40.7569, lng: 30.3783 },
  { plate: 55, name: "Samsun", region: "Karadeniz", lat: 41.2928, lng: 36.3313 },
  { plate: 56, name: "Siirt", region: "Güneydoğu Anadolu", lat: 37.9333, lng: 41.95 },
  { plate: 57, name: "Sinop", region: "Karadeniz", lat: 42.0231, lng: 35.1531 },
  { plate: 58, name: "Sivas", region: "İç Anadolu", lat: 39.7477, lng: 37.0179 },
  { plate: 59, name: "Tekirdağ", region: "Marmara", lat: 40.9833, lng: 27.5167 },
  { plate: 60, name: "Tokat", region: "Karadeniz", lat: 40.3167, lng: 36.55 },
  { plate: 61, name: "Trabzon", region: "Karadeniz", lat: 41.0015, lng: 39.7178 },
  { plate: 62, name: "Tunceli", region: "Doğu Anadolu", lat: 39.1079, lng: 39.5401 },
  { plate: 63, name: "Şanlıurfa", region: "Güneydoğu Anadolu", lat: 37.1591, lng: 38.7969 },
  { plate: 64, name: "Uşak", region: "Ege", lat: 38.6823, lng: 29.4082 },
  { plate: 65, name: "Van", region: "Doğu Anadolu", lat: 38.4891, lng: 43.4089 },
  { plate: 66, name: "Yozgat", region: "İç Anadolu", lat: 39.8181, lng: 34.8147 },
  { plate: 67, name: "Zonguldak", region: "Karadeniz", lat: 41.4564, lng: 31.7987 },
  { plate: 68, name: "Aksaray", region: "İç Anadolu", lat: 38.3687, lng: 34.037 },
  { plate: 69, name: "Bayburt", region: "Karadeniz", lat: 40.2552, lng: 40.2249 },
  { plate: 70, name: "Karaman", region: "İç Anadolu", lat: 37.1759, lng: 33.2287 },
  { plate: 71, name: "Kırıkkale", region: "İç Anadolu", lat: 39.8468, lng: 33.5153 },
  { plate: 72, name: "Batman", region: "Güneydoğu Anadolu", lat: 37.8812, lng: 41.1351 },
  { plate: 73, name: "Şırnak", region: "Güneydoğu Anadolu", lat: 37.5164, lng: 42.4595 },
  { plate: 74, name: "Bartın", region: "Karadeniz", lat: 41.6344, lng: 32.3375 },
  { plate: 75, name: "Ardahan", region: "Doğu Anadolu", lat: 41.1105, lng: 42.7022 },
  { plate: 76, name: "Iğdır", region: "Doğu Anadolu", lat: 39.9196, lng: 44.0454 },
  { plate: 77, name: "Yalova", region: "Marmara", lat: 40.65, lng: 29.2667 },
  { plate: 78, name: "Karabük", region: "Karadeniz", lat: 41.2061, lng: 32.6204 },
  { plate: 79, name: "Kilis", region: "Güneydoğu Anadolu", lat: 36.7184, lng: 37.1212 },
  { plate: 80, name: "Osmaniye", region: "Akdeniz", lat: 37.0742, lng: 36.2467 },
  { plate: 81, name: "Düzce", region: "Karadeniz", lat: 40.8438, lng: 31.1565 },
];

/**
 * Popüler ve bilinen ilçelerin bağlı olduğu illere eşleme tablosu
 * (Tüm anahtarlar Türkçe küçük harf standardında tutulur)
 */
export const TURKEY_DISTRICT_TO_PROVINCE: Record<string, string> = {
  // Muğla
  bodrum: "Muğla",
  marmaris: "Muğla",
  fethiye: "Muğla",
  datça: "Muğla",
  ula: "Muğla",
  akyaka: "Muğla",
  köyceğiz: "Muğla",
  ortaca: "Muğla",
  dalaman: "Muğla",
  milas: "Muğla",
  yatağan: "Muğla",
  seydikemer: "Muğla",
  kavaklıdere: "Muğla",
  göcek: "Muğla",
  ölüdeniz: "Muğla",

  // İzmir
  çeşme: "İzmir",
  alaçatı: "İzmir",
  urla: "İzmir",
  seferihisar: "İzmir",
  sığacık: "İzmir",
  foça: "İzmir",
  selçuk: "İzmir",
  şirince: "İzmir",
  dikili: "İzmir",
  karaburun: "İzmir",
  bornova: "İzmir",
  karşıyaka: "İzmir",
  konak: "İzmir",
  buca: "İzmir",
  alsancak: "İzmir",
  bayraklı: "İzmir",
  karabağlar: "İzmir",
  çiğli: "İzmir",
  menemen: "İzmir",
  gaziemir: "İzmir",
  torbalı: "İzmir",
  kemalpaşa: "İzmir",
  aliağa: "İzmir",
  bergama: "İzmir",
  ödemiş: "İzmir",
  tire: "İzmir",

  // Antalya
  alanya: "Antalya",
  manavgat: "Antalya",
  side: "Antalya",
  kaş: "Antalya",
  kalkan: "Antalya",
  kemer: "Antalya",
  serik: "Antalya",
  belek: "Antalya",
  muratpaşa: "Antalya",
  konyaaltı: "Antalya",
  kepez: "Antalya",
  döşemealtı: "Antalya",
  aksu: "Antalya",
  finike: "Antalya",
  kumluca: "Antalya",
  demre: "Antalya",
  gazipaşa: "Antalya",
  korkuteli: "Antalya",
  elmalı: "Antalya",
  çıralı: "Antalya",
  olimpos: "Antalya",

  // İstanbul
  kadıköy: "İstanbul",
  beşiktaş: "İstanbul",
  şişli: "İstanbul",
  üsküdar: "İstanbul",
  beyoğlu: "İstanbul",
  fatih: "İstanbul",
  bakırköy: "İstanbul",
  sarıyer: "İstanbul",
  beykoz: "İstanbul",
  maltepe: "İstanbul",
  kartal: "İstanbul",
  pendik: "İstanbul",
  ataşehir: "İstanbul",
  ümraniye: "İstanbul",
  bağcılar: "İstanbul",
  bahçelievler: "İstanbul",
  esenyurt: "İstanbul",
  başakşehir: "İstanbul",
  küçükçekmece: "İstanbul",
  büyükçekmece: "İstanbul",
  avcılar: "İstanbul",
  beylikdüzü: "İstanbul",
  silivri: "İstanbul",
  şile: "İstanbul",
  ağva: "İstanbul",
  çatalca: "İstanbul",
  tuzla: "İstanbul",
  zeytinburnu: "İstanbul",
  eyüpsultan: "İstanbul",
  kağıthane: "İstanbul",
  adalar: "İstanbul",
  büyükada: "İstanbul",
  heybeliada: "İstanbul",

  // Balıkesir
  ayvalık: "Balıkesir",
  cunda: "Balıkesir",
  edremit: "Balıkesir",
  akçay: "Balıkesir",
  altınoluk: "Balıkesir",
  burhaniye: "Balıkesir",
  bandırma: "Balıkesir",
  erdek: "Balıkesir",
  avşa: "Balıkesir",
  gönen: "Balıkesir",
  karesi: "Balıkesir",
  altıeylül: "Balıkesir",
  susurluk: "Balıkesir",
  manyas: "Balıkesir",

  // Aydın
  kuşadası: "Aydın",
  didim: "Aydın",
  söke: "Aydın",
  efeler: "Aydın",
  nazilli: "Aydın",
  germencik: "Aydın",
  incirliova: "Aydın",
  çine: "Aydın",

  // Çanakkale
  bozcaada: "Çanakkale",
  gökçeada: "Çanakkale",
  assos: "Çanakkale",
  ayvacık: "Çanakkale",
  gelibolu: "Çanakkale",
  biga: "Çanakkale",
  çan: "Çanakkale",
  ezine: "Çanakkale",
  lapseki: "Çanakkale",

  // Nevşehir
  ürgüp: "Nevşehir",
  göreme: "Nevşehir",
  avanos: "Nevşehir",
  uçhisar: "Nevşehir",
  derinkuyu: "Nevşehir",
  kaymaklı: "Nevşehir",
  kozaklı: "Nevşehir",
  ortahisar: "Nevşehir",

  // Bursa
  nilüfer: "Bursa",
  osmangazi: "Bursa",
  yıldırım: "Bursa",
  mudanya: "Bursa",
  trilye: "Bursa",
  gemlik: "Bursa",
  inegöl: "Bursa",
  iznik: "Bursa",
  mustafakemalpaşa: "Bursa",
  karacabey: "Bursa",
  orhangazi: "Bursa",

  // Ankara
  çankaya: "Ankara",
  keçiören: "Ankara",
  yenimahalle: "Ankara",
  mamak: "Ankara",
  etimesgut: "Ankara",
  sincan: "Ankara",
  altındağ: "Ankara",
  gölbaşı: "Ankara",
  polatlı: "Ankara",
  beypazarı: "Ankara",
  kızılcahamam: "Ankara",

  // Trabzon
  akçaabat: "Trabzon",
  uzungöl: "Trabzon",
  çaykara: "Trabzon",
  yomra: "Trabzon",
  sürmene: "Trabzon",
  of: "Trabzon",
  maçka: "Trabzon",

  // Rize
  çamlıhemşin: "Rize",
  ayder: "Rize",
  ardeşen: "Rize",
  fındıklı: "Rize",
  pazar: "Rize",
  ikizdere: "Rize",

  // Artvin
  hopa: "Artvin",
  borçka: "Artvin",
  şavşat: "Artvin",
  arhavi: "Artvin",

  // Denizli
  pamukkale: "Denizli",
  merkezefendi: "Denizli",

  // Mersin
  tarsus: "Mersin",
  silifke: "Mersin",
  kızkalesi: "Mersin",
  erdemli: "Mersin",
  anamur: "Mersin",

  // Sakarya
  sapanca: "Sakarya",
  karasu: "Sakarya",
  hendek: "Sakarya",
  akyazı: "Sakarya",
  serdivan: "Sakarya",
  adapazarı: "Sakarya",

  // Kocaeli
  izmit: "Kocaeli",
  gebze: "Kocaeli",
  darıca: "Kocaeli",
  kartepe: "Kocaeli",
  gölcük: "Kocaeli",
  kandıra: "Kocaeli",
  kerpe: "Kocaeli",
  kefken: "Kocaeli",
  karamürsel: "Kocaeli",

  // Yalova
  çınarcık: "Yalova",
  armutlu: "Yalova",
  termal: "Yalova",

  // Karabük
  safranbolu: "Karabük",

  // Kırklareli
  iğneada: "Kırklareli",
  lüleburgaz: "Kırklareli",
  vize: "Kırklareli",
  kıyıköy: "Kırklareli",

  // Tekirdağ
  çorlu: "Tekirdağ",
  şarköy: "Tekirdağ",
  çerkezköy: "Tekirdağ",
};

/**
 * Türkçe karakter uyumlu arama anahtarı üretir
 */
export function normalizeTurkishText(text: string): string {
  if (!text) return "";
  return text
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/i̇/g, "i")
    .replace(/[\s\-_]/g, "");
}

/**
 * Verilen metnin il mi yoksa ilçe mi olduğunu analiz edip ana ili döndürür.
 */
export function resolveTurkishCityOrDistrict(input: string): {
  cityName: string;
  districtName?: string;
  isDistrict: boolean;
} {
  if (!input) return { cityName: "", isDistrict: false };

  const norm = normalizeTurkishText(input);

  // 1. Önce doğrudan 81 il listesinde var mı?
  const directProvince = TURKEY_PROVINCES.find(
    (p) => normalizeTurkishText(p.name) === norm
  );
  if (directProvince) {
    return { cityName: directProvince.name, isDistrict: false };
  }

  // 2. İlçe sözlüğünde var mı?
  for (const [distKey, provName] of Object.entries(TURKEY_DISTRICT_TO_PROVINCE)) {
    if (normalizeTurkishText(distKey) === norm) {
      // Orijinal ilçe adını düzgün baş harfle formatla
      const formattedDistrict =
        distKey.charAt(0).toLocaleUpperCase("tr-TR") + distKey.slice(1);
      return {
        cityName: provName,
        districtName: formattedDistrict,
        isDistrict: true,
      };
    }
  }

  // 3. Eşleşme bulunamadıysa giriş yapılan metni temizleyip il olarak kabul et
  return { cityName: input.trim(), isDistrict: false };
}
