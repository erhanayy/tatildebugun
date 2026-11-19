"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Coins,
  TrendingUp,
  ShieldAlert,
  History,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Users,
  MapPin,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserPointsSummaryAction,
  getPaginatedPointActivitiesAction,
} from "@/lib/actions/points";
import type { UserPointsSummary } from "@/lib/points/engine";
import { useTranslation } from "@/lib/i18n/context";

interface PointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSummary?: UserPointsSummary | null;
}

export function PointsModal({ isOpen, onClose, initialSummary }: PointsModalProps) {
  const { locale } = useTranslation();
  const isEn = locale === "en";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<"simulation" | "rules" | "ledger">("simulation");
  const [summary, setSummary] = useState<UserPointsSummary | null>(initialSummary || null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Kâr Simülasyonu Senaryoları (Net Kâr Varsayımı)
  const [customProfit, setCustomProfit] = useState<number>(1000000);

  // Paging State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [ledgerData, setLedgerData] = useState<{
    items: any[];
    totalCount: number;
    totalPages: number;
  }>({
    items: [],
    totalCount: 0,
    totalPages: 1,
  });
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Modal açıldığında verileri yükle
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoadingSummary(true);
      try {
        const res = await getUserPointsSummaryAction();
        if (res.success && res.summary) {
          setSummary(res.summary);
          setCustomProfit(res.summary.estimatedNetProfit || 1000000);
        }
      } catch (err) {
        console.error("Points summary error:", err);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadData();
  }, [isOpen]);

  // Ledger sayfası değiştikçe yükle
  useEffect(() => {
    if (!isOpen || activeTab !== "ledger") return;

    async function loadLedger() {
      setLoadingLedger(true);
      try {
        const res = await getPaginatedPointActivitiesAction(page, pageSize);
        if (res.success && "items" in res) {
          setLedgerData({
            items: res.items,
            totalCount: res.totalCount || 0,
            totalPages: res.totalPages || 1,
          });
        }
      } catch (err) {
        console.error("Ledger load error:", err);
      } finally {
        setLoadingLedger(false);
      }
    }

    loadLedger();
  }, [isOpen, activeTab, page, pageSize]);

  // ESC ile kapatma desteği
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Simülasyon Hesaplamaları
  const totalUserPoints = summary?.totalPoints || 0;
  const totalPoolPoints = Math.max(summary?.totalPoolPoints || 1000, totalUserPoints, 1);
  const poolWeight = totalPoolPoints > 0 ? (totalUserPoints / totalPoolPoints) * 100 : 0;
  const poolPercentage = summary?.poolSharePercentage || 50; // Net kârın %50'si
  const communityPoolSize = customProfit * (poolPercentage / 100);
  const simulatedEarnings = Math.round((poolWeight / 100) * communityPoolSize);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900/95 border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Üst Başlık & Kapatma Butonu */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {isEn ? "AllTripX Value-Share & Points Hub" : "AllTripX Kâr Payı & Puan Merkezi"}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase">
                  2026 Sezonu
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isEn
                  ? "Fair profit-sharing based on physical check-ins & active contributions"
                  : "Fiziki check-in ve gerçek katkıya dayalı adil kâr paylaşım ekonomisi"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canlı Skor Özeti Bandı */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{isEn ? "Your Balance:" : "Mevcut Puanınız:"}</span>
            <span className="text-base font-black text-amber-400 flex items-center gap-1">
              <Coins className="w-4 h-4" />
              {totalUserPoints.toLocaleString("tr-TR")} Pts
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 text-slate-300 font-semibold text-[11px]">
              <span className="text-slate-400">{isEn ? "Pool Weight:" : "Havuz Payı:"}</span>
              <span className="text-emerald-400 font-bold">%{poolWeight.toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold text-[11px]">
              <span>{isEn ? "Community Share:" : "Topluluk Payı:"}</span>
              <span className="font-bold">%{poolPercentage} Net Kâr</span>
            </div>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/40 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("simulation")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "simulation"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isEn ? "Profit Simulation (%50)" : "Kâr Simülasyonu (%50)"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "rules"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isEn ? "Rules & Fair Play" : "Kazanma & Ceza Kuralları"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "ledger"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{isEn ? "Activity Ledger" : "Puan Hareketleri"}</span>
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* SEKME 1: KÂR SIMÜLASYONU */}
          {activeTab === "simulation" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Vurgulu Simülasyon Kutusu */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      {isEn ? "2026 Value-Share Forecast" : "2026 Sezonu Kâr Payı Simülatörü"}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                    SİMÜLASYON
                  </span>
                </div>

                {/* Örnek Net Kâr Senaryo Seçici */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-semibold block">
                    {isEn ? "Company Net Profit Scenario:" : "Örnek Şirket Net Kâr Varsayımı:"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "1 Milyon TL", value: 1000000 },
                      { label: "2.5 Milyon TL", value: 2500000 },
                      { label: "5 Milyon TL", value: 5000000 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCustomProfit(opt.value)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          customProfit === opt.value
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hesaplama Akış Kartı */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isEn ? "Topluluk Havuzu (%50)" : "Topluluk Havuzu (%50)"}
                    </span>
                    <div className="text-sm sm:text-base font-black text-amber-300">
                      {communityPoolSize.toLocaleString("tr-TR")} TL
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isEn ? "Havuzdaki Ağırlığınız" : "Havuzdaki Ağırlığınız"}
                    </span>
                    <div className="text-sm sm:text-base font-black text-emerald-400">
                      %{poolWeight.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950/80 border border-emerald-500/40 text-center space-y-1">
                    <span className="text-[11px] text-emerald-300 font-medium">
                      {isEn ? "Tahmini Hakediş Payı" : "Tahmini Hakediş Payı"}
                    </span>
                    <div className="text-base sm:text-lg font-black text-emerald-400">
                      ~{simulatedEarnings.toLocaleString("tr-TR")} TL
                    </div>
                  </div>
                </div>

                {/* Hukuki Açıklama Kutusu */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-white">Hukuki ve Şeffaf Simülasyon Bilgilendirmesi:</strong>{" "}
                    Bu rakam, yıl sonundaki şirket net kârına ve platformdaki tüm kullanıcıların topladığı toplam puan oranına göre dağıtılacak olup, değişkenlik gösterebilir. Kesin bir garanti, senet veya borç taahhüdü niteliği taşımaz. Katkınız arttıkça havuzdaki ağırlığınız yükselir!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SEKME 2: KAZANMA VE CEZA KURALLARI */}
          {activeTab === "rules" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Puan Kazanma Tablosu */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {isEn ? "How to Earn Points (2026 Matrix)" : "Puan Kazanma Matrisi (2026 Sezonu)"}
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Eylem / Katkı</th>
                        <th className="py-2.5 px-3">Yıl Geçişi</th>
                        <th className="py-2.5 px-3 text-right">Puan Değeri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Fiziki Mekan Check-In</span>
                          </div>
                          <span className="text-[10px] text-emerald-300 font-semibold">20x Sahada Ziyaret</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">Sonraki yıla taşınmaz</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">+200 Puan</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Arkadaş Daveti (Referral)</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">Tam sayıya yuvarlanır</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">Sonraki yıla taşınmaz</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-400">%20 Pasif Gelir</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Tamamlanan Seyahat Rotası</td>
                        <td className="py-2.5 px-3 text-[11px] text-amber-300 font-semibold">Başlangıç: Rota × 50 × %20</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">+50 Puan</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Davet Kodu ile Katılım</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">Sonraki yıla taşınmaz</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">+50 Puan</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Arkadaş / Aile İlişkisi Kurma</td>
                        <td className="py-2.5 px-3 text-[11px] text-amber-300 font-semibold">Başlangıç: İlişki × 20 × %20</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">+20 Puan</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Yeni Mekan / Pin Ekleme</td>
                        <td className="py-2.5 px-3 text-[11px] text-amber-300 font-semibold">Başlangıç: Pin × 10 × %20</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">+10 Puan</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Günlük Giriş (Sadakat)</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">Sonraki yıla taşınmaz</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">+5 Puan</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Yorum ve Beğeni</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">Sonraki yıla taşınmaz</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-400">+5 Puan</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ceza ve Oyundan Atılma Kuralları */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {isEn ? "Penalties & Fair Play Policy" : "Ceza, Puan Silme ve Oyundan Atılma Kuralları"}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-red-950/20 border border-red-500/30 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <strong className="text-white block font-bold">1. Sahte Konum Bildirimi (GPS Spoofing):</strong>
                      <p className="text-[11px] text-slate-400">
                        Mekanda bulunmadan GPS emülatörleri veya sahte koordinatlarla check-in yapmaya çalışanların haksız puanları silinir, tekrarda o sezonki kâr havuzu hakkı dondurulur.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <strong className="text-white block font-bold">2. Küfürlü, Reklam veya Yanıltıcı İçerik:</strong>
                      <p className="text-[11px] text-slate-400">
                        Topluluğu yanıltan, uygunsuz görsel veya küfür içeren pin ve yorumlar anında silinir ve kullanıcının defterine <strong>-500 Puan</strong> ceza yansıtılır.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-2.5">
                    <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <strong className="text-white block font-bold">3. Bot ve Otomasyon ile Hile Yapma (Ban Hammer):</strong>
                      <p className="text-[11px] text-slate-400">
                        Otomatik scriptler ile sahte beğeni, pin veya davet üreten hesaplar derhal sistemden kalıcı olarak ihraç edilir ve tüm birikimleri sıfırlanır.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <strong className="text-white block font-bold">4. Yıla Başlangıç Puanı & Tam Sayı Kuralı:</strong>
                      <p className="text-[11px] text-slate-400">
                        Yeni yıla başlarken o güne kadarki aktif kayıtların üzerinden hesaplanır: (Toplam Pin × 10 × %20) + (Tamamlanan Rota × 50 × %20) + (Sosyal İlişki × 20 × %20). Diğer puanlar sonraki yıla taşınmaz ve tüm oran hesaplamaları tam sayıya yuvarlanır.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEKME 3: SAYFALAMALI PUAN DEFTERİ (PAGING LEDGER) */}
          {activeTab === "ledger" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Toplam <strong className="text-white">{ledgerData.totalCount}</strong> işlem kaydı
                </span>
                <span className="text-slate-400">
                  Sayfa <strong className="text-white">{page}</strong> / {ledgerData.totalPages}
                </span>
              </div>

              {loadingLedger ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span>Kayıtlar yükleniyor...</span>
                </div>
              ) : ledgerData.items.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                  Henüz puan hareketiniz bulunmuyor. Şehir mekanlarında check-in yaparak puan toplamaya başlayın! 🚀
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgerData.items.map((entry: any) => {
                    const isPositive = entry.finalPoints > 0;
                    const dateStr = new Date(entry.createdAt).toLocaleDateString(
                      isEn ? "en-US" : "tr-TR",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );

                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-0.5 text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                              {entry.actionType === "checkin_pin"
                                ? "Check-in (20x)"
                                : entry.actionType === "referral_passive"
                                ? "Arkadaş Seyahati (%20)"
                                : entry.actionType === "create_pin"
                                ? "Mekan Ekleme"
                                : entry.actionType === "admin_penalty"
                                ? "Ceza Puanı"
                                : entry.actionType}
                            </span>
                            <span className="text-[11px] text-slate-400">{dateStr}</span>
                          </div>
                          <p className="text-xs text-white truncate max-w-sm">
                            {entry.description || "Puan hareketi"}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`text-sm font-black ${
                              isPositive ? "text-amber-400" : "text-rose-400"
                            }`}
                          >
                            {isPositive ? `+${entry.finalPoints}` : entry.finalPoints} Pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sayfalama Butonları */}
              {ledgerData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={page <= 1 || loadingLedger}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Önceki</span>
                  </button>

                  <span className="text-xs text-slate-400 font-semibold">
                    {page} / {ledgerData.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= ledgerData.totalPages || loadingLedger}
                    onClick={() => setPage((p) => Math.min(ledgerData.totalPages, p + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span>Sonraki</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
