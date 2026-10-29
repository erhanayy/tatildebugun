"use client";

import { useState } from "react";
import type { FeedItem, ReactionType } from "@/lib/actions/social";
import { toggleReaction, addComment } from "@/lib/actions/social";
import { getCountryFlagEmoji } from "@/lib/country-flags";
import {
  Heart,
  Plane,
  Palmtree,
  MessageSquare,
  Send,
  Navigation,
  Calendar,
  Clock,
  CheckCircle2,
  Share2,
  Sparkles,
  MapPin,
  Car,
  Train,
  Bus,
  Motorbike,
  Bike,
} from "lucide-react";
import { toast } from "sonner";

interface FeedViewProps {
  initialFeed: FeedItem[];
  currentUserId: string;
}

export function FeedView({ initialFeed, currentUserId }: FeedViewProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialFeed);
  const [activeTab, setActiveTab] = useState<"all" | "visits" | "trips">("all");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Filtreleme
  const filteredItems = feedItems.filter((item) => {
    if (activeTab === "visits") return item.type === "visit";
    if (activeTab === "trips") return item.type === "trip";
    return true;
  });

  // Reaksiyon Verme (Optimistic UI)
  async function handleReaction(item: FeedItem, reactionType: ReactionType) {
    const isCurrentlySelected = item.reactions.userReaction === reactionType;
    const previousReaction = item.reactions.userReaction;

    // Optimistic Güncelleme
    setFeedItems((prev) =>
      prev.map((it) => {
        if (it.id !== item.id) return it;

        const newCounts = { ...it.reactions.counts };
        let newTotal = it.reactions.total;

        if (isCurrentlySelected) {
          // Geri al
          newCounts[reactionType] = Math.max(0, newCounts[reactionType] - 1);
          newTotal = Math.max(0, newTotal - 1);
          return {
            ...it,
            reactions: {
              ...it.reactions,
              counts: newCounts,
              total: newTotal,
              userReaction: null,
            },
          };
        } else {
          // Eski reaksiyonu düşür
          if (previousReaction) {
            newCounts[previousReaction] = Math.max(0, newCounts[previousReaction] - 1);
          } else {
            newTotal += 1;
          }
          // Yeni reaksiyonu artır
          newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;

          return {
            ...it,
            reactions: {
              ...it.reactions,
              counts: newCounts,
              total: newTotal,
              userReaction: reactionType,
            },
          };
        }
      })
    );

    const res = await toggleReaction(item.type, item.id, reactionType);
    if (!res.success) {
      toast.error("Tepki kaydedilemedi.");
    }
  }

  // Yorum Ekleme
  async function handleAddComment(item: FeedItem) {
    const text = commentInputs[item.id]?.trim();
    if (!text) return;

    setSubmittingComment((prev) => ({ ...prev, [item.id]: true }));

    const res = await addComment(item.type, item.id, text);

    if (res.success && res.comment) {
      setFeedItems((prev) =>
        prev.map((it) => {
          if (it.id !== item.id) return it;
          return {
            ...it,
            comments: [...it.comments, res.comment],
          };
        })
      );
      setCommentInputs((prev) => ({ ...prev, [item.id]: "" }));
      toast.success("Yorumun paylaşıldı!");
    } else {
      toast.error(res.message || "Yorum eklenirken hata oluştu.");
    }

    setSubmittingComment((prev) => ({ ...prev, [item.id]: false }));
  }

  function getTransportIcon(type?: string) {
    switch (type) {
      case "flight":
        return <Plane className="w-3.5 h-3.5" />;
      case "car":
        return <Car className="w-3.5 h-3.5" />;
      case "train":
        return <Train className="w-3.5 h-3.5" />;
      case "bus":
        return <Bus className="w-3.5 h-3.5" />;
      case "motorbike":
        return <Motorbike className="w-3.5 h-3.5" />;
      case "bicycle":
        return <Bike className="w-3.5 h-3.5" />;
      default:
        return <Navigation className="w-3.5 h-3.5" />;
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Üst Sekmeler */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: "Tümü (Keşfet)" },
            { id: "visits", label: "Şehir Ziyaretleri" },
            { id: "trips", label: "Rotalar" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filteredItems.length} Gönderi
        </span>
      </div>

      {/* Akış Kartları */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-cyan-500 opacity-60" />
          <h4 className="font-bold text-white text-base">Henüz paylaşım bulunamadı</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Haritaya bayrak veya rota ekleyerek topluluk akışında ilk hikayeni sen başlatabilirsin!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredItems.map((item) => {
            const isTrip = item.type === "trip";
            const flag = getCountryFlagEmoji(item.countryCode);
            const isCommentsOpen = !!openComments[item.id];

            return (
              <article
                key={`${item.type}-${item.id}`}
                className="rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl overflow-hidden hover:border-slate-700/80 transition-all"
              >
                {/* 1. Yazar ve Üst Başlık */}
                <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-cyan-500/20">
                      {item.author.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white leading-tight">
                        {item.author.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {isTrip ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Seyahat Rotası</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Şehir Ziyareti</span>
                    </span>
                  )}
                </div>

                {/* 2. Kart Gövdesi */}
                <div className="p-5 space-y-4">
                  {/* Başlık & Bayrak */}
                  <div className="flex items-start gap-3">
                    <span className="text-3xl select-none">{flag}</span>
                    <div className="flex-1">
                      <h3 className="font-extrabold text-base text-white">{item.title}</h3>
                      <p className="text-xs text-cyan-400 font-medium mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  {/* Tarih ve Ulaşım Rozetleri */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{item.dateStr}</span>
                    </span>

                    {item.transportType && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60">
                        {getTransportIcon(item.transportType)}
                        <span className="capitalize">{item.transportType}</span>
                      </span>
                    )}

                    {item.status && (
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                          item.status === "planned"
                            ? "bg-pink-950/40 text-pink-300 border-pink-800/60"
                            : "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                        }`}
                      >
                        {item.status === "planned" ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Planlanan Rota</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tamamlandı</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Rota Duraklar Zinciri (Trip ise) */}
                  {isTrip && item.stops && item.stops.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Rota Durakları ({item.stops.length})
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-200">
                        {item.stops.map((stop, idx) => (
                          <span key={stop.id} className="inline-flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>{getCountryFlagEmoji(stop.countryCode)}</span>
                            <span>{stop.cityName}</span>
                            {idx < item.stops!.length - 1 && (
                              <span className="text-cyan-500 font-bold mx-1">➔</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notlar / Açıklama */}
                  {item.notes && (
                    <p className="text-xs text-slate-300 italic bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 leading-relaxed">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* 3. Reaksiyonlar & Yorum Butonları */}
                <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-950/30 flex items-center justify-between">
                  {/* Reaksiyonlar */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { type: "heart", label: "Beğen", icon: Heart, activeClass: "text-red-500 fill-red-500 bg-red-500/10 border-red-500/30" },
                      { type: "plane", label: "Hayalim", icon: Plane, activeClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
                      { type: "palm", label: "Harika", icon: Palmtree, activeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      const count = item.reactions.counts[btn.type as ReactionType] || 0;
                      const isSelected = item.reactions.userReaction === btn.type;

                      return (
                        <button
                          key={btn.type}
                          type="button"
                          onClick={() => handleReaction(item, btn.type as ReactionType)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? btn.activeClass
                              : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {count > 0 && <span className="font-bold">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Yorum Butonu */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{item.comments.length} Yorum</span>
                  </button>
                </div>

                {/* 4. Yorumlar Bölümü (Açılır/Kapanır) */}
                {isCommentsOpen && (
                  <div className="p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-3 animate-in fade-in duration-150">
                    {/* Yorum Listesi */}
                    <div className="space-y-2.5 max-h-60 overflow-y-auto">
                      {item.comments.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2 text-center">
                          İlk yorumu sen yaz!
                        </p>
                      ) : (
                        item.comments.map((comm) => (
                          <div
                            key={comm.id}
                            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{comm.userName}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(comm.createdAt).toLocaleDateString("tr-TR")}
                              </span>
                            </div>
                            <p className="text-slate-300 leading-relaxed">{comm.commentText}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Yorum Ekleme Input'u */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={commentInputs[item.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddComment(item);
                          }
                        }}
                        placeholder="Yorumunu yaz..."
                        className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        disabled={submittingComment[item.id] || !commentInputs[item.id]?.trim()}
                        onClick={() => handleAddComment(item)}
                        className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
