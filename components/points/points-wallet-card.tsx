"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Sparkles,
  TrendingUp,
  Users,
  MapPin,
  Share2,
  Copy,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  Coins,
  History,
  ShieldCheck,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserPointsSummaryAction,
  getRecentPointActivitiesAction,
  applyReferralCodeAction,
} from "@/lib/actions/points";
import { triggerFloatingPoints } from "@/components/points/floating-points-effect";
import type { UserPointsSummary } from "@/lib/points/engine";
import { useTranslation } from "@/lib/i18n/context";

export function PointsWalletCard() {
  const { locale } = useTranslation();
  const isEn = locale === "en";

  const [summary, setSummary] = useState<UserPointsSummary | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [submittingCode, setSubmittingCode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUserPointsSummaryAction();
      if (res.success && res.summary) {
        setSummary(res.summary);
      }
      const actRes = await getRecentPointActivitiesAction(5);
      if (actRes.success && actRes.activities) {
        setActivities(actRes.activities);
      }
    } catch (e) {
      console.error("PointsWalletCard error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!summary?.referralCode) return;
    navigator.clipboard.writeText(summary.referralCode);
    setCopied(true);
    toast.success(
      isEn
        ? "Referral code copied to clipboard!"
        : "Davet kodu panoya kopyalandı!"
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = () => {
    if (!summary?.referralCode) return;
    const shareText = isEn
      ? `Join me on AllTripX! Explore cities, check in, and share in the 2026 community value pool. Use my invite code: ${summary.referralCode} https://alltripx.com`
      : `AllTripX'e katıl! Şehirleri keşfet, check-in yap ve 2026 sezonu kâr paylaşım havuzuna ortak ol. Davet kodum: ${summary.referralCode} https://alltripx.com`;

    if (navigator.share) {
      navigator.share({
        title: "AllTripX Value-Share",
        text: shareText,
        url: "https://alltripx.com",
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success(
        isEn
          ? "Invite message copied to clipboard!"
          : "Davet metni panoya kopyalandı!"
      );
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setSubmittingCode(true);
    try {
      const res = await applyReferralCodeAction(inputCode);
      if (res.success) {
        toast.success(res.message);
        triggerFloatingPoints({
          points: 50,
          label: isEn ? "Referral Welcome Bonus" : "Davet Hoşgeldin Bonusu",
          multiplier: "+50 Puan 🎁",
        });
        setShowCodeInput(false);
        setInputCode("");
        await loadData();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Hata oluştu");
    } finally {
      setSubmittingCode(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 flex items-center justify-center min-h-[180px]">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <Coins className="w-5 h-5 animate-spin text-amber-400" />
          <span>{isEn ? "Loading Points Ledger..." : "Puan Defteri Yükleniyor..."}</span>
        </div>
      </div>
    );
  }

  const totalPts = summary?.totalPoints || 0;
  const checkinPts = summary?.checkinPoints || 0;
  const referralPts = summary?.referralPoints || 0;
  const estEarnings = summary?.estimatedEarningsTl || 0;
  const poolSharePct = summary?.poolSharePercent || 0;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Arka Plan Işık Efekti */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. ÜST BAŞLIK & SEZON ROZETİ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                {isEn ? "AllTripX Value-Share Wallet" : "Değer Paylaşımı & Puan Cüzdanı"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                2026 Sezonu
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isEn
                ? "Fair profit-sharing based on physical check-ins & verified contributions"
                : "Fiziki check-in ve gerçek seyahat katkılarına dayalı adil kâr ortaklığı"}
            </p>
          </div>
        </div>

        {/* Havuzdaki Ağırlık Yüzdesi */}
        <div className="text-right">
          <div className="text-xs text-slate-400 font-medium">
            {isEn ? "Pool Weight" : "Havuzdaki Ağırlığın"}
          </div>
          <div className="text-sm font-bold text-amber-400">
            %{poolSharePct > 0 ? poolSharePct : "0.01"}
          </div>
        </div>
      </div>

      {/* 2. ANA PUAN SAYACI & ROZETLER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5 relative z-10">
        {/* Toplam Puan */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            {isEn ? "Total Points" : "Toplam Sezon Puanı"}
          </span>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              {totalPts.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold ml-1.5">PTS</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isEn ? "Immutable ledger balance" : "Değiştirilemez defter bakiyesi"}
          </span>
        </div>

        {/* Fiziki Check-in (20x Çarpan) */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            {isEn ? "Verified Check-ins (20x)" : "Fiziki Check-in (20x!)"}
          </span>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-bold text-white">
              {checkinPts.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400/80 font-semibold ml-1.5">PTS</span>
          </div>
          <span className="text-[11px] text-emerald-400/70">
            {isEn ? "GPS verified visits get 20x boost" : "Mekanda bizzat check-in kazancı"}
          </span>
        </div>

        {/* Arkadaş Geliri (%20 Pasif) */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between">
          <span className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            {isEn ? "Passive Referrals (20%)" : "Arkadaş Payı (%20 Pasif)"}
          </span>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-bold text-white">
              {referralPts.toLocaleString()}
            </span>
            <span className="text-xs text-indigo-400/80 font-semibold ml-1.5">PTS</span>
          </div>
          <span className="text-[11px] text-indigo-400/70">
            {summary?.invitedCount || 0} {isEn ? "friends invited" : "davetli gezgin"}
          </span>
        </div>
      </div>

      {/* 3. HUKUKİ SİMÜLASYON KUTUSU (Madde 81.5) */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-slate-900 border border-amber-500/30 my-4 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-200">
                  {isEn ? "2026 Season Estimated Share" : "2026 Sezonu Tahmini Pay Simülasyonu"}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30">
                  Simülasyon
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn
                  ? "Based on 1,000,000 TL net profit assumption & 20% community pool"
                  : "1.000.000 TL net kâr ve %20 topluluk havuz dağıtım senaryosunda:"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg sm:text-xl font-black text-emerald-400 tracking-tight">
              ~{estEarnings > 0 ? estEarnings.toLocaleString() : "50"} TL
            </div>
            <div className="text-[10px] text-slate-400">
              {isEn ? "Instant dynamic share" : "Anlık tahmini sezon payı"}
            </div>
          </div>
        </div>

        {/* Hukuki Uyarı Notu (Madde 81.5) */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
          <span>
            {isEn
              ? "*This estimate fluctuates dynamically based on year-end company net profit and total pool points. It serves as a community motivation simulation and does not constitute a legal guarantee or debt commitment."
              : "*Bu rakam yıl sonundaki net şirket kârına ve havuzdaki puan ağırlığına göre anlık değişen bir topluluk simülasyonudur; sabit bir getiri veya yasal borç taahhüdü içermez."}
          </span>
        </div>
      </div>

      {/* 4. REFERRAL (DAVET KODU & %20 PASİF GELİR PAYLAŞIMI) */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 my-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{isEn ? "Your Invite Code:" : "Davet Kodun:"}</span>
              <span className="font-mono text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {summary?.referralCode || "GEZGIN2026"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isEn
                ? "Invite friends: earn 20% passive points whenever they check-in all year!"
                : "Arkadaşların yıl boyu gezdikçe ve check-in yaptıkça %20 pasif puan hanene uçar!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleCopyCode}
            type="button"
            className="flex-1 sm:flex-initial h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-all flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isEn ? "Copied" : "Kopyalandı") : (isEn ? "Copy" : "Kodu Kopyala")}</span>
          </button>

          <button
            onClick={handleShareInvite}
            type="button"
            className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-slate-950 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isEn ? "Invite Friend" : "Arkadaşını Davet Et"}</span>
          </button>
        </div>
      </div>

      {/* Davet Kodu Gir (Eğer başka bir arkadaşın kodu varsa) */}
      <div className="relative z-10">
        {!showCodeInput ? (
          <button
            type="button"
            onClick={() => setShowCodeInput(true)}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
          >
            <span>{isEn ? "Have a friend's referral code?" : "Bir arkadaşının davet kodu mu var?"}</span>
            <span className="underline font-medium">
              {isEn ? "Enter code (+50 PTS)" : "Kodu gir (+50 Puan kazan)"}
            </span>
          </button>
        ) : (
          <form
            onSubmit={handleApplyCode}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 max-w-md"
          >
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder={isEn ? "ENTER REFERRAL CODE" : "DAVET KODUNU GİR"}
              className="flex-1 bg-transparent border-0 text-xs text-white placeholder-slate-400 focus:outline-none font-mono uppercase"
            />
            <button
              type="submit"
              disabled={submittingCode || !inputCode.trim()}
              className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 disabled:opacity-50 transition-all"
            >
              {submittingCode ? "..." : isEn ? "Apply" : "Bağla"}
            </button>
            <button
              type="button"
              onClick={() => setShowCodeInput(false)}
              className="text-xs text-slate-400 hover:text-white px-1"
            >
              ✕
            </button>
          </form>
        )}
      </div>

      {/* 5. SON PUAN HAREKETLERİ (LEDGER GEÇMİŞİ AKIŞI) */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 relative z-10">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-400" />
            {isEn ? "Recent Point Ledger Activities" : "Son Defter (Ledger) Hareketleri"}
          </span>
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                {isEn ? "No point transactions yet." : "Henüz bir puan hareketi kaydedilmedi."}
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-200 truncate">
                      {act.description || act.actionType}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {act.multiplier > 1 && ` • ${act.multiplier}x Çarpan`}
                    </div>
                  </div>
                  <div
                    className={`font-bold font-mono shrink-0 ${
                      act.finalPoints >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {act.finalPoints >= 0 ? `+${act.finalPoints}` : act.finalPoints} PTS
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
