"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Search,
  Compass,
  MapPin,
  Calendar,
  CheckCheck,
  Check,
  User,
  Coffee,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import {
  getConversationList,
  getMessages,
  sendMessage,
  type ConversationItem,
  type ChatMessageItem,
} from "@/lib/actions/chat";
import { toast } from "sonner";

interface ChatViewProps {
  initialConversations: ConversationItem[];
  currentUserId: string;
  defaultPartnerId?: string | null;
}

export function ChatView({
  initialConversations,
  currentUserId,
  defaultPartnerId,
}: ChatViewProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(
    defaultPartnerId || initialConversations[0]?.partner.id || null
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.partner.id === activePartnerId);

  // Mesaj listesini en alta kaydır
  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }

  // Seçili partnerin mesajlarını yükle
  async function loadActiveMessages(partnerId: string, isSilent = false) {
    if (!isSilent) setLoadingMessages(true);
    try {
      const data = await getMessages(partnerId);
      setMessages(data);
      if (!isSilent) setTimeout(() => scrollToBottom("auto"), 50);

      // Konuşma listesindeki okunmamış sayısını yerel olarak sıfırla
      setConversations((prev) =>
        prev.map((c) =>
          c.partner.id === partnerId ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  }

  // Konuşma listesini arka planda güncelle
  async function refreshConversations() {
    try {
      const data = await getConversationList();
      setConversations(data);
    } catch (e) {
      // sessizce geç
    }
  }

  // Aktif partner değiştiğinde mesajları çek
  useEffect(() => {
    if (activePartnerId) {
      loadActiveMessages(activePartnerId);
    }
  }, [activePartnerId]);

  // Canlı polling: Her 5 saniyede bir aktif sohbeti ve konuşmaları güncelle
  useEffect(() => {
    const interval = setInterval(() => {
      if (activePartnerId) {
        loadActiveMessages(activePartnerId, true);
      }
      refreshConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [activePartnerId]);

  // Mesaj Gönder
  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!activePartnerId || !messageText.trim() || sending) return;

    const trimmed = messageText.trim();
    setMessageText("");
    setSending(true);

    // İyimser UI güncellemesi (Optimistic update)
    const optimisticMsg: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: activePartnerId,
      messageText: trimmed,
      isRead: false,
      createdAt: new Date(),
      isMine: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 30);

    const res = await sendMessage({
      receiverId: activePartnerId,
      messageText: trimmed,
      matchId: activeConversation?.matchInfo.matchId,
    });

    if (res.success && res.data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? res.data! : m))
      );
      refreshConversations();
    } else {
      toast.error(res.message || "Mesaj iletilemedi.");
      // Hata durumunda geri al
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    }

    setSending(false);
  }

  // Hızlı seyahat mesajı seçimi
  function handleQuickPrompt(text: string) {
    setMessageText(text);
  }

  // Filtrelenmiş konuşmalar
  const filteredConversations = conversations.filter(
    (c) =>
      c.partner.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.matchInfo.cityName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatMessageTime(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="h-[calc(100vh-140px)] min-h-[580px] max-w-7xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col md:flex-row">
      {/* SOL PANEL: Konuşma / Eşleşen Arkadaşlar Listesi */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-800/80 flex flex-col bg-slate-950/40 shrink-0 ${
          activePartnerId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Sol Başlık & Arama */}
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Gezgin Sohbeti</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60">
              {conversations.length} Eşleşme
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Arkadaş veya şehir ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Konuşmalar Listesi */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {conversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-400 flex items-center justify-center text-2xl mb-3 shadow-inner">
                🧭
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Henüz Eşleşmeniz Yok</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4 max-w-[220px]">
                Gezgin Eşleşmesi (Radar) sayfasına giderek rotanızla çakışan gezginlerle tanışın ve sohbete başlayın!
              </p>
              <Link
                href="/match"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Radara Git</span>
              </Link>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Aramanıza uygun sohbet bulunamadı.
            </div>
          ) : (
            filteredConversations.map((item) => {
              const isSelected = item.partner.id === activePartnerId;
              return (
                <div
                  key={item.partner.id}
                  onClick={() => setActivePartnerId(item.partner.id)}
                  className={`p-3.5 px-4 flex items-start gap-3 transition-colors cursor-pointer text-left relative ${
                    isSelected
                      ? "bg-cyan-950/30 border-l-4 border-cyan-400"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {item.partner.avatarUrl ? (
                        <span className="text-xl">{item.partner.avatarUrl}</span>
                      ) : (
                        item.partner.fullName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                  </div>

                  {/* Detaylar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-white truncate">
                        {item.partner.fullName}
                      </span>
                      {item.lastMessage && (
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {formatMessageTime(item.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    {/* Ortak Rota Rozeti */}
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-medium mb-1 truncate max-w-full">
                      <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{item.matchInfo.cityName}</span>
                    </div>

                    {/* Son Mesaj Özeti */}
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.lastMessage ? (
                        item.lastMessage.messageText
                      ) : (
                        <span className="text-slate-500 italic">Sohbeti başlat...</span>
                      )}
                    </p>
                  </div>

                  {/* Okunmamış Mesaj Sayacı */}
                  {item.unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shadow-md shadow-blue-500/50 mt-1 shrink-0">
                      {item.unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SAĞ PANEL: Aktif Sohbet Penceresi */}
      <div
        className={`flex-1 flex flex-col bg-slate-900/60 ${
          !activePartnerId ? "hidden md:flex" : "flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Sohbet Üst Barı */}
            <div className="p-3.5 px-4 sm:px-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobilde Geri Dön Butonu */}
                <button
                  type="button"
                  onClick={() => setActivePartnerId(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {activeConversation.partner.avatarUrl ? (
                    <span className="text-xl">{activeConversation.partner.avatarUrl}</span>
                  ) : (
                    activeConversation.partner.fullName.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>{activeConversation.partner.fullName}</span>
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{activeConversation.matchInfo.cityName}</span>
                    </span>
                    {activeConversation.matchInfo.overlapDates && (
                      <span className="text-slate-500">
                        • {activeConversation.matchInfo.overlapDates}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rota Detayı Rozeti */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 text-xs font-semibold">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span>Eşleşen Seyahat Arkadaşı</span>
              </div>
            </div>

            {/* Mesaj Akışı Alanı */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {/* Tanışma Başlangıç Kutusu */}
              <div className="my-4 p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-center max-w-md mx-auto">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2 text-sm">
                  ☕
                </div>
                <h4 className="text-xs font-bold text-white">
                  {activeConversation.partner.fullName} ile eşleştiniz!
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {activeConversation.matchInfo.cityName} seyahatiniz için buluşma planı yapabilir, deneyimlerinizi paylaşabilirsiniz.
                </p>
              </div>

              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Mesajlar yükleniyor...
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Henüz bir mesaj yazılmadı. Aşağıdaki hızlı ifadelerden birini seçerek veya mesajınızı yazarak sohbeti başlatın!
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.isMine ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[85%] sm:max-w-[70%] break-words shadow-md ${
                        m.isMine
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm"
                          : "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-sm"
                      }`}
                    >
                      <p>{m.messageText}</p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                          m.isMine ? "text-cyan-100/80" : "text-slate-400"
                        }`}
                      >
                        <span>{formatMessageTime(m.createdAt)}</span>
                        {m.isMine && (
                          m.isRead ? (
                            <span title="Okundu"><CheckCheck className="w-3 h-3 text-cyan-200" /></span>
                          ) : (
                            <span title="İletildi"><Check className="w-3 h-3 text-cyan-200/60" /></span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Hızlı Seyahat İfadeleri (Pills - Mobil-First: flex-wrap, sıfır yatay kaydırma) */}
            <div className="px-4 sm:px-6 py-2 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleQuickPrompt("📍 Nerede buluşalım?")}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                📍 Nerede buluşalım?
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("☕ Müsait olduğunda bir kahve içelim mi?")}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                ☕ Bir kahve içelim mi?
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("✈️ Seyahat planın nasıl gidiyor?")}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                ✈️ Seyahat planın nasıl?
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("🌴 Rotalarımızı birleştirelim mi?")}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                🌴 Rotamızı birleştirelim!
              </button>
            </div>

            {/* Mesaj Giriş Formu */}
            <form
              onSubmit={handleSend}
              className="p-3.5 px-4 sm:px-6 border-t border-slate-800/80 bg-slate-950/80 flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Bir mesaj yazın... (Enter ile gönder)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gönder</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700/60 text-slate-400 flex items-center justify-center text-3xl mb-3 shadow-inner">
              💬
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Bir Sohbet Seçin</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Sol taraftaki seyahat arkadaşlarınızdan birine tıklayarak sohbet geçmişinizi görüntüleyin ve mesajlaşmaya başlayın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
