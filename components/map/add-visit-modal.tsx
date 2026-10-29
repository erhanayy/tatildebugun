"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  createVisit,
  updateVisit,
  reverseGeocodeLocation,
  type CreateVisitInput,
} from "@/lib/actions/visits";
import type { Visit } from "@/lib/db/schema";
import { getCountryFlagEmoji } from "@/lib/country-flags";
import {
  TURKEY_PROVINCES,
  TURKEY_DISTRICT_TO_PROVINCE,
  resolveTurkishCityOrDistrict,
  normalizeTurkishText,
} from "@/lib/turkey-cities";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  Users,
  Compass,
  Loader2,
  CheckCircle2,
  FileText,
  Pencil,
  Sparkles,
  ChevronDown,
  Building2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number } | null;
  editingVisit?: Visit | null;
  onSuccess: (visits: Visit[]) => void;
}

const MONTHS = [
  { value: 1, label: "Ocak" },
  { value: 2, label: "Şubat" },
  { value: 3, label: "Mart" },
  { value: 4, label: "Nisan" },
  { value: 5, label: "Mayıs" },
  { value: 6, label: "Haziran" },
  { value: 7, label: "Temmuz" },
  { value: 8, label: "Ağustos" },
  { value: 9, label: "Eylül" },
  { value: 10, label: "Ekim" },
  { value: 11, label: "Kasım" },
  { value: 12, label: "Aralık" },
];

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export function AddVisitModal({
  isOpen,
  onClose,
  initialCoords,
  editingVisit,
  onSuccess,
}: AddVisitModalProps) {
  const isEditing = !!editingVisit;

  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [countryCode, setCountryCode] = useState("TR");
  const [countryName, setCountryName] = useState("Türkiye");
  const [cityName, setCityName] = useState("İstanbul");
  const [districtName, setDistrictName] = useState("");
  const [latitude, setLatitude] = useState<number>(41.0082);
  const [longitude, setLongitude] = useState<number>(28.9784);

  // Akıllı İlçe / Şehir Normalizasyonu
  const [detectedDistrict, setDetectedDistrict] = useState<string | null>(null);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const [dateType, setDateType] = useState<"exact" | "month_year" | "timeless">("exact");
  const [visitCount, setVisitCount] = useState<number>(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visitYear, setVisitYear] = useState<number>(new Date().getFullYear());
  const [visitMonth, setVisitMonth] = useState<number>(new Date().getMonth() + 1);

  const [stayDurationDays, setStayDurationDays] = useState<number>(3);
  const [visitType, setVisitType] = useState<"touristic" | "business">("touristic");
  const [visibility, setVisibility] = useState<"public" | "friends" | "family">("public");
  const [notes, setNotes] = useState("");

  // Dropdown dışına tıklandığında listeyi kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Düzenleme veya Yeni Kayıt Durumunda Formu Doldur
  useEffect(() => {
    if (!isOpen) return;

    if (editingVisit) {
      setCountryCode(editingVisit.countryCode);
      setCountryName(editingVisit.countryName);
      setCityName(editingVisit.cityName);
      setDistrictName(editingVisit.districtName || "");
      setLatitude(editingVisit.latitude);
      setLongitude(editingVisit.longitude);
      setDateType((editingVisit.dateType as any) || "exact");
      setVisitCount(1);
      setStartDate(formatDateForInput(editingVisit.startDate));
      setEndDate(formatDateForInput(editingVisit.endDate));
      setVisitYear(editingVisit.visitYear || new Date().getFullYear());
      setVisitMonth(editingVisit.visitMonth || new Date().getMonth() + 1);
      setStayDurationDays(editingVisit.stayDurationDays || 1);
      setVisitType((editingVisit.visitType as any) || "touristic");
      setVisibility((editingVisit.visibility as any) || "public");
      setNotes(editingVisit.notes || "");
      setDetectedDistrict(null);
    } else if (initialCoords) {
      setLatitude(initialCoords.lat);
      setLongitude(initialCoords.lng);
      setLoadingGeocode(true);

      reverseGeocodeLocation(initialCoords.lat, initialCoords.lng)
        .then((geo) => {
          if (geo) {
            setCountryName(geo.countryName);
            setCountryCode(geo.countryCode);
            setCityName(geo.cityName);
            setDistrictName(geo.districtName || "");
            setDetectedDistrict(geo.districtName || null);
          }
        })
        .finally(() => setLoadingGeocode(false));
    }
  }, [isOpen, initialCoords, editingVisit]);

  // Kesin tarih seçildiğinde kalış süresini otomatik hesapla
  useEffect(() => {
    if (dateType === "exact" && startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      if (end >= start) {
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        setStayDurationDays(diffDays);
      }
    }
  }, [dateType, startDate, endDate]);

  interface FilteredCityItem {
    type: "province" | "district";
    cityName: string;
    districtName?: string;
    badge: string;
    plate?: number;
  }

  // Türkiye İçin Akıllı Şehir & İlçe Filtreleme Listesi
  const turkeyFilteredItems = useMemo<FilteredCityItem[]>(() => {
    if (countryCode !== "TR") return [];
    const query = normalizeTurkishText(cityName);

    // Boş ise 81 resmi ili listele
    if (!query) {
      return TURKEY_PROVINCES.map((p) => ({
        type: "province" as const,
        cityName: p.name,
        badge: `${p.region} Bölgesi`,
        plate: p.plate,
      }));
    }

    const results: FilteredCityItem[] = [];

    // 1. İlleri tara
    for (const p of TURKEY_PROVINCES) {
      if (normalizeTurkishText(p.name).includes(query)) {
        results.push({
          type: "province",
          cityName: p.name,
          badge: `${p.region} Bölgesi (İl)`,
          plate: p.plate,
        });
      }
    }

    // 2. İlçeleri tara (örn: Bodrum, Çeşme, Kaş, Kadıköy...)
    for (const [distKey, provName] of Object.entries(TURKEY_DISTRICT_TO_PROVINCE)) {
      if (normalizeTurkishText(distKey).includes(query)) {
        const formattedDist =
          distKey.charAt(0).toLocaleUpperCase("tr-TR") + distKey.slice(1);
        results.push({
          type: "district",
          cityName: provName,
          districtName: formattedDist,
          badge: `${formattedDist} ilçesi → ${provName} ili`,
        });
      }
    }

    return results.slice(0, 30);
  }, [countryCode, cityName]);

  // Şehir / İlçe Listeden Seçildiğinde
  function handleSelectCityItem(item: {
    type: "province" | "district";
    cityName: string;
    districtName?: string;
  }) {
    setCityName(item.cityName);
    if (item.type === "district" && item.districtName) {
      setDistrictName(item.districtName);
      setDetectedDistrict(item.districtName);
    } else {
      setDetectedDistrict(null);
    }
    setIsCityDropdownOpen(false);
  }

  // Kullanıcı Şehir Kutusundan Çıktığında (Blur) Otomatik Düzeltme
  function handleCityBlur() {
    // Dropdown tıklamalarını engellememek için kısa bir gecikme
    setTimeout(() => {
      if (countryCode === "TR" && cityName.trim()) {
        const resolved = resolveTurkishCityOrDistrict(cityName);
        if (resolved.cityName && resolved.cityName !== cityName) {
          setCityName(resolved.cityName);
        }
        if (resolved.isDistrict && resolved.districtName) {
          setDistrictName((prev) => prev || resolved.districtName!);
          setDetectedDistrict(resolved.districtName);
        }
      }
    }, 200);
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    // Türkiye için son kez ilçe kontrolü ve il normalizasyonu
    let finalCity = cityName.trim();
    if (countryCode === "TR") {
      const resolved = resolveTurkishCityOrDistrict(finalCity);
      if (resolved.cityName) {
        finalCity = resolved.cityName;
      }
    }

    setSubmitting(true);

    const payload: CreateVisitInput = {
      countryCode: countryCode.toUpperCase(),
      countryName,
      cityName: finalCity,
      districtName: districtName.trim() || null,
      latitude,
      longitude,
      dateType,
      startDate: dateType === "exact" ? startDate : null,
      endDate: dateType === "exact" ? endDate : null,
      visitYear: dateType === "month_year" ? Number(visitYear) : null,
      visitMonth: dateType === "month_year" ? Number(visitMonth) : null,
      stayDurationDays: dateType === "timeless" ? 0 : Number(stayDurationDays),
      count: dateType === "timeless" && !isEditing ? visitCount : 1,
      visitType,
      visibility,
      notes: notes.trim() || null,
    };

    let res;
    if (isEditing && editingVisit) {
      res = await updateVisit(editingVisit.id, payload);
    } else {
      res = await createVisit(payload);
    }

    if (res.success) {
      const returnedVisits = res.visits && res.visits.length > 0 ? res.visits : res.visit ? [res.visit] : [];
      if (isEditing) {
        toast.success(`${finalCity} seyahati başarıyla güncellendi! ✏️`);
      } else if (dateType === "timeless" && visitCount > 1) {
        toast.success(`${finalCity} için ${visitCount} bayrak haritaya başarıyla eklendi! 🚩`);
      } else {
        toast.success(`${finalCity} ziyareti haritaya bayrak olarak eklendi! 🚩`);
      }
      if (returnedVisits.length > 0) {
        onSuccess(returnedVisits);
      }
      onClose();
    } else {
      setErrorMessage(res.message || "Bir hata oluştu. Bilgileri kontrol ediniz.");
    }
    setSubmitting(false);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Üst Başlık Barı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCountryFlagEmoji(countryCode)}</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEditing ? "Seyahati Düzenle" : "Haritaya Bayrak Ekle"}</span>
                {loadingGeocode && <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? "Seyahat detaylarınızı ve anılarınızı güncelleyin"
                  : "Gittiğiniz şehri ve seyahat detaylarını kaydedin"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Alanı (Kaydırılabilir İçerik) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Konum: Ülke, Şehir ve İlçe (3'lü Yapı) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Ülke Alanı */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ülke
              </label>
              <input
                type="text"
                required
                value={countryName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCountryName(val);
                  if (val.toLowerCase().includes("türk") || val.toLowerCase() === "tr") {
                    setCountryCode("TR");
                  }
                }}
                placeholder="Örn: Türkiye..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            {/* Şehir Alanı (Arama Destekli Akıllı Combobox) */}
            <div className="relative" ref={cityDropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Şehir (İl)</span>
                {countryCode === "TR" && (
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">
                    81 İl & İlçeler
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={cityName}
                  onFocus={() => setIsCityDropdownOpen(true)}
                  onChange={(e) => {
                    setCityName(e.target.value);
                    setIsCityDropdownOpen(true);
                  }}
                  onBlur={handleCityBlur}
                  placeholder={countryCode === "TR" ? "Şehir ara (Örn: Muğla)..." : "Şehir adı"}
                  className="w-full px-3 py-2.5 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsCityDropdownOpen((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Açılır Arama Listesi (Dropdown) */}
              {isCityDropdownOpen && countryCode === "TR" && turkeyFilteredItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider sticky top-0">
                    Önerilen Şehirler & İlçeler
                  </div>
                  {turkeyFilteredItems.map((item, idx) => (
                    <button
                      key={`${item.cityName}-${item.districtName || ""}-${idx}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCityItem(item);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-cyan-50 dark:hover:bg-cyan-950/50 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {item.type === "province" ? (
                          <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.type === "district" ? item.districtName : item.cityName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                            ({item.badge})
                          </span>
                        </div>
                      </div>

                      {item.cityName === cityName && !item.districtName && (
                        <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* İlçe Alanı (Opsiyonel / Boş Geçilebilir) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>İlçe</span>
                <span className="text-[10px] text-slate-400 font-normal">İsteğe Bağlı</span>
              </label>
              <input
                type="text"
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                placeholder="Örn: Bodrum, Kadıköy..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          </div>

          {/* İlçe Tespit Rozeti ve Notlara Ekleme Kısayolu */}
          {detectedDistrict && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/80 dark:border-cyan-800 text-xs text-cyan-800 dark:text-cyan-200 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>
                  Tespit edilen ilçe: <strong>{detectedDistrict}</strong> → Bağlı Şehir:{" "}
                  <strong>{cityName}</strong>
                </span>
              </div>
              {!notes.includes(detectedDistrict) && (
                <button
                  type="button"
                  onClick={() => {
                    const addStr = `${detectedDistrict} seyahati`;
                    setNotes((prev) => (prev ? `${prev} (${addStr})` : addStr));
                  }}
                  className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  + Notlara Ekle
                </button>
              )}
            </div>
          )}

          {/* Tarih Seçim Modu: Kesin Tarih vs Yıl/Ay vs Zamansız */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ziyaret Zamanı <span className="text-cyan-600 dark:text-cyan-400">*</span>
              </label>
              <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setDateType("exact")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    dateType === "exact"
                      ? "bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-sm font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Kesin Tarih
                </button>
                <button
                  type="button"
                  onClick={() => setDateType("month_year")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    dateType === "month_year"
                      ? "bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-sm font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Yıl ve Ay
                </button>
                <button
                  type="button"
                  onClick={() => setDateType("timeless")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    dateType === "timeless"
                      ? "bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Zamansız
                </button>
              </div>
            </div>

            {dateType === "exact" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Giriş / Başlangıç</span>
                  <input
                    type="date"
                    required={dateType === "exact"}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Çıkış / Bitiş</span>
                  <input
                    type="date"
                    required={dateType === "exact"}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
              </div>
            )}

            {dateType === "month_year" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Yıl</span>
                  <select
                    value={visitYear}
                    onChange={(e) => setVisitYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Ay</span>
                  <select
                    value={visitMonth}
                    onChange={(e) => setVisitMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {dateType === "timeless" && (
              <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800/80 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Ziyaret Adedi (Kaç Defa Gittiniz?)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tarih ve süre gerekmeden haritaya rozet olarak işlenir
                    </span>
                  </div>

                  {/* Sayaç [-] count [+] */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={visitCount <= 1}
                      onClick={() => setVisitCount((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      -
                    </button>
                    <div className="w-10 text-center font-extrabold text-base text-cyan-700 dark:text-cyan-300">
                      {visitCount}
                    </div>
                    <button
                      type="button"
                      disabled={visitCount >= 50}
                      onClick={() => setVisitCount((prev) => Math.min(50, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Hızlı Seçim Butonları */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mr-1">
                    Hızlı Seç:
                  </span>
                  {[1, 2, 3, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setVisitCount(num)}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        visitCount === num
                          ? "bg-cyan-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kalış Süresi & Ziyaret Türü */}
          <div className={dateType === "timeless" ? "block" : "grid grid-cols-2 gap-3"}>
            {dateType !== "timeless" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Kalış Süresi (Gün)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={stayDurationDays}
                  onChange={(e) => setStayDurationDays(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span>Ziyaret Türü</span>
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="touristic">🏖️ Turistik Gezi</option>
                <option value="business">💼 İş Ziyareti</option>
              </select>
            </div>
          </div>

          {/* Paylaşım ve Gizlilik */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-500" />
              <span>Görünürlük & Paylaşım</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", label: "Herkese Açık", icon: "🌐" },
                { id: "friends", label: "Arkadaşlarım", icon: "👥" },
                { id: "family", label: "Ailem", icon: "👨‍👩‍👦" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVisibility(item.id as any)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    visibility === item.id
                      ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 font-bold shadow-sm"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notlar (Opsiyonel) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Geziden Hatıralar & Notlar (Opsiyonel)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Sagrada Familia ziyareti, harika tapas lezzetleri..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
            />
          </div>

          {/* Alt Butonlar */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/20 disabled:opacity-60 flex items-center gap-2 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEditing ? "Güncelleniyor..." : "Kaydediliyor..."}</span>
                </>
              ) : (
                <>
                  {isEditing ? <Pencil className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>
                    {isEditing
                      ? "Değişiklikleri Kaydet"
                      : dateType === "timeless" && visitCount > 1
                      ? `📍 ${visitCount} Bayrağı Haritaya Ekle`
                      : "Bayrağı Haritaya Ekle"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
