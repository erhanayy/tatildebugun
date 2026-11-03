"use client";

import { useState, useRef } from "react";
import {
  matchPhotosWithPlaces,
  type PhotoMatchResult,
} from "@/lib/photo-matcher";
import { type CityPlaceItem } from "@/lib/actions/places";
import {
  Camera,
  Upload,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface PhotoMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  places: CityPlaceItem[];
  onConfirmMatches: (
    matches: Array<{ placeId: string; visitedAt?: Date | null }>
  ) => Promise<void>;
}

export function PhotoMatchModal({
  isOpen,
  onClose,
  cityName,
  places,
  onConfirmMatches,
}: PhotoMatchModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<PhotoMatchResult[] | null>(null);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Record<string, boolean>>({});
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAnalyzing(true);
    setResults(null);

    try {
      const matchResults = await matchPhotosWithPlaces(
        Array.from(files),
        places,
        400 // 400 metre eşiği
      );

      setResults(matchResults);

      // Eşleşenleri varsayılan olarak seçili yap
      const initialSelected: Record<string, boolean> = {};
      matchResults.forEach((r) => {
        if (r.matchedPlace) {
          initialSelected[r.matchedPlace.id] = true;
        }
      });
      setSelectedPlaceIds(initialSelected);

      const matchedCount = matchResults.filter((r) => r.matchedPlace).length;
      if (matchedCount > 0) {
        toast.success(`🎉 ${matchedCount} fotoğraf mekanlarla başarıyla eşleştirildi!`);
      } else {
        toast.info("Fotoğraflarda yakındaki mekanlarla eşleşen bir konum bulunamadı.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Fotoğraflar taranırken bir hata oluştu.");
    } finally {
      setAnalyzing(false);
      // Input'u sıfırla ki aynı dosyalar tekrar seçilebilsin
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function toggleSelect(placeId: string) {
    setSelectedPlaceIds((prev) => ({
      ...prev,
      [placeId]: !prev[placeId],
    }));
  }

  async function handleConfirm() {
    if (!results) return;

    const toSave: Array<{ placeId: string; visitedAt?: Date | null }> = [];
    const seenPlaces = new Set<string>();

    for (const r of results) {
      if (r.matchedPlace && selectedPlaceIds[r.matchedPlace.id]) {
        if (!seenPlaces.has(r.matchedPlace.id)) {
          seenPlaces.add(r.matchedPlace.id);
          toSave.push({
            placeId: r.matchedPlace.id,
            visitedAt: r.timestamp || new Date(),
          });
        }
      }
    }

    if (toSave.length === 0) {
      toast.error("Lütfen kaydedilecek en az bir mekan seçin.");
      return;
    }

    setSaving(true);
    try {
      await onConfirmMatches(toSave);
      toast.success(`${toSave.length} mekan ziyaret listenize eklendi! 🌴`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Mekanlar kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  const matchedResults = results?.filter((r) => r.matchedPlace) || [];
  const unmatchedResults = results?.filter((r) => !r.matchedPlace) || [];

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 1. Modal Başlığı */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Fotoğraflardan Mekan Bul</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase">
                  EXIF GPS
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {cityName} seyahatinizde çektiğiniz fotoğrafları seçin, çekim konumlarından gittiğiniz yerleri otomatik bulalım.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Kaydırılabilir İçerik Alanı */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Gizli Dosya Seçici */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />

          {/* Dosya Seçim & Yükleme Alanı */}
          {!analyzing && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 sm:p-6 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-amber-500/60 bg-slate-950/50 hover:bg-slate-950/80 transition-all cursor-pointer text-center space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 flex items-center justify-center mx-auto transition-colors">
                <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {results ? "Farklı Fotoğraflar Seç veya Ekle" : "Fotoğrafları Seç (Galeri / Dosyalar)"}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Birden fazla tatil fotoğrafı seçebilirsiniz.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Fotoğraflarınız sunucuya yüklenmez, cihaz içinde yerel taranır (0 MB Kota).</span>
              </div>
            </div>
          )}

          {/* Analiz Yükleniyor Durumu */}
          {analyzing && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Fotoğrafların Konumları Taranıyor...</h4>
                <p className="text-xs text-slate-400">
                  EXIF GPS başlıkları {cityName} mekan havuzumuzla eşleştiriliyor.
                </p>
              </div>
            </div>
          )}

          {/* Eşleşme Sonuçları */}
          {results && !analyzing && (
            <div className="space-y-4">
              {/* Başarılı Eşleşen Mekanlar */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Tespit Edilen Mekanlar ({matchedResults.length})</span>
                  </span>
                  {matchedResults.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Görüldü olarak işaretlemek istediklerinizi seçin
                    </span>
                  )}
                </div>

                {matchedResults.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                    Seçtiğiniz fotoğrafların koordinatları {cityName} mekanlarına yeterince yakın bulunamadı veya fotoğraflarda GPS etiketi yer almıyor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matchedResults.map((r, idx) => {
                      const place = r.matchedPlace!;
                      const isSelected = !!selectedPlaceIds[place.id];

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleSelect(place.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70"
                          }`}
                        >
                          {/* Sol: Fotoğraf Thumbnail + Mekan Bilgisi */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Çekilen Fotoğraf Önizlemesi */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(r.previewUrl);
                              }}
                              className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 cursor-zoom-in group/img"
                              title="Fotoğrafı büyüt"
                            >
                              <img
                                src={r.previewUrl}
                                alt={r.fileName}
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-3 h-3 text-white" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                                {place.name}
                              </h4>

                              <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1 text-amber-300 font-mono">
                                  <MapPin className="w-3 h-3" />
                                  <span>{place.distanceMeters}m yakında</span>
                                </span>

                                {r.timestamp && (
                                  <span className="inline-flex items-center gap-1 font-mono text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {r.timestamp.toLocaleTimeString("tr-TR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Sağ: Seçim Rozeti / Checkbox */}
                          <div className="shrink-0">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                                  : "border-2 border-slate-700 bg-slate-900"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-4 h-4 fill-slate-950 text-amber-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Eşleşmeyen veya GPS Olmayan Fotoğraflar (Akordeon) */}
              {unmatchedResults.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowUnmatched((prev) => !prev)}
                    className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1.5 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Eşleşmeyen veya Konumsuz Fotoğraflar ({unmatchedResults.length})</span>
                    </span>
                    {showUnmatched ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showUnmatched && (
                    <div className="mt-2 space-y-1.5">
                      {unmatchedResults.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between gap-2 text-[11px] text-slate-400"
                        >
                          <span className="truncate max-w-[220px] font-mono">{r.fileName}</span>
                          <span className="text-slate-500 text-[10px] shrink-0">{r.errorNote}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Modal Alt Butonları */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer text-center"
          >
            Vazgeç
          </button>

          {matchedResults.length > 0 && (
            <button
              type="button"
              disabled={saving || Object.values(selectedPlaceIds).filter(Boolean).length === 0}
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Seçilenleri Ziyaret Listeme Ekle ({Object.values(selectedPlaceIds).filter(Boolean).length})
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Büyütülmüş Fotoğraf Önizleme Modalı */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[3100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-lg w-full max-h-[85vh] flex flex-col items-center">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Önizleme"
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
