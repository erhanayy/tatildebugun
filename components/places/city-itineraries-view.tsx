"use client";

import { useState, useEffect } from "react";
import {
  getCityDailyItineraries,
  type CityItineraryItem,
  type ItineraryStopItem,
} from "@/lib/actions/itineraries";
import {
  Footprints,
  Compass,
  Clock,
  MapPin,
  Sparkles,
  Maximize2,
  X,
  Loader2,
  ArrowRight,
  Landmark,
  Coffee,
  ShoppingBag,
  Trees,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface CityItinerariesViewProps {
  cityName: string;
  countryCode: string;
  tripId: string;
  visitedPlaceIds?: Set<string>;
  onToggleVisit?: (placeId: string) => void;
}

export function CityItinerariesView({
  cityName,
  countryCode,
  tripId,
  visitedPlaceIds = new Set(),
  onToggleVisit,
}: CityItinerariesViewProps) {
  const [loading, setLoading] = useState(true);
  const [itineraries, setItineraries] = useState<CityItineraryItem[]>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getCityDailyItineraries(cityName, countryCode);
        if (res.success && res.itineraries.length > 0) {
          setItineraries(res.itineraries);
          setSelectedDayNumber(1);
        }
      } catch (err) {
        console.error(err);
        toast.error("Rotalar yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cityName, countryCode]);

  const activeItinerary = itineraries.find((it) => it.dayNumber === selectedDayNumber);

  // Aktif günün tamamlanma yüzdesi
  const totalStops = activeItinerary?.stops.length || 0;
  const completedStops =
    activeItinerary?.stops.filter((s) => s.placeId && visitedPlaceIds.has(s.placeId)).length || 0;
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  function getCategoryIcon(category?: string) {
    switch (category) {
      case "museum":
        return <Landmark className="w-3.5 h-3.5 text-blue-400" />;
      case "historic":
        return <Landmark className="w-3.5 h-3.5 text-amber-400" />;
      case "cafe":
        return <Coffee className="w-3.5 h-3.5 text-orange-400" />;
      case "shop":
        return <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />;
      case "nature":
        return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-cyan-400" />;
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-2xl border border-slate-800">
        <Loader2 className="w-7 h-7 text-cyan-400 animate-spin mb-2" />
        <p className="text-xs text-slate-400">
          {cityName} için optimize yürüyüş rotaları hazırlanıyor...
        </p>
      </div>
    );
  }

  if (itineraries.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
        Bu şehir için henüz hazırlanmış bir rota bulunmuyor.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Gün Seçici Sekmeler (Mobil-First: flex-wrap, sıfır yatay kaydırma) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80">
        {itineraries.map((it) => {
          const isActive = it.dayNumber === selectedDayNumber;
          return (
            <button
              key={it.dayNumber}
              type="button"
              onClick={() => setSelectedDayNumber(it.dayNumber)}
              className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                isActive
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/30 scale-[1.02]"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <div className="truncate">{it.dayNumber}. Gün</div>
              <div
                className={`text-[10px] font-normal truncate mt-0.5 ${
                  isActive ? "text-cyan-100" : "text-slate-500"
                }`}
              >
                ~{it.estimatedSteps.toLocaleString("tr-TR")} adım
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Aktif Gün Detay Kartı */}
      {activeItinerary && (
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-xl flex flex-col gap-4">
          {/* Başlık ve Tema */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[10px] font-semibold mb-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{activeItinerary.theme || `${cityName} Yürüyüşü`}</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {activeItinerary.dayNumber}. Gün: {activeItinerary.title}
              </h3>
            </div>

            {/* İlerleme Rozeti */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Tamamlanan</div>
                <div className="text-xs font-bold text-emerald-400">
                  {completedStops} / {totalStops} Durak
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-slate-700 flex items-center justify-center text-[10px] font-extrabold text-cyan-300">
                %{progressPercent}
              </div>
            </div>
          </div>

          {/* Açıklama */}
          {activeItinerary.description && (
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeItinerary.description}
            </p>
          )}

          {/* Rota Metrikleri Şeridi (Adım, Mesafe, Süre) */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Footprints className="w-3 h-3 text-cyan-400" /> Adım
              </span>
              <span className="text-xs sm:text-sm font-black text-cyan-200 mt-0.5">
                ~{activeItinerary.estimatedSteps.toLocaleString("tr-TR")}
              </span>
            </div>

            <div className="flex flex-col items-center border-x border-slate-800/80">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Compass className="w-3 h-3 text-blue-400" /> Mesafe
              </span>
              <span className="text-xs sm:text-sm font-black text-blue-200 mt-0.5">
                {(activeItinerary.totalDistanceMeters / 1000).toFixed(1)} km
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Süre
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-200 mt-0.5">
                ~{Math.round(activeItinerary.estimatedDurationMinutes / 60)} Saat
              </span>
            </div>
          </div>

          {/* 3. Sıralı Duraklar Akışı (Vertical Flow / Dikey Bağlantılı Hat) */}
          <div className="flex flex-col gap-3 mt-1">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>🚶‍♂️ Sıralı Yürüyüş Durakları:</span>
            </div>

            <div className="relative pl-6 sm:pl-8 flex flex-col gap-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-blue-500 before:to-emerald-500">
              {activeItinerary.stops.map((stop, idx) => {
                const isVisited = stop.placeId ? visitedPlaceIds.has(stop.placeId) : false;

                return (
                  <div
                    key={idx}
                    className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                  >
                    {/* Sıra Numarası / Ziyaret Rozeti (Tıklanabilir) */}
                    <button
                      type="button"
                      disabled={!stop.placeId || !onToggleVisit}
                      onClick={() => {
                        if (stop.placeId && onToggleVisit) {
                          onToggleVisit(stop.placeId);
                        }
                      }}
                      className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shadow-md transition-transform active:scale-90 ${
                        isVisited
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-950 hover:bg-emerald-400"
                          : "bg-cyan-600 text-white ring-4 ring-slate-950 hover:bg-cyan-500"
                      } ${stop.placeId && onToggleVisit ? "cursor-pointer" : "cursor-default"}`}
                      title={
                        stop.placeId && onToggleVisit
                          ? isVisited
                            ? "Ziyareti kaldır"
                            : "Ziyaret edildi olarak işaretle"
                          : undefined
                      }
                    >
                      {isVisited ? <CheckCircle2 className="w-3.5 h-3.5" /> : stop.orderIndex}
                    </button>

                    {/* Sol: Görsel + İsim + Detay */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Küçük Resim (Thumbnail) */}
                      {stop.imageUrl ? (
                        <div
                          onClick={() =>
                            setPreviewImage({ url: stop.imageUrl!, title: stop.name })
                          }
                          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 shadow-md group/img cursor-zoom-in"
                          title="Görseli büyüt"
                        >
                          <img
                            src={stop.imageUrl}
                            alt={stop.name}
                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-3 h-3 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          {getCategoryIcon(stop.category)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            className={`text-xs font-bold leading-tight ${
                              isVisited ? "text-emerald-200 line-through opacity-80" : "text-white"
                            }`}
                          >
                            {stop.name}
                          </h4>
                          {isVisited && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold">
                              Ziyaret Edildi
                            </span>
                          )}
                        </div>

                        {stop.walkingTip && (
                          <p className="text-[11px] text-cyan-300/80 mt-1 flex items-start gap-1">
                            <span className="shrink-0">💡</span>
                            <span>{stop.walkingTip}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sağ: Süre + Ziyaret Butonu */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                      {stop.estimatedMinutes && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800/80 text-[10px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>~{stop.estimatedMinutes} dk</span>
                        </div>
                      )}

                      {stop.placeId && onToggleVisit && (
                        <button
                          type="button"
                          onClick={() => onToggleVisit(stop.placeId!)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer min-h-[36px] ${
                            isVisited
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              isVisited ? "text-emerald-400" : "text-slate-500"
                            }`}
                          />
                          <span>{isVisited ? "Görüldü" : "Tik At"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Görsel Büyütme Modalı (Lightbox) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-5 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-slate-950 border border-slate-800/80">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-slate-100 text-center">{previewImage.title}</h4>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>📷 Kaynak: Wikimedia Commons</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
