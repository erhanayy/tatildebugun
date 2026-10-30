"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getUnreadChatCount } from "@/lib/actions/chat";

export function ChatBadge() {
  const pathname = usePathname();
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
      className={`relative p-2 rounded-xl transition-all cursor-pointer group ${
        isActive
          ? "bg-slate-800 text-cyan-400 border border-slate-700"
          : "text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent"
      }`}
      aria-label="Gezgin Sohbeti"
    >
      <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />

      {/* Canlı Mavi/Mor Okunmamış Mesaj Rozeti (Badge) */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-black text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full border-2 border-slate-900 shadow-lg shadow-blue-500/50 animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      {/* Tooltip */}
      <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
        Gezgin Sohbeti {unreadCount > 0 ? `(${unreadCount} yeni)` : ""}
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
      </span>
    </Link>
  );
}
