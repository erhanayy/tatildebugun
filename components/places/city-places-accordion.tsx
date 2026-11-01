"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import {
  getCityPlaces,
  togglePlaceVisit,
  updatePlaceVisit,
  setPlaceRating,
  createCustomPlace,
  type CityPlaceItem,
} from "@/lib/actions/places";
import {
  Search,
  CheckCircle2,
  Circle,
  Star,
  Plus,
  Clock,
  Edit3,
  Coffee,
  ShoppingBag,
  Landmark,
  Trees,
  Camera,
  Utensils,
  Sparkles,
  X,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface CityPlacesAccordionProps {
  cityName: string;
  countryCode: string;
  tripId: string;
  stopId?: string | null;
  latitude?: number;
  longitude?: number;
  onPlacesCountChange?: (total: number, visited: number) => void;
}

export function CityPlacesAccordion({
  cityName,
  countryCode,
  tripId,
  stopId,
  latitude,
  longitude,
  onPlacesCountChange,
}: CityPlacesAccordionProps) {
  const [places, setPlaces] = useState<CityPlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unvisited" | "visited">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // Saat/Tarih Düzenleme Modalı State
  const [editingVisit, setEditingVisit] = useState<{
    place: CityPlaceItem;
    dateStr: string;
    timeStr: string;
  } | null>(null);

  // Özel Mekan Ekleme Modalı State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<"cafe" | "shop" | "restaurant" | "historic" | "other">("cafe");
  const [customNotes, setCustomNotes] = useState("");
  const [customRating, setCustomRating] = useState<number>(5);

  // Hover edilen yıldız state'leri (Her kart için anlık canlı önizleme)
  const [hoveredRatings, setHoveredRatings] = useState<Record<string, number | null>>({});
  const [customRatingHover, setCustomRatingHover] = useState<number | null>(null);

  // Mekanları Yükle
  async function loadPlaces() {
    setLoading(true);
    try {
      const res = await getCityPlaces(cityName, countryCode, tripId, latitude, longitude);
      if (res.success && res.places) {
        setPlaces(res.places);
        const visitedCount = res.places.filter((p) => p.isVisited).length;
        onPlacesCountChange?.(res.places.length, visitedCount);
      }
    } catch (e) {
      console.error(e);
      toast.error("Mekanlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlaces();
  }, [cityName, countryCode, tripId]);

  // Tik at veya tiki kaldır
  function handleToggle(place: CityPlaceItem) {
    const nextVisited = !place.isVisited;
    const now = new Date();

    // İyimser UI güncellemesi (Varsayılan olarak 5 yıldız zorlamaz, kullanıcının seçimine bırakır)
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === place.id
          ? {
              ...p,
              isVisited: nextVisited,
              visitedAt: nextVisited ? now : null,
              userRating: nextVisited ? (p.userRating ?? null) : null,
            }
          : p
      )
    );

    startTransition(async () => {
      const res = await togglePlaceVisit({
        tripId,
        stopId,
        placeId: place.id,
        userRating: nextVisited ? (place.userRating ?? undefined) : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "İşlem başarısız oldu.");
        // Geri al
        loadPlaces();
      } else {
        if (res.action === "added") {
          toast.success(`${place.name} görüldü olarak kaydedildi! 🎯`);
          if (res.visitId) {
            setPlaces((prev) =>
              prev.map((p) =>
                p.id === place.id ? { ...p, visitId: res.visitId, isVisited: true } : p
              )
            );
          }
        } else {
          toast.info(`${place.name} ziyareti kaldırıldı.`);
          setPlaces((prev) =>
            prev.map((p) =>
              p.id === place.id ? { ...p, visitId: null, isVisited: false, userRating: null } : p
            )
          );
        }
      }
    });
  }

  // Yıldız puanı güncelle (Aynı yıldıza tekrar basarsa puanı kaldırır)
  function handleRatingChange(place: CityPlaceItem, rating: number) {
    const newRating = place.userRating === rating ? null : rating;

    // 1. Anında UI'ı güncelle (Yıldızlar anında sarı kalsın, gecikme olmasın)
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === place.id
          ? {
              ...p,
              userRating: newRating,
              isVisited: true,
              visitedAt: p.visitedAt || new Date(),
            }
          : p
      )
    );

    // 2. Tıklanan kartın hover state'ini anında temizle
    setHoveredRatings((prev) => ({ ...prev, [place.id]: null }));

    startTransition(async () => {
      const res = await setPlaceRating({
        tripId,
        placeId: place.id,
        stopId,
        userRating: newRating,
      });

      if (res.success) {
        if (newRating) {
          toast.success(`Puan kaydedildi: ${newRating} Yıldız ⭐`);
        } else {
          toast.info("Puan kaldırıldı.");
        }
        if (res.visitId) {
          setPlaces((prev) =>
            prev.map((p) =>
              p.id === place.id ? { ...p, visitId: res.visitId, isVisited: true } : p
            )
          );
        }
      } else {
        toast.error(res.error || "Puan kaydedilemedi");
        loadPlaces();
      }
    });
  }

  // Düzenleme modalını aç
  function openEditModal(place: CityPlaceItem) {
    const vDate = place.visitedAt ? new Date(place.visitedAt) : new Date();
    const yyyy = vDate.getFullYear();
    const mm = String(vDate.getMonth() + 1).padStart(2, "0");
    const dd = String(vDate.getDate()).padStart(2, "0");
    const hh = String(vDate.getHours()).padStart(2, "0");
    const min = String(vDate.getMinutes()).padStart(2, "0");

    setEditingVisit({
      place,
      dateStr: `${yyyy}-${mm}-${dd}`,
      timeStr: `${hh}:${min}`,
    });
  }

  // Tarih ve saati kaydet
  function handleSaveDateTime() {
    if (!editingVisit || !editingVisit.place.visitId) return;

    const [yyyy, mm, dd] = editingVisit.dateStr.split("-").map(Number);
    const [hh, min] = editingVisit.timeStr.split(":").map(Number);
    const updatedDate = new Date(yyyy, mm - 1, dd, hh, min);

    const placeId = editingVisit.place.id;
    const visitId = editingVisit.place.visitId;

    setPlaces((prev) =>
      prev.map((p) => (p.id === placeId ? { ...p, visitedAt: updatedDate } : p))
    );
    setEditingVisit(null);

    startTransition(async () => {
      const res = await updatePlaceVisit({
        visitId,
        visitedAt: updatedDate.toISOString(),
      });
      if (res.success) {
        toast.success("Ziyaret zamanı güncellendi! 🕒");
      } else {
        toast.error("Zaman güncellenemedi.");
      }
    });
  }

  // Özel mekan ekleme
  function handleCreateCustom() {
    if (!customName.trim()) {
      toast.error("Lütfen bir mekan adı giriniz.");
      return;
    }

    startTransition(async () => {
      const res = await createCustomPlace({
        tripId,
        stopId,
        cityName,
        countryCode,
        name: customName.trim(),
        category: customCategory,
        notes: customNotes.trim() || undefined,
        userRating: customRating,
      });

      if (res.success && res.place) {
        toast.success(`${customName} eklendi ve görüldü olarak kaydedildi! 🌟`);
        setPlaces((prev) => [res.place, ...prev]);
        setIsAddModalOpen(false);
        setCustomName("");
        setCustomNotes("");
        setCustomRating(5);
      } else {
        toast.error(res.error || "Özel mekan eklenemedi.");
      }
    });
  }

  // Filtreleme mantığı
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // 1. Arama filtresi
      if (searchTerm.trim().length >= 2) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = p.description?.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }

      // 2. Durum filtresi (Tümü / Görülmeyenler / Görülenler)
      if (statusFilter === "unvisited" && p.isVisited) return false;
      if (statusFilter === "visited" && !p.isVisited) return false;

      // 3. Kategori filtresi
      if (categoryFilter !== "all") {
        if (categoryFilter === "historic" && !["monument", "museum", "historic"].includes(p.category)) return false;
        if (categoryFilter === "cafe" && !["cafe", "restaurant"].includes(p.category)) return false;
        if (categoryFilter === "shop" && p.category !== "shop") return false;
        if (categoryFilter === "nature" && !["nature", "view"].includes(p.category)) return false;
      }

      return true;
    });
  }, [places, searchTerm, statusFilter, categoryFilter]);

  const totalCount = places.length;
  const visitedCount = places.filter((p) => p.isVisited).length;
  const unvisitedCount = totalCount - visitedCount;

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case "museum":
      case "monument":
      case "historic":
        return <Landmark className="w-3.5 h-3.5 text-cyan-400" />;
      case "cafe":
        return <Coffee className="w-3.5 h-3.5 text-amber-400" />;
      case "restaurant":
        return <Utensils className="w-3.5 h-3.5 text-rose-400" />;
      case "shop":
        return <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />;
      case "nature":
        return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
      case "view":
        return <Camera className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  }

  function formatTime(d: Date | string | null) {
    if (!d) return "";
    const date = new Date(d);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-4">
      {/* 1. Üst Kontrol Barı: Canlı Arama + Keşif Durumu Segment Butonları */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Canlı Arama Input'u */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Mekan veya turistik yer ara... (örn: Kol, Eyf, Müze)"
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Keşif Durumu Butonları: 3 Kolonlu Responsive Segment (Mobilde tam sığar, yatay kaydırma yapmaz) */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-center transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tümü ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("unvisited")}
            className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              statusFilter === "unvisited"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-amber-400/80 hover:text-amber-300"
            }`}
            title="Henüz ziyaret edilmemiş yerler"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">Görülmeyen ({unvisitedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("visited")}
            className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              statusFilter === "visited"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-emerald-400/80 hover:text-emerald-300"
            }`}
            title="Gezilmiş ve işaretlenmiş yerler"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">Görülen ({visitedCount})</span>
          </button>
        </div>
      </div>

      {/* 2. Kategori Filtre Butonları + Özel Mekan Ekle Butonu (Mobil-First: flex-wrap, sıfır yatay kaydırma) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Kategori Hapları */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "Tümü" },
            { id: "historic", label: "🏛️ Tarih & Müze" },
            { id: "cafe", label: "☕ Kafe & Yeme-İçme" },
            { id: "shop", label: "🛍️ Alışveriş & Butik" },
            { id: "nature", label: "🌳 Doğa & Manzara" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Özel Mekan Ekle Düğmesi (Mobilde tam genişlikte alt satırda, desktopta sağda) */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Özel Mekan / Kafe Ekle</span>
        </button>
      </div>

      {/* 3. Mekanlar Listesi (Renk Kodlu: Yeşil vs Sarı) */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>{cityName} için turistik yerler yükleniyor...</span>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 text-slate-400 text-xs">
          <p className="font-semibold text-slate-300">Eşleşen mekan bulunamadı.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Filtreleri temizleyebilir veya yukarıdaki &quot;Özel Mekan Ekle&quot; butonuyla kendi mekanınızı ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredPlaces.map((place) => {
            const isGreen = place.isVisited;

            return (
              <div
                key={place.id}
                className={`relative p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isGreen
                    ? "bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-500/5"
                    : "bg-amber-950/15 border-amber-500/35 hover:border-amber-500/60"
                }`}
              >
                {/* Üst Kısım: Checkbox + İsim + Kategori + Saat / Kalem */}
                <div className="flex items-start justify-between gap-2.5">
                  {/* Sol: Tik Butonu ve Mekan Adı */}
                  <div
                    onClick={() => handleToggle(place)}
                    className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 transition-transform active:scale-90"
                      aria-label={isGreen ? "Ziyareti kaldır" : "Ziyaret edildi olarak işaretle"}
                    >
                      {isGreen ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-amber-400/80 hover:text-amber-300" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isGreen ? "text-emerald-100" : "text-amber-100"
                          }`}
                        >
                          {place.name}
                        </span>
                        {place.isCustom && (
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-semibold">
                            Özel
                          </span>
                        )}
                      </div>

                      {place.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {place.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sağ: Kategori Rozeti ve Zaman Damgası */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <div
                      className="p-1 rounded-lg bg-slate-900/80 border border-slate-800"
                      title={place.category}
                    >
                      {getCategoryIcon(place.category)}
                    </div>

                    {/* Eğer görüldüyse: Saat Damgası ve Düzenleme Kalemi */}
                    {isGreen && place.visitedAt && (
                      <div className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 rounded-lg px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{formatTime(place.visitedAt)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(place);
                          }}
                          className="ml-1 p-0.5 text-emerald-400 hover:text-emerald-200 cursor-pointer"
                          title="Ziyaret zamanını düzenle"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alt Kısım: İnteraktif 5 Yıldızlı Puanlama (Görülen Yerler İçin) */}
                {isGreen && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-emerald-400/90 font-medium">
                      Puanınız:
                    </span>
                    <div
                      className="flex items-center gap-1 touch-manipulation"
                      onMouseLeave={() =>
                        setHoveredRatings((prev) => ({ ...prev, [place.id]: null }))
                      }
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentHover = hoveredRatings[place.id];
                        const active =
                          currentHover !== null && currentHover !== undefined
                            ? currentHover >= star
                            : (place.userRating || 0) >= star;

                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() =>
                              setHoveredRatings((prev) => ({ ...prev, [place.id]: star }))
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRatingChange(place, star);
                            }}
                            className="p-1 sm:p-0.5 hover:scale-125 active:scale-110 transition-transform cursor-pointer"
                            title={`${star} Yıldız Ver`}
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${
                                active
                                  ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                                  : "text-white fill-white/15 stroke-[1.75] hover:text-amber-300 hover:fill-amber-300/40"
                              }`}
                            />
                          </button>
                        );
                      })}
                      {place.userRating ? (
                        <span className="text-[11px] font-bold text-amber-300 ml-1.5 font-mono">
                          {place.userRating}.0
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 ml-1.5 italic">
                          (Puan Seç)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Tarih ve Saat Düzenleme Modalı */}
      {editingVisit && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Ziyaret Zamanını Güncelle
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingVisit.place.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingVisit(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Ziyaret Tarihi:
                </label>
                <input
                  type="date"
                  value={editingVisit.dateStr}
                  onChange={(e) =>
                    setEditingVisit({ ...editingVisit, dateStr: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Ziyaret Saati:
                </label>
                <input
                  type="time"
                  value={editingVisit.timeStr}
                  onChange={(e) =>
                    setEditingVisit({ ...editingVisit, timeStr: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingVisit(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveDateTime}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Özel Mekan / Kafe Ekleme Modalı */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  {cityName} İçin Özel Mekan Ekle
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gittiğiniz bir kafe, restoran, butik veya gizli bir keşfi kaydedin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Mekan Adı *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Örn: Café de Flore, Shakespeare & Co..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Kategori
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cafe", label: "☕ Kafe", icon: Coffee },
                    { id: "restaurant", label: "🍽️ Restoran", icon: Utensils },
                    { id: "shop", label: "🛍️ Butik / Shop", icon: ShoppingBag },
                    { id: "historic", label: "🏛️ Tarihi", icon: Landmark },
                    { id: "other", label: "✨ Diğer", icon: Sparkles },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCustomCategory(cat.id as any)}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        customCategory === cat.id
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                          : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Puanınız
                </label>
                <div
                  className="flex items-center gap-1.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800"
                  onMouseLeave={() => setCustomRatingHover(null)}
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (customRatingHover ?? customRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setCustomRatingHover(star)}
                        onClick={() => setCustomRating(star)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        title={`${star} Yıldız`}
                      >
                        <Star
                          className={`w-5 h-5 transition-colors ${
                            active
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                              : "text-white fill-white/15 stroke-[1.75] hover:text-amber-300 hover:fill-amber-300/40"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-amber-300 ml-2">
                    {customRating} Yıldız
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Kişisel Not (İsteğe bağlı)
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Kruvasanı çok lezzetliydi, balkonda oturduk..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleCreateCustom}
                disabled={isPending || !customName.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Ekleniyor..." : "Kaydet & Görüldü İşaretle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
