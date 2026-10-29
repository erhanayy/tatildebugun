"use client";

import { useState, useMemo, useEffect } from "react";
import type { Visit } from "@/lib/db/schema";
import { createTrip, updateTrip, type CreateTripInput, type TripWithStops } from "@/lib/actions/trips";
import { getUserBaseLocation } from "@/lib/actions/user";
import {
  resolveLocationCoordinates,
  findCountryByNameOrCode,
} from "@/lib/world-cities";
import { CountryAutocomplete, CityAutocomplete } from "./location-autocomplete";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Navigation,
  Plane,
  Car,
  Train,
  Bus,
  Motorbike,
  Bike,
  CheckCircle2,
  Clock,
  Moon,
} from "lucide-react";
import { toast } from "sonner";

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingVisits?: Visit[];
  onTripCreated: (trip: TripWithStops) => void;
  initialTrip?: TripWithStops | null;
  onTripUpdated?: (trip: TripWithStops) => void;
}

export type TransportTypeId = "flight" | "car" | "train" | "bus" | "motorbike" | "bicycle";

interface IntermediateStop {
  id: string;
  countryCode: string;
  countryName: string;
  cityName: string;
  transportType: TransportTypeId;
  nights: number;
}

const TRANSPORT_OPTIONS = [
  { id: "flight", label: "Uçak", icon: Plane },
  { id: "car", label: "Araba", icon: Car },
  { id: "train", label: "Tren", icon: Train },
  { id: "bus", label: "Otobüs", icon: Bus },
  { id: "motorbike", label: "Motosiklet", icon: Motorbike },
  { id: "bicycle", label: "Bisiklet", icon: Bike },
] as const;

export function CreateTripModal({
  isOpen,
  onClose,
  onTripCreated,
  initialTrip,
  onTripUpdated,
}: CreateTripModalProps) {
  // Rota Temel Bilgileri
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"planned" | "completed">("planned");
  const [visibility, setVisibility] = useState<"public" | "friends" | "family">("public");

  // Başlangıç Tarihi (Varsayılan bugün)
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);
  const [startDate, setStartDate] = useState(defaultStartDate);

  // 1. Satır: Başlangıç Noktası (Profilde varsa beslenir, yoksa veya istenirse serbestçe değiştirilebilir)
  const [origin, setOrigin] = useState({
    countryCode: "TR",
    countryName: "Türkiye",
    cityName: "",
  });

  // 2, 3, 4. Satırlar: Hazır 3 Ara Durak (Tamamen boş başlar, kullanıcı dilediğini seçer)
  const [stops, setStops] = useState<IntermediateStop[]>([
    {
      id: "stop-1",
      countryCode: "",
      countryName: "",
      cityName: "",
      transportType: "flight",
      nights: 2,
    },
    {
      id: "stop-2",
      countryCode: "",
      countryName: "",
      cityName: "",
      transportType: "flight",
      nights: 2,
    },
    {
      id: "stop-3",
      countryCode: "",
      countryName: "",
      cityName: "",
      transportType: "train",
      nights: 2,
    },
  ]);

  // Son Satır: Dönüş Noktası (Profilde varsa beslenir, yoksa veya istenirse serbestçe değiştirilebilir)
  const [destination, setDestination] = useState<{
    countryCode: string;
    countryName: string;
    cityName: string;
    transportType: TransportTypeId;
  }>({
    countryCode: "TR",
    countryName: "Türkiye",
    cityName: "",
    transportType: "flight",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formu Düzenleme (initialTrip) veya Yeni Rota Moduna Göre Başlat
  useEffect(() => {
    if (!isOpen) return;

    if (initialTrip) {
      setTitle(initialTrip.title || "");
      setDescription(initialTrip.description || "");
      setStatus(initialTrip.status as "planned" | "completed");
      setVisibility(initialTrip.visibility as "public" | "friends" | "family");
      if (initialTrip.startDate) {
        setStartDate(new Date(initialTrip.startDate).toISOString().split("T")[0]);
      }

      const sorted = [...(initialTrip.stops || [])].sort((a, b) => a.stopOrder - b.stopOrder);
      if (sorted.length >= 2) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const middle = sorted.slice(1, -1);

        const originC = findCountryByNameOrCode(first.countryCode);
        setOrigin({
          countryCode: first.countryCode,
          countryName: originC ? originC.name : first.countryCode,
          cityName: first.cityName,
        });

        const destC = findCountryByNameOrCode(last.countryCode);
        setDestination({
          countryCode: last.countryCode,
          countryName: destC ? destC.name : last.countryCode,
          cityName: last.cityName,
          transportType: (last.transportType as TransportTypeId) || "flight",
        });

        if (middle.length > 0) {
          setStops(
            middle.map((s, idx) => {
              const sCountry = findCountryByNameOrCode(s.countryCode);
              let nights = 2;
              if (s.arrivalDate && s.departureDate) {
                const diff = Math.round(
                  (new Date(s.departureDate).getTime() - new Date(s.arrivalDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                nights = Math.max(1, diff);
              }
              return {
                id: s.id || `stop-${idx}`,
                countryCode: s.countryCode,
                countryName: sCountry ? sCountry.name : s.countryCode,
                cityName: s.cityName,
                transportType: (s.transportType as TransportTypeId) || "flight",
                nights,
              };
            })
          );
        }
      }
    } else {
      // Yeni Rota Oluşturma Modu
      setTitle("");
      setDescription("");
      setStatus("planned");
      setVisibility("public");
      setStartDate(defaultStartDate);
      setStops([
        {
          id: "stop-1",
          countryCode: "",
          countryName: "",
          cityName: "",
          transportType: "flight",
          nights: 2,
        },
        {
          id: "stop-2",
          countryCode: "",
          countryName: "",
          cityName: "",
          transportType: "flight",
          nights: 2,
        },
        {
          id: "stop-3",
          countryCode: "",
          countryName: "",
          cityName: "",
          transportType: "train",
          nights: 2,
        },
      ]);
      setDestination({
        countryCode: "TR",
        countryName: "Türkiye",
        cityName: "",
        transportType: "flight",
      });

      // Profildeki Ana Şehir (Base City) bilgisini çek ve varsa ata
      getUserBaseLocation().then((loc) => {
        if (loc && loc.baseCity) {
          const cCode = loc.baseCountry || "TR";
          const matchedCountry = findCountryByNameOrCode(cCode);
          const cName = matchedCountry ? matchedCountry.name : (cCode === "TR" ? "Türkiye" : cCode);
          setOrigin({
            countryCode: cCode,
            countryName: cName,
            cityName: loc.baseCity,
          });
          setDestination((prev) => ({
            ...prev,
            countryCode: cCode,
            countryName: cName,
            cityName: loc.baseCity,
          }));
        } else {
          setOrigin({
            countryCode: "TR",
            countryName: "Türkiye",
            cityName: "",
          });
          setDestination((prev) => ({
            ...prev,
            countryCode: "TR",
            countryName: "Türkiye",
            cityName: "",
          }));
        }
      });
    }
  }, [isOpen, initialTrip, defaultStartDate]);

  // Toplam Gece Sayısı ve Bitiş Tarihi Otomatik Hesaplama (Canlı Dinamik Toplam)
  const totalNights = useMemo(() => {
    return stops.reduce((sum, s) => sum + (s.nights || 1), 0);
  }, [stops]);

  // Canlı Zincirleme Durak Tarihleri
  const calculatedTimeline = useMemo(() => {
    const baseDate = startDate ? new Date(startDate) : new Date();
    let current = new Date(baseDate);

    const stopRanges = stops.map((s) => {
      const arrival = new Date(current);
      const departure = new Date(current);
      departure.setDate(departure.getDate() + (s.nights || 1));
      current = departure; // bir sonraki durağın başlangıcı bu durağın çıkışıdır

      return {
        arrivalDateIso: arrival.toISOString(),
        departureDateIso: departure.toISOString(),
        arrivalFormatted: arrival.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        departureFormatted: departure.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      };
    });

    const finalReturnDate = new Date(current);

    return {
      stopRanges,
      endDateIso: finalReturnDate.toISOString(),
      endDateFormatted: finalReturnDate.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      startDateFormatted: baseDate.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }, [startDate, stops]);

  if (!isOpen) return null;

  // Durak Sırasını Değiştir (Yalnızca ara duraklar kendi arasında yer değiştirebilir)
  function moveStop(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stops.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;
    setStops(newStops);
  }

  // Durak Sil (En az 1 ara durak kalmalıdır)
  function removeStop(id: string) {
    if (stops.length <= 1) {
      toast.error("Rotada en az 1 ara durak bulunmalıdır.");
      return;
    }
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  // Yeni Ara Durak Ekle
  function handleAddStop() {
    const lastStop = stops[stops.length - 1];
    const newStop: IntermediateStop = {
      id: "stop-" + Math.random().toString(36).substring(2, 9),
      countryCode: lastStop ? lastStop.countryCode : "",
      countryName: lastStop ? lastStop.countryName : "",
      cityName: "",
      transportType: "flight",
      nights: 2,
    };
    setStops((prev) => [...prev, newStop]);
  }

  // Gece Sayısını Değiştir (+ / -) -> Anında toplamı ve dönüş tarihini günceller
  function handleNightChange(index: number, delta: number) {
    setStops((prev) => {
      const next = [...prev];
      const cur = next[index].nights || 1;
      next[index].nights = Math.max(1, cur + delta);
      return next;
    });
  }

  // Durak Bilgisini Güncelle
  function updateStop(index: number, field: keyof IntermediateStop, val: any) {
    setStops((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  }

  // Formu Gönder ve Kaydet
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Lütfen bir rota adı giriniz.");
      return;
    }

    if (!origin.cityName.trim()) {
      toast.error("Lütfen seyahat başlangıç noktasının şehrini giriniz.");
      return;
    }

    if (!destination.cityName.trim()) {
      toast.error("Lütfen seyahat dönüş noktasının şehrini giriniz.");
      return;
    }

    // Boş ara durak kontrolü
    for (let i = 0; i < stops.length; i++) {
      if (!stops[i].cityName.trim()) {
        toast.error(`Lütfen ${i + 1}. durak için bir şehir giriniz.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const originCountry = origin.countryCode || findCountryByNameOrCode(origin.countryName)?.code || "TR";
      const destCountry = destination.countryCode || findCountryByNameOrCode(destination.countryName)?.code || "TR";

      const resolvedOrigin = resolveLocationCoordinates(originCountry, origin.cityName);
      const resolvedDestination = resolveLocationCoordinates(
        destCountry,
        destination.cityName
      );

      const payloadStops: any[] = [];

      // 1. Başlangıç Noktası (Stop Order: 0)
      payloadStops.push({
        cityName: resolvedOrigin.cityName,
        countryCode: resolvedOrigin.countryCode,
        latitude: resolvedOrigin.latitude,
        longitude: resolvedOrigin.longitude,
        stopOrder: 0,
        stopType: "origin",
        transportType: null,
        arrivalDate: new Date(startDate).toISOString(),
        departureDate: new Date(startDate).toISOString(),
        nights: 0,
        notes: "Başlangıç Noktası",
      });

      // 2. Ara Duraklar
      stops.forEach((s, idx) => {
        const cCode = s.countryCode || findCountryByNameOrCode(s.countryName)?.code || "TR";
        const resolved = resolveLocationCoordinates(cCode, s.cityName);
        const timeline = calculatedTimeline.stopRanges[idx];

        payloadStops.push({
          cityName: resolved.cityName,
          countryCode: resolved.countryCode,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          stopOrder: idx + 1,
          stopType: "stop",
          transportType: s.transportType,
          arrivalDate: timeline.arrivalDateIso,
          departureDate: timeline.departureDateIso,
          nights: s.nights,
          notes: `${idx + 1}. Durak (${s.nights} Gece)`,
        });
      });

      // 3. Dönüş Noktası (Stop Order: stops.length + 1)
      payloadStops.push({
        cityName: resolvedDestination.cityName,
        countryCode: resolvedDestination.countryCode,
        latitude: resolvedDestination.latitude,
        longitude: resolvedDestination.longitude,
        stopOrder: stops.length + 1,
        stopType: "return",
        transportType: destination.transportType || "flight",
        arrivalDate: calculatedTimeline.endDateIso,
        departureDate: calculatedTimeline.endDateIso,
        nights: 0,
        notes: "Dönüş Noktası",
      });

      const input: CreateTripInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        transportType: "mixed",
        visibility,
        startDate: new Date(startDate).toISOString(),
        endDate: calculatedTimeline.endDateIso,
        stops: payloadStops,
      };

      if (initialTrip) {
        const res = await updateTrip(initialTrip.id, input);
        if (res.success && res.trip) {
          toast.success("Rota başarıyla güncellendi! 🚀");
          if (onTripUpdated) onTripUpdated(res.trip);
          onClose();
        } else {
          toast.error(res.message || "Rota güncellenemedi.");
        }
      } else {
        const res = await createTrip(input);
        if (res.success && res.trip) {
          toast.success("Rota başarıyla oluşturuldu! 🚀");
          onTripCreated(res.trip);
          onClose();
        } else {
          toast.error(res.message || "Rota oluşturulamadı.");
        }
      }
    } catch (error) {
      console.error("Rota kaydedilirken hata:", error);
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Üst Başlık Barı */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center shadow-sm">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{initialTrip ? "Rotayı Düzenle" : "Yeni Rota Oluştur"}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20">
                  {stops.length + 2} Nokta
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Şehirleri ve durakları birbirine bağlayan seyahat rotası
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Alanı (Düzgün Scroll ve Boşluklu) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Rota Adı ve Durum */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Rota Adı *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Klasik Avrupa Turu, Ege Kıyıları Kaçamağı"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Seyahat Durumu
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStatus("planned")}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    status === "planned"
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Planlanan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("completed")}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    status === "completed"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Geçmiş</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Seyahat Başlangıç Tarihi ve Otomatik Canlı Zaman Çizelgesi */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/25">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-cyan-900 dark:text-cyan-300 uppercase tracking-wider mb-1">
                    Seyahat Başlangıç Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-cyan-500/30 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
                  />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 self-end mb-1">
                  (Çıkış Günü)
                </div>
              </div>

              {/* Canlı Hesaplanan Dinamik Toplam Rozeti */}
              <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 px-3.5 py-2 rounded-xl border border-cyan-500/30 shadow-sm text-xs">
                <Moon className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
                <div className="leading-tight">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    Toplam {totalNights} Gece
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 mx-1.5">•</span>
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Dönüş: <strong className="text-cyan-600 dark:text-cyan-400">{calculatedTimeline.endDateFormatted}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. YAPILANDIRILMIŞ ROTA IZGARASI (BAŞLANGIÇ - ARA DURAKLAR - DÖNÜŞ) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Seyahat Güzergahı ve Duraklar ({stops.length + 2} Nokta)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Başlangıç, ara duraklar ve dönüş noktalarını belirleyiniz. Ara durakları taşıyabilir veya gece sayılarını ayarlayabilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddStop}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Durak Ekle</span>
              </button>
            </div>

            {/* IZGARA TABLOSU */}
            <div className="space-y-2">
              {/* --- SATIR 0: BAŞLANGIÇ NOKTASI --- */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
                <div className="flex items-center gap-2 sm:w-1/4">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    🛫
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Başlangıç Noktası
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Tarih: {calculatedTimeline.startDateFormatted}
                    </div>
                  </div>
                </div>

                {/* Ülke ve Şehir Autocomplete */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                  <CountryAutocomplete
                    countryCode={origin.countryCode}
                    countryName={origin.countryName}
                    placeholder="Çıkış Ülkesi..."
                    onChange={(c) =>
                      setOrigin((prev) => ({ ...prev, countryCode: c.code, countryName: c.name }))
                    }
                  />

                  <CityAutocomplete
                    countryCode={origin.countryCode}
                    cityName={origin.cityName}
                    placeholder="Çıkış Şehri..."
                    onChange={(cityName) =>
                      setOrigin((prev) => ({ ...prev, cityName }))
                    }
                  />
                </div>
              </div>

              {/* --- ARA DURAKLAR (1..N) (DİNAMİK, ŞEHİRLER BOŞ GELİR) --- */}
              {stops.map((stop, index) => {
                const timeline = calculatedTimeline.stopRanges[index];
                return (
                  <div
                    key={stop.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex flex-col gap-2 transition-all shadow-sm hover:border-cyan-500/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Sıra & Durak Adı (Sol Kolon - Sabit Genişlik) */}
                      <div className="flex items-center gap-2 sm:w-[190px] shrink-0">
                        <div className="w-6 h-6 rounded-xl bg-cyan-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {index + 1}. Durak
                          </div>
                          {timeline && (
                            <div className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 truncate">
                              📅 {timeline.arrivalFormatted} - {timeline.departureFormatted}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ulaşım Aracı Seçici (Orta Kolon - Tam Ortalanmış, İkon-Only) */}
                      <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          {TRANSPORT_OPTIONS.map((t) => {
                            const Icon = t.icon;
                            const isSelected = stop.transportType === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => updateStop(index, "transportType", t.id)}
                                title={t.label}
                                className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-cyan-500 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sağ Kolon - Gece Sayısı ve Taşı/Sil Butonları (Sabit Genişlik, Sağa Hizalı) */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:w-[190px] shrink-0">
                        {/* Gece Sayısı Girişi */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleNightChange(index, -1)}
                            disabled={stop.nights <= 1}
                            className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-900 dark:text-white min-w-12 text-center">
                            {stop.nights} Gece
                          </span>
                          <button
                            type="button"
                            onClick={() => handleNightChange(index, 1)}
                            className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                          >
                            +
                          </button>
                        </div>

                        {/* Sıralama ve Silme Kontrolleri */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveStop(index, "up")}
                            title="Yukarı Taşı"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 disabled:opacity-20 cursor-pointer transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === stops.length - 1}
                            onClick={() => moveStop(index, "down")}
                            title="Aşağı Taşı"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 disabled:opacity-20 cursor-pointer transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStop(stop.id)}
                            disabled={stops.length <= 1}
                            title="Durağı Sil"
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-20 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Ülke ve Şehir Autocomplete Çubuğu */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <CountryAutocomplete
                        countryCode={stop.countryCode}
                        countryName={stop.countryName}
                        placeholder="Durak Ülkesi yazınız..."
                        onChange={(c) => {
                          updateStop(index, "countryCode", c.code);
                          updateStop(index, "countryName", c.name);
                        }}
                      />

                      <CityAutocomplete
                        countryCode={stop.countryCode}
                        cityName={stop.cityName}
                        placeholder="Durak Şehri yazınız veya seçiniz..."
                        onChange={(city) => updateStop(index, "cityName", city)}
                      />
                    </div>
                  </div>
                );
              })}

              {/* --- SATIR SON: DÖNÜŞ NOKTASI --- */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-500/30 flex flex-col gap-2 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Sıra & Durak Adı (Sol Kolon - Sabit Genişlik) */}
                  <div className="flex items-center gap-2 sm:w-[190px] shrink-0">
                    <div className="w-7 h-7 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      🛬
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 truncate">
                        Dönüş Noktası
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Varış: {calculatedTimeline.endDateFormatted}
                      </div>
                    </div>
                  </div>

                  {/* Dönüş Ulaşım Aracı Seçici (Orta Kolon - Tam Ortalanmış, Üsttekilerle Birebir Aynı Hizada) */}
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-sm">
                      {TRANSPORT_OPTIONS.map((t) => {
                        const Icon = t.icon;
                        const isSelected = destination.transportType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              setDestination((prev) => ({ ...prev, transportType: t.id }))
                            }
                            title={`Dönüş Aracı: ${t.label}`}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sağ Kolon - Rozet ile Dengeleme (Sabit Genişlik: sm:w-[190px], Sağa Hizalı) */}
                  <div className="hidden sm:flex sm:w-[190px] shrink-0 items-center justify-end">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-900/50 px-2.5 py-1 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Varış Noktası</span>
                    </span>
                  </div>
                </div>

                {/* Ülke ve Şehir Autocomplete */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-indigo-200/60 dark:border-indigo-800/40">
                  <CountryAutocomplete
                    countryCode={destination.countryCode}
                    countryName={destination.countryName}
                    placeholder="Dönüş Ülkesi..."
                    onChange={(c) =>
                      setDestination((prev) => ({ ...prev, countryCode: c.code, countryName: c.name }))
                    }
                  />

                  <CityAutocomplete
                    countryCode={destination.countryCode}
                    cityName={destination.cityName}
                    placeholder="Dönüş Şehri..."
                    onChange={(cityName) =>
                      setDestination((prev) => ({ ...prev, cityName }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Açıklama (Opsiyonel) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Rota Açıklaması veya Gezgin Notları (Opsiyonel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Gezilecek yerler, tren saatleri veya hatırlatıcı notlarınız..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting
                ? "Kaydediliyor..."
                : initialTrip
                ? "Değişiklikleri Kaydet 🚀"
                : "Rotayı Kaydet 🚀"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
