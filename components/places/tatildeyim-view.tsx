"use client";

import { useState } from "react";
import Link from "next/link";
import { type Trip, type TripStop } from "@/lib/db/schema";
import { CityPlacesAccordion } from "@/components/places/city-places-accordion";
import { getCountryFlagEmoji } from "@/lib/country-flags";
import {
  Luggage,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Compass,
  Plane,
  Car,
  Train,
  Bus,
  Sparkles,
  Clock,
  Star,
  CheckCircle2,
  Share2,
  Plus,
  ArrowRight,
} from "lucide-react";

interface TatildeyimViewProps {
  userTrips: Trip[];
  activeTrip: Trip | null;
  stops: TripStop[];
  timeline: Array<{
    placeId: string;
    stopId: string | null;
    visitedAt: Date;
    userRating: number | null;
    cityName: string;
    placeName: string;
    category: string;
  }>;
}

export function TatildeyimView({
  userTrips,
  activeTrip,
  stops,
  timeline,
}: TatildeyimViewProps) {
  // Seçili tur ID'si (varsayılan aktif tur)
  const [selectedTripId, setSelectedTripId] = useState<string>(
    activeTrip?.id || (userTrips[0]?.id || "")
  );

  // Açık olan akordeon durakları (birden fazlası açık kalabilir)
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>(() => {
    // İlk 2 durağı varsayılan olarak açık aç
    const initial: Record<string, boolean> = {};
    stops.slice(0, 2).forEach((s) => {
      initial[s.id] = true;
    });
    return initial;
  });

  // Zaman tüneli görünümünü aç/kapat
  const [showTimeline, setShowTimeline] = useState(false);

  function toggleStopAccordion(stopId: string) {
    setExpandedStops((prev) => ({
      ...prev,
      [stopId]: !prev[stopId],
    }));
  }

  function getTransportIcon(type?: string | null) {
    switch (type) {
      case "flight":
        return <Plane className="w-3.5 h-3.5" />;
      case "car":
        return <Car className="w-3.5 h-3.5" />;
      case "train":
        return <Train className="w-3.5 h-3.5" />;
      case "bus":
        return <Bus className="w-3.5 h-3.5" />;
      default:
        return <Compass className="w-3.5 h-3.5" />;
    }
  }

  // Eğer kullanıcının hiç turu yoksa
  if (!activeTrip && userTrips.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-2xl shadow-cyan-500/30">
          <Luggage className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Henüz Planlanmış Bir Turunuz Yok 🌴
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Dünya haritanızdan ilk seyahat rotanızı oluşturun; tur zamanı geldiğinde bu ekranda
            gittiğiniz şehirlerdeki turistik yerleri tek tek tikleyip puanlayabilirsiniz!
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Haritaya Git ve Rota Oluştur</span>
          </Link>
        </div>
      </div>
    );
  }

  const currentTrip = userTrips.find((t) => t.id === selectedTripId) || activeTrip;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Üst Kokpit Başlığı & Tur Seçimi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 shrink-0">
            <Luggage className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
                CANLI TUR REHBERİ
              </span>
              <span className="text-xs text-slate-400">
                • {stops.length} Şehir Durağı
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              {currentTrip?.title || "Aktif Seyahat Turum"}
            </h1>

            {currentTrip?.description && (
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {currentTrip.description}
              </p>
            )}
          </div>
        </div>

        {/* Sağ Üst Aksiyonlar: Tur Seçici + Zaman Tüneli Aç */}
        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          {userTrips.length > 1 && (
            <select
              value={selectedTripId}
              onChange={(e) => {
                setSelectedTripId(e.target.value);
                window.location.href = `/tatildeyim?tripId=${e.target.value}`;
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {userTrips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setShowTimeline((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showTimeline
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                : "bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{showTimeline ? "Duraklara Dön" : `Zaman Tüneli (${timeline.length})`}</span>
          </button>
        </div>
      </div>

      {/* 2. Rota Şehir Akışı Şeridi (Visual Breadcrumbs) */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Rota Akışı:
        </span>
        {stops.map((stop, index) => (
          <div key={stop.id} className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-medium">
              <span>{getCountryFlagEmoji(stop.countryCode)}</span>
              <span>{stop.cityName}</span>
            </div>
            {index < stops.length - 1 && (
              <span className="text-slate-600 flex items-center gap-1">
                {getTransportIcon(stop.transportType)}
                <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 3. ZAMAN TÜNELİ GÖRÜNÜMÜ (Açıldıysa) */}
      {showTimeline ? (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Seyahat Zaman Tüneli & Gezi Günlüğü
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gittiğiniz yerler ve verdiğiniz puanlar kronolojik sırayla listelenir.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
              {timeline.length} Mekan Ziyareti
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Henüz bu turda tik atılmış bir mekan bulunmuyor. Aşağıdaki duraklardan turistik yerleri işaretleyebilirsiniz!
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-blue-500 before:to-slate-800">
              {timeline.map((event, idx) => {
                const date = new Date(event.visitedAt);
                const dateStr = date.toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const timeStr = date.toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={idx} className="relative group">
                    {/* Çizgi üzerindeki parıldayan nokta */}
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-slate-900 shadow-md shadow-cyan-500/50 group-hover:scale-125 transition-transform" />

                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">
                            {event.placeName}
                          </span>
                          <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-md border border-cyan-800/40">
                            {event.cityName}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                          <span>📅 {dateStr}</span>
                          <span>🕒 {timeStr}</span>
                        </div>
                      </div>

                      {event.userRating && (
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-xl text-amber-300 font-bold text-xs shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{event.userRating}.0</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 4. ŞEHİR DURAKLARI VE GENİŞLEYEN AKORDEONLAR */
        <div className="space-y-4">
          {stops.map((stop, idx) => {
            const isExpanded = !!expandedStops[stop.id];

            return (
              <div
                key={stop.id}
                className="bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl transition-all duration-200"
              >
                {/* Durak Başlık Kartı (Tıklanabilir Header) */}
                <div
                  onClick={() => toggleStopAccordion(stop.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  {/* Sol: Sıra No + Bayrak + Şehir Adı */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-300 shrink-0">
                      {idx + 1}
                    </div>

                    <div className="text-2xl shrink-0">
                      {getCountryFlagEmoji(stop.countryCode)}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                        {stop.cityName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="capitalize">{stop.stopType === "origin" ? "Başlangıç" : stop.stopType === "return" ? "Dönüş" : "Ara Durak"}</span>
                        {stop.notes && <span>• {stop.notes}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Sağ: İkonik Yerler Butonu + Chevron */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-cyan-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Turistik Yerler & Mekanlar</span>
                    </div>

                    <button
                      type="button"
                      className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                      aria-label="Akordeon aç/kapat"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Genişleyen Akordeon Alanı */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5">
                    <CityPlacesAccordion
                      cityName={stop.cityName}
                      countryCode={stop.countryCode}
                      tripId={currentTrip?.id || ""}
                      stopId={stop.id}
                      latitude={stop.latitude}
                      longitude={stop.longitude}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
