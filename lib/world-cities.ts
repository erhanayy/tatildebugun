import { TURKEY_PROVINCES, resolveTurkishCityOrDistrict, normalizeTurkishText } from "./turkey-cities";
import { COUNTRY_CENTERS, getCountryFlagEmoji } from "./country-flags";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  aliases?: string[];
}

export interface CityOption {
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
}

/**
 * Dünya Ülkeleri (Genişletilmiş Kapsamlı Liste - 100+ Popüler ve Turistik Ülke)
 */
export const WORLD_COUNTRIES: CountryOption[] = [
  { code: "TR", name: "Türkiye", flag: "🇹🇷", aliases: ["Turkey", "Turkiye"] },
  {
    code: "KKTC",
    name: "Kuzey Kıbrıs Türk Cumhuriyeti (KKTC)",
    flag: "🇹🇷",
    aliases: [
      "Kıbrıs",
      "Kuzey Kıbrıs",
      "KKTC",
      "TRNC",
      "Girne",
      "Lefkoşa",
      "Lefkosa",
      "Lefkoşe",
      "Gazimağusa",
      "Gazimagusa",
      "Gazi Magosa",
      "Magusa",
      "Güzelyurt",
      "Guzelyurt",
      "İskele",
      "Iskele",
      "Lefke",
    ],
  },
  { code: "FR", name: "Fransa", flag: "🇫🇷", aliases: ["France", "Paris"] },
  { code: "IT", name: "İtalya", flag: "🇮🇹", aliases: ["Italy", "Roma", "Milano"] },
  { code: "ES", name: "İspanya", flag: "🇪🇸", aliases: ["Spain", "Barselona", "Madrid", "Ibiza"] },
  { code: "DE", name: "Almanya", flag: "🇩🇪", aliases: ["Germany", "Berlin", "Munih"] },
  { code: "NL", name: "Hollanda", flag: "🇳🇱", aliases: ["Netherlands", "Holland", "Amsterdam"] },
  { code: "GB", name: "Birleşik Krallık", flag: "🇬🇧", aliases: ["İngiltere", "UK", "Britain", "England", "Londra"] },
  { code: "GR", name: "Yunanistan", flag: "🇬🇷", aliases: ["Greece", "Atina", "Santorini", "Mikonos"] },
  { code: "AT", name: "Avusturya", flag: "🇦🇹", aliases: ["Austria", "Viyana"] },
  { code: "CH", name: "İsviçre", flag: "🇨🇭", aliases: ["Switzerland", "Swiss", "Zürih", "Cenevre"] },
  { code: "PT", name: "Portekiz", flag: "🇵🇹", aliases: ["Portugal", "Lizbon", "Porto"] },
  { code: "US", name: "Amerika Birleşik Devletleri", flag: "🇺🇸", aliases: ["ABD", "USA", "Amerika", "New York", "Miami"] },
  { code: "JP", name: "Japonya", flag: "🇯🇵", aliases: ["Japan", "Tokyo", "Kyoto"] },
  { code: "TH", name: "Tayland", flag: "🇹🇭", aliases: ["Thailand", "Bangkok", "Phuket"] },
  { code: "AE", name: "Birleşik Arap Emirlikleri", flag: "🇦🇪", aliases: ["Dubai", "Abu Dabi", "BAE", "UAE"] },
  { code: "EG", name: "Mısır", flag: "🇪🇬", aliases: ["Egypt", "Kahire", "Şarm El-Şeyh"] },
  { code: "ME", name: "Karadağ", flag: "🇲🇪", aliases: ["Montenegro", "Kotor", "Budva"] },
  { code: "HR", name: "Hırvatistan", flag: "🇭🇷", aliases: ["Croatia", "Dubrovnik", "Split"] },
  { code: "GE", name: "Gürcistan", flag: "🇬🇪", aliases: ["Georgia", "Tiflis", "Batum"] },
  { code: "AZ", name: "Azerbaycan", flag: "🇦🇿", aliases: ["Azerbaijan", "Baku", "Bakü"] },
  { code: "BE", name: "Belçika", flag: "🇧🇪", aliases: ["Belgium", "Brüksel", "Brugge"] },
  { code: "CZ", name: "Çekya", flag: "🇨🇿", aliases: ["Czech", "Prag", "Prague"] },
  { code: "DK", name: "Danimarka", flag: "🇩🇰", aliases: ["Denmark", "Kopenhag"] },
  { code: "SE", name: "İsveç", flag: "🇸🇪", aliases: ["Sweden", "Stockholm"] },
  { code: "NO", name: "Norveç", flag: "🇳🇴", aliases: ["Norway", "Oslo", "Bergen"] },
  { code: "FI", name: "Finlandiya", flag: "🇫🇮", aliases: ["Finland", "Helsinki"] },
  { code: "PL", name: "Polonya", flag: "🇵🇱", aliases: ["Poland", "Varşova", "Krakow"] },
  { code: "HU", name: "Macaristan", flag: "🇭🇺", aliases: ["Hungary", "Budapeşte"] },
  { code: "RO", name: "Romanya", flag: "🇷🇴", aliases: ["Romania", "Bükreş"] },
  { code: "BG", name: "Bulgaristan", flag: "🇧🇬", aliases: ["Bulgaria", "Sofya", "Varna"] },
  { code: "RS", name: "Sırbistan", flag: "🇷🇸", aliases: ["Serbia", "Belgrad"] },
  { code: "BA", name: "Bosna-Hersek", flag: "🇧🇦", aliases: ["Bosnia", "Saraybosna", "Mostar"] },
  { code: "MK", name: "Kuzey Makedonya", flag: "🇲🇰", aliases: ["Macedonia", "Üsküp", "Ohri"] },
  { code: "AL", name: "Arnavutluk", flag: "🇦🇱", aliases: ["Albania", "Tiran", "Saranda"] },
  { code: "XK", name: "Kosova", flag: "🇽🇰", aliases: ["Kosovo", "Priştine"] },
  { code: "SI", name: "Slovenya", flag: "🇸🇮", aliases: ["Slovenia", "Ljubljana", "Bled"] },
  { code: "SK", name: "Slovakya", flag: "🇸🇰", aliases: ["Slovakia", "Bratislava"] },
  { code: "IE", name: "İrlanda", flag: "🇮🇪", aliases: ["Ireland", "Dublin"] },
  { code: "IS", name: "İzlanda", flag: "🇮🇸", aliases: ["Iceland", "Reykjavik"] },
  { code: "MT", name: "Malta", flag: "🇲🇹", aliases: ["Valletta"] },
  { code: "CY", name: "Güney Kıbrıs Rum Yönetimi (GKRY)", flag: "🇨🇾", aliases: ["Kıbrıs Rum", "Güney Kıbrıs", "GKRY", "Limasol", "Larnaka", "Baf"] },
  { code: "RU", name: "Rusya", flag: "🇷🇺", aliases: ["Russia", "Moskova", "St Petersburg"] },
  { code: "UA", name: "Ukrayna", flag: "🇺🇦", aliases: ["Ukraine", "Kiev", "Lviv"] },
  { code: "CA", name: "Kanada", flag: "🇨🇦", aliases: ["Canada", "Toronto", "Vancouver"] },
  { code: "BR", name: "Brezilya", flag: "🇧🇷", aliases: ["Brazil", "Rio de Janeiro", "Sao Paulo"] },
  { code: "AR", name: "Arjantin", flag: "🇦🇷", aliases: ["Argentina", "Buenos Aires"] },
  { code: "MX", name: "Meksika", flag: "🇲🇽", aliases: ["Mexico", "Cancun", "Tulum"] },
  { code: "KR", name: "Güney Kore", flag: "🇰🇷", aliases: ["Korea", "South Korea", "Seul"] },
  { code: "SG", name: "Singapur", flag: "🇸🇬", aliases: ["Singapore"] },
  { code: "MY", name: "Malezya", flag: "🇲🇾", aliases: ["Malaysia", "Kuala Lumpur"] },
  { code: "ID", name: "Endonezya", flag: "🇮🇩", aliases: ["Indonesia", "Bali", "Ubud", "Cakarta"] },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", aliases: ["Hanoi", "Ho Chi Minh"] },
  { code: "IN", name: "Hindistan", flag: "🇮🇳", aliases: ["India", "Yeni Delhi", "Goa"] },
  { code: "MA", name: "Fas", flag: "🇲🇦", aliases: ["Morocco", "Marakeş", "Kazablanka"] },
  { code: "ZA", name: "Güney Afrika", flag: "🇿🇦", aliases: ["South Africa", "Cape Town"] },
  { code: "AU", name: "Avustralya", flag: "🇦🇺", aliases: ["Australia", "Sidney", "Melbourne"] },
  { code: "NZ", name: "Yeni Zelanda", flag: "🇳🇿", aliases: ["New Zealand", "Auckland"] },
  { code: "SA", name: "Suudi Arabistan", flag: "🇸🇦", aliases: ["Saudi Arabia", "Riyad", "Mekke", "Medine"] },
  { code: "QA", name: "Katar", flag: "🇶🇦", aliases: ["Qatar", "Doha"] },
  { code: "JO", name: "Ürdün", flag: "🇯🇴", aliases: ["Jordan", "Amman", "Petra"] },
  { code: "UZ", name: "Özbekistan", flag: "🇺🇿", aliases: ["Uzbekistan", "Taskent", "Semerkant"] },
  { code: "KZ", name: "Kazakistan", flag: "🇰🇿", aliases: ["Kazakhstan", "Almati", "Astana"] },
  { code: "MV", name: "Maldivler", flag: "🇲🇻", aliases: ["Maldives", "Male"] },
  { code: "CU", name: "Küba", flag: "🇨🇺", aliases: ["Cuba", "Havana", "Varadero"] },
  { code: "DO", name: "Dominik Cumhuriyeti", flag: "🇩🇴", aliases: ["Dominican Republic", "Punta Cana"] },
  { code: "PH", name: "Filipinler", flag: "🇵🇭", aliases: ["Philippines", "Manila", "Boracay", "Cebu"] },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", aliases: ["Kolombo", "Kandy"] },
  { code: "MU", name: "Mauritius", flag: "🇲🇺", aliases: ["Port Louis"] },
  { code: "SC", name: "Seyşeller", flag: "🇸🇨", aliases: ["Seychelles", "Mahe"] },
  { code: "CO", name: "Kolombiya", flag: "🇨🇴", aliases: ["Colombia", "Bogota", "Medellin", "Cartagena"] },
  { code: "PE", name: "Peru", flag: "🇵🇪", aliases: ["Lima", "Cusco", "Machu Picchu"] },
  { code: "CL", name: "Şili", flag: "🇨🇱", aliases: ["Chile", "Santiago"] },
  { code: "CR", name: "Kosta Rika", flag: "🇨🇷", aliases: ["Costa Rica", "San Jose"] },
  { code: "KE", name: "Kenya", flag: "🇰🇪", aliases: ["Nairobi", "Mombasa"] },
  { code: "TZ", name: "Tanzanya", flag: "🇹🇿", aliases: ["Tanzania", "Zanzibar"] },
  { code: "TN", name: "Tunus", flag: "🇹🇳", aliases: ["Tunisia"] },
  { code: "LU", name: "Lüksemburg", flag: "🇱🇺", aliases: ["Luxembourg"] },
  { code: "MC", name: "Monako", flag: "🇲🇨", aliases: ["Monaco", "Monte Carlo"] },
  { code: "CN", name: "Çin", flag: "🇨🇳", aliases: ["China", "Pekin", "Sanghay"] },
  { code: "TW", name: "Tayvan", flag: "🇹🇼", aliases: ["Taiwan", "Taipei"] },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", aliases: ["Hongkong"] },
  { code: "OM", name: "Umman", flag: "🇴🇲", aliases: ["Oman", "Maskat"] },
  { code: "NP", name: "Nepal", flag: "🇳🇵", aliases: ["Katmandu"] },
  { code: "KH", name: "Kamboçya", flag: "🇰🇭", aliases: ["Cambodia", "Siem Reap"] },
];

export const POPULAR_COUNTRIES = WORLD_COUNTRIES.slice(0, 20);

export const POPULAR_WORLD_CITIES: Record<string, CityOption[]> = {
  TR: [
    { name: "İstanbul", countryCode: "TR", lat: 41.0082, lng: 28.9784 },
    { name: "Ankara", countryCode: "TR", lat: 39.9334, lng: 32.8597 },
    { name: "İzmir", countryCode: "TR", lat: 38.4192, lng: 27.1287 },
    { name: "Bursa", countryCode: "TR", lat: 40.1885, lng: 29.061 },
    { name: "Antalya", countryCode: "TR", lat: 36.8969, lng: 30.7133 },
    { name: "Muğla / Bodrum", countryCode: "TR", lat: 37.0344, lng: 27.4305 },
    { name: "Muğla / Fethiye", countryCode: "TR", lat: 36.6217, lng: 29.1164 },
    { name: "Nevşehir / Kapadokya", countryCode: "TR", lat: 38.6247, lng: 34.7142 },
    { name: "Trabzon", countryCode: "TR", lat: 41.0027, lng: 39.7168 },
    { name: "Gaziantep", countryCode: "TR", lat: 37.0662, lng: 37.3833 },
    { name: "Çanakkale", countryCode: "TR", lat: 40.1553, lng: 26.4142 },
    { name: "Balıkesir", countryCode: "TR", lat: 39.6484, lng: 27.8826 },
    { name: "Eskişehir", countryCode: "TR", lat: 39.7767, lng: 30.5206 },
  ],
  FR: [
    { name: "Paris", countryCode: "FR", lat: 48.8566, lng: 2.3522 },
    { name: "Nice", countryCode: "FR", lat: 43.7102, lng: 7.262 },
    { name: "Lyon", countryCode: "FR", lat: 45.764, lng: 4.8357 },
    { name: "Marsilya", countryCode: "FR", lat: 43.2965, lng: 5.3698 },
    { name: "Bordeaux", countryCode: "FR", lat: 44.8378, lng: -0.5792 },
    { name: "Strasbourg", countryCode: "FR", lat: 48.5734, lng: 7.7521 },
    { name: "Cannes", countryCode: "FR", lat: 43.5528, lng: 7.0174 },
  ],
  IT: [
    { name: "Roma", countryCode: "IT", lat: 41.9028, lng: 12.4964 },
    { name: "Milano", countryCode: "IT", lat: 45.4642, lng: 9.19 },
    { name: "Venedik", countryCode: "IT", lat: 45.4408, lng: 12.3155 },
    { name: "Floransa", countryCode: "IT", lat: 43.7696, lng: 11.2558 },
    { name: "Napoli", countryCode: "IT", lat: 40.8518, lng: 14.2681 },
    { name: "Bologna", countryCode: "IT", lat: 44.4949, lng: 11.3426 },
    { name: "Torino", countryCode: "IT", lat: 45.0703, lng: 7.6869 },
  ],
  ES: [
    { name: "Barselona", countryCode: "ES", lat: 41.3851, lng: 2.1734 },
    { name: "Madrid", countryCode: "ES", lat: 40.4168, lng: -3.7038 },
    { name: "Sevilla", countryCode: "ES", lat: 37.3891, lng: -5.9845 },
    { name: "Valensiya", countryCode: "ES", lat: 39.4699, lng: -0.3763 },
    { name: "Malaga", countryCode: "ES", lat: 36.7213, lng: -4.4214 },
    { name: "Granada", countryCode: "ES", lat: 37.1773, lng: -3.5986 },
    { name: "İbiza", countryCode: "ES", lat: 38.9067, lng: 1.4206 },
  ],
  NL: [
    { name: "Amsterdam", countryCode: "NL", lat: 52.3676, lng: 4.9041 },
    { name: "Rotterdam", countryCode: "NL", lat: 51.9244, lng: 4.4777 },
    { name: "Utrecht", countryCode: "NL", lat: 52.0907, lng: 5.1214 },
    { name: "Lahey (Den Haag)", countryCode: "NL", lat: 52.0705, lng: 4.3007 },
    { name: "Eindhoven", countryCode: "NL", lat: 51.4416, lng: 5.4697 },
  ],
  DE: [
    { name: "Berlin", countryCode: "DE", lat: 52.52, lng: 13.405 },
    { name: "Münih", countryCode: "DE", lat: 48.1351, lng: 11.582 },
    { name: "Frankfurt", countryCode: "DE", lat: 50.1109, lng: 8.6821 },
    { name: "Hamburg", countryCode: "DE", lat: 53.5511, lng: 9.9937 },
    { name: "Köln", countryCode: "DE", lat: 50.9375, lng: 6.9603 },
    { name: "Düsseldorf", countryCode: "DE", lat: 51.2277, lng: 6.7735 },
  ],
  GB: [
    { name: "Londra", countryCode: "GB", lat: 51.5074, lng: -0.1278 },
    { name: "Edinburgh", countryCode: "GB", lat: 55.9533, lng: -3.1883 },
    { name: "Manchester", countryCode: "GB", lat: 53.4808, lng: -2.2426 },
    { name: "Liverpool", countryCode: "GB", lat: 53.4084, lng: -2.9916 },
  ],
  GR: [
    { name: "Atina", countryCode: "GR", lat: 37.9838, lng: 23.7275 },
    { name: "Selanik", countryCode: "GR", lat: 40.6401, lng: 22.9444 },
    { name: "Santorini", countryCode: "GR", lat: 36.3932, lng: 25.4615 },
    { name: "Mikonos", countryCode: "GR", lat: 37.4467, lng: 25.3289 },
    { name: "Girit / Kandiye", countryCode: "GR", lat: 35.3387, lng: 25.1442 },
    { name: "Rodos", countryCode: "GR", lat: 36.4349, lng: 28.2175 },
  ],
  AT: [
    { name: "Viyana", countryCode: "AT", lat: 48.2082, lng: 16.3738 },
    { name: "Salzburg", countryCode: "AT", lat: 47.8095, lng: 13.055 },
    { name: "Hallstatt", countryCode: "AT", lat: 47.5622, lng: 13.6493 },
    { name: "Innsbruck", countryCode: "AT", lat: 47.2692, lng: 11.4041 },
  ],
  CH: [
    { name: "Zürih", countryCode: "CH", lat: 47.3769, lng: 8.5417 },
    { name: "Cenevre", countryCode: "CH", lat: 46.2044, lng: 6.1432 },
    { name: "Basel", countryCode: "CH", lat: 47.5596, lng: 7.5886 },
    { name: "Luzern", countryCode: "CH", lat: 47.0502, lng: 8.3093 },
    { name: "Bern", countryCode: "CH", lat: 46.948, lng: 7.4474 },
  ],
  PT: [
    { name: "Lizbon", countryCode: "PT", lat: 38.7223, lng: -9.1393 },
    { name: "Porto", countryCode: "PT", lat: 41.1579, lng: -8.6291 },
    { name: "Faro / Algarve", countryCode: "PT", lat: 37.0194, lng: -7.9304 },
  ],
  US: [
    { name: "New York", countryCode: "US", lat: 40.7128, lng: -74.006 },
    { name: "Los Angeles", countryCode: "US", lat: 34.0522, lng: -118.2437 },
    { name: "San Francisco", countryCode: "US", lat: 37.7749, lng: -122.4194 },
    { name: "Miami", countryCode: "US", lat: 25.7617, lng: -80.1918 },
    { name: "Las Vegas", countryCode: "US", lat: 36.1699, lng: -115.1398 },
    { name: "Chicago", countryCode: "US", lat: 41.8781, lng: -87.6298 },
  ],
  JP: [
    { name: "Tokyo", countryCode: "JP", lat: 35.6762, lng: 139.6503 },
    { name: "Kyoto", countryCode: "JP", lat: 35.0116, lng: 135.7681 },
    { name: "Osaka", countryCode: "JP", lat: 34.6937, lng: 135.5023 },
    { name: "Hiroşima", countryCode: "JP", lat: 34.3853, lng: 132.4553 },
  ],
  TH: [
    { name: "Bangkok", countryCode: "TH", lat: 13.7563, lng: 100.5018 },
    { name: "Phuket", countryCode: "TH", lat: 7.8804, lng: 98.3923 },
    { name: "Pattaya", countryCode: "TH", lat: 12.9276, lng: 100.8771 },
    { name: "Chiang Mai", countryCode: "TH", lat: 18.7883, lng: 98.9853 },
  ],
  AE: [
    { name: "Dubai", countryCode: "AE", lat: 25.2048, lng: 55.2708 },
    { name: "Abu Dabi", countryCode: "AE", lat: 24.4539, lng: 54.3773 },
  ],
  EG: [
    { name: "Kahire", countryCode: "EG", lat: 30.0444, lng: 31.2357 },
    { name: "Şarm El-Şeyh", countryCode: "EG", lat: 27.9158, lng: 34.3299 },
    { name: "Hurgada", countryCode: "EG", lat: 27.2579, lng: 33.8116 },
  ],
  ME: [
    { name: "Kotor", countryCode: "ME", lat: 42.4247, lng: 18.7712 },
    { name: "Budva", countryCode: "ME", lat: 42.2911, lng: 18.8403 },
    { name: "Podgorica", countryCode: "ME", lat: 42.4304, lng: 19.2594 },
    { name: "Tivat", countryCode: "ME", lat: 42.4364, lng: 18.6961 },
  ],
  HR: [
    { name: "Dubrovnik", countryCode: "HR", lat: 42.6507, lng: 18.0944 },
    { name: "Split", countryCode: "HR", lat: 43.5081, lng: 16.4402 },
    { name: "Zagreb", countryCode: "HR", lat: 45.815, lng: 15.9819 },
    { name: "Zadar", countryCode: "HR", lat: 44.1194, lng: 15.2314 },
  ],
  ID: [
    { name: "Bali (Ubud)", countryCode: "ID", lat: -8.5069, lng: 115.2625 },
    { name: "Bali (Canggu)", countryCode: "ID", lat: -8.6477, lng: 115.1385 },
    { name: "Cakarta", countryCode: "ID", lat: -6.2088, lng: 106.8456 },
    { name: "Lombok", countryCode: "ID", lat: -8.5833, lng: 116.1167 },
  ],
  MV: [
    { name: "Malé", countryCode: "MV", lat: 4.1755, lng: 73.5093 },
    { name: "Maafushi", countryCode: "MV", lat: 3.9404, lng: 73.4908 },
  ],
  CU: [
    { name: "Havana", countryCode: "CU", lat: 23.1136, lng: -82.3666 },
    { name: "Varadero", countryCode: "CU", lat: 23.1536, lng: -81.2514 },
    { name: "Trinidad", countryCode: "CU", lat: 21.8019, lng: -79.9842 },
  ],
  DO: [
    { name: "Punta Cana", countryCode: "DO", lat: 18.5601, lng: -68.3725 },
    { name: "Santo Domingo", countryCode: "DO", lat: 18.4861, lng: -69.9312 },
  ],
  PH: [
    { name: "Manila", countryCode: "PH", lat: 14.5995, lng: 120.9842 },
    { name: "Boracay", countryCode: "PH", lat: 11.9674, lng: 121.9248 },
    { name: "Cebu", countryCode: "PH", lat: 10.3157, lng: 123.8854 },
    { name: "Palawan (El Nido)", countryCode: "PH", lat: 11.1956, lng: 119.4075 },
  ],
  LK: [
    { name: "Kolombo", countryCode: "LK", lat: 6.9271, lng: 79.8612 },
    { name: "Kandy", countryCode: "LK", lat: 7.2906, lng: 80.6337 },
    { name: "Galle", countryCode: "LK", lat: 6.0535, lng: 80.221 },
  ],
  MA: [
    { name: "Marakeş", countryCode: "MA", lat: 31.6295, lng: -7.9811 },
    { name: "Kazablanka", countryCode: "MA", lat: 33.5731, lng: -7.5898 },
    { name: "Fes", countryCode: "MA", lat: 34.0181, lng: -5.0078 },
    { name: "Şafşavan (Chefchaouen)", countryCode: "MA", lat: 35.1688, lng: -5.2636 },
  ],
  GE: [
    { name: "Tiflis", countryCode: "GE", lat: 41.7151, lng: 44.8271 },
    { name: "Batum", countryCode: "GE", lat: 41.6168, lng: 41.6367 },
  ],
  AZ: [
    { name: "Bakü", countryCode: "AZ", lat: 40.4093, lng: 49.8671 },
    { name: "Gence", countryCode: "AZ", lat: 40.6828, lng: 46.3606 },
  ],
  CZ: [
    { name: "Prag", countryCode: "CZ", lat: 50.0755, lng: 14.4378 },
    { name: "Brno", countryCode: "CZ", lat: 49.1951, lng: 16.6068 },
    { name: "Karlovy Vary", countryCode: "CZ", lat: 50.2319, lng: 12.8719 },
  ],
  HU: [
    { name: "Budapeşte", countryCode: "HU", lat: 47.4979, lng: 19.0402 },
    { name: "Debrecen", countryCode: "HU", lat: 47.5316, lng: 21.6273 },
  ],
  BE: [
    { name: "Brüksel", countryCode: "BE", lat: 50.8503, lng: 4.3517 },
    { name: "Brugge", countryCode: "BE", lat: 51.2093, lng: 3.2247 },
    { name: "Gent", countryCode: "BE", lat: 51.0543, lng: 3.7174 },
    { name: "Antwerp", countryCode: "BE", lat: 51.2194, lng: 4.4025 },
  ],
  SE: [
    { name: "Stockholm", countryCode: "SE", lat: 59.3293, lng: 18.0686 },
    { name: "Göteborg", countryCode: "SE", lat: 57.7089, lng: 11.9746 },
    { name: "Malmö", countryCode: "SE", lat: 55.605, lng: 13.0038 },
  ],
  NO: [
    { name: "Oslo", countryCode: "NO", lat: 59.9139, lng: 10.7522 },
    { name: "Bergen", countryCode: "NO", lat: 60.3913, lng: 5.3221 },
    { name: "Tromsø", countryCode: "NO", lat: 69.6492, lng: 18.9553 },
  ],
  DK: [
    { name: "Kopenhag", countryCode: "DK", lat: 55.6761, lng: 12.5683 },
    { name: "Aarhus", countryCode: "DK", lat: 56.1629, lng: 10.2039 },
  ],
  RS: [
    { name: "Belgrad", countryCode: "RS", lat: 44.7866, lng: 20.4489 },
    { name: "Novi Sad", countryCode: "RS", lat: 45.2671, lng: 19.8335 },
  ],
  BA: [
    { name: "Saraybosna", countryCode: "BA", lat: 43.8563, lng: 18.4131 },
    { name: "Mostar", countryCode: "BA", lat: 43.3438, lng: 17.8078 },
  ],
  AL: [
    { name: "Tiran", countryCode: "AL", lat: 41.3275, lng: 19.8187 },
    { name: "Saranda", countryCode: "AL", lat: 39.8756, lng: 20.0053 },
  ],
  MK: [
    { name: "Üsküp", countryCode: "MK", lat: 41.9981, lng: 21.4254 },
    { name: "Ohri", countryCode: "MK", lat: 41.1172, lng: 20.8016 },
  ],
  IS: [
    { name: "Reykjavik", countryCode: "IS", lat: 64.1466, lng: -21.9426 },
    { name: "Vik", countryCode: "IS", lat: 63.4186, lng: -19.006 },
  ],
  MT: [
    { name: "Valletta", countryCode: "MT", lat: 35.8989, lng: 14.5146 },
    { name: "Sliema", countryCode: "MT", lat: 35.9125, lng: 14.5019 },
  ],
  KKTC: [
    { name: "Girne", countryCode: "KKTC", lat: 35.3386, lng: 33.3186 },
    { name: "Lefkoşa", countryCode: "KKTC", lat: 35.1856, lng: 33.3644 },
    { name: "Gazimağusa", countryCode: "KKTC", lat: 35.125, lng: 33.9417 },
    { name: "Güzelyurt", countryCode: "KKTC", lat: 35.1989, lng: 32.9931 },
    { name: "İskele", countryCode: "KKTC", lat: 35.2892, lng: 33.8878 },
    { name: "Lefke", countryCode: "KKTC", lat: 35.1167, lng: 32.85 },
  ],
  CY: [
    { name: "Limasol (Leymosun)", countryCode: "CY", lat: 34.6841, lng: 33.0379 },
    { name: "Larnaka", countryCode: "CY", lat: 34.9167, lng: 33.6292 },
    { name: "Baf (Paphos)", countryCode: "CY", lat: 34.7754, lng: 32.4218 },
  ],
  SG: [
    { name: "Singapur", countryCode: "SG", lat: 1.3521, lng: 103.8198 },
  ],
  MY: [
    { name: "Kuala Lumpur", countryCode: "MY", lat: 3.139, lng: 101.6869 },
    { name: "Penang", countryCode: "MY", lat: 5.4141, lng: 100.3288 },
  ],
  VN: [
    { name: "Hanoi", countryCode: "VN", lat: 21.0278, lng: 105.8342 },
    { name: "Ho Chi Minh", countryCode: "VN", lat: 10.8231, lng: 106.6297 },
    { name: "Da Nang", countryCode: "VN", lat: 16.0544, lng: 108.2022 },
  ],
  ZA: [
    { name: "Cape Town", countryCode: "ZA", lat: -33.9249, lng: 18.4241 },
    { name: "Johannesburg", countryCode: "ZA", lat: -26.2041, lng: 28.0473 },
  ],
  AU: [
    { name: "Sidney", countryCode: "AU", lat: -33.8688, lng: 151.2093 },
    { name: "Melbourne", countryCode: "AU", lat: -37.8136, lng: 144.9631 },
  ],
  NZ: [
    { name: "Auckland", countryCode: "NZ", lat: -36.8485, lng: 174.7633 },
    { name: "Queenstown", countryCode: "NZ", lat: -45.0312, lng: 168.6626 },
  ],
  BR: [
    { name: "Rio de Janeiro", countryCode: "BR", lat: -22.9068, lng: -43.1729 },
    { name: "Sao Paulo", countryCode: "BR", lat: -23.5505, lng: -46.6333 },
  ],
  AR: [
    { name: "Buenos Aires", countryCode: "AR", lat: -34.6037, lng: -58.3816 },
    { name: "Bariloche", countryCode: "AR", lat: -41.1335, lng: -71.3103 },
  ],
  MX: [
    { name: "Mexico City", countryCode: "MX", lat: 19.4326, lng: -99.1332 },
    { name: "Cancun", countryCode: "MX", lat: 21.1619, lng: -86.8515 },
    { name: "Tulum", countryCode: "MX", lat: 20.2114, lng: -87.4654 },
  ],
  KR: [
    { name: "Seul", countryCode: "KR", lat: 37.5665, lng: 126.978 },
    { name: "Busan", countryCode: "KR", lat: 35.1796, lng: 129.0756 },
  ],
  UZ: [
    { name: "Taşkent", countryCode: "UZ", lat: 41.2995, lng: 69.2401 },
    { name: "Semerkant", countryCode: "UZ", lat: 39.6542, lng: 66.9597 },
    { name: "Buhara", countryCode: "UZ", lat: 39.7747, lng: 64.4286 },
  ],
  KZ: [
    { name: "Almatı", countryCode: "KZ", lat: 43.222, lng: 76.8512 },
    { name: "Astana", countryCode: "KZ", lat: 51.1694, lng: 71.4491 },
  ],
  TZ: [
    { name: "Zanzibar (Stone Town)", countryCode: "TZ", lat: -6.1659, lng: 39.2026 },
    { name: "Darüsselam", countryCode: "TZ", lat: -6.7924, lng: 39.2083 },
  ],
  KE: [
    { name: "Nairobi", countryCode: "KE", lat: -1.2921, lng: 36.8219 },
    { name: "Mombasa", countryCode: "KE", lat: -4.0435, lng: 39.6682 },
  ],
  CN: [
    { name: "Pekin", countryCode: "CN", lat: 39.9042, lng: 116.4074 },
    { name: "Şanghay", countryCode: "CN", lat: 31.2304, lng: 121.4737 },
  ],
};

/**
 * Kullanıcı girdisinden ülke arar ve eşleştirir (örn: 'fr' -> Fransa, 'İtal' -> İtalya, 'abd' -> ABD)
 */
export function findCountryByNameOrCode(query: string): CountryOption | null {
  if (!query || !query.trim()) return null;
  const qNorm = normalizeTurkishText(query);
  const qRaw = query.trim().toLowerCase();

  // 1. Tam kod eşleşmesi (örn: "TR", "FR", "IT")
  const byCode = WORLD_COUNTRIES.find((c) => c.code.toLowerCase() === qRaw);
  if (byCode) return byCode;

  // 2. Tam isim eşleşmesi
  const byNameExact = WORLD_COUNTRIES.find((c) => normalizeTurkishText(c.name) === qNorm);
  if (byNameExact) return byNameExact;

  // 3. Başlangıç isim eşleşmesi
  const byNameStart = WORLD_COUNTRIES.find((c) =>
    normalizeTurkishText(c.name).startsWith(qNorm)
  );
  if (byNameStart) return byNameStart;

  // 4. Alias tam veya başlangıç eşleşmesi
  const byAlias = WORLD_COUNTRIES.find((c) =>
    c.aliases?.some((a) => normalizeTurkishText(a) === qNorm || normalizeTurkishText(a).startsWith(qNorm))
  );
  if (byAlias) return byAlias;

  // 5. İçeren isim eşleşmesi
  const byNameIncludes = WORLD_COUNTRIES.find((c) =>
    normalizeTurkishText(c.name).includes(qNorm)
  );
  if (byNameIncludes) return byNameIncludes;

  // 6. İçeren alias eşleşmesi
  const byAliasIncludes = WORLD_COUNTRIES.find((c) =>
    c.aliases?.some((a) => normalizeTurkishText(a).includes(qNorm))
  );
  if (byAliasIncludes) return byAliasIncludes;

  return null;
}

/**
 * Yazılan metne göre filtreli ülke listesi döner (Autocomplete için)
 */
export function searchCountries(query: string): CountryOption[] {
  if (!query || !query.trim()) return WORLD_COUNTRIES.slice(0, 16);
  const qNorm = normalizeTurkishText(query);
  const qRaw = query.trim().toLowerCase();

  return WORLD_COUNTRIES.filter((c) => {
    if (c.code.toLowerCase() === qRaw || c.code.toLowerCase().includes(qRaw)) return true;
    if (normalizeTurkishText(c.name).includes(qNorm)) return true;
    if (c.aliases && c.aliases.some((a) => normalizeTurkishText(a).includes(qNorm) || a.toLowerCase().includes(qRaw))) {
      return true;
    }
    return false;
  }).slice(0, 15);
}

/**
 * Seçili ülkeye ait popüler şehirleri arar veya listeler
 */
export function searchCities(countryCode: string, query?: string): string[] {
  const code = (countryCode || "").toUpperCase();

  // Türkiye için 81 il + ilçeler
  if (code === "TR") {
    if (!query || !query.trim()) {
      return ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Muğla", "Trabzon", "Gaziantep", "Eskişehir", "Nevşehir"];
    }
    const qNorm = normalizeTurkishText(query);
    return TURKEY_PROVINCES.filter((p) =>
      normalizeTurkishText(p.name).includes(qNorm)
    )
      .slice(0, 12)
      .map((p) => p.name);
  }

  // Başka ülke için tanımlı şehirler
  const cities = POPULAR_WORLD_CITIES[code] || [];
  if (cities.length > 0) {
    if (!query || !query.trim()) {
      return cities.map((c) => c.name);
    }
    const qNorm = normalizeTurkishText(query);
    return cities
      .filter((c) => normalizeTurkishText(c.name).includes(qNorm))
      .map((c) => c.name);
  }

  // Eğer ülke kodu henüz seçilmemiş veya şehir listesi tanımlı değilse ama arama yapılmışsa:
  if (query && query.trim()) {
    const qNorm = normalizeTurkishText(query);
    const matched: string[] = [];
    // 81 il kontrolü
    for (const p of TURKEY_PROVINCES) {
      if (normalizeTurkishText(p.name).includes(qNorm)) {
        matched.push(p.name);
        if (matched.length >= 8) return matched;
      }
    }
    // Dünya şehirleri kontrolü
    for (const list of Object.values(POPULAR_WORLD_CITIES)) {
      for (const city of list) {
        if (normalizeTurkishText(city.name).includes(qNorm) && !matched.includes(city.name)) {
          matched.push(city.name);
          if (matched.length >= 10) return matched;
        }
      }
    }
    return matched;
  }

  return [];
}

/**
 * Ülke kodu ve şehir adına göre koordinat ve geçerli şehir adı çözer.
 */
export function resolveLocationCoordinates(
  countryCode: string,
  cityName: string
): { cityName: string; countryCode: string; latitude: number; longitude: number } {
  const code = (countryCode || "TR").toUpperCase();
  const trimmedCity = (cityName || "").trim();

  // 1. Türkiye ili veya ilçesi mi?
  if (code === "TR") {
    const resolved = resolveTurkishCityOrDistrict(trimmedCity);
    const matched = TURKEY_PROVINCES.find(
      (p) => p.name.toLowerCase() === resolved.cityName.toLowerCase()
    );
    if (matched) {
      return {
        cityName: resolved.districtName ? `${resolved.cityName} (${resolved.districtName})` : resolved.cityName,
        countryCode: "TR",
        latitude: matched.lat,
        longitude: matched.lng,
      };
    }
  }

  // 2. Popüler Dünya Şehirleri listesinde var mı?
  const citiesInCountry = POPULAR_WORLD_CITIES[code] || [];
  const matchedWorldCity = citiesInCountry.find(
    (c) => c.name.toLowerCase() === trimmedCity.toLowerCase()
  );
  if (matchedWorldCity) {
    return {
      cityName: matchedWorldCity.name,
      countryCode: code,
      latitude: matchedWorldCity.lat,
      longitude: matchedWorldCity.lng,
    };
  }

  // 3. Ülke merkez koordinatlarına hafif bir varyasyonla düş
  const countryCenter = COUNTRY_CENTERS[code] || { lat: 39.0, lng: 35.2 };
  return {
    cityName: trimmedCity || "Bilinmeyen Şehir",
    countryCode: code,
    latitude: countryCenter.lat,
    longitude: countryCenter.lng,
  };
}
