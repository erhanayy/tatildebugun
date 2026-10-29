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
      className={`relative p-2 rounded-xl transition-all cursor-pointer ${
        isActive
          ? "bg-slate-800 text-cyan-400 border border-slate-700"
          : "text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent"
      }`}
      title="Gezgin Sohbeti"
      aria-label="Mesajlar"
    >
      <MessageSquare className="w-5 h-5" />

      {/* Canlı Mavi/Mor Okunmamış Mesaj Rozeti (Badge) */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-black text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full border-2 border-slate-900 shadow-lg shadow-blue-500/50 animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
