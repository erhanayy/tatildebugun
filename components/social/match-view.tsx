"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { MatchCandidate } from "@/lib/actions/match";
import { sendMatchRequest, respondMatchRequest } from "@/lib/actions/match";
import {
  findFriendsByContactHashes,
  findFriendsByContacts,
  sendContactFriendRequest,
  type MatchedContactFriend,
} from "@/lib/actions/contacts";
import {
  searchTravelers,
  sendTravelerConnectionRequest,
  type SearchedTraveler,
} from "@/lib/actions/search-travelers";
import { normalizeToInternational } from "@/lib/utils/phone";
import { CountryFlag } from "@/components/ui/country-flag";
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
  Share2,
  Users,
  Smartphone,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Search,
  AtSign,
  User,
  Mail,
  Phone,
  Home,
  HeartHandshake,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

interface MatchViewProps {
  candidates: MatchCandidate[];
  incomingRequests: any[];
  outgoingRequests: any[];
  currentUser?: {
    id: string;
    name: string;
  };
}

export function MatchView({
  candidates: initialCandidates,
  incomingRequests: initialIncoming,
  outgoingRequests: initialOutgoing,
  currentUser,
}: MatchViewProps) {
  const { locale, t } = useTranslation();
  const [candidates, setCandidates] = useState<MatchCandidate[]>(initialCandidates);
  const [incoming, setIncoming] = useState<any[]>(initialIncoming);
  const [outgoing, setOutgoing] = useState<any[]>(initialOutgoing);
  const [activeTab, setActiveTab] = useState<"radar" | "contacts" | "incoming" | "outgoing" | "search">("radar");

  // Rota Çakışması Teklif Modalı State
  const [selectedCandidate, setSelectedCandidate] = useState<MatchCandidate | null>(null);
  const [candidateRelationship, setCandidateRelationship] = useState<"friend" | "relative" | "family">("friend");
  const [introMessage, setIntroMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rehber & Arkadaş Eşleştirme State
  const [contactFriends, setContactFriends] = useState<MatchedContactFriend[]>([]);
  const [isScanningContacts, setIsScanningContacts] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [manualPhonesInput, setManualPhonesInput] = useState("");
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [connectingFriendId, setConnectingFriendId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // 🔍 Gezgin Arama State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedTraveler[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTravelerForConnection, setSelectedTravelerForConnection] = useState<SearchedTraveler | null>(null);
  const [connectionRelationship, setConnectionRelationship] = useState<"friend" | "relative" | "family">("friend");
  const [connectionIntroMsg, setConnectionIntroMsg] = useState("");
  const [isSendingConnection, setIsSendingConnection] = useState(false);

  // Kişisel Davet Bağlantısı
  const inviteUrl =
    currentUser?.id && typeof window !== "undefined"
      ? `${window.location.origin}/davet/${currentUser.id}`
      : "https://alltripx.com/register";

  // WhatsApp Davet Paylaşımı
  function handleShareWhatsApp() {
    const text = locale === "en"
      ? `Hey! I created my travel routes and world map on AllTripX 🌴 Add your map and let's travel together when our paths cross:\n${inviteUrl}`
      : `Selam! AllTripX'te seyahat rotalarımı ve dünya haritamı oluşturdum 🌴 Sen de haritanı ekle, rotalarımız çakıştığında birlikte gezelim:\n${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  }

  // Davet Bağlantısını Kopyala
  function handleCopyInviteLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      toast.success("Özel davet bağlantınız panoya kopyalandı! 📋");
      setTimeout(() => setCopiedInvite(false), 2500);
    }
  }

  // WebCrypto ile İstemci Tarafında SHA-256 Hash'leme (KVKK & Sıfır Bilgi Güvencesi)
  async function sha256Hex(text: string): Promise<string> {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return "";
  }

  // Rehber Numaralarını İşle ve Eşleştir (KVKK Zero-Knowledge)
  async function processPhoneNumbersList(rawList: string[]) {
    try {
      setIsScanningContacts(true);

      // 1. İstemci tarafında E.164 uluslararası standardına normalize et (+905XXXXXXXXX vb.)
      const normalizedSet = new Set<string>();
      for (const raw of rawList) {
        if (!raw || typeof raw !== "string") continue;
        const norm = normalizeToInternational(raw, "+90");
        if (norm && norm.length >= 10) {
          normalizedSet.add(norm);
        }
      }

      if (normalizedSet.size === 0) {
        toast.info("Geçerli bir telefon numarası bulunamadı.");
        setIsScanningContacts(false);
        setIsSearchingManual(false);
        return;
      }

      // 2. İstemci tarafında WebCrypto ile SHA-256 hash'le (Açık numara asla internete çıkmaz)
      const hashes: string[] = [];
      for (const phone of normalizedSet) {
        const hash = await sha256Hex(phone);
        if (hash) hashes.push(hash);
      }

      // 3. Yalnızca kriptografik hash'leri sunucuya gönder
      let res;
      if (hashes.length > 0) {
        res = await findFriendsByContactHashes(hashes);
      } else {
        // Fallback
        res = await findFriendsByContacts(Array.from(normalizedSet));
      }

      if (res.success) {
        setContactFriends(res.friends);
        setActiveTab("contacts");
        if (res.friends.length > 0) {
          toast.success(`${res.friends.length} arkadaşınız AllTripX'te bulundu! 🎉`);
        } else {
          toast.info("Rehberinizdeki numaralar arasında henüz kayıtlı gezgin bulunamadı. WhatsApp'tan davet edebilirsiniz!");
        }
      } else {
        toast.error(res.message || "Rehber sorgulaması başarısız oldu.");
      }
    } catch (err) {
      console.error("Rehber tarama hatası:", err);
      toast.error("Rehber sorgulanırken beklenmedik bir hata oluştu.");
    } finally {
      setIsScanningContacts(false);
      setIsSearchingManual(false);
    }
  }

  // Rehberi Tara Butonu (Web Contact Picker API veya Modal)
  async function handleOpenContactsScanner() {
    // Tarayıcı Web Contact Picker API desteği var mı? (Android Chrome, Edge vb.)
    const isContactPickerSupported =
      typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

    if (isContactPickerSupported) {
      try {
        setIsScanningContacts(true);
        const contacts = await (navigator as any).contacts.select(["name", "tel"], { multiple: true });
        if (contacts && contacts.length > 0) {
          const allPhones: string[] = contacts.flatMap((c: any) => c.tel || []);
          if (allPhones.length > 0) {
            await processPhoneNumbersList(allPhones);
            return;
          }
        }
      } catch (e: any) {
        // Kullanıcı iptal ettiyse veya hata verdiyse manuel modala yönlendir
        if (e?.name !== "AbortError") {
          setIsContactModalOpen(true);
        }
      } finally {
        setIsScanningContacts(false);
      }
    } else {
      // Desteklemeyen tarayıcılar (iOS Safari, Masaüstü) için modal aç
      setIsContactModalOpen(true);
    }
  }

  // Manuel Numara Girişi ile Arama
  async function handleManualPhoneSearch() {
    if (!manualPhonesInput.trim()) {
      toast.error("Lütfen en az bir telefon numarası giriniz.");
      return;
    }

    setIsSearchingManual(true);
    // Virgül, noktalı virgül veya satır başlarına göre ayır (numara içindeki boşlukları bölmez)
    const lines = manualPhonesInput.split(/[\n,;]+/);
    const phones: string[] = [];

    for (const item of lines) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      // Eğer satırda birden çok boşlukla ayrılmış birden fazla telefon varsa
      const digitsCount = trimmed.replace(/\D/g, "").length;
      if (digitsCount > 15 && /\s{2,}/.test(trimmed)) {
        const parts = trimmed.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
        phones.push(...parts);
      } else {
        phones.push(trimmed);
      }
    }

    if (phones.length === 0) {
      toast.error("Geçerli bir telefon numarası bulunamadı.");
      setIsSearchingManual(false);
      return;
    }

    await processPhoneNumbersList(phones);
    setIsContactModalOpen(false);
    setManualPhonesInput("");
  }

  // Rehberden Bulunan Arkadaşa Rota Arkadaşlığı Teklifi Gönder
  async function handleConnectWithFriend(friendId: string) {
    setConnectingFriendId(friendId);
    const res = await sendContactFriendRequest(friendId);
    if (res.success) {
      toast.success("Bağlantı ve rota arkadaşlığı teklifi iletildi! 🤝");
      setContactFriends((prev) =>
        prev.map((f) =>
          f.id === friendId ? { ...f, hasExistingRequest: true, requestStatus: "pending" } : f
        )
      );
    } else {
      toast.error(res.message || "İstek gönderilemedi.");
    }
    setConnectingFriendId(null);
  }

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

  // Rota Çakışması İsteği Gönder
  async function handleSendRequest() {
    if (!selectedCandidate) return;

    setIsSubmitting(true);

    const res = await sendMatchRequest({
      receiverId: selectedCandidate.user.id,
      cityName: selectedCandidate.cityName,
      overlapStartDate: selectedCandidate.overlapStartDate,
      overlapEndDate: selectedCandidate.overlapEndDate,
      relationshipType: candidateRelationship,
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

  // 🔍 Gezgin Arama Canlı Debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);
      try {
        const results = await searchTravelers(q);
        setSearchResults(results);
      } catch (err) {
        console.error("Gezgin arama hatası:", err);
        toast.error("Arama yapılırken bir hata oluştu.");
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Gezgin Bağlantı Modalı Aç
  function handleOpenConnectionModal(traveler: SearchedTraveler) {
    setSelectedTravelerForConnection(traveler);
    setConnectionRelationship("friend");
    setConnectionIntroMsg(
      locale === "en"
        ? `Hello @${traveler.username}! I wanted to add you as a friend on AllTripX 🌴`
        : `Merhaba @${traveler.username}! Seni AllTripX'te arkadaş olarak eklemek istedim 🌴`
    );
  }

  // Gezgin Doğrudan Bağlantı İsteği Gönder
  async function handleSendTravelerConnection() {
    if (!selectedTravelerForConnection) return;

    setIsSendingConnection(true);

    try {
      const res = await sendTravelerConnectionRequest({
        targetUserId: selectedTravelerForConnection.id,
        relationshipType: connectionRelationship,
        introMessage: connectionIntroMsg.trim(),
      });

      if (res.success) {
        toast.success(res.message);
        // Arama listesinde durumu güncelle
        setSearchResults((prev) =>
          prev.map((t) =>
            t.id === selectedTravelerForConnection.id
              ? {
                  ...t,
                  connectionStatus: "pending_outgoing",
                  relationshipType: connectionRelationship,
                }
              : t
          )
        );
        setSelectedTravelerForConnection(null);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Bağlantı isteği iletilemedi.");
    } finally {
      setIsSendingConnection(false);
    }
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
      {/* 🌟 VİRAL DAVET & WHATSAPP PAYLAŞIM KARTI */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-extrabold border border-cyan-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gezgin Ağını Büyüt</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {locale === "en" ? "Invite Friends to AllTripX 🌴" : "Arkadaşlarını AllTripX'e Davet Et 🌴"}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Özel davet linkini WhatsApp'ta paylaş; arkadaşların haritalarını ve seyahat rotalarını eklediğinde rotalarınız çakıştığında anında bildirim al!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp'ta Paylaş</span>
            </button>

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition-all cursor-pointer min-h-[44px]"
            >
              {copiedInvite ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedInvite ? "Kopyalandı! ✓" : "Linki Kopyala"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Üst Sekmeler ve Rehber Tarama Butonu */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              activeTab === "radar"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            🧭 {t("match.radarTab")} ({candidates.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              activeTab === "search"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            🔍 {t("match.searchTab")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative min-h-[44px] ${
              activeTab === "contacts"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            👥 {t("match.contactsTab")} ({contactFriends.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative min-h-[44px] ${
              activeTab === "incoming"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            📥 {t("match.incomingTab")} ({incoming.filter((i) => i.match.status === "pending").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outgoing")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              activeTab === "outgoing"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            📤 {t("match.outgoingTab")} ({outgoing.length})
          </button>
        </div>

        {/* Rehberi Tara Hızlı Butonu */}
        <button
          type="button"
          onClick={handleOpenContactsScanner}
          disabled={isScanningContacts}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer min-h-[44px]"
        >
          {isScanningContacts ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4 text-cyan-200" />
          )}
          <span>{isScanningContacts ? "Taranıyor..." : "Rehberimi Tara 📱"}</span>
        </button>
      </div>

      {/* 1. SEKME: EŞLEŞME RADARI */}
      {activeTab === "radar" && (
        <div className="space-y-4">
          {candidates.length === 0 ? (
            <div className="py-20 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
              <Compass className="w-10 h-10 mx-auto text-cyan-500 opacity-60" />
              <div className="max-w-md mx-auto space-y-1.5 px-4">
                <h4 className="font-bold text-white text-base">Henüz Çakışan Rota Bulunmadı</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kişisel haritana daha fazla şehir ve seyahat tarihi ekledikçe aynı destinasyonda olan
                  gezginlerle eşleşme radarın canlanacaktır!
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenContactsScanner}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 cursor-pointer min-h-[44px]"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Rehberimdeki Arkadaşları Tara 📱</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((cand) => {
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
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <CountryFlag countryCode={cand.countryCode} width={16} height={12} className="shadow-xs shrink-0" />
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
                      <span className="font-medium">{cand.dateDescription}</span>
                    </div>

                    {/* Alt Aksiyon Butonu */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{cand.userVisitCount} Şehir Ziyareti</span>
                      </div>

                      {cand.hasExistingRequest ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                          {cand.requestStatus === "pending"
                            ? "⏳ Teklif Beklemede"
                            : cand.requestStatus === "accepted"
                            ? "✅ Rota Arkadaşısınız"
                            : "Reddedildi"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(cand)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer min-h-[44px]"
                        >
                          <Coffee className="w-3.5 h-3.5" />
                          <span>Tanışma Teklifi Gönder</span>
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

      {/* 2. SEKME: REHBERİMDEKİ DOSTLAR */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          {contactFriends.length === 0 ? (
            <div className="py-16 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4 px-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="font-bold text-white text-base">Rehberindeki Gezginleri Keşfet</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Telefon rehberini tarayarak AllTripX'e üye olan arkadaşlarını anında bulabilir, rotalarını inceleyebilir ve rota arkadaşlığı teklifi gönderebilirsin.
                </p>
                <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400/90 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>KVKK Güvencesi: Numaralarınız sunucuya kaydedilmez, sadece anlık eşleştirilir.</span>
                </div>
              </div>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenContactsScanner}
                  disabled={isScanningContacts}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  {isScanningContacts ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  <span>Rehberi Tara ve Bul 📱</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp ile Davet Et</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-slate-400">
                  Rehberinizden <span className="text-cyan-400 font-extrabold">{contactFriends.length}</span> arkadaşınız AllTripX'te:
                </p>
                <button
                  type="button"
                  onClick={handleOpenContactsScanner}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                >
                  Yeniden Tara 🔄
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contactFriends.map((friend) => {
                  const isConnecting = connectingFriendId === friend.id;

                  return (
                    <div
                      key={friend.id}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-cyan-500/40 transition-all space-y-4"
                    >
                      {/* Üst: Profil ve Konum */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-cyan-500/20">
                            {friend.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white leading-tight">
                              {friend.fullName}
                            </h4>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <CountryFlag countryCode={friend.baseCountry || "TR"} width={16} height={12} className="shadow-xs shrink-0" />
                              <span className="font-medium text-slate-300">
                                {friend.baseCity || "Türkiye"}
                              </span>
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/80">
                          Rehber Arkadaşın
                        </span>
                      </div>

                      {/* İstatistik Rozetleri */}
                      <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/60 text-xs text-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-cyan-400" />
                          <span><b>{friend.visitedCountriesCount}</b> Ülke Gezdi</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          <span><b>{friend.visitedCitiesCount}</b> Şehir</span>
                        </div>
                      </div>

                      {/* Aksiyon Butonu */}
                      <div className="flex items-center justify-end pt-1 border-t border-slate-800/60">
                        {friend.hasExistingRequest ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                            {friend.requestStatus === "pending"
                              ? "⏳ İstek Gönderildi"
                              : friend.requestStatus === "accepted"
                              ? "✅ Rota Arkadaşısınız"
                              : "Reddedildi"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isConnecting}
                            onClick={() => handleConnectWithFriend(friend.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer min-h-[44px] disabled:opacity-60"
                          >
                            {isConnecting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            <span>{isConnecting ? "Gönderiliyor..." : "Rota Arkadaşı Ol 👥"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SEKME: GELEN TANIŞMA İSTEKLERİ */}
      {activeTab === "incoming" && (
        <div className="space-y-3">
          {incoming.length === 0 ? (
            <div className="py-16 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800">
              <p className="text-xs">Henüz gelen bir tanışma teklifiniz bulunmuyor.</p>
            </div>
          ) : (
            incoming.map((item) => (
              <div
                key={item.match.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                      {item.sender.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.sender.fullName}</h4>
                      <p className="text-xs text-cyan-400 mt-0.5">
                        {item.match.cityName} seyahati için tanışma teklifi
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.match.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>

                {item.match.introMessage && (
                  <p className="text-xs text-slate-300 italic bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                    "{item.match.introMessage}"
                  </p>
                )}

                {item.match.status === "pending" ? (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleRespond(item.match.id, "declined")}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer min-h-[44px]"
                    >
                      Reddet
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(item.match.id, "accepted")}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/25 transition-all cursor-pointer min-h-[44px]"
                    >
                      Kabul Et 🤝
                    </button>
                  </div>
                ) : item.match.status === "accepted" ? (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Kabul Edildi</span>
                    </span>
                    <Link
                      href={`/messages?user=${item.sender.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer min-h-[44px]"
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

      {/* 4. SEKME: GÖNDERİLEN TEKLİFLER */}
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer min-h-[44px]"
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

      {/* 5. SEKME: GEZGİN ARAMA */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Arama Girişi & Bilgi Kutusu */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Gezgin Arama & Arkadaş Ekleme</span>
              </h4>
              <p className="text-xs text-slate-400">
                Ad Soyad, kullanıcı adı (<span className="text-cyan-400 font-mono">@nickname</span>) veya E-posta ile tüm gezginleri arayabilir, Aile, Akraba veya Arkadaş olarak bağlantı kurabilirsiniz.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İsim, @kullanıcı_adı veya e-posta yazınız..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500 transition-all min-h-[44px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Gizlilik Güvencesi ve İpucu */}
            <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-400">
                <strong className="text-cyan-300">Gizlilik Koruması:</strong> Gezginlerin isim ve e-posta görünürlük tercihleri korunur. Kullanıcı adları (<span className="font-mono text-cyan-300">@nickname</span>) her durumda aranabilir ve benzersizdir.
              </p>
            </div>
          </div>

          {/* Arama Sonuçları */}
          {isSearching ? (
            <div className="py-16 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Gezginler taranıyor...</p>
            </div>
          ) : hasSearched && searchResults.length === 0 ? (
            <div className="py-16 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-2 px-4">
              <p className="text-sm font-bold text-white">Eşleşen gezgin bulunamadı</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Aradığınız kişinin kullanıcı adını (<span className="font-mono text-cyan-400">@nickname</span>) veya kayıtlı e-postasını sorarak tam eşleşmeyle bulabilirsiniz.
              </p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((traveler) => (
                <div
                  key={traveler.id}
                  className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-cyan-500/40 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-cyan-500/20 shrink-0">
                        {traveler.avatarUrl ? (
                          <img
                            src={traveler.avatarUrl}
                            alt={traveler.username}
                            className="w-full h-full rounded-2xl object-cover"
                          />
                        ) : (
                          (traveler.fullName || traveler.username).slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-cyan-400 font-mono">
                            @{traveler.username}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white leading-tight">
                          {traveler.fullName ? (
                            traveler.fullName
                          ) : (
                            <span className="italic text-slate-500 text-xs font-normal">
                              Ad-Soyad Gizli
                            </span>
                          )}
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                          <CountryFlag countryCode={traveler.baseCountry || "TR"} width={16} height={12} className="shadow-xs shrink-0" />
                          <span>{traveler.baseCity || "İstanbul"}</span>
                        </div>
                      </div>
                    </div>

                    {/* E-posta Gösterimi (Eğer İzinli ise) */}
                    {traveler.email && (
                      <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[120px]">
                        {traveler.email}
                      </span>
                    )}
                  </div>

                  {/* İstatistikler ve Aksiyon */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{traveler.visitCount} Ziyaret 📍</span>
                      <span>{traveler.tripCount} Rota 🗺️</span>
                    </div>

                    {traveler.connectionStatus === "accepted" ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                          {traveler.relationshipType === "family"
                            ? "🏡 Ailem"
                            : traveler.relationshipType === "relative"
                            ? "🤝 Akrabam"
                            : "👥 Arkadaşım"}
                        </span>
                        <Link
                          href={`/messages?user=${traveler.id}`}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors cursor-pointer min-h-[36px]"
                          title="Sohbet Et"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : traveler.connectionStatus === "pending_outgoing" ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
                        ⏳ İstek Bekliyor
                      </span>
                    ) : traveler.connectionStatus === "pending_incoming" ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab("incoming")}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-colors cursor-pointer min-h-[44px]"
                      >
                        📥 Gelen İstek (Yanıtla)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenConnectionModal(traveler)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer min-h-[44px]"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Bağlantı Kur 🤝</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3 px-4">
              <Search className="w-10 h-10 text-cyan-500/40 mx-auto" />
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-white text-base">Gezgin Arkadaşlarını Ara</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Yukarıdaki arama çubuğuna arkadaşının adını, @kullanıcı_adını veya e-postasını yazarak hemen bağlantı isteği gönderebilirsin.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rota Çakışması Tanışma Teklifi Modalı */}
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
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* İlişki Türü Seçimi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Bağlantı Türü
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCandidateRelationship("friend")}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                    candidateRelationship === "friend"
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 font-extrabold"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  👥 Arkadaşım
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateRelationship("relative")}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                    candidateRelationship === "relative"
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 font-extrabold"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  🤝 Akrabam
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateRelationship("family")}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                    candidateRelationship === "family"
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 font-extrabold"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  🏡 Ailem
                </button>
              </div>
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[44px]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isSubmitting || !introMessage.trim()}
                onClick={handleSendRequest}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                {isSubmitting ? "Gönderiliyor..." : "Teklifi İlet 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doğrudan Gezgin Bağlantı / Arkadaş Ekleme Modalı */}
      {selectedTravelerForConnection && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold font-mono">
                  @
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Bağlantı Kur: @{selectedTravelerForConnection.username}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedTravelerForConnection.fullName || `@${selectedTravelerForConnection.username}`} ile ilişkinizi belirleyin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTravelerForConnection(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* İlişki Türü Seçimi (Hiyerarşik Yapı) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                İlişki Türü (Yetki Derecesi)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setConnectionRelationship("friend")}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all cursor-pointer min-h-[44px] ${
                    connectionRelationship === "friend"
                      ? "bg-cyan-500/20 border-cyan-500 text-white"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>👥 Arkadaşım</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Rotalarımı ve genel paylaşımlarımı görebilir.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setConnectionRelationship("relative")}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all cursor-pointer min-h-[44px] ${
                    connectionRelationship === "relative"
                      ? "bg-cyan-500/20 border-cyan-500 text-white"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>🤝 Akrabam</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Arkadaş ve akraba paylaşımlarına erişebilir.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setConnectionRelationship("family")}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all cursor-pointer min-h-[44px] ${
                    connectionRelationship === "family"
                      ? "bg-cyan-500/20 border-cyan-500 text-white"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
                    <Home className="w-3.5 h-3.5" />
                    <span>🏡 Ailem</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    En üst yetki; tüm rota ve seyahatlerimi görür.
                  </p>
                </button>
              </div>
            </div>

            {/* Mesaj */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tanışma / Davet Mesajı
              </label>
              <textarea
                rows={3}
                value={connectionIntroMsg}
                onChange={(e) => setConnectionIntroMsg(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTravelerForConnection(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer min-h-[44px]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isSendingConnection}
                onClick={handleSendTravelerConnection}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center gap-2"
              >
                {isSendingConnection ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gönderiliyor...</span>
                  </>
                ) : (
                  <span>Bağlantı İsteği Gönder 🚀</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rehberden Arkadaş Arama & Numara Sorgulama Modalı */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Rehberden Arkadaşlarını Bul 📱
                  </h3>
                  <p className="text-xs text-slate-400">
                    Telefon numaraları ile AllTripX üyelerini keşfet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bilgi ve KVKK Güvencesi */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>KVKK & Sıfır Bilgi Güvencesi</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Girilen telefon numaraları sunucuda veya veritabanımızda <b>asla saklanmaz</b>. Yalnızca AllTripX üyesi olan dostlarınızı tespit etmek için anlık olarak sorgulanır.
              </p>
            </div>

            {/* Numara Giriş Alanı */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Telefon Numarası veya Liste
              </label>
              <textarea
                rows={3}
                value={manualPhonesInput}
                onChange={(e) => setManualPhonesInput(e.target.value)}
                placeholder="Örn: 0532 123 45 67 veya 0544 987 65 43 (virgülle ayırabilirsiniz)"
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Rehberinizden kopyaladığınız bir veya birden fazla numarayı yapıştırarak da aratabilirsiniz.
              </p>
            </div>

            {/* WhatsApp Hızlı Paylaşım Butonu */}
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-300">
                <p className="font-bold">Arkadaşların henüz üye değil mi?</p>
                <p className="text-[10px] text-emerald-400/80">WhatsApp grubuna tek tıkla seyahat daveti at!</p>
              </div>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer min-h-[40px]"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Davet Et</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer min-h-[44px]"
              >
                Kapat
              </button>
              <button
                type="button"
                disabled={isSearchingManual || !manualPhonesInput.trim()}
                onClick={handleManualPhoneSearch}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center gap-2"
              >
                {isSearchingManual ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sorgulanıyor...</span>
                  </>
                ) : (
                  <span>Sorgula ve Eşleştir 🔍</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
