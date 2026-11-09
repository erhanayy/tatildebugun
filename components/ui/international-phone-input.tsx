"use client";

import { useState, useEffect, useRef } from "react";
import { COUNTRIES, CountryInfo, splitPhone, normalizeToInternational } from "@/lib/utils/phone";
import { ChevronDown, Search, Check, Phone } from "lucide-react";

interface InternationalPhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function InternationalPhoneInput({
  value,
  onChange,
  id = "phoneNumber",
  placeholder,
  required = false,
  disabled = false,
  className = "",
}: InternationalPhoneInputProps) {
  // İlk değeri çözümle
  const initial = splitPhone(value || "");
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(initial.country);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.nationalNumber);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dışarıdan value değiştiğinde senkronize et (örneğin profil yüklendiğinde)
  useEffect(() => {
    if (!value) {
      setNationalNumber("");
      return;
    }
    const parsed = splitPhone(value);
    setSelectedCountry(parsed.country);
    setNationalNumber(parsed.nationalNumber);
  }, [value]);

  // Dışarı tıklama kontrolü (Kapatmak için)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Ülke filtresi
  const filteredCountries = COUNTRIES.filter((c) => {
    if (c.code === "OTHER") return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  // Numara değiştiğinde
  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value;

    // Kullanıcı tam uluslararası yapıştırdıysa (+49... veya 0049...)
    if (raw.startsWith("+") || raw.startsWith("00")) {
      const parsed = splitPhone(raw);
      setSelectedCountry(parsed.country);
      setNationalNumber(parsed.nationalNumber);
      onChange(normalizeToInternational(raw, parsed.country.dialCode));
      return;
    }

    // Başında 0 varsa (örn: 0532...) otomatik 0'ı temizle
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0") && selectedCountry.code !== "OTHER") {
      digits = digits.slice(1);
    }

    setNationalNumber(digits);

    if (!digits) {
      onChange("");
      return;
    }

    const full = `${selectedCountry.dialCode}${digits}`;
    onChange(normalizeToInternational(full, selectedCountry.dialCode));
  }

  // Ülke seçildiğinde
  function handleSelectCountry(country: CountryInfo) {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery("");

    if (nationalNumber) {
      let digits = nationalNumber;
      if (digits.startsWith("0") && country.code !== "OTHER") {
        digits = digits.slice(1);
        setNationalNumber(digits);
      }
      const full = `${country.dialCode}${digits}`;
      onChange(normalizeToInternational(full, country.dialCode));
    }
  }

  return (
    <div className={`relative flex items-center ${className}`} ref={dropdownRef}>
      {/* Ülke Kodu Seçici Buton */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-l-xl bg-slate-100 dark:bg-slate-800 border-y border-l border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 z-10 min-h-[44px] cursor-pointer"
        title="Ülke ve alan kodunu değiştir"
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="font-mono text-xs">{selectedCountry.dialCode}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Telefon Numarası Girişi */}
      <div className="relative flex-1">
        <input
          id={id}
          type="tel"
          required={required}
          disabled={disabled}
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={placeholder || selectedCountry.placeholder}
          className="w-full pl-3 pr-3 py-2.5 rounded-r-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all min-h-[44px]"
        />
      </div>

      {/* Ülke Seçim Açılır Menüsü */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 max-h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in-50 duration-150">
          {/* Arama Alanı */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ülke veya kod ara (+49, Almanya...)"
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Ülke Listesi */}
          <div className="overflow-y-auto max-h-60 p-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredCountries.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Ülke bulunamadı</div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = selectedCountry.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-xl text-xs transition-colors min-h-[40px] cursor-pointer ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {c.dialCode}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
