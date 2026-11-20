"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTranslation } from "@/lib/i18n/context";
import { UserPointsSummary } from "@/lib/points/engine";
import { getPaginatedPointActivitiesAction } from "@/lib/actions/points";
import {
  Coins,
  Sparkles,
  Trophy,
  TrendingUp,
  ShieldCheck,
  History,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  AlertTriangle,
  Gift,
  MapPin,
  Users,
  Compass,
  Navigation,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export interface PaginatedLedgerItem {
  id: string;
  actionType: string;
  basePoints: number;
  multiplier: number;
  finalPoints: number;
  description?: string | null;
  createdAt: string | Date;
  referenceType?: string | null;
}

interface RewardsViewProps {
  initialSummary: UserPointsSummary;
  initialLedger: {
    items: PaginatedLedgerItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  user: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
}

export function RewardsView({ initialSummary, initialLedger, user }: RewardsViewProps) {
  const { locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<"simulation" | "rules" | "ledger">("simulation");

  // Simülasyon State
  const [scenarioProfit, setScenarioProfit] = useState<number>(initialSummary.estimatedNetProfit || 1000000);

  // Kopyalama State
  const [copied, setCopied] = useState(false);

  // Sayfalama State
  const [ledgerPage, setLedgerPage] = useState(initialLedger.page);
  const [ledgerData, setLedgerData] = useState(initialLedger);
  const [isPending, startTransition] = useTransition();

  // Yıllık Kâr Payı Simülasyon Hesaplaması (%50 Pay)
  const poolSharePct = initialSummary.poolSharePercentage || 50.0;
  const simulatedPoolShareTl = scenarioProfit * (poolSharePct / 100);
  const userWeightRatio = initialSummary.totalPoolPoints > 0 
    ? initialSummary.totalPoints / initialSummary.totalPoolPoints 
    : 0;
  const userSimulatedEarningsTl = Math.round(userWeightRatio * simulatedPoolShareTl);

  function handleCopyReferral() {
    if (!initialSummary.referralCode) return;
    navigator.clipboard.writeText(initialSummary.referralCode);
    setCopied(true);
    toast.success(
      locale === "en"
        ? `Referral code ${initialSummary.referralCode} copied to clipboard!`
        : `Davet kodunuz (${initialSummary.referralCode}) panoya kopyalandı!`
    );
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > ledgerData.totalPages || newPage === ledgerPage) return;
    setLedgerPage(newPage);
    startTransition(async () => {
      try {
        const res = await getPaginatedPointActivitiesAction(newPage, 8);
        if (res.success && "items" in res) {
          setLedgerData({
            items: res.items,
            page: res.page,
            pageSize: res.pageSize,
            totalCount: res.totalCount,
            totalPages: res.totalPages,
          });
        }
      } catch (err) {
        console.error("Ledger page fetch error:", err);
      }
    });
  }

  function formatActionBadge(actionType: string) {
    switch (actionType) {
      case "checkin_pin":
        return { label: locale === "en" ? "Check-in (20x)" : "Check-in (20x)", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
      case "referral_passive":
        return { label: locale === "en" ? "Passive (%20)" : "Pasif (%20)", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
      case "create_pin":
        return { label: locale === "en" ? "Travel Pin" : "Gezi Pini", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
      case "delete_pin":
        return { label: locale === "en" ? "Pin Removed" : "Silinen Pin", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
      case "complete_trip":
        return { label: locale === "en" ? "Completed Route" : "Tamamlanan Rota", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" };
      case "delete_trip":
        return { label: locale === "en" ? "Route Reversal" : "Rota İadesi", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
      case "connect_friend":
        return { label: locale === "en" ? "Connection" : "Sosyal İlişki", color: "bg-teal-500/15 text-teal-400 border-teal-500/30" };
      case "remove_friend":
        return { label: locale === "en" ? "Disconnect" : "İlişki İadesi", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
      case "visit_place":
        return { label: locale === "en" ? "Visited Place" : "Görülen Yer", color: "bg-lime-500/15 text-lime-400 border-lime-500/30" };
      case "remove_place_visit":
        return { label: locale === "en" ? "Place Removed" : "Çıkarılan Yer", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
      case "welcome_bonus":
        return { label: locale === "en" ? "Welcome" : "Hoşgeldin", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      case "daily_login":
        return { label: locale === "en" ? "Daily Login" : "Günlük Giriş", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
      case "admin_penalty":
        return { label: locale === "en" ? "Penalty" : "Ceza", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
      default:
        return { label: actionType, color: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Kahraman Başlık & Cüzdan Kartı */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl p-5 sm:p-8">
        {/* Altın Parıltı Efekti */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Sol: Kullanıcı Profili ve Sezon Bilgisi */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <UserAvatar
                avatarUrl={user.avatarUrl}
                name={user.fullName || "Gezgin"}
                size="xl"
                className="ring-4 ring-amber-500/30 shadow-2xl"
              />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center text-sm shadow-lg">
                🪙
              </div>
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  {user.fullName || "AllTripX Gezgini"}
                </h1>
                {user.username && (
                  <span className="text-xs text-slate-400 font-medium">@{user.username}</span>
                )}
              </div>

              {/* Sezon ve Sıralama Rozetleri */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {locale === "en" ? "2026 Founder Season" : "2026 Kurucu Sezonu"}
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  {locale === "en" ? `Community Rank #${initialSummary.rank}` : `Topluluk #${initialSummary.rank}. Sıra`}
                </span>
              </div>

              {/* Davet Kodu Kopyalama */}
              {initialSummary.referralCode && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-400">{locale === "en" ? "Referral Code:" : "Davet Kodunuz:"}</span>
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 text-xs font-mono font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    <span>{initialSummary.referralCode}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sağ: Toplam Puan & Tahmini Kazanç Kartı */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 w-full lg:w-96 shrink-0 shadow-xl shadow-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                {locale === "en" ? "TOTAL POINTS & VALUE SHARE" : "TOPLAM PUAN & KÂR PAYI"}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                {initialSummary.totalPoints.toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
                <span className="text-xs ml-1 text-amber-400 font-bold">PTS</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">{locale === "en" ? "Pool Share Ratio" : "Havuzdaki Payınız"}</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  %{initialSummary.poolSharePercent.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">{locale === "en" ? "Est. Value (1M Net)" : "Tahmini Pay (1M Kâr)"}</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  ~{initialSummary.estimatedEarningsTl.toLocaleString(locale === "en" ? "en-US" : "tr-TR")} TL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sekmeler (Tab Menü) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-hidden flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("simulation")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
            activeTab === "simulation"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
              : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{locale === "en" ? "AllTripX Annual Profit (%50)" : "AllTripX Yıllık Kârı (%50)"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
            activeTab === "rules"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
              : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{locale === "en" ? "Rules & Fair Play" : "Puan Kuralları & Adil Oyun"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
            activeTab === "ledger"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
              : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>{locale === "en" ? `Ledger History (${ledgerData.totalCount})` : `Puan Defteri (${ledgerData.totalCount})`}</span>
        </button>
      </div>

      {/* 3. Sekme İçerikleri */}
      {/* SEKME 1: KÂR PAYLAŞIM SİMÜLASYONU */}
      {activeTab === "simulation" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  {locale === "en" ? "AllTripX Annual Profit (%50) & Simulation" : "AllTripX Yıllık Kârı (%50) & Havuz Simülasyonu"}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  {locale === "en"
                    ? "50% of the platform's net annual profit is distributed to the explorer community based on their point weight."
                    : "Şirket yıllık net kârının tam %50'si, gezginlerin sezon boyunca kazandığı toplam puan ağırlıklarına göre paylaştırılır."}
                </p>
              </div>

              {/* Senaryo Seçici Butonlar */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
                {[1000000, 2500000, 5000000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setScenarioProfit(amount)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      scenarioProfit === amount
                        ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {amount === 1000000 ? "1 Milyon TL" : amount === 2500000 ? "2.5 Milyon TL" : "5 Milyon TL"}
                  </button>
                ))}
              </div>
            </div>

            {/* Simülasyon Veri Kartları Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {locale === "en" ? "Company Net Profit" : "Şirket Net Kârı"}
                </span>
                <p className="text-xl font-black text-white mt-1">
                  {scenarioProfit.toLocaleString(locale === "en" ? "en-US" : "tr-TR")} TL
                </p>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{locale === "en" ? "Selected Scenario" : "Seçili Senaryo"}</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                  {locale === "en" ? "AllTripX Profit Share (%50)" : "AllTripX Yıllık Kârı (%50)"}
                </span>
                <p className="text-xl font-black text-amber-400 mt-1">
                  {simulatedPoolShareTl.toLocaleString(locale === "en" ? "en-US" : "tr-TR")} TL
                </p>
                <span className="text-[11px] text-amber-300/70 mt-0.5 block">{locale === "en" ? "Total Distributed Pool" : "Dağıtılacak Toplam Havuz"}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {locale === "en" ? "Total Pool Points" : "Havuz Toplam Puanı"}
                </span>
                <p className="text-xl font-black text-white mt-1">
                  {initialSummary.totalPoolPoints.toLocaleString(locale === "en" ? "en-US" : "tr-TR")} PTS
                </p>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {locale === "en" ? `Your Points: ${initialSummary.totalPoints} PTS` : `Sizin Puanınız: ${initialSummary.totalPoints} PTS`}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40">
                <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                  {locale === "en" ? "Est. Earnings (~)" : "Tahmini Hakedişiniz (~)"}
                </span>
                <p className="text-2xl font-black text-emerald-300 mt-1">
                  ~{userSimulatedEarningsTl.toLocaleString(locale === "en" ? "en-US" : "tr-TR")} TL
                </p>
                <span className="text-[11px] text-emerald-400/80 mt-0.5 block">
                  {locale === "en" ? `Weight: %${(userWeightRatio * 100).toFixed(2)}` : `Havuz Payı: %${(userWeightRatio * 100).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Matematiksel Formül Kutusu */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                {locale === "en" ? "Mathematical Distribution Formula" : "Matematiksel Paylaşım Formülü"}
              </h3>
              <p className="text-xs font-mono text-cyan-300 bg-slate-900/90 p-3 rounded-xl border border-cyan-500/20 overflow-x-hidden">
                Hakediş = (Kullanıcı Sezon Puanı / Havuz Toplam Puanı) × (Şirket Net Kârı × 0.50)
              </p>
            </div>

            {/* Hukuki Güvence & Feragatname Metni */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold">{locale === "en" ? "Legal Notice & Transparency:" : "Hukuki Bilgilendirme ve Güvence:"} </span>
                {locale === "en"
                  ? "This calculation is a transparent motivation simulation based on annual net company profit and real community participant scores. It does not constitute a guaranteed commercial bond, dividend right, or financial promissory note."
                  : "Bu hesaplama, şirketin yıl sonu bağımsız denetimden geçmiş net kârına ve platformdaki tüm kullanıcıların topladığı toplam puan havuzuna göre dinamik olarak hesaplanan bir motivasyon simülasyonudur. Kesin bir senet, ticari temettü taahhüdü veya borç niteliği taşımaz."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 2: PUAN KAZANMA KURALLARI VE ADİL OYUN MATRİSİ */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Puan Kazanma Tablosu */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {locale === "en" ? "2026 Season Point Matrix" : "2026 Sezonu Puan Kazanma Tablosu"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {locale === "en"
                  ? "Physical exploration is rewarded with a 20x multiplier to encourage authentic discovery."
                  : "Masabaşı sanal işlemler yerine sahada gezen ve gerçek deneyim paylaşan gezginler 20x çarpanla ödüllendirilir."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {locale === "en"
                      ? "Physical Place Check-In (GPS Verified)"
                      : "Fiziki Mekan Check-In (GPS Doğrulamalı)"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Proof-of-Presence at the visited location"
                      : "Gezilen mekanda varlık kanıtı (Proof-of-Presence)"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/70 text-[10px] font-semibold text-slate-400">
                    {locale === "en" ? "⏳ Does not carry over to next year" : "⏳ Sonraki yıla taşınmaz"}
                  </span>
                </div>
                <span className="text-lg font-black text-emerald-300 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shrink-0">
                  +200 P
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4 shrink-0" />
                    {locale === "en"
                      ? "Friend Referral Passive Income"
                      : "Arkadaş Daveti Pasif Geliri"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "20% of your invited friend's travels (rounded to whole points)"
                      : "Davet ettiğin arkadaşının seyahatlerinden %20 (tam sayıya yuvarlanır)"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/70 text-[10px] font-semibold text-slate-400">
                    {locale === "en" ? "⏳ Does not carry over to next year" : "⏳ Sonraki yıla taşınmaz"}
                  </span>
                </div>
                <span className="text-lg font-black text-purple-300 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 shrink-0">
                  {locale === "en" ? "20% Share" : "%20 Pay"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-sky-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 shrink-0" />
                    {locale === "en"
                      ? "Completed Travel Route Sharing"
                      : "Tamamlanan Seyahat Rotası Paylaşımı"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Routes saved as Completed (reversed if deleted or reverted)"
                      : "Geçmiş / Tamamlandı statüsünde rota paylaşımı (silinirse iade)"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                    {locale === "en"
                      ? "🎯 Season Start: Routes × 50 × 20% (rounded)"
                      : "🎯 Yıla Başlangıç: Toplam Rota × 50 × %20"}
                  </span>
                </div>
                <span className="text-lg font-black text-sky-300 px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/30 shrink-0">
                  +50 P
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 shrink-0" />
                    {locale === "en"
                      ? "Welcome Invite Bonus"
                      : "Hoşgeldin Davet Bonusu"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Joining the AllTripX community with a referral code"
                      : "Davet koduyla AllTripX ailesine katılım"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/70 text-[10px] font-semibold text-slate-400">
                    {locale === "en" ? "⏳ Does not carry over to next year" : "⏳ Sonraki yıla taşınmaz"}
                  </span>
                </div>
                <span className="text-lg font-black text-amber-300 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0">
                  +50 P
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-teal-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 shrink-0" />
                    {locale === "en"
                      ? "Confirmed Friend / Family Connection"
                      : "Arkadaş / Aile İlişkisi Kurma"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Awarded to both travelers on mutual acceptance (reversed if removed)"
                      : "Karşılıklı onaylanan her arkadaş, akraba veya aile bağlantısı (kaldırılırsa iade)"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                    {locale === "en"
                      ? "🎯 Season Start: Connections × 20 × 20% (rounded)"
                      : "🎯 Yıla Başlangıç: Sosyal İlişki × 20 × %20"}
                  </span>
                </div>
                <span className="text-lg font-black text-teal-300 px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 shrink-0">
                  +20 P
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 shrink-0" />
                    {locale === "en"
                      ? "Travel / Place Pin Creation"
                      : "Gezi / Mekan Pini Ekleme"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Adding a new visited city or place pin to the map"
                      : "Haritaya yeni ziyaret veya mekan pini katkısı"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                    {locale === "en"
                      ? "🎯 Season Start: Pins × 10 × 20% (rounded)"
                      : "🎯 Yıla Başlangıç: Toplam Pin × 10 × %20"}
                  </span>
                </div>
                <span className="text-lg font-black text-cyan-300 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shrink-0">
                  +10 P
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 shrink-0" />
                    {locale === "en" ? "Daily Explorer Login" : "Günlük Kaşif Girişi"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Once-a-day platform loyalty check-in reward"
                      : "Günde 1 kez platforma giriş sadakat ödülü"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/70 text-[10px] font-semibold text-slate-400">
                    {locale === "en" ? "⏳ Does not carry over to next year" : "⏳ Sonraki yıla taşınmaz"}
                  </span>
                </div>
                <span className="text-base font-bold text-blue-300 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 shrink-0">
                  +5 P
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                    {locale === "en"
                      ? "Comment & Like Interaction"
                      : "Yorum & Beğeni Etkileşimi"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Meaningful contribution to community posts"
                      : "Topluluk içeriklerine anlamlı katkı"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/70 text-[10px] font-semibold text-slate-400">
                    {locale === "en" ? "⏳ Does not carry over to next year" : "⏳ Sonraki yıla taşınmaz"}
                  </span>
                </div>
                <span className="text-base font-bold text-pink-300 px-3 py-1 rounded-xl bg-pink-500/10 border border-pink-500/30 shrink-0">
                  +5 P
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-lime-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-bold text-lime-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {locale === "en"
                      ? "On Vacation — Visited Place"
                      : "Tatildeyim — Görülen Yer"}
                  </span>
                  <p className="text-xs text-slate-400">
                    {locale === "en"
                      ? "Each place marked visited in On Vacation guide (-2 P if removed)"
                      : "Tatildeyim rehberinde görüldü eklenen her yer (çıkarılırsa -2 P iade)"}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                    {locale === "en"
                      ? "🎯 Season Start: Visited Places × 2 × 20% (rounded)"
                      : "🎯 Yıla Başlangıç: Görülen Yer × 2 × %20"}
                  </span>
                </div>
                <span className="text-base font-black text-lime-300 px-3 py-1 rounded-xl bg-lime-500/10 border border-lime-500/30 shrink-0">
                  +2 P
                </span>
              </div>
            </div>
          </div>

          {/* Adil Oyun Sözleşmesi (Fair Play & Ban Hammer) */}
          <div className="bg-slate-900/60 border border-rose-950/40 rounded-3xl p-5 sm:p-7 space-y-4">
            <h2 className="text-lg font-black text-rose-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
              {locale === "en" ? "Fair Play & Anti-Cheat Contract" : "Adil Oyun Sözleşmesi & Ceza Kuralları"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/30 space-y-1">
                <span className="font-bold text-rose-300 flex items-center gap-1">🚫 Sahte Konum (GPS Spoofing)</span>
                <p className="text-slate-400 leading-relaxed">
                  Fiziken bulunulmayan konumlara sahte GPS yazılımı ile check-in yapılması durumunda ilgili eylem silinir; mükerrer ihlalde sezonluk havuz hakkı dondurulur.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/30 space-y-1">
                <span className="font-bold text-rose-300 flex items-center gap-1">⚠️ Uygunsuz İçerik & Yalan Bilgi</span>
                <p className="text-slate-400 leading-relaxed">
                  Topluluk kurallarına aykırı veya aldatıcı pin/yorum girişlerinde içerik derhal kaldırılır ve hesaba <strong>-500 Puan</strong> idari ceza uygulanır.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/30 space-y-1">
                <span className="font-bold text-rose-300 flex items-center gap-1">🔨 Bot ve Otomasyon (Ban Hammer)</span>
                <p className="text-slate-400 leading-relaxed">
                  Otomatik script veya bot yazılımlarla yapay puan toplamaya çalışan hesaplar sıfır toleransla tespit edilerek kalıcı olarak sistemden men edilir.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-900/30 space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  {locale === "en" ? "🎯 Season Starting Score" : "🎯 Yıla Başlangıç Puanı"}
                </span>
                <p className="text-slate-400 leading-relaxed">
                  {locale === "en"
                    ? "At the start of each new year, your starting score is calculated from your active assets to date: (Total Pins × 10 × 20%) + (Completed Routes × 50 × 20%) + (Confirmed Connections × 20 × 20%) + (Visited Places × 2 × 20%). Other point types do not carry over; all percentage calculations are always rounded to whole integers."
                    : "Yeni yıla başlarken o güne kadarki aktif kayıtların üzerinden hesaplanır: (Toplam Pin × 10 × %20) + (Tamamlanan Rota × 50 × %20) + (Sosyal İlişki × 20 × %20) + (Görülen Yer × 2 × %20). Diğer puan kalemleri sonraki yıla taşınmaz; tüm oran hesaplamalarında ondalıklar en yakın tam sayıya yuvarlanır."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 3: DETAYLI SAYFALAMALI PUAN DEFTERİ */}
      {activeTab === "ledger" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                {locale === "en" ? "Immutable Points Ledger" : "Detaylı Puan Defteri Geçmişi"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {locale === "en" ? `Total ${ledgerData.totalCount} transactions logged` : `Toplam ${ledgerData.totalCount} işlem muhasebeleştirildi`}
              </p>
            </div>

            {/* Sayfa Navigasyonu */}
            {ledgerData.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={ledgerPage <= 1 || isPending}
                  onClick={() => handlePageChange(ledgerPage - 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center gap-1 transition-all min-h-[36px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {locale === "en" ? "Prev" : "Önceki"}
                </button>

                <span className="text-xs text-slate-400 font-mono px-2">
                  {ledgerPage} / {ledgerData.totalPages}
                </span>

                <button
                  type="button"
                  disabled={ledgerPage >= ledgerData.totalPages || isPending}
                  onClick={() => handlePageChange(ledgerPage + 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center gap-1 transition-all min-h-[36px]"
                >
                  {locale === "en" ? "Next" : "Sonraki"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Defter Satırları */}
          <div className="space-y-2.5">
            {ledgerData.items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                {locale === "en" ? "No point activities recorded yet." : "Henüz bir puan işlemi bulunmuyor."}
              </div>
            ) : (
              ledgerData.items.map((entry) => {
                const badge = formatActionBadge(entry.actionType);
                const isPositive = entry.finalPoints >= 0;
                const formattedDate = new Date(entry.createdAt).toLocaleDateString(
                  locale === "en" ? "en-US" : "tr-TR",
                  { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
                );

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                          {entry.description || entry.actionType}
                        </p>
                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                      {entry.multiplier > 1 && (
                        <span className="text-[11px] text-amber-400/80 font-bold px-2 py-0.5 rounded-lg bg-amber-500/10">
                          {entry.multiplier}x Çarpan
                        </span>
                      )}
                      <span
                        className={`text-sm sm:text-base font-black font-mono ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${entry.finalPoints}` : entry.finalPoints} P
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
