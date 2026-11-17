"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import {
  Palmtree,
  Globe,
  Compass,
  Radar,
  UserPlus,
  Share2,
  LogOut,
  Sparkles,
  Check,
  Copy,
  MessageCircle,
  X,
  User,
  Luggage,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { ChatBadge } from "@/components/navigation/chat-badge";
import { ContractEnforcer } from "@/components/agreements/contract-enforcer";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Contract } from "@/lib/db/schema";
import { useTranslation } from "@/lib/i18n/context";
import { UserAvatar } from "@/components/ui/user-avatar";

interface AppHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  pendingContracts?: Contract[];
}

export function AppHeader({ user, pendingContracts }: AppHeaderProps) {
  const pathname = usePathname();
  const { locale, setLanguage, t } = useTranslation();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Davet Linki
  const origin = typeof window !== "undefined" ? window.location.origin : "https://alltripx.com";
  const inviteUrl = `${origin}/davet/${user.id}`;
  const inviteMessage = locale === "en"
    ? `Hey! I created my world travel map on AllTripX and mapped my routes. Join now to match our journeys: ${inviteUrl}`
    : `Selam! AllTripX'te dünya seyahat haritamı oluşturdum ve rotalarımı paylaştım. Sen de katılarak seyahatlerimizi eşleştirebiliriz: ${inviteUrl}`;

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success(locale === "en" ? "Invite link copied! 📋" : "Davet linki kopyalandı! 📋");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleWhatsAppShare() {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteMessage)}`;
    window.open(waUrl, "_blank");
  }

  const navLinks = [
    {
      href: "/dashboard",
      label: t("nav.dashboard") || (locale === "en" ? "World Map" : "Dünya Haritam"),
      icon: Globe,
      active: pathname === "/dashboard",
      colorClass: "text-cyan-400 hover:text-cyan-300",
      activeBg: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-md shadow-cyan-500/15",
      hoverBg: "hover:bg-cyan-500/10 hover:border-cyan-500/25",
    },
    {
      href: "/feed",
      label: t("nav.feed") || (locale === "en" ? "Explore Feed" : "Gezgin Akışı"),
      icon: Compass,
      active: pathname.startsWith("/feed"),
      colorClass: "text-emerald-400 hover:text-emerald-300",
      activeBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-md shadow-emerald-500/15",
      hoverBg: "hover:bg-emerald-500/10 hover:border-emerald-500/25",
    },
    {
      href: "/match",
      label: t("nav.radar") || (locale === "en" ? "Route Radar" : "Rota Radarı"),
      icon: Radar,
      active: pathname.startsWith("/match"),
      colorClass: "text-purple-400 hover:text-purple-300",
      activeBg: "bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-md shadow-purple-500/15",
      hoverBg: "hover:bg-purple-500/10 hover:border-purple-500/25",
    },
    {
      href: "/tatildeyim",
      label: t("nav.tatildeyim") || (locale === "en" ? "On Vacation" : "Tatildeyim"),
      icon: Luggage,
      active: pathname.startsWith("/tatildeyim"),
      colorClass: "text-rose-400 hover:text-rose-300",
      activeBg: "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-md shadow-rose-500/15",
      hoverBg: "hover:bg-rose-500/10 hover:border-rose-500/25",
    },
    {
      href: "/passport",
      label: t("nav.passport") || (locale === "en" ? "Traveler Passport" : "Gezgin Pasaportu"),
      icon: Trophy,
      active: pathname.startsWith("/passport"),
      colorClass: "text-amber-400 hover:text-amber-300",
      activeBg: "bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20",
      hoverBg: "hover:bg-amber-500/15 hover:border-amber-500/30",
    },
  ];

  return (
    <>
      {/* Zorunlu KVKK ve Sözleşme Onay Denetçisi */}
      <ContractEnforcer userId={user.id} initialPendingContracts={pendingContracts} />

      {/* Gezgin İlk Kurulum & Gizlilik Tercihleri Sihirbazı */}
      <OnboardingWizard />

      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-[1500]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Marka */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
                <Palmtree className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-white">
                All<span className="text-cyan-400">TripX</span>
              </span>
            </Link>

            {/* Masaüstü Navigasyon Sekmeleri (Zarif Kapsül Ada / Segmented Dock) */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-inner shadow-slate-950/40 backdrop-blur-md">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-label={link.label}
                    className={`w-9 h-9 rounded-xl transition-all relative flex items-center justify-center cursor-pointer group ${
                      link.active
                        ? link.activeBg
                        : `${link.colorClass} ${link.hoverBg} border border-transparent`
                    }`}
                  >
                    <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />

                    {/* Zarif İpucu (Tooltip) */}
                    <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                      {link.label}
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sağ Alan: Birörnek Kokpit Aksiyon Kutuları (Dil, Davet, Zil, Mesaj, Admin, Profil, Çıkış) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Dil Hızlı Değiştirici (Language Quick Switcher - Kutulu) */}
            <button
              type="button"
              onClick={() => setLanguage(locale === "tr" ? "en" : "tr")}
              className="flex items-center justify-center gap-1.5 px-2.5 h-[38px] rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer group relative"
              aria-label={t("nav.language")}
              title={locale === "tr" ? "Switch to English" : "Türkçe'ye Geç"}
            >
              <span className="text-sm">{locale === "tr" ? "🇹🇷" : "🇬🇧"}</span>
              <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider">{locale.toUpperCase()}</span>

              {/* Tooltip */}
              <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                {locale === "tr" ? "English (Switch)" : "Türkçe (Geçiş Yap)"}
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
              </span>
            </button>

            {/* Arkadaşını Davet Et İkon Butonu (Masaüstü, 38x38px Kutu) */}
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="relative w-[38px] h-[38px] rounded-xl text-emerald-400 bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer hidden sm:flex items-center justify-center group"
              aria-label={t("nav.invite")}
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />

              {/* Tooltip */}
              <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                {t("nav.invite")} 🎁
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
              </span>
            </button>

            {/* Bildirim Çanı & Rozeti (38x38px Kutu) */}
            <NotificationBell />

            {/* Gezgin Sohbeti & Rozeti (Masaüstü, 38x38px Kutu) */}
            <div className="hidden sm:block">
              <ChatBadge />
            </div>

            {/* Yönetici Merkezi (Admin Hub) İkonu (Masaüstü, 38x38px Kutu) */}
            {(user as any).role === "admin" && (
              <Link
                href="/admin"
                className={`relative w-[38px] h-[38px] rounded-xl transition-all cursor-pointer hidden sm:flex items-center justify-center group border ${
                  pathname.startsWith("/admin")
                    ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-sm shadow-indigo-500/20"
                    : "text-indigo-400 bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/40 hover:bg-indigo-500/10"
                }`}
                aria-label={t("nav.admin")}
              >
                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />

                {/* Tooltip */}
                <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                  {t("nav.admin")} 🛡️
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
                </span>
              </Link>
            )}

            {/* Kullanıcı Profili Bağlantısı (38x38px Kutu & Avatar) */}
            <Link
              href="/profile"
              className="relative w-[38px] h-[38px] rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all cursor-pointer group flex items-center justify-center p-0.5 overflow-hidden"
              aria-label={t("nav.profile")}
            >
              <UserAvatar
                avatarUrl={user.image}
                name={user.name}
                size="sm"
                className="group-hover:scale-105 transition-transform"
              />

              {/* Tooltip */}
              <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                {user.name || "Gezgin"} ({t("nav.profile")})
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
              </span>
            </Link>

            {/* Çıkış Yap (Masaüstü, 38x38px Kutu) */}
            <form action={logoutAction} className="hidden sm:block">
              <button
                type="submit"
                className="relative w-[38px] h-[38px] rounded-xl text-rose-400 bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center justify-center group"
                aria-label={t("nav.logout")}
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />

                {/* Tooltip (Sağ sınıra taşmaması için sağa hizalı) */}
                <span className="absolute top-full mt-2.5 right-0 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                  {t("nav.logout")}
                  <span className="absolute -top-1 right-3 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Mobil Alt Sekmeler */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-1.5 bg-slate-900/95">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all ${
                  link.active
                    ? `${link.colorClass} bg-slate-800/90 shadow-sm`
                    : `${link.colorClass} opacity-75 hover:opacity-100`
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{link.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <Link
            href="/messages"
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold ${
              pathname.startsWith("/messages") ? "text-cyan-400 bg-cyan-950/40" : "text-slate-400"
            }`}
          >
            <MessageCircle className="w-5 h-5 mb-0.5" />
            <span>{t("nav.messages")}</span>
          </Link>
          <Link
            href="/profile"
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold ${
              pathname === "/profile" ? "text-cyan-400 bg-cyan-950/40" : "text-slate-400"
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>{t("nav.profile")}</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold text-emerald-400"
          >
            <UserPlus className="w-5 h-5 mb-0.5" />
            <span>{t("nav.invite")}</span>
          </button>
        </div>
      </header>

      {/* Arkadaşını Davet Et Modalı */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {t("inviteModal.title")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("inviteModal.subtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t("inviteModal.description")}
            </p>

            {/* Link Kopyalama Kutusu */}
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none px-2 select-all font-mono"
              />
              <button
                type="button"
                onClick={handleCopyInvite}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t("inviteModal.copiedBtn") : t("inviteModal.copyBtn")}</span>
              </button>
            </div>

            {/* WhatsApp ile Hızlı Paylaş */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t("inviteModal.shareWaBtn")}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
