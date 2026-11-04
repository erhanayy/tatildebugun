"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  matchPhotosWithPlaces,
  loadSampleColosseumPhoto,
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
  Sparkles,
  Info,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Bug,
  HelpCircle,
  Compass,
} from "lucide-react";
import { toast } from "sonner";

interface PhotoMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  places: CityPlaceItem[];
  initialFiles?: File[] | null;
  onMatchesDiscovered?: (matchedPlaceIds: string[]) => void;
  onConfirmMatches: (
    matches: Array<{ placeId: string; visitedAt?: Date | null }>
  ) => Promise<void>;
}

export function PhotoMatchModal({
  isOpen,
  onClose,
  cityName,
  places,
  initialFiles,
  onMatchesDiscovered,
  onConfirmMatches,
}: PhotoMatchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<PhotoMatchResult[] | null>(null);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Record<string, boolean>>({});
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [showHelpTips, setShowHelpTips] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedRef = useRef<File[] | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Eğer dışarıdan initialFiles geldiyse hemen analizi başlat
  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0 && lastProcessedRef.current !== initialFiles) {
      lastProcessedRef.current = initialFiles;
      processFiles(initialFiles);
    }
  }, [isOpen, initialFiles]);

  async function processFiles(files: File[]) {
    setAnalyzing(true);
    setResults(null);

    try {
      const matchResults = await matchPhotosWithPlaces(
        files,
        places,
        400 // 400 metre mesafe eşiği
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

      const matchedIds = matchResults
        .filter((r) => r.matchedPlace)
        .map((r) => r.matchedPlace!.id);

      if (matchedIds.length > 0) {
        onMatchesDiscovered?.(matchedIds);
      }

      const matchedCount = matchResults.filter((r) => r.matchedPlace).length;
      if (matchedCount > 0) {
        toast.success(`🎉 ${matchedCount} fotoğraf ${cityName} mekanlarıyla eşleşti!`);
      } else {
        toast.info("Fotoğraflarda yakındaki mekanlarla eşleşen bir konum bulunamadı.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Fotoğraflar taranırken bir hata oluştu.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleTestSamplePhoto() {
    setLoadingSample(true);
    try {
      const sampleFile = await loadSampleColosseumPhoto();
      toast.info("🧪 Roma Kolezyum örnek fotoğrafı yüklendi, taranıyor...");
      await processFiles([sampleFile]);
    } catch (err) {
      console.error(err);
      toast.error("Örnek fotoğraf yüklenirken bir hata oluştu.");
    } finally {
      setLoadingSample(false);
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
      toast.success(`${toSave.length} mekan gezi günlüğünüze eklendi! 🌴`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Mekanlar kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen || !mounted) return null;

  const matchedResults = results?.filter((r) => r.matchedPlace) || [];
  const unmatchedResults = results?.filter((r) => !r.matchedPlace) || [];

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Başlığı */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Fotoğraflardan Mekan Bul</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-extrabold uppercase">
                  MAVİ TESBİT (EXIF GPS)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {cityName} tatilinizde çektiğiniz fotoğrafların konumlarından gittiğiniz yerleri otomatik tespit edelim.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Kapat"
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

          {/* Dosya Seçim & Yükleme Butonu */}
          {!analyzing && (
            <div className="space-y-2.5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 sm:p-6 rounded-2xl border-2 border-dashed border-sky-500/40 hover:border-sky-400 bg-sky-950/20 hover:bg-sky-950/40 transition-all cursor-pointer text-center space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 group-hover:bg-sky-500/30 flex items-center justify-center mx-auto transition-colors">
                  <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                    {results ? "Farklı Fotoğraflar Seç (Galeri / Dosyalar)" : "Galeriden Fotoğrafları Seç"}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Birden fazla tatil fotoğrafı seçebilirsiniz.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                  <Info className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>Fotoğraflarınız sunucuya yüklenmez, telefonun içinde yerel taranır (0 MB Kota).</span>
                </div>
              </div>

              {/* Hızlı Test & Yardım & Debug Araç Çubuğu (Rule 13 Mobile-First) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={loadingSample}
                  onClick={handleTestSamplePhoto}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Doğrulanmış Roma Kolezyum koordinatına sahip örnek fotoğrafı test et"
                >
                  {loadingSample ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <span className="text-base leading-none">🧪</span>
                  )}
                  <span>Roma Örnek Fotoğrafı ile Dene</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDebugMode((prev) => !prev)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    debugMode
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Detaylı GPS ve EXIF koordinat teşhisini göster/gizle"
                >
                  <Bug className={`w-3.5 h-3.5 ${debugMode ? "text-amber-400" : "text-slate-400"}`} />
                  <span>Teşhis {debugMode ? "(Açık)" : "(Kapalı)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHelpTips((prev) => !prev)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Mobil GPS ayarları rehberi"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mobil İpucu</span>
                </button>
              </div>

              {/* Mobil Konum İpuçları Paneli */}
              {showHelpTips && (
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-sky-500/30 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-sky-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-sky-400" />
                      <span>Fotoğraflarda Konum Çıkmıyorsa Ne Yapmalı?</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHelpTips(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <strong className="text-white flex items-center gap-1">🍎 iPhone / Safari / Chrome:</strong>
                      <p className="text-slate-400 mt-1">
                        1. Fotoğraf seçerken açılan albümün sol altındaki <span className="text-sky-300 font-bold">&ldquo;Seçenekler&rdquo; (Options)</span> linkine tıklayın.
                      </p>
                      <p className="text-slate-400">
                        2. <span className="text-sky-300 font-bold">&ldquo;Tüm Fotoğraf Verileri&rdquo; (All Photos Data / Konum)</span> anahtarını açık yapın. iOS varsayılan olarak GPS verisini tarayıcıdan gizler!
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <strong className="text-white flex items-center gap-1">🤖 Android / Google Fotoğraflar:</strong>
                      <p className="text-slate-400 mt-1">
                        Kamera uygulamasında <span className="text-sky-300 font-bold">&ldquo;Konum Etiketleri&rdquo; (Geotagging)</span> açık olmalı ve galeriden dosya seçerken &ldquo;Paylaşırken konumu kaldır&rdquo; seçeneği kapatılmalıdır.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analiz Yükleniyor Durumu */}
          {analyzing && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Fotoğrafların Konumları Taranıyor...</h4>
                <p className="text-xs text-slate-400">
                  EXIF GPS etiketleri {cityName} mekan koordinatlarıyla eşleştiriliyor.
                </p>
              </div>
            </div>
          )}

          {/* Eşleşme Sonuçları */}
          {results && !analyzing && (
            <div className="space-y-4">
              {/* Başarılı Eşleşen Mekanlar (MAVİ TEMA) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Tespit Edilen Mekanlar ({matchedResults.length})</span>
                  </span>
                  {matchedResults.length > 0 && (
                    <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-md font-mono">
                      Mavi: Onay Bekliyor
                    </span>
                  )}
                </div>

                {matchedResults.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                    <div className="text-xs text-slate-300 font-medium">
                      Seçtiğiniz fotoğraflarda {cityName} mekanlarına (400 metre yakınına) düşen bir konum bulunamadı.
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Cihazınızın fotoğraf seçerken GPS bilgisini silip silmediğini anlamak için yukarıdaki <span className="text-amber-300 font-bold">&ldquo;Teşhis (Debug)&rdquo;</span> modunu açabilir veya aşağıdaki eşleşmeyen fotoğrafların detaylarını inceleyebilirsiniz.
                    </div>
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
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                            isSelected
                              ? "bg-sky-950/60 border-sky-400/80 shadow-md shadow-sky-500/15"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Sol: Fotoğraf Thumbnail + Mekan Bilgisi */}
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Çekilen Fotoğraf Önizlemesi */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(r.previewUrl);
                                }}
                                className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-sky-700/60 cursor-zoom-in group/img"
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                                    {place.name}
                                  </h4>
                                  <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9px] font-extrabold border border-sky-500/30">
                                    Fotoğraftan Bulundu
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px]">
                                  <span className="inline-flex items-center gap-1 text-sky-300 font-mono">
                                    <MapPin className="w-3 h-3 text-sky-400" />
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

                            {/* Sağ: Mavi Onay Kutusu */}
                            <div className="shrink-0">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30"
                                    : "border-2 border-slate-700 bg-slate-900"
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-4 h-4 fill-slate-950 text-sky-500" />}
                              </div>
                            </div>
                          </div>

                          {/* Teşhis / Debug Bilgisi (Debug Modu Açıkken) */}
                          {debugMode && (
                            <div className="mt-1 pt-2 border-t border-sky-800/40 text-[10px] text-slate-300 space-y-0.5 font-mono bg-slate-900/60 p-2 rounded-xl">
                              <div className="flex items-center justify-between text-amber-300 font-bold">
                                <span>Teşhis: GPS Okundu ✓</span>
                                <span>Etiket Sayısı: {r.rawTagsCount}</span>
                              </div>
                              <div className="text-slate-400 break-words">
                                Koord: <span className="text-sky-300">{r.debugInfo.coordsFormatted}</span> | Cihaz: {r.cameraModel || "Bilinmiyor"}
                              </div>
                              <div className="text-slate-400">
                                Mesafe: {r.debugInfo.distanceMeters}m (Eşik: {r.debugInfo.thresholdMeters}m)
                              </div>
                            </div>
                          )}
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
                    className="w-full min-h-[44px] flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1.5 cursor-pointer"
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
                    <div className="mt-2 space-y-2">
                      {unmatchedResults.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2 text-xs text-slate-300"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                onClick={() => setPreviewImage(r.previewUrl)}
                                className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-800 cursor-zoom-in"
                              >
                                <img
                                  src={r.previewUrl}
                                  alt={r.fileName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-mono text-[11px] text-white font-bold truncate max-w-[180px]">
                                {r.fileName}
                              </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {r.fileSizeFormatted}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{r.errorNote}</span>
                          </div>

                          {/* Her zaman veya debug modunda teşhis detayı */}
                          {debugMode && (
                            <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-xl">
                              <div className="text-amber-300 font-bold">
                                Durum: {r.debugInfo.status} | GPS: {r.debugInfo.coordsFormatted}
                              </div>
                              <div>Kamera / Cihaz: {r.cameraModel || "Bilinmiyor / Yok"}</div>
                              <div>Okunan EXIF Etiketi: {r.rawTagsCount} adet</div>
                              {r.closestPlace && (
                                <div className="text-sky-300">
                                  En Yakın Mekan: {r.closestPlace.name} ({r.closestPlace.distanceMeters}m &gt; {r.debugInfo.thresholdMeters}m)
                                </div>
                              )}
                              <div className="text-slate-500 italic break-words">{r.debugInfo.details}</div>
                            </div>
                          )}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ziyaretlere Ekleniyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Onayla ve Ziyaret Listeme Ekle ({Object.values(selectedPlaceIds).filter(Boolean).length})
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Büyütülmüş Fotoğraf Önizleme Modalı */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
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

  return createPortal(modalContent, document.body);
}
