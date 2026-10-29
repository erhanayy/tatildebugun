"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchCandidate } from "@/lib/actions/match";
import { sendMatchRequest, respondMatchRequest } from "@/lib/actions/match";
import { getCountryFlagEmoji } from "@/lib/country-flags";
import {
  Compass,
  Calendar,
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
  MessageCircle,
  MapPin,
  Clock,
  Heart,
  ChevronRight,
  UserCheck,
  Coffee,
  X,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface MatchViewProps {
  candidates: MatchCandidate[];
  incomingRequests: any[];
  outgoingRequests: any[];
}

export function MatchView({
  candidates: initialCandidates,
  incomingRequests: initialIncoming,
  outgoingRequests: initialOutgoing,
}: MatchViewProps) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>(initialCandidates);
  const [incoming, setIncoming] = useState<any[]>(initialIncoming);
  const [outgoing, setOutgoing] = useState<any[]>(initialOutgoing);
  const [activeTab, setActiveTab] = useState<"radar" | "incoming" | "outgoing">("radar");

  // Teklif Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<MatchCandidate | null>(null);
  const [introMessage, setIntroMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tanışma Modalı Aç
  function handleOpenRequestModal(candidate: MatchCandidate) {
    setSelectedCandidate(candidate);
    const dateText =
      candidate.overlapStartDate && candidate.overlapEndDate
        ? `${new Date(candidate.overlapStartDate).toLocaleDateString("tr-TR")} - ${new Date(
            candidate.overlapEndDate
          ).toLocaleDateString("tr-TR")}`
        : "aynı tarihlerde";

    setIntroMessage(
      `Merhaba ${candidate.user.fullName}! Ben de ${dateText} ${candidate.cityName} seyahatindeyim. Rotalarımızı birleştirmek ve bir kahve eşliğinde deneyimlerimizi paylaşmak ister misin? ☕`
    );
  }

  // İstek Gönder
  async function handleSendRequest() {
    if (!selectedCandidate) return;

    setIsSubmitting(true);

    const res = await sendMatchRequest({
      receiverId: selectedCandidate.user.id,
      cityName: selectedCandidate.cityName,
      overlapStartDate: selectedCandidate.overlapStartDate,
      overlapEndDate: selectedCandidate.overlapEndDate,
      introMessage: introMessage.trim(),
    });

    if (res.success && res.match) {
      toast.success("Arkadaşlık teklifin başarıyla iletildi! 🎉");
      // Listede durumu güncelle
      setCandidates((prev) =>
        prev.map((c) =>
          c.user.id === selectedCandidate.user.id && c.cityName === selectedCandidate.cityName
            ? { ...c, hasExistingRequest: true, requestStatus: "pending" }
            : c
        )
      );
      setOutgoing((prev) => [
        {
          match: res.match,
          receiver: selectedCandidate.user,
        },
        ...prev,
      ]);
      setSelectedCandidate(null);
    } else {
      toast.error(res.message || "İstek gönderilemedi.");
    }

    setIsSubmitting(false);
  }

  // Gelen İsteği Yanıtla
  async function handleRespond(matchId: string, action: "accepted" | "declined") {
    const res = await respondMatchRequest(matchId, action);
    if (res.success) {
      toast.success(action === "accepted" ? "Teklif kabul edildi! 🤝" : "Teklif reddedildi.");
      setIncoming((prev) =>
        prev.map((item) =>
          item.match.id === matchId
            ? { ...item, match: { ...item.match, status: action } }
            : item
        )
      );
    } else {
      toast.error(res.message || "İşlem tamamlanamadı.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Üst Sekmeler */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "radar"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            🧭 Eşleşme Radarı ({candidates.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === "incoming"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            📥 Gelen Teklifler ({incoming.filter((i) => i.match.status === "pending").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outgoing")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "outgoing"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            📤 Gönderilenler ({outgoing.length})
          </button>
        </div>
      </div>

      {/* 1. SEKME: EŞLEŞME RADARI */}
      {activeTab === "radar" && (
        <div className="space-y-4">
          {candidates.length === 0 ? (
            <div className="py-20 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800">
              <Compass className="w-10 h-10 mx-auto mb-3 text-cyan-500 opacity-60" />
              <h4 className="font-bold text-white text-base">Henüz Çakışan Rota Bulunmadı</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Kişisel haritana daha fazla şehir ve seyahat tarihi ekledikçe aynı destinasyonda olan
                gezginlerle eşleşme radarın canlanacaktır!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((cand) => {
                const flag = getCountryFlagEmoji(cand.countryCode);
                const isExact = cand.matchType === "exact_date";

                return (
                  <div
                    key={`${cand.user.id}-${cand.cityName}`}
                    className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-cyan-500/40 transition-all space-y-4"
                  >
                    {/* Üst: Profil ve Şehir */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-cyan-500/20">
                          {cand.user.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white leading-tight">
                            {cand.user.fullName}
                          </h4>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{flag}</span>
                            <span className="font-semibold text-slate-300">{cand.cityName}</span>
                          </span>
                        </div>
                      </div>

                      {isExact ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-pink-950/60 text-pink-300 border border-pink-800/80 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-pink-400" />
                          <span>Tarih Çakışması</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/80">
                          Ortak Rota
                        </span>
                      )}
                    </div>

                    {/* Çakışma Açıklaması */}
                    <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/60 text-xs text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="leading-relaxed">{cand.dateDescription}</span>
                    </div>

                    {/* Aksiyon Butonu */}
                    <div className="pt-1">
                      {cand.hasExistingRequest ? (
                        <div className="w-full py-2.5 rounded-2xl bg-slate-800/50 text-slate-400 border border-slate-700/60 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            {cand.requestStatus === "accepted"
                              ? "Arkadaşsınız"
                              : cand.requestStatus === "declined"
                              ? "Teklif Reddedildi"
                              : "Teklif İletildi (Bekliyor)"}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(cand)}
                          className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Coffee className="w-4 h-4" />
                          <span>Tanışma / Buluşma Teklif Et</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. SEKME: GELEN TEKLİFLER */}
      {activeTab === "incoming" && (
        <div className="space-y-3">
          {incoming.length === 0 ? (
            <div className="py-16 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800">
              <p className="text-xs">Henüz gelen bir tanışma teklifi yok.</p>
            </div>
          ) : (
            incoming.map((item) => (
              <div
                key={item.match.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{item.sender.fullName}</span>
                    <span className="text-xs text-cyan-400 font-semibold">
                      • {item.match.cityName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 max-w-lg">
                    "{item.match.introMessage}"
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.match.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>

                {item.match.status === "pending" ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRespond(item.match.id, "accepted")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Kabul Et
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(item.match.id, "declined")}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reddet
                    </button>
                  </div>
                ) : item.match.status === "accepted" ? (
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      ✅ Kabul Edildi
                    </span>
                    <Link
                      href={`/messages?user=${item.sender.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Sohbet Et</span>
                    </Link>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    ❌ Reddedildi
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. SEKME: GÖNDERİLEN TEKLİFLER */}
      {activeTab === "outgoing" && (
        <div className="space-y-3">
          {outgoing.length === 0 ? (
            <div className="py-16 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800">
              <p className="text-xs">Henüz kimseye tanışma teklifi göndermediniz.</p>
            </div>
          ) : (
            outgoing.map((item) => (
              <div
                key={item.match.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-white">{item.receiver.fullName}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.match.cityName} seyahati için teklif iletildi
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-bold border border-slate-700 bg-slate-800 text-slate-300">
                    {item.match.status === "pending"
                      ? "⏳ Yanıt Bekliyor"
                      : item.match.status === "accepted"
                      ? "✅ Kabul Edildi"
                      : "Reddedildi"}
                  </span>
                  {item.match.status === "accepted" && (
                    <Link
                      href={`/messages?user=${item.receiver.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Sohbet Et</span>
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tanışma / Buluşma Teklifi Modalı */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Tanışma & Rota Birleştirme Teklifi ☕
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedCandidate.user.fullName} ile {selectedCandidate.cityName} ortaklığı
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tanışma Mesajın (Düzenleyebilirsin)
              </label>
              <textarea
                rows={4}
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isSubmitting || !introMessage.trim()}
                onClick={handleSendRequest}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Gönderiliyor..." : "Teklifi İlet 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
