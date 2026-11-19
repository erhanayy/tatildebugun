import { TURKEY_PROVINCES, resolveTurkishCityOrDistrict } from "./turkey-cities";
import { COUNTRY_CENTERS } from "./country-flags";

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
  stateName?: string;
}

/**
 * Türkçe ve Latin aksanlı karakterlerden bağımsız arama anahtarı üretir.
 * Örn: "İskoçya" -> "iskocya", "Zürih" -> "zurih", "São Paulo" -> "saopaulo"
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/ß/g, "ss")
    .replace(/[\s\-_.'’()/,]+/g, "")
    .trim();
}

/**
 * Tüm Dünya Ülkeleri + Gezginler İçin Kurucu/Özerk Destinasyonlar (~212 Ülke/Bölge)
 * İlk 14 kayıt boş dropdown durumunda "Popüler Destinasyonlar" olarak gösterilir;
 * arama yapıldığında listenin TAMAMI taranır.
 */
export const WORLD_COUNTRIES: CountryOption[] = [
  // --- 1. Popüler Destinasyonlar (İlk 14) ---
  { code: "TR", name: "Türkiye", flag: "🇹🇷", aliases: ["Turkey", "Turkiye", "Istanbul", "Ankara", "Izmir", "Antalya"] },
  {
    code: "KKTC",
    name: "Kuzey Kıbrıs Türk Cumhuriyeti (KKTC)",
    flag: "🇹🇷",
    aliases: [
      "Kıbrıs",
      "Kuzey Kıbrıs",
      "KKTC",
      "TRNC",
      "Northern Cyprus",
      "Girne",
      "Lefkoşa",
      "Gazimağusa",
      "Güzelyurt",
      "İskele",
      "Lefke",
    ],
  },
  { code: "FR", name: "Fransa", flag: "🇫🇷", aliases: ["France", "Paris", "Nice", "Lyon"] },
  { code: "IT", name: "İtalya", flag: "🇮🇹", aliases: ["Italy", "Roma", "Rome", "Milano", "Venedik", "Floransa"] },
  { code: "ES", name: "İspanya", flag: "🇪🇸", aliases: ["Spain", "Barselona", "Barcelona", "Madrid", "Sevilla", "Ibiza"] },
  { code: "DE", name: "Almanya", flag: "🇩🇪", aliases: ["Germany", "Deutschland", "Berlin", "Munih", "Munich", "Frankfurt"] },
  { code: "NL", name: "Hollanda", flag: "🇳🇱", aliases: ["Netherlands", "Holland", "Amsterdam", "Rotterdam"] },
  {
    code: "GB",
    name: "Birleşik Krallık",
    flag: "🇬🇧",
    aliases: [
      "United Kingdom",
      "UK",
      "Great Britain",
      "Britain",
      "İngiltere",
      "England",
      "İskoçya",
      "Scotland",
      "Galler",
      "Wales",
      "Kuzey İrlanda",
      "Northern Ireland",
      "Londra",
      "London",
    ],
  },
  {
    code: "GB-SCT",
    name: "İskoçya",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    aliases: ["Scotland", "Iskocya", "Scot", "Edinburgh", "Glasgow", "Aberdeen", "Inverness", "Highlands", "Skye", "Stirling"],
  },
  { code: "GR", name: "Yunanistan", flag: "🇬🇷", aliases: ["Greece", "Atina", "Athens", "Selanik", "Santorini", "Mikonos"] },
  { code: "AT", name: "Avusturya", flag: "🇦🇹", aliases: ["Austria", "Viyana", "Vienna", "Salzburg"] },
  { code: "CH", name: "İsviçre", flag: "🇨🇭", aliases: ["Switzerland", "Swiss", "Zurih", "Zurich", "Cenevre", "Geneva"] },
  { code: "PT", name: "Portekiz", flag: "🇵🇹", aliases: ["Portugal", "Lizbon", "Lisbon", "Porto"] },
  { code: "US", name: "Amerika Birleşik Devletleri", flag: "🇺🇸", aliases: ["ABD", "USA", "United States", "America", "Amerika", "New York", "Miami", "Los Angeles"] },

  // --- 2. Birleşik Krallık Kurucu Ülkeleri ---
  {
    code: "GB-ENG",
    name: "İngiltere",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    aliases: ["England", "Ingiltere", "London", "Londra", "Manchester", "Liverpool", "Birmingham", "Oxford", "Cambridge"],
  },
  {
    code: "GB-WLS",
    name: "Galler",
    flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    aliases: ["Wales", "Cymru", "Cardiff", "Swansea"],
  },
  {
    code: "GB-NIR",
    name: "Kuzey İrlanda",
    flag: "🇬🇧",
    aliases: ["Northern Ireland", "Kuzey Irlanda", "Belfast", "Derry", "Londonderry"],
  },

  // --- 3. Popüler Uluslararası Destinasyonlar ve Tüm Dünya Ülkeleri ---
  { code: "JP", name: "Japonya", flag: "🇯🇵", aliases: ["Japan", "Tokyo", "Kyoto", "Osaka"] },
  { code: "TH", name: "Tayland", flag: "🇹🇭", aliases: ["Thailand", "Bangkok", "Phuket", "Pattaya"] },
  { code: "AE", name: "Birleşik Arap Emirlikleri", flag: "🇦🇪", aliases: ["United Arab Emirates", "UAE", "BAE", "Dubai", "Abu Dabi", "Abu Dhabi"] },
  { code: "EG", name: "Mısır", flag: "🇪🇬", aliases: ["Egypt", "Kahire", "Cairo", "Sarm El-Seyh", "Sharm El Sheikh"] },
  { code: "ME", name: "Karadağ", flag: "🇲🇪", aliases: ["Montenegro", "Kotor", "Budva", "Podgorica"] },
  { code: "HR", name: "Hırvatistan", flag: "🇭🇷", aliases: ["Croatia", "Dubrovnik", "Split", "Zagreb"] },
  { code: "GE", name: "Gürcistan", flag: "🇬🇪", aliases: ["Georgia", "Tiflis", "Tbilisi", "Batum", "Batumi"] },
  { code: "AZ", name: "Azerbaycan", flag: "🇦🇿", aliases: ["Azerbaijan", "Baku", "Bakü"] },
  { code: "BE", name: "Belçika", flag: "🇧🇪", aliases: ["Belgium", "Brüksel", "Brussels", "Brugge", "Bruges", "Antwerp"] },
  { code: "CZ", name: "Çekya", flag: "🇨🇿", aliases: ["Czechia", "Czech Republic", "Çek Cumhuriyeti", "Prag", "Prague"] },
  { code: "DK", name: "Danimarka", flag: "🇩🇰", aliases: ["Denmark", "Kopenhag", "Copenhagen"] },
  { code: "SE", name: "İsveç", flag: "🇸🇪", aliases: ["Sweden", "Stockholm", "Goteborg", "Malmo"] },
  { code: "NO", name: "Norveç", flag: "🇳🇴", aliases: ["Norway", "Oslo", "Bergen", "Tromso"] },
  { code: "FI", name: "Finlandiya", flag: "🇫🇮", aliases: ["Finland", "Helsinki", "Lapland", "Rovaniemi"] },
  { code: "PL", name: "Polonya", flag: "🇵🇱", aliases: ["Poland", "Varşova", "Warsaw", "Krakow", "Gdansk"] },
  { code: "HU", name: "Macaristan", flag: "🇭🇺", aliases: ["Hungary", "Budapeşte", "Budapest"] },
  { code: "RO", name: "Romanya", flag: "🇷🇴", aliases: ["Romania", "Bükreş", "Bucharest", "Brasov", "Cluj"] },
  { code: "BG", name: "Bulgaristan", flag: "🇧🇬", aliases: ["Bulgaria", "Sofya", "Sofia", "Varna", "Plovdiv", "Filibe"] },
  { code: "RS", name: "Sırbistan", flag: "🇷🇸", aliases: ["Serbia", "Belgrad", "Belgrade", "Novi Sad"] },
  { code: "BA", name: "Bosna-Hersek", flag: "🇧🇦", aliases: ["Bosnia and Herzegovina", "Bosnia", "Saraybosna", "Sarajevo", "Mostar"] },
  { code: "MK", name: "Kuzey Makedonya", flag: "🇲🇰", aliases: ["North Macedonia", "Macedonia", "Makedonya", "Üsküp", "Skopje", "Ohri", "Ohrid"] },
  { code: "AL", name: "Arnavutluk", flag: "🇦🇱", aliases: ["Albania", "Tiran", "Tirana", "Saranda"] },
  { code: "XK", name: "Kosova", flag: "🇽🇰", aliases: ["Kosovo", "Priştine", "Pristina", "Prizren"] },
  { code: "SI", name: "Slovenya", flag: "🇸🇮", aliases: ["Slovenia", "Ljubljana", "Bled"] },
  { code: "SK", name: "Slovakya", flag: "🇸🇰", aliases: ["Slovakia", "Bratislava", "Kosice"] },
  { code: "IE", name: "İrlanda", flag: "🇮🇪", aliases: ["Ireland", "Dublin", "Cork", "Galway"] },
  { code: "IS", name: "İzlanda", flag: "🇮🇸", aliases: ["Iceland", "Reykjavik"] },
  { code: "MT", name: "Malta", flag: "🇲🇹", aliases: ["Valletta", "Sliema", "Gozo"] },
  { code: "CY", name: "Güney Kıbrıs Rum Yönetimi (GKRY)", flag: "🇨🇾", aliases: ["Cyprus", "Kıbrıs Rum", "Güney Kıbrıs", "GKRY", "Limasol", "Limassol", "Larnaka", "Larnaca", "Paphos", "Baf"] },
  { code: "RU", name: "Rusya", flag: "🇷🇺", aliases: ["Russia", "Russian Federation", "Moskova", "Moscow", "St Petersburg"] },
  { code: "UA", name: "Ukrayna", flag: "🇺🇦", aliases: ["Ukraine", "Kiev", "Kyiv", "Lviv", "Odesa"] },
  { code: "CA", name: "Kanada", flag: "🇨🇦", aliases: ["Canada", "Toronto", "Vancouver", "Montreal", "Ottawa"] },
  { code: "BR", name: "Brezilya", flag: "🇧🇷", aliases: ["Brazil", "Rio de Janeiro", "Sao Paulo", "Brasilia"] },
  { code: "AR", name: "Arjantin", flag: "🇦🇷", aliases: ["Argentina", "Buenos Aires", "Patagonia"] },
  { code: "MX", name: "Meksika", flag: "🇲🇽", aliases: ["Mexico", "Mexico City", "Cancun", "Tulum"] },
  { code: "KR", name: "Güney Kore", flag: "🇰🇷", aliases: ["South Korea", "Korea", "Seul", "Seoul", "Busan", "Jeju"] },
  { code: "SG", name: "Singapur", flag: "🇸🇬", aliases: ["Singapore"] },
  { code: "MY", name: "Malezya", flag: "🇲🇾", aliases: ["Malaysia", "Kuala Lumpur", "Penang", "Langkawi"] },
  { code: "ID", name: "Endonezya", flag: "🇮🇩", aliases: ["Indonesia", "Bali", "Ubud", "Cakarta", "Jakarta"] },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", aliases: ["Viet Nam", "Hanoi", "Ho Chi Minh", "Da Nang"] },
  { code: "IN", name: "Hindistan", flag: "🇮🇳", aliases: ["India", "Yeni Delhi", "New Delhi", "Mumbai", "Goa", "Jaipur"] },
  { code: "MA", name: "Fas", flag: "🇲🇦", aliases: ["Morocco", "Marakeş", "Marrakesh", "Kazablanka", "Casablanca", "Fes"] },
  { code: "ZA", name: "Güney Afrika", flag: "🇿🇦", aliases: ["South Africa", "Cape Town", "Johannesburg"] },
  { code: "AU", name: "Avustralya", flag: "🇦🇺", aliases: ["Australia", "Sidney", "Sydney", "Melbourne", "Brisbane"] },
  { code: "NZ", name: "Yeni Zelanda", flag: "🇳🇿", aliases: ["New Zealand", "Auckland", "Queenstown", "Wellington"] },
  { code: "SA", name: "Suudi Arabistan", flag: "🇸🇦", aliases: ["Saudi Arabia", "Riyad", "Riyadh", "Cidde", "Jeddah", "Mekke", "Medine"] },
  { code: "QA", name: "Katar", flag: "🇶🇦", aliases: ["Qatar", "Doha"] },
  { code: "JO", name: "Ürdün", flag: "🇯🇴", aliases: ["Jordan", "Amman", "Petra", "Akabe"] },
  { code: "UZ", name: "Özbekistan", flag: "🇺🇿", aliases: ["Uzbekistan", "Taşkent", "Tashkent", "Semerkant", "Samarkand", "Buhara"] },
  { code: "KZ", name: "Kazakistan", flag: "🇰🇿", aliases: ["Kazakhstan", "Almatı", "Almaty", "Astana"] },
  { code: "MV", name: "Maldivler", flag: "🇲🇻", aliases: ["Maldives", "Male"] },
  { code: "CU", name: "Küba", flag: "🇨🇺", aliases: ["Cuba", "Havana", "Varadero"] },
  { code: "DO", name: "Dominik Cumhuriyeti", flag: "🇩🇴", aliases: ["Dominican Republic", "Punta Cana", "Santo Domingo"] },
  { code: "PH", name: "Filipinler", flag: "🇵🇭", aliases: ["Philippines", "Manila", "Boracay", "Cebu", "Palawan"] },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", aliases: ["Kolombo", "Colombo", "Kandy", "Galle"] },
  { code: "MU", name: "Mauritius", flag: "🇲🇺", aliases: ["Morityus", "Port Louis"] },
  { code: "SC", name: "Seyşeller", flag: "🇸🇨", aliases: ["Seychelles", "Mahe", "Victoria"] },
  { code: "CO", name: "Kolombiya", flag: "🇨🇴", aliases: ["Colombia", "Bogota", "Medellin", "Cartagena"] },
  { code: "PE", name: "Peru", flag: "🇵🇪", aliases: ["Lima", "Cusco", "Machu Picchu"] },
  { code: "CL", name: "Şili", flag: "🇨🇱", aliases: ["Chile", "Santiago", "Valparaiso"] },
  { code: "CR", name: "Kosta Rika", flag: "🇨🇷", aliases: ["Costa Rica", "San Jose"] },
  { code: "KE", name: "Kenya", flag: "🇰🇪", aliases: ["Nairobi", "Mombasa"] },
  { code: "TZ", name: "Tanzanya", flag: "🇹🇿", aliases: ["Tanzania", "Zanzibar", "Darüsselam", "Arusha"] },
  { code: "TN", name: "Tunus", flag: "🇹🇳", aliases: ["Tunisia", "Tunis", "Hammamet", "Djerba"] },
  { code: "LU", name: "Lüksemburg", flag: "🇱🇺", aliases: ["Luxembourg"] },
  { code: "MC", name: "Monako", flag: "🇲🇨", aliases: ["Monaco", "Monte Carlo"] },
  { code: "CN", name: "Çin", flag: "🇨🇳", aliases: ["China", "Pekin", "Beijing", "Şanghay", "Shanghai", "Guangzhou", "Shenzhen"] },
  { code: "TW", name: "Tayvan", flag: "🇹🇼", aliases: ["Taiwan", "Taipei"] },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", aliases: ["Hongkong"] },
  { code: "MO", name: "Makao", flag: "🇲🇴", aliases: ["Macau", "Macao"] },
  { code: "OM", name: "Umman", flag: "🇴🇲", aliases: ["Oman", "Maskat", "Muscat", "Salalah"] },
  { code: "NP", name: "Nepal", flag: "🇳🇵", aliases: ["Katmandu", "Kathmandu", "Pokhara"] },
  { code: "KH", name: "Kamboçya", flag: "🇰🇭", aliases: ["Cambodia", "Phnom Penh", "Siem Reap"] },

  // --- 4. Diğer Tüm Dünya Ülkeleri (Avrupa, Asya, Amerika, Afrika, Okyanusya — Eksiksiz) ---
  { code: "AF", name: "Afganistan", flag: "🇦🇫", aliases: ["Afghanistan", "Kabil", "Kabul"] },
  { code: "AD", name: "Andorra", flag: "🇦🇩", aliases: ["Andorra la Vella"] },
  { code: "AO", name: "Angola", flag: "🇦🇴", aliases: ["Luanda"] },
  { code: "AG", name: "Antigua ve Barbuda", flag: "🇦🇬", aliases: ["Antigua and Barbuda", "Saint John's"] },
  { code: "AW", name: "Aruba", flag: "🇦🇼", aliases: ["Oranjestad"] },
  { code: "BS", name: "Bahamalar", flag: "🇧🇸", aliases: ["Bahamas", "Nassau"] },
  { code: "BH", name: "Bahreyn", flag: "🇧🇭", aliases: ["Bahrain", "Manama"] },
  { code: "BD", name: "Bangladeş", flag: "🇧🇩", aliases: ["Bangladesh", "Dakka", "Dhaka"] },
  { code: "BB", name: "Barbados", flag: "🇧🇧", aliases: ["Bridgetown"] },
  { code: "BY", name: "Belarus", flag: "🇧🇾", aliases: ["Beyaz Rusya", "Minsk"] },
  { code: "BZ", name: "Belize", flag: "🇧🇿", aliases: ["Belmopan", "Belize City"] },
  { code: "BJ", name: "Benin", flag: "🇧🇯", aliases: ["Porto-Novo", "Cotonou"] },
  { code: "BM", name: "Bermuda", flag: "🇧🇲", aliases: ["Hamilton"] },
  { code: "BT", name: "Bhutan", flag: "🇧🇹", aliases: ["Butan", "Thimphu"] },
  { code: "BO", name: "Bolivya", flag: "🇧🇴", aliases: ["Bolivia", "La Paz", "Sucre", "Uyuni"] },
  { code: "BW", name: "Botsvana", flag: "🇧🇼", aliases: ["Botswana", "Gaborone"] },
  { code: "BN", name: "Brunei", flag: "🇧🇳", aliases: ["Bandar Seri Begawan"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", aliases: ["Ouagadougou"] },
  { code: "BI", name: "Burundi", flag: "🇧🇮", aliases: ["Gitega", "Bujumbura"] },
  { code: "KY", name: "Cayman Adaları", flag: "🇰🇾", aliases: ["Cayman Islands", "George Town"] },
  { code: "GI", name: "Cebelitarık", flag: "🇬🇮", aliases: ["Gibraltar"] },
  { code: "DZ", name: "Cezayir", flag: "🇩🇿", aliases: ["Algeria", "Algiers", "Oran"] },
  { code: "DJ", name: "Cibuti", flag: "🇩🇯", aliases: ["Djibouti"] },
  { code: "CW", name: "Curaçao", flag: "🇨🇼", aliases: ["Curacao", "Willemstad"] },
  { code: "TD", name: "Çad", flag: "🇹🇩", aliases: ["Chad", "N'Djamena"] },
  { code: "TL", name: "Doğu Timor", flag: "🇹🇱", aliases: ["Timor-Leste", "East Timor", "Dili"] },
  { code: "DM", name: "Dominika", flag: "🇩🇲", aliases: ["Dominica", "Roseau"] },
  { code: "EC", name: "Ekvador", flag: "🇪🇨", aliases: ["Ecuador", "Quito", "Guayaquil", "Galapagos"] },
  { code: "GQ", name: "Ekvator Ginesi", flag: "🇬🇶", aliases: ["Equatorial Guinea", "Malabo"] },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", aliases: ["San Salvador"] },
  { code: "ER", name: "Eritre", flag: "🇪🇷", aliases: ["Eritrea", "Asmara"] },
  { code: "AM", name: "Ermenistan", flag: "🇦🇲", aliases: ["Armenia", "Erivan", "Yerevan"] },
  { code: "EE", name: "Estonya", flag: "🇪🇪", aliases: ["Estonia", "Tallinn"] },
  { code: "SZ", name: "Esvatini", flag: "🇸🇿", aliases: ["Eswatini", "Swaziland", "Mbabane"] },
  { code: "ET", name: "Etiyopya", flag: "🇪🇹", aliases: ["Ethiopia", "Addis Ababa"] },
  { code: "FO", name: "Faroe Adaları", flag: "🇫🇴", aliases: ["Faroe Islands", "Torshavn"] },
  { code: "FJ", name: "Fiji", flag: "🇫🇯", aliases: ["Suva", "Nadi"] },
  { code: "CI", name: "Fildişi Sahili", flag: "🇨🇮", aliases: ["Ivory Coast", "Cote d'Ivoire", "Abidjan", "Yamoussoukro"] },
  { code: "PS", name: "Filistin", flag: "🇵🇸", aliases: ["Palestine", "Ramallah", "Kudus", "Gazze", "Gaza", "Bethlehem"] },
  { code: "PF", name: "Fransız Polinezyası", flag: "🇵🇫", aliases: ["French Polynesia", "Tahiti", "Bora Bora", "Papeete"] },
  { code: "GA", name: "Gabon", flag: "🇬🇦", aliases: ["Libreville"] },
  { code: "GM", name: "Gambiya", flag: "🇬🇲", aliases: ["Gambia", "Banjul"] },
  { code: "GH", name: "Gana", flag: "🇬🇭", aliases: ["Ghana", "Akra", "Accra"] },
  { code: "GN", name: "Gine", flag: "🇬🇳", aliases: ["Guinea", "Conakry"] },
  { code: "GW", name: "Gine-Bissau", flag: "🇬🇼", aliases: ["Guinea-Bissau", "Bissau"] },
  { code: "GD", name: "Grenada", flag: "🇬🇩", aliases: ["St. George's"] },
  { code: "GL", name: "Grönland", flag: "🇬🇱", aliases: ["Greenland", "Nuuk"] },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", aliases: ["Guatemala City", "Antigua"] },
  { code: "GY", name: "Guyana", flag: "🇬🇾", aliases: ["Georgetown"] },
  { code: "SS", name: "Güney Sudan", flag: "🇸🇸", aliases: ["South Sudan", "Juba"] },
  { code: "HT", name: "Haiti", flag: "🇭🇹", aliases: ["Port-au-Prince"] },
  { code: "HN", name: "Honduras", flag: "🇭🇳", aliases: ["Tegucigalpa", "Roatan"] },
  { code: "IQ", name: "Irak", flag: "🇮🇶", aliases: ["Iraq", "Bağdat", "Baghdad", "Erbil", "Basra"] },
  { code: "IR", name: "İran", flag: "🇮🇷", aliases: ["Iran", "Tahran", "Tehran", "Tebriz", "Isfahan", "Siraz"] },
  { code: "IL", name: "İsrail", flag: "🇮🇱", aliases: ["Israel", "Tel Aviv", "Kudüs", "Jerusalem", "Haifa"] },
  { code: "JM", name: "Jamaika", flag: "🇯🇲", aliases: ["Jamaica", "Kingston", "Montego Bay"] },
  { code: "CM", name: "Kamerun", flag: "🇨🇲", aliases: ["Cameroon", "Yaounde", "Douala"] },
  { code: "KG", name: "Kırgızistan", flag: "🇰🇬", aliases: ["Kyrgyzstan", "Bişkek", "Bishkek", "Osh"] },
  { code: "KI", name: "Kiribati", flag: "🇰🇮", aliases: ["Tarawa"] },
  { code: "KM", name: "Komorlar", flag: "🇰🇲", aliases: ["Comoros", "Moroni"] },
  { code: "CG", name: "Kongo Cumhuriyeti", flag: "🇨🇬", aliases: ["Republic of the Congo", "Congo", "Brazzaville"] },
  { code: "CD", name: "Kongo Demokratik Cumhuriyeti", flag: "🇨🇩", aliases: ["Democratic Republic of the Congo", "DR Congo", "Kinshasa"] },
  { code: "KW", name: "Kuveyt", flag: "🇰🇼", aliases: ["Kuwait", "Kuwait City"] },
  { code: "KP", name: "Kuzey Kore", flag: "🇰🇵", aliases: ["North Korea", "Pyongyang"] },
  { code: "LA", name: "Laos", flag: "🇱🇦", aliases: ["Vientiane", "Luang Prabang"] },
  { code: "LS", name: "Lesotho", flag: "🇱🇸", aliases: ["Lesoto", "Maseru"] },
  { code: "LV", name: "Letonya", flag: "🇱🇻", aliases: ["Latvia", "Riga"] },
  { code: "LR", name: "Liberya", flag: "🇱🇷", aliases: ["Liberia", "Monrovia"] },
  { code: "LY", name: "Libya", flag: "🇱🇾", aliases: ["Trablus", "Tripoli", "Bingazi"] },
  { code: "LI", name: "Lihtenştayn", flag: "🇱🇮", aliases: ["Liechtenstein", "Vaduz"] },
  { code: "LT", name: "Litvanya", flag: "🇱🇹", aliases: ["Lithuania", "Vilnius", "Kaunas"] },
  { code: "LB", name: "Lübnan", flag: "🇱🇧", aliases: ["Lebanon", "Beyrut", "Beirut"] },
  { code: "MG", name: "Madagaskar", flag: "🇲🇬", aliases: ["Madagascar", "Antananarivo"] },
  { code: "MW", name: "Malavi", flag: "🇲🇼", aliases: ["Malawi", "Lilongwe"] },
  { code: "ML", name: "Mali", flag: "🇲🇱", aliases: ["Bamako"] },
  { code: "MH", name: "Marshall Adaları", flag: "🇲🇭", aliases: ["Marshall Islands", "Majuro"] },
  { code: "FM", name: "Mikronezya", flag: "🇫🇲", aliases: ["Micronesia", "Palikir"] },
  { code: "MN", name: "Moğolistan", flag: "🇲🇳", aliases: ["Mongolia", "Ulan Batur", "Ulaanbaatar"] },
  { code: "MD", name: "Moldova", flag: "🇲🇩", aliases: ["Kişinev", "Chisinau"] },
  { code: "MR", name: "Moritanya", flag: "🇲🇷", aliases: ["Mauritania", "Nouakchott"] },
  { code: "MZ", name: "Mozambik", flag: "🇲🇿", aliases: ["Mozambique", "Maputo"] },
  { code: "MM", name: "Myanmar", flag: "🇲🇲", aliases: ["Burma", "Birmanya", "Yangon", "Mandalay"] },
  { code: "NA", name: "Namibya", flag: "🇳🇦", aliases: ["Namibia", "Windhoek"] },
  { code: "NR", name: "Nauru", flag: "🇳🇷", aliases: ["Yaren"] },
  { code: "NE", name: "Nijer", flag: "🇳🇪", aliases: ["Niger", "Niamey"] },
  { code: "NG", name: "Nijerya", flag: "🇳🇬", aliases: ["Nigeria", "Lagos", "Abuja"] },
  { code: "NI", name: "Nikaragua", flag: "🇳🇮", aliases: ["Nicaragua", "Managua", "Granada"] },
  { code: "CF", name: "Orta Afrika Cumhuriyeti", flag: "🇨🇫", aliases: ["Central African Republic", "Bangui"] },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", aliases: ["İslamabad", "Islamabad", "Karaçi", "Karachi", "Lahor", "Lahore"] },
  { code: "PW", name: "Palau", flag: "🇵🇼", aliases: ["Ngerulmud", "Koror"] },
  { code: "PA", name: "Panama", flag: "🇵🇦", aliases: ["Panama City"] },
  { code: "PG", name: "Papua Yeni Gine", flag: "🇵🇬", aliases: ["Papua New Guinea", "Port Moresby"] },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", aliases: ["Asuncion"] },
  { code: "PR", name: "Porto Riko", flag: "🇵🇷", aliases: ["Puerto Rico", "San Juan"] },
  { code: "RW", name: "Ruanda", flag: "🇷🇼", aliases: ["Rwanda", "Kigali"] },
  { code: "KN", name: "Saint Kitts ve Nevis", flag: "🇰🇳", aliases: ["Saint Kitts and Nevis", "Basseterre"] },
  { code: "LC", name: "Saint Lucia", flag: "🇱🇨", aliases: ["Castries"] },
  { code: "VC", name: "Saint Vincent ve Grenadinler", flag: "🇻🇨", aliases: ["Saint Vincent and the Grenadines", "Kingstown"] },
  { code: "WS", name: "Samoa", flag: "🇼🇸", aliases: ["Apia"] },
  { code: "SM", name: "San Marino", flag: "🇸🇲", aliases: ["San Marino"] },
  { code: "ST", name: "São Tomé ve Príncipe", flag: "🇸🇹", aliases: ["Sao Tome and Principe"] },
  { code: "SN", name: "Senegal", flag: "🇸🇳", aliases: ["Dakar"] },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱", aliases: ["Freetown"] },
  { code: "SB", name: "Solomon Adaları", flag: "🇸🇧", aliases: ["Solomon Islands", "Honiara"] },
  { code: "SO", name: "Somali", flag: "🇸🇴", aliases: ["Somalia", "Mogadişu", "Mogadishu"] },
  { code: "SD", name: "Sudan", flag: "🇸🇩", aliases: ["Hartum", "Khartoum"] },
  { code: "SR", name: "Surinam", flag: "🇸🇷", aliases: ["Suriname", "Paramaribo"] },
  { code: "SY", name: "Suriye", flag: "🇸🇾", aliases: ["Syria", "Şam", "Damascus", "Halep", "Aleppo"] },
  { code: "TJ", name: "Tacikistan", flag: "🇹🇯", aliases: ["Tajikistan", "Duşanbe", "Dushanbe"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", aliases: ["Lome"] },
  { code: "TO", name: "Tonga", flag: "🇹🇴", aliases: ["Nuku'alofa"] },
  { code: "TT", name: "Trinidad ve Tobago", flag: "🇹🇹", aliases: ["Trinidad and Tobago", "Port of Spain"] },
  { code: "TM", name: "Türkmenistan", flag: "🇹🇲", aliases: ["Turkmenistan", "Aşkabat", "Ashgabat"] },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻", aliases: ["Funafuti"] },
  { code: "UG", name: "Uganda", flag: "🇺🇬", aliases: ["Kampala"] },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", aliases: ["Montevideo", "Punta del Este"] },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺", aliases: ["Port Vila"] },
  { code: "VA", name: "Vatikan", flag: "🇻🇦", aliases: ["Vatican City", "Holy See"] },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", aliases: ["Caracas"] },
  { code: "YE", name: "Yemen", flag: "🇾🇪", aliases: ["Sanaa", "Aden", "Socotra"] },
  { code: "CV", name: "Yeşil Burun Adaları", flag: "🇨🇻", aliases: ["Cabo Verde", "Cape Verde", "Praia", "Sal"] },
  { code: "ZM", name: "Zambiya", flag: "🇿🇲", aliases: ["Zambia", "Lusaka", "Livingstone"] },
  { code: "ZW", name: "Zimbabve", flag: "🇿🇼", aliases: ["Zimbabwe", "Harare", "Victoria Falls"] },
];

export const POPULAR_COUNTRIES = WORLD_COUNTRIES.slice(0, 20);

/**
 * Türkçe adları olan popüler dünya şehirleri + kurucu ülke (İskoçya, Galler, İngiltere, Kuzey İrlanda)
 * ve büyük destinasyonların anında önerilen başlıca şehirleri.
 * Diğer tüm ~148.000 şehir `/api/locations/cities` üzerinden offline sunucu indeksinden gelir.
 */
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
  "GB-SCT": [
    { name: "Edinburgh", countryCode: "GB-SCT", lat: 55.9533, lng: -3.1883 },
    { name: "Glasgow", countryCode: "GB-SCT", lat: 55.8642, lng: -4.2518 },
    { name: "Aberdeen", countryCode: "GB-SCT", lat: 57.1497, lng: -2.0943 },
    { name: "Inverness", countryCode: "GB-SCT", lat: 57.4778, lng: -4.2247 },
    { name: "Dundee", countryCode: "GB-SCT", lat: 56.462, lng: -2.9707 },
    { name: "Stirling", countryCode: "GB-SCT", lat: 56.1165, lng: -3.9369 },
    { name: "St Andrews", countryCode: "GB-SCT", lat: 56.3398, lng: -2.7967 },
    { name: "Isle of Skye (Portree)", countryCode: "GB-SCT", lat: 57.4125, lng: -6.196 },
    { name: "Fort William", countryCode: "GB-SCT", lat: 56.8198, lng: -5.1052 },
    { name: "Perth", countryCode: "GB-SCT", lat: 56.395, lng: -3.4308 },
    { name: "Oban", countryCode: "GB-SCT", lat: 56.4153, lng: -5.471 },
  ],
  "GB-ENG": [
    { name: "Londra", countryCode: "GB-ENG", lat: 51.5074, lng: -0.1278 },
    { name: "Manchester", countryCode: "GB-ENG", lat: 53.4808, lng: -2.2426 },
    { name: "Liverpool", countryCode: "GB-ENG", lat: 53.4084, lng: -2.9916 },
    { name: "Birmingham", countryCode: "GB-ENG", lat: 52.4862, lng: -1.8904 },
    { name: "Oxford", countryCode: "GB-ENG", lat: 51.752, lng: -1.2577 },
    { name: "Cambridge", countryCode: "GB-ENG", lat: 52.2053, lng: 0.1218 },
    { name: "Bristol", countryCode: "GB-ENG", lat: 51.4545, lng: -2.5879 },
    { name: "Bath", countryCode: "GB-ENG", lat: 51.3811, lng: -2.359 },
    { name: "York", countryCode: "GB-ENG", lat: 53.9591, lng: -1.0815 },
    { name: "Brighton", countryCode: "GB-ENG", lat: 50.8225, lng: -0.1372 },
  ],
  "GB-WLS": [
    { name: "Cardiff", countryCode: "GB-WLS", lat: 51.4816, lng: -3.1791 },
    { name: "Swansea", countryCode: "GB-WLS", lat: 51.6214, lng: -3.9436 },
    { name: "Newport", countryCode: "GB-WLS", lat: 51.5842, lng: -2.9977 },
    { name: "Bangor", countryCode: "GB-WLS", lat: 53.2274, lng: -4.1293 },
    { name: "Llandudno", countryCode: "GB-WLS", lat: 53.3241, lng: -3.8276 },
  ],
  "GB-NIR": [
    { name: "Belfast", countryCode: "GB-NIR", lat: 54.5973, lng: -5.9301 },
    { name: "Derry / Londonderry", countryCode: "GB-NIR", lat: 54.9966, lng: -7.3086 },
    { name: "Lisburn", countryCode: "GB-NIR", lat: 54.5162, lng: -6.058 },
    { name: "Newry", countryCode: "GB-NIR", lat: 54.1751, lng: -6.3402 },
    { name: "Armagh", countryCode: "GB-NIR", lat: 54.3503, lng: -6.6528 },
    { name: "Portrush", countryCode: "GB-NIR", lat: 55.2043, lng: -6.6534 },
  ],
  GB: [
    { name: "Londra", countryCode: "GB", lat: 51.5074, lng: -0.1278 },
    { name: "Edinburgh", countryCode: "GB", lat: 55.9533, lng: -3.1883 },
    { name: "Glasgow", countryCode: "GB", lat: 55.8642, lng: -4.2518 },
    { name: "Manchester", countryCode: "GB", lat: 53.4808, lng: -2.2426 },
    { name: "Liverpool", countryCode: "GB", lat: 53.4084, lng: -2.9916 },
    { name: "Cardiff", countryCode: "GB", lat: 51.4816, lng: -3.1791 },
    { name: "Belfast", countryCode: "GB", lat: 54.5973, lng: -5.9301 },
    { name: "Oxford", countryCode: "GB", lat: 51.752, lng: -1.2577 },
    { name: "Cambridge", countryCode: "GB", lat: 52.2053, lng: 0.1218 },
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
  PL: [
    { name: "Varşova", countryCode: "PL", lat: 52.2297, lng: 21.0122 },
    { name: "Krakow", countryCode: "PL", lat: 50.0647, lng: 19.945 },
    { name: "Gdansk", countryCode: "PL", lat: 54.352, lng: 18.6466 },
    { name: "Wroclaw", countryCode: "PL", lat: 51.1079, lng: 17.0385 },
  ],
  RO: [
    { name: "Bükreş", countryCode: "RO", lat: 44.4268, lng: 26.1025 },
    { name: "Brasov", countryCode: "RO", lat: 45.6427, lng: 25.5887 },
    { name: "Cluj-Napoca", countryCode: "RO", lat: 46.7712, lng: 23.6236 },
  ],
  BG: [
    { name: "Sofya", countryCode: "BG", lat: 42.6977, lng: 23.3219 },
    { name: "Varna", countryCode: "BG", lat: 43.2141, lng: 27.9147 },
    { name: "Filibe (Plovdiv)", countryCode: "BG", lat: 42.1354, lng: 24.7453 },
    { name: "Burgaz", countryCode: "BG", lat: 42.5048, lng: 27.4626 },
  ],
  IE: [
    { name: "Dublin", countryCode: "IE", lat: 53.3498, lng: -6.2603 },
    { name: "Cork", countryCode: "IE", lat: 51.8985, lng: -8.4756 },
    { name: "Galway", countryCode: "IE", lat: 53.2707, lng: -9.0568 },
  ],
  CA: [
    { name: "Toronto", countryCode: "CA", lat: 43.6532, lng: -79.3832 },
    { name: "Vancouver", countryCode: "CA", lat: 49.2827, lng: -123.1207 },
    { name: "Montreal", countryCode: "CA", lat: 45.5017, lng: -73.5673 },
    { name: "Ottawa", countryCode: "CA", lat: 45.4215, lng: -75.6972 },
  ],
  RU: [
    { name: "Moskova", countryCode: "RU", lat: 55.7558, lng: 37.6173 },
    { name: "St. Petersburg", countryCode: "RU", lat: 59.9343, lng: 30.3351 },
    { name: "Soçi", countryCode: "RU", lat: 43.6028, lng: 39.7342 },
  ],
  UA: [
    { name: "Kiev", countryCode: "UA", lat: 50.4501, lng: 30.5234 },
    { name: "Lviv", countryCode: "UA", lat: 49.8397, lng: 24.0297 },
    { name: "Odesa", countryCode: "UA", lat: 46.4825, lng: 30.7233 },
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
  FI: [
    { name: "Helsinki", countryCode: "FI", lat: 60.1699, lng: 24.9384 },
    { name: "Rovaniemi", countryCode: "FI", lat: 66.5039, lng: 25.7294 },
    { name: "Tampere", countryCode: "FI", lat: 61.4978, lng: 23.761 },
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
  XK: [
    { name: "Priştine", countryCode: "XK", lat: 42.6629, lng: 21.1655 },
    { name: "Prizren", countryCode: "XK", lat: 42.2153, lng: 20.7415 },
  ],
  SI: [
    { name: "Ljubljana", countryCode: "SI", lat: 46.0569, lng: 14.5058 },
    { name: "Bled", countryCode: "SI", lat: 46.3683, lng: 14.1146 },
  ],
  SK: [
    { name: "Bratislava", countryCode: "SK", lat: 48.1486, lng: 17.1077 },
    { name: "Košice", countryCode: "SK", lat: 48.7164, lng: 21.2611 },
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
  SG: [{ name: "Singapur", countryCode: "SG", lat: 1.3521, lng: 103.8198 }],
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
  SA: [
    { name: "Riyad", countryCode: "SA", lat: 24.7136, lng: 46.6753 },
    { name: "Cidde", countryCode: "SA", lat: 21.4858, lng: 39.1925 },
    { name: "Mekke", countryCode: "SA", lat: 21.3891, lng: 39.8579 },
    { name: "Medine", countryCode: "SA", lat: 24.5247, lng: 39.5692 },
  ],
  QA: [{ name: "Doha", countryCode: "QA", lat: 25.2854, lng: 51.531 }],
  JO: [
    { name: "Amman", countryCode: "JO", lat: 31.9454, lng: 35.9284 },
    { name: "Petra", countryCode: "JO", lat: 30.3285, lng: 35.4444 },
    { name: "Akabe", countryCode: "JO", lat: 29.5321, lng: 35.0063 },
  ],
};

const ENGLISH_COUNTRY_OVERRIDES: Record<string, string> = {
  TR: "Turkey",
  KKTC: "Northern Cyprus (TRNC)",
  CY: "Cyprus",
  "GB-SCT": "Scotland",
  "GB-ENG": "England",
  "GB-WLS": "Wales",
  "GB-NIR": "Northern Ireland",
  GB: "United Kingdom",
  US: "United States",
  AE: "United Arab Emirates",
  CZ: "Czechia",
  XK: "Kosovo",
  PS: "Palestine",
  TW: "Taiwan",
  HK: "Hong Kong",
  MO: "Macau",
  RU: "Russia",
  KR: "South Korea",
  KP: "North Korea",
  VN: "Vietnam",
  BA: "Bosnia and Herzegovina",
  MK: "North Macedonia",
};

let enRegionNames: Intl.DisplayNames | null = null;

/**
 * Seçili dile (TR / EN) göre ülke adını döndürür.
 * İngilizce modda standart ISO kodları için resmi İngilizce ülke adını üretir.
 */
export function getLocalizedCountryName(
  country: Pick<CountryOption, "code" | "name">,
  locale: string = "tr"
): string {
  if (locale !== "en") return country.name;
  const code = country.code.toUpperCase();
  if (ENGLISH_COUNTRY_OVERRIDES[code]) return ENGLISH_COUNTRY_OVERRIDES[code];
  if (/^[A-Z]{2}$/.test(code)) {
    try {
      if (!enRegionNames && typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
        enRegionNames = new Intl.DisplayNames(["en"], { type: "region" });
      }
      const resolved = enRegionNames?.of(code);
      if (resolved && resolved !== code) return resolved;
    } catch {
      // Fallback to default name
    }
  }
  return country.name;
}

/**
 * Kullanıcı girdisinden ülke arar ve eşleştirir (örn: 'scotland' -> İskoçya, 'iskoçya' -> İskoçya, 'fr' -> Fransa)
 */
export function findCountryByNameOrCode(query: string): CountryOption | null {
  if (!query || !query.trim()) return null;
  const qNorm = normalizeSearchText(query);
  const qRaw = query.trim().toLowerCase();

  // 1. Tam kod eşleşmesi (örn: "TR", "GB-SCT", "KKTC")
  const byCode = WORLD_COUNTRIES.find((c) => c.code.toLowerCase() === qRaw);
  if (byCode) return byCode;

  // 2. Tam isim eşleşmesi
  const byNameExact = WORLD_COUNTRIES.find((c) => normalizeSearchText(c.name) === qNorm);
  if (byNameExact) return byNameExact;

  // 3. Birincil İngilizce isim (aliases[0]) tam eşleşmesi (örn: "Scotland" -> İskoçya, "Wales" -> Galler)
  const byPrimaryAliasExact = WORLD_COUNTRIES.find(
    (c) => c.aliases?.[0] && normalizeSearchText(c.aliases[0]) === qNorm
  );
  if (byPrimaryAliasExact) return byPrimaryAliasExact;

  // 4. Diğer alias tam eşleşmesi
  const byAliasExact = WORLD_COUNTRIES.find((c) =>
    c.aliases?.some((a) => normalizeSearchText(a) === qNorm)
  );
  if (byAliasExact) return byAliasExact;

  // 4. Başlangıç isim eşleşmesi
  const byNameStart = WORLD_COUNTRIES.find((c) =>
    normalizeSearchText(c.name).startsWith(qNorm)
  );
  if (byNameStart) return byNameStart;

  // 5. Başlangıç alias eşleşmesi
  const byAliasStart = WORLD_COUNTRIES.find((c) =>
    c.aliases?.some((a) => normalizeSearchText(a).startsWith(qNorm))
  );
  if (byAliasStart) return byAliasStart;

  // 6. İçeren isim eşleşmesi
  const byNameIncludes = WORLD_COUNTRIES.find((c) =>
    normalizeSearchText(c.name).includes(qNorm)
  );
  if (byNameIncludes) return byNameIncludes;

  // 7. İçeren alias eşleşmesi
  const byAliasIncludes = WORLD_COUNTRIES.find((c) =>
    c.aliases?.some((a) => normalizeSearchText(a).includes(qNorm))
  );
  if (byAliasIncludes) return byAliasIncludes;

  return null;
}

/**
 * Yazılan metne göre sıralı ve filtreli ülke listesi döner (Autocomplete için).
 * Arama boşsa yalnızca ilk 14 Popüler Destinasyon döner; metin girildikçe 210+ ülke taranır.
 */
export function searchCountries(query: string): CountryOption[] {
  if (!query || !query.trim()) return WORLD_COUNTRIES.slice(0, 14);
  const qNorm = normalizeSearchText(query);
  const qRaw = query.trim().toLowerCase();
  if (!qNorm) return WORLD_COUNTRIES.slice(0, 14);

  const scored: { country: CountryOption; score: number }[] = [];

  for (const c of WORLD_COUNTRIES) {
    const codeLower = c.code.toLowerCase();
    const nameNorm = normalizeSearchText(c.name);
    let score = 0;

    if (codeLower === qRaw) {
      score = 100;
    } else if (nameNorm === qNorm) {
      score = 95;
    } else if (c.aliases?.[0] && normalizeSearchText(c.aliases[0]) === qNorm) {
      score = 93;
    } else if (c.aliases?.some((a) => normalizeSearchText(a) === qNorm)) {
      score = 90;
    } else if (nameNorm.startsWith(qNorm)) {
      score = 80;
    } else if (c.aliases?.[0] && normalizeSearchText(c.aliases[0]).startsWith(qNorm)) {
      score = 75;
    } else if (c.aliases?.some((a) => normalizeSearchText(a).startsWith(qNorm))) {
      score = 70;
    } else if (codeLower.includes(qRaw)) {
      score = 60;
    } else if (nameNorm.includes(qNorm)) {
      score = 50;
    } else if (c.aliases?.some((a) => normalizeSearchText(a).includes(qNorm))) {
      score = 40;
    }

    if (score > 0) {
      scored.push({ country: c, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 25).map((item) => item.country);
}

/**
 * Yerel (anında 0 ms) popüler şehir araması — API yüklenirken veya boş aramada anlık öneri sunar.
 */
export function searchLocalCities(countryCode: string, query?: string): CityOption[] {
  const code = (countryCode || "").toUpperCase();
  const qNorm = normalizeSearchText(query || "");

  // Türkiye için 81 il
  if (code === "TR") {
    if (!qNorm) {
      return POPULAR_WORLD_CITIES.TR.slice(0, 12);
    }
    return TURKEY_PROVINCES.filter((p) => normalizeSearchText(p.name).includes(qNorm))
      .slice(0, 15)
      .map((p) => ({
        name: p.name,
        countryCode: "TR",
        lat: p.lat,
        lng: p.lng,
      }));
  }

  const cities = POPULAR_WORLD_CITIES[code] || [];
  if (cities.length > 0) {
    if (!qNorm) return cities;
    return cities.filter((c) => normalizeSearchText(c.name).includes(qNorm));
  }

  // Ülke kodu seçilmediyse ve arama yapıldıysa yerel popüler şehirlerden hızlı eşleşme
  if (!code && qNorm) {
    const matched: CityOption[] = [];
    for (const p of TURKEY_PROVINCES) {
      if (normalizeSearchText(p.name).includes(qNorm)) {
        matched.push({ name: p.name, countryCode: "TR", lat: p.lat, lng: p.lng });
        if (matched.length >= 6) break;
      }
    }
    for (const list of Object.values(POPULAR_WORLD_CITIES)) {
      for (const city of list) {
        if (
          normalizeSearchText(city.name).includes(qNorm) &&
          !matched.some((m) => m.name === city.name && m.countryCode === city.countryCode)
        ) {
          matched.push(city);
          if (matched.length >= 12) return matched;
        }
      }
    }
    return matched;
  }

  return [];
}

/**
 * Geriye dönük uyumluluk: Seçili ülkeye ait popüler şehir isimlerini döner
 */
export function searchCities(countryCode: string, query?: string): string[] {
  return searchLocalCities(countryCode, query).map((c) => c.name);
}

/**
 * Ülke kodu ve şehir adına göre koordinat ve geçerli şehir adı çözer.
 * Eğer şehir seçimi sırasında gerçek koordinat (lat/lng) yakalandıysa doğrudan onu korur.
 */
export function resolveLocationCoordinates(
  countryCode: string,
  cityName: string,
  knownCoords?: { lat?: number | null; lng?: number | null }
): { cityName: string; countryCode: string; latitude: number; longitude: number } {
  const code = (countryCode || "TR").toUpperCase();
  const trimmedCity = (cityName || "").trim();

  // 0. Seçilen şehirden doğrudan bilinen geçerli koordinat varsa kullan
  if (
    knownCoords &&
    typeof knownCoords.lat === "number" &&
    typeof knownCoords.lng === "number" &&
    Number.isFinite(knownCoords.lat) &&
    Number.isFinite(knownCoords.lng)
  ) {
    if (code === "TR") {
      const resolved = resolveTurkishCityOrDistrict(trimmedCity);
      return {
        cityName: resolved.districtName
          ? `${resolved.cityName} (${resolved.districtName})`
          : resolved.cityName || trimmedCity,
        countryCode: "TR",
        latitude: knownCoords.lat,
        longitude: knownCoords.lng,
      };
    }
    return {
      cityName: trimmedCity || "Bilinmeyen Şehir",
      countryCode: code,
      latitude: knownCoords.lat,
      longitude: knownCoords.lng,
    };
  }

  // 1. Türkiye ili veya ilçesi mi?
  if (code === "TR") {
    const resolved = resolveTurkishCityOrDistrict(trimmedCity);
    const matched = TURKEY_PROVINCES.find(
      (p) => normalizeSearchText(p.name) === normalizeSearchText(resolved.cityName)
    );
    if (matched) {
      return {
        cityName: resolved.districtName
          ? `${resolved.cityName} (${resolved.districtName})`
          : resolved.cityName,
        countryCode: "TR",
        latitude: matched.lat,
        longitude: matched.lng,
      };
    }
  }

  // 2. Popüler Dünya Şehirleri listesinde var mı?
  const citiesInCountry = POPULAR_WORLD_CITIES[code] || [];
  const cityNorm = normalizeSearchText(trimmedCity);
  const matchedWorldCity = citiesInCountry.find(
    (c) => normalizeSearchText(c.name) === cityNorm
  );
  if (matchedWorldCity) {
    return {
      cityName: matchedWorldCity.name,
      countryCode: code,
      latitude: matchedWorldCity.lat,
      longitude: matchedWorldCity.lng,
    };
  }

  // 3. Ülke merkez koordinatlarına düş (210+ ülkenin tamamı tanımlı)
  const countryCenter = COUNTRY_CENTERS[code] || { lat: 39.0, lng: 35.2 };
  return {
    cityName: trimmedCity || "Bilinmeyen Şehir",
    countryCode: code,
    latitude: countryCenter.lat,
    longitude: countryCenter.lng,
  };
}
