"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getUnreadChatCount } from "@/lib/actions/chat";
import { useTranslation } from "@/lib/i18n/context";

export function ChatBadge() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadCount() {
    try {
      const count = await getUnreadChatCount();
      setUnreadCount(count);
    } catch (e) {
      // sessizce geç
    }
  }

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 15000); // 15 saniyede bir kontrol
    return () => clearInterval(interval);
  }, [pathname]);

  const isActive = pathname.startsWith("/messages");

  return (
    <Link
      href="/messages"
      className={`relative w-[38px] h-[38px] rounded-xl transition-all cursor-pointer flex items-center justify-center group border ${
        isActive
          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
          : "bg-slate-900/60 border-slate-800/80 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-cyan-500/10"
      }`}
      aria-label={t("chat.badgeTitle")}
    >
      <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />

      {/* Canlı Mavi/Mor Okunmamış Mesaj Rozeti (Kutunun Sağ Üst Köşesine Ankrajlı) */}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-black text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full border-2 border-slate-900 shadow-lg shadow-blue-500/50 animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      {/* Tooltip */}
      <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
        {t("chat.badgeTitle")} {unreadCount > 0 ? `(${unreadCount} ${t("notifications.newBadge")})` : ""}
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
      </span>
    </Link>
  );
}
