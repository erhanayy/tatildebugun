"use client";

import { useState } from "react";
import type { FeedItem, ReactionType } from "@/lib/actions/social";
import {
  toggleReaction,
  addComment,
  muteTravelerAction,
  unmuteTravelerAction,
  getMutedTravelersAction,
  disconnectTravelerAction,
} from "@/lib/actions/social";
import { sendTravelerConnectionRequest } from "@/lib/actions/search-travelers";
import { CountryFlag } from "@/components/ui/country-flag";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  UserPlus,
  MoreVertical,
  UserMinus,
  EyeOff,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";

interface FeedViewProps {
  initialFeed: FeedItem[];
  currentUserId: string;
}

interface MutedUserItem {
  id: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  mutedAt: Date;
}

export function FeedView({ initialFeed, currentUserId }: FeedViewProps) {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialFeed);
  const [activeTab, setActiveTab] = useState<"all" | "visits" | "trips">("all");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Arkadaş Ekleme ve Menü Durumları
  const [pendingFriendRequests, setPendingFriendRequests] = useState<Record<string, boolean>>({});
  const [openActionMenu, setOpenActionMenu] = useState<Record<string, boolean>>({});

  // Gizlenen Gezginler Modalı
  const [isMutedModalOpen, setIsMutedModalOpen] = useState(false);
  const [mutedList, setMutedList] = useState<MutedUserItem[]>([]);
  const [loadingMutedList, setLoadingMutedList] = useState(false);

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
      toast.error(t("feed.reactionError"));
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
      toast.success(t("feed.commentSuccess"));
    } else {
      toast.error(res.message || t("feed.commentError"));
    }

    setSubmittingComment((prev) => ({ ...prev, [item.id]: false }));
  }

  // Hızlı Arkadaş Ekleme
  async function handleAddFriend(targetUserId: string, targetName: string) {
    setPendingFriendRequests((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      const res = await sendTravelerConnectionRequest({
        targetUserId,
        relationshipType: "friend",
        introMessage:
          locale === "en"
            ? `Hey ${targetName}! I saw your travels on AllTripX Explore feed and wanted to connect as friends 🌴`
            : `Selam ${targetName}! AllTripX Keşfet akışındaki seyahatini gördüm ve arkadaş olarak eklemek istedim 🌴`,
      });

      if (res.success) {
        toast.success(locale === "en" ? "Friend request sent! 🚀" : "Arkadaşlık isteği iletildi! 🚀");
        // Akıştaki tüm ilgili kartları "pending_outgoing" yap
        setFeedItems((prev) =>
          prev.map((it) =>
            it.author.id === targetUserId
              ? {
                  ...it,
                  author: {
                    ...it.author,
                    connectionStatus: "pending_outgoing",
                  },
                }
              : it
          )
        );
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error(locale === "en" ? "Failed to send request." : "İstek gönderilemedi.");
    } finally {
      setPendingFriendRequests((prev) => ({ ...prev, [targetUserId]: false }));
    }
  }

  // Gezgini Akıştan Kalıcı Gizle (Mute)
  async function handleHideTraveler(targetUserId: string, targetName: string) {
    setOpenActionMenu({});
    const previousItems = [...feedItems];

    // İyimser UI: O gezginin tüm gönderilerini akıştan anında kaldır
    setFeedItems((prev) => prev.filter((it) => it.author.id !== targetUserId));

    toast(`${targetName} ${t("feed.hideTravelerSuccess")}`, {
      action: {
        label: t("feed.undo"),
        onClick: async () => {
          setFeedItems(previousItems);
          await unmuteTravelerAction(targetUserId);
          toast.success(t("feed.unmuteSuccess"));
        },
      },
      duration: 6000,
    });

    const res = await muteTravelerAction(targetUserId);
    if (!res.success) {
      setFeedItems(previousItems);
      toast.error(res.message);
    }
  }

  // Bağlantıyı / Arkadaşlığı Kaldır (Disconnect)
  async function handleDisconnectTraveler(targetUserId: string, targetName: string) {
    setOpenActionMenu({});
    if (!window.confirm(`${targetName}: ${t("feed.disconnectConfirm")}`)) {
      return;
    }

    const res = await disconnectTravelerAction(targetUserId);
    if (res.success) {
      toast.success(t("feed.disconnectSuccess"));
      // İlgili kartları bağlantısız yap
      setFeedItems((prev) =>
        prev.map((it) =>
          it.author.id === targetUserId
            ? {
                ...it,
                author: {
                  ...it.author,
                  connectionStatus: "none",
                  relationshipType: null,
                },
              }
            : it
        )
      );
    } else {
      toast.error(res.message);
    }
  }

  // Gizlenen Gezginler Listesini Aç
  async function openMutedModal() {
    setIsMutedModalOpen(true);
    setLoadingMutedList(true);
    try {
      const data = await getMutedTravelersAction();
      setMutedList(data);
    } catch {
      toast.error("Gizlenen gezginler yüklenemedi.");
    } finally {
      setLoadingMutedList(false);
    }
  }

  // Gizlenen Gezgini Listeden Geri Aç (Unmute)
  async function handleUnmuteTraveler(targetUserId: string) {
    const res = await unmuteTravelerAction(targetUserId);
    if (res.success) {
      toast.success(t("feed.unmuteSuccess"));
      setMutedList((prev) => prev.filter((m) => m.id !== targetUserId));
      router.refresh();
    } else {
      toast.error(res.message);
    }
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
      {/* Üst Sekmeler ve Gizlenenler Butonu */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: t("feed.tabAll") },
            { id: "visits", label: t("feed.tabVisits") },
            { id: "trips", label: t("feed.tabTrips") },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                activeTab === tab.id
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openMutedModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-h-[36px]"
            title={t("feed.mutedTravelersTitle")}
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-400/80" />
            <span className="hidden sm:inline">{t("feed.mutedTravelersBtn")}</span>
          </button>

          <span className="text-xs text-slate-500 font-medium">
            {filteredItems.length} {t("feed.postsCount")}
          </span>
        </div>
      </div>

      {/* Akış Kartları */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-cyan-500 opacity-60" />
          <h4 className="font-bold text-white text-base">{t("feed.emptyTitle")}</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {t("feed.emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredItems.map((item) => {
            const isTrip = item.type === "trip";
            const isCommentsOpen = !!openComments[item.id];
            const isMenuOpen = !!openActionMenu[item.id];

            return (
              <article
                key={`${item.type}-${item.id}`}
                className="rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl overflow-hidden hover:border-slate-700/80 transition-all"
              >
                {/* 1. Yazar ve Üst Başlık */}
                <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-800/50 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      avatarUrl={item.author.avatarUrl}
                      name={item.author.fullName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white leading-tight truncate flex items-center gap-1.5">
                          <span>{item.author.fullName}</span>
                          {item.author.starDisplay ? (
                            <span
                              className="text-amber-400 text-xs shrink-0 font-medium tracking-tight"
                              title={`${item.author.starCount || 0} Yıldızlı Gezgin`}
                            >
                              {item.author.starDisplay}
                            </span>
                          ) : null}
                        </h4>

                        {/* Bağlantı / İlişki Tipi Rozetleri */}
                        {item.author.isSelf ? (
                          <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full shrink-0">
                            ({t("feed.self")})
                          </span>
                        ) : item.author.connectionStatus === "accepted" ? (
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1">
                            (
                            {item.author.relationshipType === "family"
                              ? t("feed.relFamily")
                              : item.author.relationshipType === "relative"
                              ? t("feed.relRelative")
                              : t("feed.relFriend")}
                            )
                          </span>
                        ) : item.author.connectionStatus === "pending_outgoing" ? (
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full shrink-0">
                            ({t("feed.requestSent")})
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[11px] text-slate-400 truncate">
                        {new Date(item.createdAt).toLocaleDateString(
                          locale === "en" ? "en-US" : "tr-TR",
                          {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Sağ Taraf: Arkadaş Ekle Butonu, Rota/Ziyaret Rozeti ve Üç Nokta Menüsü */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Arkadaş Olarak Ekle Butonu */}
                    {!item.author.isSelf && item.author.connectionStatus === "none" && (
                      <button
                        type="button"
                        onClick={() => handleAddFriend(item.author.id, item.author.fullName)}
                        disabled={pendingFriendRequests[item.author.id]}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition-all shadow-sm cursor-pointer min-h-[36px] active:scale-95 disabled:opacity-50"
                        title={t("feed.addFriendBtn")}
                      >
                        {pendingFriendRequests[item.author.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">{t("feed.addFriendBtn")}</span>
                      </button>
                    )}

                    {isTrip ? (
                      <span className="hidden xs:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{t("feed.badgeTrip")}</span>
                      </span>
                    ) : (
                      <span className="hidden xs:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{t("feed.badgeVisit")}</span>
                      </span>
                    )}

                    {/* Üç Nokta Menüsü (...) */}
                    {!item.author.isSelf && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionMenu((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          aria-label={t("feed.moreOptions")}
                          title={t("feed.moreOptions")}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                            {item.author.connectionStatus === "accepted" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDisconnectTraveler(item.author.id, item.author.fullName)
                                }
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer text-left"
                              >
                                <UserMinus className="w-3.5 h-3.5 shrink-0" />
                                <span>{t("feed.disconnect")}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleHideTraveler(item.author.id, item.author.fullName)
                              }
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                            >
                              <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{t("feed.hideTraveler")}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Kart Gövdesi */}
                <div className="p-5 space-y-4">
                  {/* Başlık & Bayrak */}
                  <div className="flex items-start gap-3">
                    <CountryFlag
                      countryCode={item.countryCode}
                      width={32}
                      height={22}
                      className="shadow-md shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <h3 className="font-extrabold text-base sm:text-lg text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  {/* Tarih ve Süre Bilgisi */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{item.dateStr}</span>
                    </div>

                    {item.stayDurationDays && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.stayDurationDays} gün kalındı</span>
                      </div>
                    )}

                    {item.transportType && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-indigo-400">{getTransportIcon(item.transportType)}</span>
                        <span className="capitalize">{item.transportType}</span>
                      </div>
                    )}
                  </div>

                  {/* Rota Durakları (Eğer Trip ise) */}
                  {isTrip && item.stops && item.stops.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h5 className="text-xs font-bold text-slate-300">
                        {t("feed.routeStops")}:
                      </h5>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.stops.map((stop, idx) => (
                          <div
                            key={stop.id}
                            className="flex items-center gap-1.5 text-xs bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/80 text-slate-200"
                          >
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-semibold">{stop.cityName}</span>
                            {stop.arrivalDate && stop.departureDate ? (
                              <span className="text-[10px] text-slate-400">
                                ({Math.max(1, Math.round((new Date(stop.departureDate).getTime() - new Date(stop.arrivalDate).getTime()) / (1000 * 60 * 60 * 24)))} {locale === "en" ? "days" : "gün"})
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notlar & Hikaye */}
                  {item.notes && (
                    <p className="text-xs sm:text-sm text-slate-300 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 leading-relaxed italic">
                      "{item.notes}"
                    </p>
                  )}

                  {/* Reaksiyon ve Yorum Butonları */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReaction(item, "heart")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                          item.reactions.userReaction === "heart"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                        <span>{item.reactions.counts.heart || 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReaction(item, "plane")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                          item.reactions.userReaction === "plane"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                        }`}
                      >
                        <Plane className="w-4 h-4" />
                        <span>{item.reactions.counts.plane || 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReaction(item, "palm")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                          item.reactions.userReaction === "palm"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                        }`}
                      >
                        <Palmtree className="w-4 h-4" />
                        <span>{item.reactions.counts.palm || 0}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenComments((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer min-h-[36px]"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        {item.comments.length} {t("feed.commentsCount")}
                      </span>
                    </button>
                  </div>

                  {/* Yorumlar Bölümü */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
                      {item.comments.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {item.comments.map((c) => (
                            <div
                              key={c.id}
                              className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-cyan-400">
                                  {c.userName}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(c.createdAt).toLocaleDateString(
                                    locale === "en" ? "en-US" : "tr-TR"
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300">{c.commentText}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-2">
                          {t("feed.firstComment")}
                        </p>
                      )}

                      {/* Yorum Yazma Formu */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={commentInputs[item.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(item);
                          }}
                          placeholder={t("feed.commentPlaceholder")}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors min-h-[40px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(item)}
                          disabled={
                            !commentInputs[item.id]?.trim() ||
                            submittingComment[item.id]
                          }
                          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center min-h-[40px]"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Gizlenen Gezginler Yönetim Modalı */}
      {isMutedModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-white">
                  {t("feed.mutedTravelersTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMutedModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-slate-400 mb-2">
                {t("feed.mutedTravelersDesc")}
              </p>

              {loadingMutedList ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-xs">Yükleniyor...</span>
                </div>
              ) : mutedList.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  {t("feed.mutedTravelersEmpty")}
                </div>
              ) : (
                mutedList.map((mUser) => (
                  <div
                    key={mUser.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        avatarUrl={mUser.avatarUrl}
                        name={mUser.fullName}
                        size="sm"
                      />
                      <div className="truncate">
                        <h5 className="font-bold text-xs text-white truncate">
                          {mUser.fullName}
                        </h5>
                        {mUser.username && (
                          <span className="text-[11px] text-cyan-400 font-mono">
                            @{mUser.username}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnmuteTraveler(mUser.id)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {t("feed.unmuteBtn")}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
