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
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { ChatBadge } from "@/components/navigation/chat-badge";

interface AppHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Davet Linki
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tatildebugun.com";
  const inviteUrl = `${origin}/davet/${user.id}`;
  const inviteMessage = `Selam! TatildeBugün'de dünya seyahat haritamı oluşturdum ve rotalarımı paylaştım. Sen de katılarak seyahatlerimizi eşleştirebiliriz: ${inviteUrl}`;

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Davet linki kopyalandı! 📋");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleWhatsAppShare() {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteMessage)}`;
    window.open(waUrl, "_blank");
  }

  const navLinks = [
    {
      href: "/dashboard",
      label: "Dünya Haritam",
      icon: Globe,
      active: pathname === "/dashboard",
    },
    {
      href: "/feed",
      label: "Gezgin Akışı & Rotalar",
      icon: Compass,
      active: pathname.startsWith("/feed"),
    },
    {
      href: "/match",
      label: "Gezgin Eşleşmesi (Radar)",
      icon: Radar,
      active: pathname.startsWith("/match"),
    },
    {
      href: "/tatildeyim",
      label: "Tatildeyim (Tur Rehberim)",
      icon: Luggage,
      active: pathname.startsWith("/tatildeyim"),
    },
  ];

  return (
    <>
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Marka */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
                <Palmtree className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-white">
                Tatilde<span className="text-cyan-400">Bugün</span>
              </span>
            </Link>

            {/* Masaüstü Navigasyon Sekmeleri (Zarif İkon Butonları & Tooltip) */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-label={link.label}
                    className={`p-2.5 rounded-xl transition-all relative flex items-center justify-center cursor-pointer group ${
                      link.active
                        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent"
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

          {/* Sağ Alan: Davet Et + Bildirimler + Sohbet + Profil & Çıkış */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Arkadaşını Davet Et İkon Butonu */}
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="relative p-2 rounded-xl text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center group"
              aria-label="Arkadaşını Davet Et"
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />

              {/* Tooltip */}
              <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                Arkadaşını Davet Et 🎁
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
              </span>
            </button>

            {/* Bildirim Çanı & Rozeti */}
            <NotificationBell />

            {/* Gezgin Sohbeti & Rozeti */}
            <ChatBadge />

            {/* Kullanıcı Profili Bağlantısı (Kompakt Avatar) */}
            <Link
              href="/profile"
              className="relative p-1 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all cursor-pointer group flex items-center"
              aria-label="Profilim & Ayarlar"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "🌴"}
              </div>

              {/* Tooltip */}
              <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                {user.name || "Gezgin"} (Profilim & Ayarlar)
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
              </span>
            </Link>

            {/* Çıkış Yap (Kompakt İkon) */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="relative p-2 rounded-xl text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 transition-colors cursor-pointer flex items-center justify-center group"
                aria-label="Güvenli Çıkış Yap"
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />

                {/* Tooltip (Sağ sınıra taşmaması için sağa hizalı) */}
                <span className="absolute top-full mt-2.5 right-0 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
                  Güvenli Çıkış Yap
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
                className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold ${
                  link.active ? "text-cyan-400 bg-cyan-950/40" : "text-slate-400"
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
            <span>Sohbet</span>
          </Link>
          <Link
            href="/profile"
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold ${
              pathname === "/profile" ? "text-cyan-400 bg-cyan-950/40" : "text-slate-400"
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>Profil</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold text-emerald-400"
          >
            <UserPlus className="w-5 h-5 mb-0.5" />
            <span>Davet</span>
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
                    Arkadaşını Davet Et 🎁
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Birlikte gezin, rotalarınızı eşleştirin
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
              Özel davet linkin ile arkadaşlarını TatildeBugün'e davet et. Aynı şehirde ve tarihte
              buluştuğunuzda anında eşleşip rota oluşturun!
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
                <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
              </button>
            </div>

            {/* WhatsApp ile Hızlı Paylaş */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp ile Hemen Paylaş</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
