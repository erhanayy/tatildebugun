"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTranslation } from "@/lib/i18n/context";
import {
  TravelerStats,
  getTravelerDashboardData,
  getLeaderboard,
  LeaderboardItem,
} from "@/lib/actions/traveler-dashboard";
import {
  Globe,
  MapPin,
  Route,
  Landmark,
  Clock,
  Trophy,
  Award,
  Sparkles,
  Users,
  Compass,
  ArrowRight,
  TrendingUp,
  Shield,
  Star,
  CheckCircle2,
  Lock,
  ChevronRight,
  Home,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface TravelerDashboardViewProps {
  initialStats: TravelerStats;
  initialLeaderboard: {
    items: LeaderboardItem[];
    userRank: number;
    totalParticipants: number;
  };
}

export function TravelerDashboardView({
  initialStats,
  initialLeaderboard,
}: TravelerDashboardViewProps) {
  const { locale, t } = useTranslation();
  const [stats, setStats] = useState<TravelerStats>(initialStats);
  const [includeHomeCity, setIncludeHomeCity] = useState(initialStats.includeHomeCity);
  const [isPending, startTransition] = useTransition();

  // Sıralama (Leaderboard) State
  const [leaderboardScope, setLeaderboardScope] = useState<"friends" | "family" | "relatives" | "global">("friends");
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Ana Şehri Dahil Et / Hariç Tut Değişimi
  function handleToggleHomeCity() {
    const nextVal = !includeHomeCity;
    setIncludeHomeCity(nextVal);

    startTransition(async () => {
      const updated = await getTravelerDashboardData(nextVal);
      if (updated) {
        setStats(updated);
        toast.success(
          nextVal
            ? locale === "en"
              ? "Home city visits included in travel statistics."
              : "Ana şehir ziyaretleri seyahat istatistiklerine dahil edildi."
            : locale === "en"
              ? "Home city visits excluded from travel statistics."
              : "Ana şehir ziyaretleri seyahat istatistiklerinden hariç tutuldu."
        );
      }
    });
  }

  // Sıralama Kapsamı Değişimi
  async function handleScopeChange(scope: "friends" | "family" | "relatives" | "global") {
    setLeaderboardScope(scope);
    setLoadingLeaderboard(true);
    try {
      const res = await getLeaderboard(scope);
      setLeaderboard(res);
    } catch (e) {
      toast.error(locale === "en" ? "Failed to load leaderboard." : "Sıralama yüklenirken bir sorun oluştu.");
    } finally {
      setLoadingLeaderboard(false);
    }
  }

  // Dünya Keşif Yüzdesi (Dünyada 195 BM üyesi ülke baz alınır)
  const worldCoveragePercent = Math.min(100, Math.round((stats.countryCount / 195) * 1000) / 10);

  // Dil seçimine göre dinamik başlıklar
  const tierTitle = locale === "en" ? stats.tierInfo.currentTier.titleEn : stats.tierInfo.currentTier.titleTr;
  const tierDesc = locale === "en" ? stats.tierInfo.currentTier.descEn : stats.tierInfo.currentTier.descTr;
  const nextTierTitle = stats.tierInfo.nextTier
    ? locale === "en"
      ? stats.tierInfo.nextTier.titleEn
      : stats.tierInfo.nextTier.titleTr
    : null;

  // Kıta isimlerini dile göre dönüştürme
  function getContinentName(rawName: string) {
    if (locale !== "en") return rawName;
    const map: Record<string, string> = {
      "Avrupa / Asya": "Europe / Asia",
      "Avrupa": "Europe",
      "Amerika": "Americas",
      "Asya": "Asia",
      "Afrika": "Africa",
      "Okyanusya": "Oceania",
      "Asya / Orta Doğu": "Asia / Middle East",
      "Avrupa / Akdeniz": "Europe / Med",
    };
    return map[rawName] || rawName;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Gezgin Pasaportu & Hero Alanı */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl p-5 sm:p-8">
        {/* Arka Plan Işık Efekti */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-amber-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Sol: Avatar, İsim, Rütbe & Yıldızlar */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <UserAvatar
                avatarUrl={stats.user.avatarUrl}
                name={stats.user.fullName}
                size="xl"
                className="ring-4 ring-slate-800/80 shadow-2xl"
              />
              <div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-500/60 flex items-center justify-center text-base shadow-lg"
                title={tierTitle}
              >
                {stats.tierInfo.currentTier.icon}
              </div>
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  {stats.user.fullName}
                </h1>
                {stats.user.username && (
                  <span className="text-xs text-slate-400 font-medium">
                    @{stats.user.username}
                  </span>
                )}
              </div>

              {/* Rütbe ve Yıldızlar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Rütbe Rozeti */}
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border ${stats.tierInfo.currentTier.badgeBorderClass}`}
                >
                  <span>{stats.tierInfo.currentTier.icon}</span>
                  <span>{tierTitle}</span>
                </span>

                {/* Kademeli Yıldızlar */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-bold shadow-sm"
                  title={`${stats.starInfo.stars} ${locale === "en" ? "Star Traveler" : "Yıldızlı Gezgin"} (${stats.countryCount} ${locale === "en" ? "Countries" : "Ülke"})`}
                >
                  <span className="tracking-tight text-amber-400 font-extrabold">
                    {stats.starInfo.starDisplay || "⭐"}
                  </span>
                  <span>
                    {stats.starInfo.stars > 0
                      ? locale === "en"
                        ? `${stats.starInfo.stars} Stars`
                        : `${stats.starInfo.stars} Yıldız`
                      : locale === "en"
                      ? "New Explorer"
                      : "Yeni Kaşif"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-lg line-clamp-2">
                {tierDesc}
              </p>
            </div>
          </div>

          {/* Sağ: Toplam Puan & Bir Sonraki Seviye İlerlemesi */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 w-full md:w-80 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {locale === "en" ? "TRAVELER SCORE" : "GEZGİN SKORU"}
              </span>
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
                {stats.score.toLocaleString(locale === "en" ? "en-US" : "tr-TR")}{" "}
                {locale === "en" ? "Pts" : "P"}
              </span>
            </div>

            {/* Rütbe İlerleme Çubuğu */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{tierTitle}</span>
                <span>
                  {nextTierTitle
                    ? locale === "en"
                      ? `${stats.tierInfo.pointsToNext} pts left`
                      : `${stats.tierInfo.pointsToNext} P kaldı`
                    : locale === "en"
                    ? "Max Rank 👑"
                    : "Maksimum Rütbe 👑"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${stats.tierInfo.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Kademeli Yıldız İlerlemesi (Her 5 ülke = 1 yıldız) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {locale === "en" ? "For Next Star:" : "Sonraki Yıldız İçin:"}
                </span>
                <span className="font-bold text-amber-400">
                  {stats.starInfo.progressInStar} / 5{" "}
                  {locale === "en" ? "countries" : "ülke"}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{
                    width: `${(stats.starInfo.progressInStar / 5) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500 text-right">
                {locale === "en"
                  ? `Visit ${stats.starInfo.remainingToNext} more ${
                      stats.starInfo.remainingToNext === 1 ? "country" : "countries"
                    } to unlock star #${stats.starInfo.stars + 1}!`
                  : `${stats.starInfo.remainingToNext} ülke daha ziyaret ederek ${
                      stats.starInfo.stars + 1
                    }. yıldızı kap!`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Ana Lokasyon Seçeneği (Toggle Switch: Dahil Et / Hariç Tut) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>
                {locale === "en"
                  ? "Include Home City in Statistics"
                  : "Ana Şehri İstatistiklere Dahil Et"}
              </span>
              {stats.user.baseCity && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  📍 {stats.user.baseCity}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {includeHomeCity
                ? locale === "en"
                  ? "Visits in your home city are currently included in your travel score and passport."
                  : "Şu an ana şehrinizdeki ziyaretler de seyahat istatistiklerinize ve karnenize yansıtılıyor."
                : locale === "en"
                ? "Your home city is currently excluded; only vacation, tour and exploration journeys are counted."
                : "Şu an ana şehriniz hariç tutuluyor; sadece tatil, tur ve keşif seyahatleriniz sayılıyor."}
            </p>
          </div>
        </div>

        {/* Modern Switch Butonu */}
        <button
          type="button"
          onClick={handleToggleHomeCity}
          disabled={isPending}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 shrink-0 ${
            includeHomeCity
              ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              includeHomeCity
                ? "bg-white border-white text-cyan-700"
                : "bg-slate-700 border-slate-600 text-transparent"
            }`}
          >
            {includeHomeCity && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <span>
            {includeHomeCity
              ? locale === "en"
                ? "Home City Included (Active)"
                : "Ana Şehir Dahil (Açık)"
              : locale === "en"
              ? "Home City Excluded (Filtered)"
              : "Ana Şehir Hariç (Filtreli)"}
          </span>
        </button>
      </div>

      {/* 3. Temel Gezgin Sayaçları (5 Kart - Mobile First Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Ülke */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">
              {locale === "en" ? "Visited Countries" : "Ziyaret Edilen Ülke"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.countryCount}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-semibold mt-1">
              <span>
                {locale === "en" ? "World Explored:" : "Dünya Keşfi:"} %
                {worldCoveragePercent}
              </span>
            </div>
          </div>
        </div>

        {/* Şehir */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">
              {locale === "en" ? "Visited Cities" : "Gezilen Şehir"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.cityCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {locale === "en" ? "Map pins and stops" : "Harita pini ve durak"}
            </p>
          </div>
        </div>

        {/* Seyahat Rotası */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">
              {locale === "en" ? "Travel Routes" : "Seyahat Rotası"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Route className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.tripCount}
            </div>
            <p className="text-[11px] text-purple-400 font-medium mt-1">
              {stats.completedTrips}{" "}
              {locale === "en" ? "completed" : "tamamlanan"}
            </p>
          </div>
        </div>

        {/* Tarihi Mekan / POI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">
              {locale === "en" ? "Places Checked-in" : "Mekan Check-in"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.poiCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {locale === "en" ? "Historic sights & POIs" : "Tarihi anıt & POI"}
            </p>
          </div>
        </div>

        {/* Seyahat Süresi */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold">
              {locale === "en" ? "Total Travel" : "Toplam Seyahat"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.totalDays} {locale === "en" ? "Days" : "Gün"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {locale === "en" ? "Time spent exploring" : "Yolda geçirilen süre"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. İki Kolonlu Panel: Kıta/Ülke Analizi & Sosyal Liderlik Sıralaması */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol (5 Kolon): Kıta Dağılımı & En Çok Gezilen Ülkeler */}
        <div className="lg:col-span-5 space-y-6">
          {/* Kıta Dağılımı */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                {locale === "en" ? "Continent Distribution" : "Kıta Dağılımı"}
              </h3>
              <span className="text-xs text-slate-500">
                {stats.continentDistribution.length}{" "}
                {locale === "en" ? "Continents" : "Kıta"}
              </span>
            </div>

            {stats.continentDistribution.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                {locale === "en"
                  ? "No travel records added yet."
                  : "Henüz seyahat kaydı eklenmedi."}
              </p>
            ) : (
              <div className="space-y-3">
                {stats.continentDistribution.map((cont, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">
                        {getContinentName(cont.name)}
                      </span>
                      <span className="text-slate-400">
                        {cont.count} {locale === "en" ? "Countries" : "Ülke"} (%
                        {cont.percentage})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                        style={{ width: `${cont.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* En Çok Gezilen Ülkeler */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                {locale === "en"
                  ? "Most Visited Countries"
                  : "En Çok Ziyaret Edilen Ülkeler"}
              </h3>
            </div>

            {stats.topCountries.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                {locale === "en"
                  ? "No visited countries yet."
                  : "Henüz ziyaret edilen ülke bulunmuyor."}
              </p>
            ) : (
              <div className="space-y-2.5">
                {stats.topCountries.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-500 w-4">
                        #{idx + 1}
                      </span>
                      <span className="text-base font-bold text-white">
                        {c.countryCode}
                      </span>
                      <span className="text-xs text-slate-300 font-medium truncate">
                        {c.countryName}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60">
                      {c.cityCount} {locale === "en" ? "Cities" : "Şehir"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ (7 Kolon): Sosyal Liderlik Sıralaması (Leaderboard) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                {locale === "en" ? "Social Leaderboard" : "Sosyal Liderlik Sıralaması"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {locale === "en"
                  ? "Travel score rankings among your friends, family and travelers"
                  : "Gezgin arkadaşlarınız ve aileniz arasındaki puan sıralaması"}
              </p>
            </div>

            {/* Kullanıcının Sırası Rozeti */}
            {leaderboard.userRank > 0 && (
              <div className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <span>{locale === "en" ? "🏆 Your Rank:" : "🏆 Sıranız:"}</span>
                <span className="text-amber-400 font-extrabold">
                  #{leaderboard.userRank}
                </span>
                <span className="text-slate-400">
                  / {leaderboard.totalParticipants}{" "}
                  {locale === "en" ? "Travelers" : "Gezgin"}
                </span>
              </div>
            )}
          </div>

          {/* Sekmeler (Tabs: Arkadaşlarım, Ailem, Akrabalarım, Genel) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => handleScopeChange("friends")}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                leaderboardScope === "friends"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🤝</span>
              <span>{locale === "en" ? "Friends" : "Arkadaşlar"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleScopeChange("family")}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                leaderboardScope === "family"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🏡</span>
              <span>{locale === "en" ? "Family" : "Ailem"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleScopeChange("relatives")}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                leaderboardScope === "relatives"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>👥</span>
              <span>{locale === "en" ? "Relatives" : "Akrabalar"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleScopeChange("global")}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                leaderboardScope === "global"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🌍</span>
              <span>{locale === "en" ? "Global" : "Genel"}</span>
            </button>
          </div>

          {/* Sıralama Listesi */}
          <div className="space-y-2 pt-2">
            {loadingLeaderboard ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {locale === "en"
                  ? "Updating leaderboard..."
                  : "Sıralama güncelleniyor..."}
              </div>
            ) : leaderboard.items.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800/80 p-6 space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-300">
                  {locale === "en"
                    ? "No connections in this category yet."
                    : "Bu kapsamda henüz bağlantınız bulunmuyor."}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {locale === "en"
                    ? "Connect with fellow travelers from explore feed or profile to join the race!"
                    : "Gezgin akışından veya profilinizden yeni bağlantılar ekleyerek yarışa katılabilirsiniz!"}
                </p>
              </div>
            ) : (
              leaderboard.items.map((item) => {
                const isTop1 = item.rank === 1;
                const isTop2 = item.rank === 2;
                const isTop3 = item.rank === 3;

                return (
                  <div
                    key={item.id}
                    className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      item.isSelf
                        ? "bg-cyan-950/30 border-cyan-500/50 shadow-lg shadow-cyan-500/5"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Sıra Numarası & Avatar & İsim */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isTop1
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                            : isTop2
                            ? "bg-slate-300 text-slate-950"
                            : isTop3
                            ? "bg-amber-700 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : item.rank}
                      </div>

                      <UserAvatar
                        avatarUrl={item.avatarUrl}
                        name={item.fullName}
                        size="md"
                        className="shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {item.fullName}
                          </h4>

                          {/* Kademeli Yıldızlar */}
                          {item.starDisplay && (
                            <span
                              className="text-amber-400 text-xs shrink-0 font-medium tracking-tight"
                              title={`${item.stars} ${
                                locale === "en" ? "Star Traveler" : "Yıldızlı Gezgin"
                              }`}
                            >
                              {item.starDisplay}
                            </span>
                          )}

                          {item.isSelf && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                              {locale === "en" ? "You" : "Siz"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>
                            {item.countryCount}{" "}
                            {locale === "en" ? "Countries" : "Ülke"}
                          </span>
                          <span>•</span>
                          <span>
                            {item.cityCount}{" "}
                            {locale === "en" ? "Cities" : "Şehir"}
                          </span>
                          <span>•</span>
                          <span>
                            {item.tripCount}{" "}
                            {locale === "en" ? "Routes" : "Rota"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Puan ve Rütbe İkonu */}
                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black text-amber-400">
                        {item.score.toLocaleString(locale === "en" ? "en-US" : "tr-TR")}{" "}
                        {locale === "en" ? "Pts" : "P"}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {locale === "en" ? item.tierTitleEn : item.tierTitleTr}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Kilit Açılabilir Başarım Rozetleri (Badges Grid) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              {locale === "en"
                ? "Achievement Badges & Trophies"
                : "Başarım Rozetleri & Kilitler"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {locale === "en"
                ? "Unlock exclusive travel badges by achieving milestones"
                : "Seyahat hedeflerini tamamlayarak özel madalya ve rozetleri açın"}
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
            {stats.badges.filter((b) => b.isUnlocked).length} / {stats.badges.length}{" "}
            {locale === "en" ? "Earned" : "Kazanıldı"}
          </span>
        </div>

        {/* Rozet Kartları Izgarası (Mobile First Responsive) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.badges.map((badge) => {
            const def = badge.definition;
            const title = locale === "en" ? def.titleEn : def.titleTr;
            const desc = locale === "en" ? def.descEn : def.descTr;

            return (
              <div
                key={def.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  badge.isUnlocked
                    ? "bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : "bg-slate-950/60 border-slate-800/80 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shrink-0 ${
                        badge.isUnlocked
                          ? "bg-amber-500/20 border-amber-500/40 shadow-md shadow-amber-500/20"
                          : "bg-slate-800 border-slate-700 grayscale"
                      }`}
                    >
                      {def.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{title}</span>
                        {badge.isUnlocked && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rozet Durumu & İlerleme Çubuğu */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {badge.isUnlocked ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {locale === "en" ? "Earned" : "Kazanıldı"}
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          {locale === "en" ? "Locked" : "Kilitli"}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-slate-300">
                      {badge.currentValue} / {badge.targetValue}
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.isUnlocked
                          ? "bg-amber-400"
                          : "bg-cyan-500"
                      }`}
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
