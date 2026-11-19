import { NextRequest, NextResponse } from "next/server";
import { City, State } from "country-state-city";
import { z } from "zod";
import {
  POPULAR_WORLD_CITIES,
  WORLD_COUNTRIES,
  normalizeSearchText,
  type CityOption,
} from "@/lib/world-cities";
import { TURKEY_PROVINCES, TURKEY_DISTRICT_TO_PROVINCE } from "@/lib/turkey-cities";

// Zod Doğrulama Şeması (Kural 10)
const querySchema = z.object({
  country: z.string().trim().max(10).optional().default(""),
  q: z.string().trim().max(80).optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

interface IndexedCity extends CityOption {
  norm: string;
  isPopular: boolean;
  countryName?: string;
}

// Birleşik Krallık kurucu ülke -> country-state-city stateCode eşlemesi
const UK_SUBDIVISION_MAP: Record<string, { countryIso: string; stateIso: string }> = {
  "GB-SCT": { countryIso: "GB", stateIso: "SCT" },
  "GB-ENG": { countryIso: "GB", stateIso: "ENG" },
  "GB-WLS": { countryIso: "GB", stateIso: "WLS" },
  "GB-NIR": { countryIso: "GB", stateIso: "NYK" },
};

// Sunucu bellek içi önbellekler (tek seferlik yükleme, 1-5 ms arama)
const countryCitiesCache = new Map<string, IndexedCity[]>();
const stateNameMapCache = new Map<string, Map<string, string>>();
let globalCitiesCache: IndexedCity[] | null = null;

const countryNameByCode = new Map<string, string>(
  WORLD_COUNTRIES.map((c) => [c.code.toUpperCase(), c.name])
);

function getStateNameMap(isoCountry: string): Map<string, string> {
  const existing = stateNameMapCache.get(isoCountry);
  if (existing) return existing;

  const map = new Map<string, string>();
  const states = State.getStatesOfCountry(isoCountry) || [];
  for (const st of states) {
    map.set(st.isoCode, st.name);
  }
  stateNameMapCache.set(isoCountry, map);
  return map;
}

function getIndexedCitiesForCountry(rawCode: string): IndexedCity[] {
  const code = rawCode.toUpperCase();
  const cached = countryCitiesCache.get(code);
  if (cached) return cached;

  const result: IndexedCity[] = [];
  const seen = new Set<string>();
  const cName = countryNameByCode.get(code);

  const pushCity = (city: CityOption, isPopular: boolean) => {
    const norm = normalizeSearchText(city.name);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    result.push({
      ...city,
      norm,
      isPopular,
      countryName: cName,
    });
  };

  // 1. Türkiye için 81 il + popüler ilçeler öncelikli
  if (code === "TR") {
    for (const popular of POPULAR_WORLD_CITIES.TR || []) {
      pushCity(popular, true);
    }
    for (const p of TURKEY_PROVINCES) {
      pushCity(
        { name: p.name, countryCode: "TR", lat: p.lat, lng: p.lng, stateName: p.region },
        true
      );
    }
    for (const [distKey, provName] of Object.entries(TURKEY_DISTRICT_TO_PROVINCE)) {
      const prov = TURKEY_PROVINCES.find((p) => p.name === provName);
      if (prov) {
        const formattedDist = distKey.charAt(0).toLocaleUpperCase("tr-TR") + distKey.slice(1);
        pushCity(
          {
            name: `${provName} / ${formattedDist}`,
            countryCode: "TR",
            lat: prov.lat,
            lng: prov.lng,
            stateName: provName,
          },
          false
        );
      }
    }
  } else {
    // 2. Küratörlü Türkçe/popüler şehirler (Viyana, Roma, Edinburgh, Glasgow vb.)
    for (const popular of POPULAR_WORLD_CITIES[code] || []) {
      pushCity(popular, true);
    }
  }

  // 3. Offline country-state-city veri setinden tüm şehirler
  if (code !== "KKTC") {
    const ukSub = UK_SUBDIVISION_MAP[code];
    if (ukSub) {
      const cscCities = City.getCitiesOfState(ukSub.countryIso, ukSub.stateIso) || [];
      for (const c of cscCities) {
        const lat = Number(c.latitude);
        const lng = Number(c.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        pushCity(
          {
            name: c.name,
            countryCode: code,
            lat,
            lng,
          },
          false
        );
      }
    } else if (/^[A-Z]{2}$/.test(code)) {
      const stateMap = getStateNameMap(code);
      const cscCities = City.getCitiesOfCountry(code) || [];
      for (const c of cscCities) {
        const lat = Number(c.latitude);
        const lng = Number(c.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        pushCity(
          {
            name: c.name,
            countryCode: code,
            lat,
            lng,
            stateName: c.stateCode ? stateMap.get(c.stateCode) : undefined,
          },
          false
        );
      }
    }
  }

  countryCitiesCache.set(code, result);
  return result;
}

function getGlobalIndexedCities(): IndexedCity[] {
  if (globalCitiesCache) return globalCitiesCache;

  const list: IndexedCity[] = [];
  const seen = new Set<string>();

  const add = (city: CityOption, isPopular: boolean) => {
    const norm = normalizeSearchText(city.name);
    if (!norm) return;
    const key = `${city.countryCode}_${norm}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      ...city,
      norm,
      isPopular,
      countryName: countryNameByCode.get(city.countryCode.toUpperCase()),
    });
  };

  // 1. Türkiye 81 il
  for (const p of TURKEY_PROVINCES) {
    add({ name: p.name, countryCode: "TR", lat: p.lat, lng: p.lng }, true);
  }

  // 2. Popüler dünya şehirleri (Türkçe isimler öncelikli)
  for (const cities of Object.values(POPULAR_WORLD_CITIES)) {
    for (const c of cities) {
      add(c, true);
    }
  }

  // 3. Tüm ~148.000 dünya şehri (UK alt bölgeleri ayrıştırılarak)
  const allCities = City.getAllCities();
  for (const c of allCities) {
    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    let mappedCountry = c.countryCode.toUpperCase();
    if (mappedCountry === "GB") {
      if (c.stateCode === "SCT") mappedCountry = "GB-SCT";
      else if (c.stateCode === "WLS") mappedCountry = "GB-WLS";
      else if (c.stateCode === "NYK") mappedCountry = "GB-NIR";
      else if (c.stateCode === "ENG") mappedCountry = "GB-ENG";
    }

    add(
      {
        name: c.name,
        countryCode: mappedCountry,
        lat,
        lng,
      },
      false
    );
  }

  globalCitiesCache = list;
  return list;
}

function scoreMatch(item: IndexedCity, qNorm: string): number {
  let score = 0;
  if (item.norm === qNorm) {
    score = 100;
  } else if (item.norm.startsWith(qNorm)) {
    score = 80;
  } else if (item.norm.includes(qNorm)) {
    score = 50;
  } else {
    return 0;
  }

  if (item.isPopular) {
    score += 15;
  }

  // Kısa/temiz şehir isimlerini (örn. "Edinburgh" vs "City of Edinburgh") öne çıkar
  score -= Math.min(item.name.length * 0.1, 5);
  return score;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      country: searchParams.get("country") ?? "",
      q: searchParams.get("q") ?? "",
      limit: searchParams.get("limit") ?? 20,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz konum sorgusu", cities: [] },
        { status: 400 }
      );
    }

    const { country, q, limit } = parsed.data;
    const countryCode = country.toUpperCase();
    const qNorm = normalizeSearchText(q);

    // 1. Ülke seçilmişse o ülkenin şehirlerinde ara
    if (countryCode) {
      const pool = getIndexedCitiesForCountry(countryCode);

      if (!qNorm) {
        const initial = pool.slice(0, limit).map(({ norm: _n, isPopular: _p, ...rest }) => rest);
        return NextResponse.json(
          { cities: initial, total: pool.length },
          { headers: { "Cache-Control": "public, max-age=3600" } }
        );
      }

      const scored: { city: IndexedCity; score: number }[] = [];
      for (const item of pool) {
        const s = scoreMatch(item, qNorm);
        if (s > 0) {
          scored.push({ city: item, score: s });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      const top = scored
        .slice(0, limit)
        .map(({ city: { norm: _n, isPopular: _p, ...rest } }) => rest);

      return NextResponse.json(
        { cities: top, total: scored.length },
        { headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }

    // 2. Ülke seçilmemişse en az 2 karakter girildiğinde tüm dünya şehirlerinde ara
    if (qNorm.length < 2) {
      return NextResponse.json({ cities: [], total: 0 });
    }

    const globalPool = getGlobalIndexedCities();
    const scored: { city: IndexedCity; score: number }[] = [];

    for (const item of globalPool) {
      const s = scoreMatch(item, qNorm);
      if (s > 0) {
        scored.push({ city: item, score: s });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored
      .slice(0, limit)
      .map(({ city: { norm: _n, isPopular: _p, ...rest } }) => rest);

    return NextResponse.json(
      { cities: top, total: scored.length },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (error) {
    console.error("Offline şehir arama hatası:", error instanceof Error ? error.message : "Bilinmeyen hata");
    return NextResponse.json({ error: "Şehir araması başarısız oldu", cities: [] }, { status: 500 });
  }
}

