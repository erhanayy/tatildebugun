"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Heart,
  MessageCircle,
  Coffee,
  Sparkles,
  CheckCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/actions/notifications";
import { toast } from "sonner";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sayacı yükle
  async function loadCount() {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (e) {
      // sessizce geç
    }
  }

  // Bildirim listesini yükle
  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await getUserNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // İlk yüklemede ve 20 saniyede bir periyodik kontrol
  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 20000);
    return () => clearInterval(interval);
  }, []);

  // Dropdown açılınca listeyi güncelle
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadCount();
    }
  }, [isOpen]);

  // Dışarı tıklandığında kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleNotificationClick(item: NotificationItem) {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }

    setIsOpen(false);

    // İlgili sayfaya yönlendir
    if (item.type === "match_request" || item.type === "match_accepted") {
      router.push("/match");
    } else {
      router.push("/feed");
    }
  }

  async function handleMarkAllAsRead() {
    await markAllNotificationsAsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("Tüm bildirimler okundu olarak işaretlendi.");
  }

  function formatTime(date: Date | string) {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Şimdi";
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    return `${days} gün önce`;
  }

  function getIcon(type: string) {
    switch (type) {
      case "reaction":
        return <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />;
      case "comment":
        return <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />;
      case "match_request":
        return <Coffee className="w-3.5 h-3.5 text-amber-400" />;
      case "match_accepted":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Zil & Rozet Butonu */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl transition-all cursor-pointer group ${
          isOpen
            ? "bg-slate-800 text-cyan-400 border border-slate-700"
            : "text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent"
        }`}
        aria-label="Bildirimler"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />

        {/* Canlı Kırmızı Bildirim Rozeti (Badge) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-black text-white bg-rose-500 rounded-full border-2 border-slate-900 shadow-lg shadow-rose-500/50 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Tooltip (Menü açık değilken gösterilir) */}
        {!isOpen && (
          <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
            Bildirimler {unreadCount > 0 ? `(${unreadCount} yeni)` : ""}
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
          </span>
        )}
      </button>

      {/* Açılır Bildirim Menüsü (Dropdown) */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-auto md:right-0 mt-2.5 w-[330px] sm:w-[380px] bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Başlık Alanı */}
          <div className="p-3.5 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                  {unreadCount} yeni
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tümünü Okundu Yap</span>
              </button>
            )}
          </div>

          {/* Bildirim Listesi */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/50">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Bildirimler yükleniyor...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-2xl mb-2.5 border border-slate-700/60">
                  🌴
                </div>
                <h4 className="text-xs font-bold text-slate-300">Henüz bildiriminiz yok</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                  Seyahatleriniz ve rotalarınızla etkileşim olduğunda burada görünecektir.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 px-4 flex items-start gap-3 hover:bg-slate-800/60 transition-colors cursor-pointer text-left relative ${
                    !item.isRead ? "bg-cyan-950/20" : ""
                  }`}
                >
                  {/* Aktör Avatarı ve İkon Rozeti */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {item.actor.avatarUrl ? (
                        <span className="text-base">{item.actor.avatarUrl}</span>
                      ) : (
                        item.actor.fullName?.slice(0, 2).toUpperCase() || "🌴"
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-700 shadow-sm">
                      {getIcon(item.type)}
                    </div>
                  </div>

                  {/* Bildirim İçeriği */}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs text-slate-200 font-medium leading-snug">
                      {item.title}
                    </p>
                    {item.content && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 bg-slate-950/40 p-1.5 px-2 rounded-lg border border-slate-800/60">
                        &quot;{item.content}&quot;
                      </p>
                    )}
                    <span className="text-[10px] text-slate-500 mt-1.5 inline-block font-mono">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>

                  {/* Okunmadı Mavi Nokta */}
                  {!item.isRead && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80 mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
