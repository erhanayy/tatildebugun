"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  searchCountries,
  searchLocalCities,
  findCountryByNameOrCode,
  getLocalizedCountryName,
  normalizeSearchText,
  type CountryOption,
  type CityOption,
} from "@/lib/world-cities";
import { CountryFlag } from "@/components/ui/country-flag";
import { useTranslation } from "@/lib/i18n";
import { MapPin, ChevronDown, X, Check, Loader2, Search } from "lucide-react";

export interface SelectedCityPayload extends CityOption {
  countryName?: string;
}

/**
 * ============================================================================
 * 1. Ülke Girişi (Kelime Arama Odaklı 210+ Ülke & Özerk Destinasyon Seçici)
 * ============================================================================
 */
interface CountryAutocompleteProps {
  countryCode: string;
  countryName: string;
  onChange: (country: { code: string; name: string }) => void;
  placeholder?: string;
  className?: string;
}

export function CountryAutocomplete({
  countryCode,
  countryName,
  onChange,
  placeholder,
  className = "",
}: CountryAutocompleteProps) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(countryName || "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Dışarıdan countryName veya countryCode değiştiğinde senkronize et
  useEffect(() => {
    if (countryCode) {
      const match = findCountryByNameOrCode(countryCode);
      if (match) {
        setQuery(getLocalizedCountryName(match, locale));
        return;
      }
    }
    if (countryName) {
      setQuery(countryName);
    } else {
      setQuery("");
    }
  }, [countryCode, countryName, locale]);

  // Dışarı tıklandığında popover'ı kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (query.trim()) {
          const matched = findCountryByNameOrCode(query);
          if (matched) {
            const localized = getLocalizedCountryName(matched, locale);
            if (matched.code !== countryCode || localized !== query) {
              onChange({ code: matched.code, name: localized });
              setQuery(localized);
            }
          } else {
            onChange({ code: countryCode || "XX", name: query.trim() });
          }
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query, countryCode, onChange, locale]);

  const trimmedQuery = query.trim();
  const filteredCountries = useMemo(() => searchCountries(query), [query]);

  function handleSelect(c: CountryOption) {
    const localized = getLocalizedCountryName(c, locale);
    setQuery(localized);
    onChange({ code: c.code, name: localized });
    setIsOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    const quickMatch = findCountryByNameOrCode(val);
    if (quickMatch && val.trim().length >= 2) {
      onChange({ code: quickMatch.code, name: val });
    } else {
      onChange({ code: "", name: val });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" && isOpen && filteredCountries.length > 0) {
      e.preventDefault();
      handleSelect(filteredCountries[0]);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* Bayrak Rozeti */}
        <div className="absolute left-2.5 flex items-center justify-center pointer-events-none select-none">
          {countryCode ? (
            <CountryFlag countryCode={countryCode} width={18} height={13} className="shadow-xs" />
          ) : (
            <span className="text-base">🌍</span>
          )}
        </div>

        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("locationSearch.countryPlaceholder")}
          className="w-full min-h-[38px] pl-9 pr-8 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-500 transition-all shadow-sm"
        />

        {query ? (
          <button
            type="button"
            aria-label={t("locationSearch.clearCountryAria")}
            onClick={() => {
              setQuery("");
              onChange({ code: "", name: "" });
              setIsOpen(true);
            }}
            className="absolute right-1.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        )}
      </div>

      {/* Dropdown Öneri Listesi */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full max-h-64 overflow-y-auto overflow-x-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-[3100] py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="truncate">
              {trimmedQuery
                ? `${t("locationSearch.matchingCountries")} (${filteredCountries.length})`
                : t("locationSearch.popularDestinations")}
            </span>
            {!trimmedQuery && (
              <span className="text-[10px] font-medium normal-case text-cyan-600 dark:text-cyan-400 shrink-0">
                {t("locationSearch.typeToSearch")}
              </span>
            )}
          </div>

          {filteredCountries.length > 0 ? (
            <>
              {filteredCountries.map((c) => {
                const isSelected = countryCode.toUpperCase() === c.code.toUpperCase();
                const displayName = getLocalizedCountryName(c, locale);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(c);
                    }}
                    className={`w-full min-h-[44px] text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CountryFlag countryCode={c.code} width={18} height={13} className="shadow-xs shrink-0" />
                      <span className="truncate">{displayName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                        {c.code}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                    </div>
                  </button>
                );
              })}

              {!trimmedQuery && (
                <div className="px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 bg-slate-50/70 dark:bg-slate-800/40">
                  <Search className="w-3 h-3 shrink-0 text-cyan-500" />
                  <span className="truncate">{t("locationSearch.searchAllHint")}</span>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
              <div>{t("locationSearch.noCountryFound")}</div>
              <div className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5 break-words">
                &quot;{trimmedQuery}&quot; {t("locationSearch.customCountryNotice")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * 2. Şehir Girişi (Offline 148.000+ Dünya Şehri Sunucu İndeksi + Anında Yerel Öneri)
 * ============================================================================
 */
interface CityAutocompleteProps {
  countryCode: string;
  cityName: string;
  onChange: (cityName: string) => void;
  onSelectCity?: (city: SelectedCityPayload) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function CityAutocomplete({
  countryCode,
  cityName,
  onChange,
  onSelectCity,
  placeholder,
  className = "",
  required = true,
}: CityAutocompleteProps) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [remoteCities, setRemoteCities] = useState<SelectedCityPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklandığında popover'ı kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Anlık yerel şehir önerileri (0 ms)
  const localSuggestions = useMemo<SelectedCityPayload[]>(
    () => searchLocalCities(countryCode, cityName),
    [countryCode, cityName]
  );

  // Offline sunucu indeksinden tüm ülke/dünya şehirlerini getir (1-5 ms, asla takılmaz)
  useEffect(() => {
    if (!isOpen) return;

    const code = (countryCode || "").trim().toUpperCase();
    const q = (cityName || "").trim();

    // Ülke seçilmediyse ve en az 2 karakter yazılmadıysa sunucuyu yorma
    if (!code && q.length < 2) {
      setRemoteCities([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const debounceId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (code) params.set("country", code);
        if (q) params.set("q", q);
        params.set("limit", "25");

        const res = await fetch(`/api/locations/cities?${params.toString()}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as { cities?: SelectedCityPayload[] };
          if (Array.isArray(data.cities)) {
            setRemoteCities(data.cities);
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setRemoteCities([]);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(debounceId);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, countryCode, cityName]);

  // Yerel ve sunucu sonuçlarını tekilleştirerek birleştir
  const suggestions = useMemo<SelectedCityPayload[]>(() => {
    const merged: SelectedCityPayload[] = [];
    const seen = new Set<string>();

    const push = (item: SelectedCityPayload) => {
      const key = `${item.countryCode.toUpperCase()}_${normalizeSearchText(item.name)}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    };

    // Sunucu indeksinden gelen sıralı sonuçları ve yerel Türkçe şehirleri birleştir
    if (remoteCities.length > 0) {
      for (const item of remoteCities) push(item);
      for (const item of localSuggestions) push(item);
    } else {
      for (const item of localSuggestions) push(item);
    }

    return merged.slice(0, 25);
  }, [localSuggestions, remoteCities]);

  function handleSelect(city: SelectedCityPayload) {
    onChange(city.name);
    if (onSelectCity) {
      onSelectCity(city);
    }
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" && isOpen && suggestions.length > 0) {
      e.preventDefault();
      handleSelect(suggestions[0]);
    }
  }

  const trimmedCity = cityName.trim();
  const showDropdown = isOpen && (suggestions.length > 0 || isLoading || trimmedCity.length >= 2);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />

        <input
          type="text"
          required={required}
          value={cityName}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("locationSearch.cityPlaceholder")}
          className="w-full min-h-[38px] pl-8 pr-8 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-500 transition-all shadow-sm"
        />

        {isLoading ? (
          <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-cyan-500 animate-spin pointer-events-none" />
        ) : cityName ? (
          <button
            type="button"
            aria-label={t("locationSearch.clearCityAria")}
            onClick={() => {
              onChange("");
              setIsOpen(true);
            }}
            className="absolute right-1.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        )}
      </div>

      {/* Şehir Öneri Dropdown'ı */}
      {showDropdown && (
        <div className="absolute left-0 top-full mt-1.5 w-full max-h-60 overflow-y-auto overflow-x-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-[3100] py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="truncate">
              {trimmedCity
                ? `${t("locationSearch.citiesLabel")} (${suggestions.length})`
                : t("locationSearch.suggestedCities")}
            </span>
            {countryCode && (
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 shrink-0">
                {countryCode.toUpperCase()}
              </span>
            )}
          </div>

          {suggestions.length > 0 ? (
            suggestions.map((city) => {
              const isSelected =
                normalizeSearchText(cityName) === normalizeSearchText(city.name) &&
                (!countryCode || countryCode.toUpperCase() === city.countryCode.toUpperCase());
              const localizedCountrySub =
                !countryCode && city.countryCode
                  ? getLocalizedCountryName(
                      { code: city.countryCode, name: city.countryName || city.countryCode },
                      locale
                    )
                  : city.stateName;
              return (
                <button
                  key={`${city.countryCode}-${city.name}-${city.lat.toFixed(3)}-${city.lng.toFixed(3)}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(city);
                  }}
                  className={`w-full min-h-[44px] text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{city.name}</div>
                      {localizedCountrySub && (
                        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500 truncate">
                          {localizedCountrySub}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!countryCode && city.countryCode && (
                      <CountryFlag countryCode={city.countryCode} width={15} height={11} />
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                  </div>
                </button>
              );
            })
          ) : isLoading ? (
            <div className="px-3 py-3 text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
              <span>{t("locationSearch.searchingCities")}</span>
            </div>
          ) : (
            <div className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
              <div>{t("locationSearch.noCityFound")}</div>
              <div className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5 break-words">
                &quot;{trimmedCity}&quot; {t("locationSearch.customCityNotice")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
