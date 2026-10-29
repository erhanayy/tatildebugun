"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  searchCountries,
  searchCities,
  findCountryByNameOrCode,
  type CountryOption,
} from "@/lib/world-cities";
import { getCountryFlagEmoji } from "@/lib/country-flags";
import { MapPin, Search, ChevronDown, X, Check } from "lucide-react";

/**
 * ============================================================================
 * 1. Ülke Girişi (Akıllı Autocomplete & Serbest Yazım Destekli)
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
  placeholder = "Ülke yazınız...",
  className = "",
}: CountryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(countryName || "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Dışarıdan countryName veya countryCode değiştiğinde senkronize et
  useEffect(() => {
    if (countryName) {
      setQuery(countryName);
    } else if (countryCode) {
      const match = findCountryByNameOrCode(countryCode);
      if (match) setQuery(match.name);
    } else {
      setQuery("");
    }
  }, [countryCode, countryName]);

  // Dışarı tıklandığında popover'ı kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Kullanıcı dropdown'dan tıklamadan dışarı tıkladıysa, yazdığı metinden eşleşen ülke var mı bak
        if (query.trim()) {
          const matched = findCountryByNameOrCode(query);
          if (matched) {
            onChange({ code: matched.code, name: matched.name });
            setQuery(matched.name);
          } else {
            onChange({ code: countryCode || "XX", name: query.trim() });
          }
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query, countryCode, onChange]);

  // Arama sonuçları
  const filteredCountries = searchCountries(query);

  const displayFlag = countryCode ? getCountryFlagEmoji(countryCode) : "🌍";

  function handleSelect(c: CountryOption) {
    setQuery(c.name);
    onChange({ code: c.code, name: c.name });
    setIsOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    // Canlı eşleştirme: tam veya yakın kod/isim uyuşuyorsa kodu anında güncelle
    const quickMatch = findCountryByNameOrCode(val);
    if (quickMatch && val.length >= 2) {
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
        <div className="absolute left-2.5 flex items-center justify-center pointer-events-none text-base select-none">
          {displayFlag}
        </div>

        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-500 transition-all shadow-sm"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange({ code: "", name: "" });
              setIsOpen(true);
            }}
            className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        )}
      </div>

      {/* Dropdown Öneri Listesi */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[230px] max-h-56 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-[3100] py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            {query.trim() ? "Eşleşen Ülkeler" : "Popüler Destinasyonlar"}
          </div>

          {filteredCountries.length > 0 ? (
            filteredCountries.map((c) => {
              const isSelected = countryCode.toUpperCase() === c.code.toUpperCase();
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                      {c.code}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 text-center">
              <div>Bulunamadı</div>
              <div className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                "{query}" serbest isim olarak kaydedilecek.
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
 * 2. Şehir Girişi (Seçili Ülkenin Şehirleri + Serbest Şehir Yazımı)
 * ============================================================================
 */
interface CityAutocompleteProps {
  countryCode: string;
  cityName: string;
  onChange: (cityName: string) => void;
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({
  countryCode,
  cityName,
  onChange,
  placeholder = "Şehir yazınız veya seçiniz...",
  className = "",
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  // Şehir önerileri (seçili ülkeye ve yazılan karaktere göre filtrelenir)
  const suggestions = searchCities(countryCode, cityName);

  function handleSelect(city: string) {
    onChange(city);
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />

        <input
          type="text"
          required
          value={cityName}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-500 transition-all shadow-sm"
        />

        {cityName ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(true);
            }}
            className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        )}
      </div>

      {/* Şehir Öneri Dropdown'ı */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[210px] max-h-52 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-[3100] py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Önerilen Şehirler</span>
            {countryCode && (
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                {countryCode.toUpperCase()}
              </span>
            )}
          </div>

          {suggestions.map((city) => {
            const isSelected = cityName.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                type="button"
                onClick={() => handleSelect(city)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{city}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
