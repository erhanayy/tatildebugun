"use client";

import { useState } from "react";
import { signContract } from "@/lib/actions/agreements";
import { Contract } from "@/lib/db/schema";
import { useTranslation } from "@/lib/i18n";
import { ShieldCheck, CheckCircle2, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";

interface ForceContractSignatureProps {
  userId: string;
  pendingContracts: Contract[];
  onSignedSuccess?: () => void;
}

const EN_CONTRACTS: Record<string, { title: string; content: string }> = {
  KVKK: {
    title: "Personal Data Protection & Privacy Notice (GDPR / KVKK)",
    content: `ALLTRIPX PERSONAL DATA PROTECTION & PRIVACY STATEMENT (GDPR & KVKK)

1. Data Controller
In accordance with applicable data protection regulations including the EU General Data Protection Regulation (GDPR) and Law No. 6698 on the Protection of Personal Data (KVKK), AllTripX ("Platform", "we", "us") places the utmost importance on the security, confidentiality, and lawful processing of your personal data.

2. Personal Data Processed
When using our services, we process the following categories of data:
- Identity & Contact Data: Full name, username/handle, email address, mobile phone number.
- Travel & Activity Data: Cities and countries visited or planned, trip dates, travel purposes, duration of stay, personal travel notes.
- Geolocation & Media Data: EXIF GPS coordinates embedded in uploaded photos (processed exclusively for matching places of interest and never sold as raw tracking data to third parties).
- Social & Communication Data: Traveler connections, profile bio, and in-platform messaging.

3. Purposes of Processing
Your personal data is processed strictly for:
- Providing and administering your AllTripX traveler account,
- Generating your interactive world travel map and personal travel history,
- Automatically detecting visited attractions and places of interest from your travel photos,
- Enabling the Route Radar to match you with fellow travelers visiting overlapping destinations,
- Account verification via one-time passwords (OTP) and fulfilling legal obligations.

4. Data Sharing & Security
We do not sell your personal data to commercial third-party advertisers. Data is stored on secure, encrypted cloud infrastructure (Google Cloud Platform - European Union region) and shared only with essential service providers (such as transactional email/SMS gateways) under strict data processing agreements.

5. Your Legal Rights
Under GDPR and KVKK, you have the right to access, rectify, port, or request the erasure of your personal data, as well as the right to restrict or object to its processing. You can manage your privacy preferences at any time in Profile Settings or contact us at support@alltripx.com.`,
  },
  USER_AGREEMENT: {
    title: "AllTripX Traveler & User Membership Agreement",
    content: `ALLTRIPX TRAVELER & USER MEMBERSHIP AGREEMENT

1. Parties & Purpose
This Agreement is entered into between AllTripX ("Platform") and the registered user ("Traveler/User") to govern the terms of travel planning, route discovery, and social networking on the Platform.

2. Account Creation & Security
- You agree to provide accurate, current, and complete information during registration.
- You are solely responsible for maintaining the confidentiality of your account credentials. All activities occurring under your account are deemed your responsibility.

3. Platform Guidelines & Community Ethics
- AllTripX is a respectful global community of travelers sharing itineraries, recommendations, and wanderlust.
- You agree not to post hateful, abusive, obscene, unlawful, or infringing content, photos, or location data.
- Uploading photos without copyright ownership or submitting falsified location pins is strictly prohibited.

4. Intellectual Property
- You retain ownership of the photos and personal content you upload. By sharing them publicly on AllTripX, you grant us a worldwide, non-exclusive license to display them within the platform services.
- The AllTripX brand, source code, interactive map interface, and algorithmically curated routes are protected intellectual property.

5. Termination
AllTripX reserves the right to suspend or terminate accounts that violate this Agreement, spam other users, or compromise platform integrity.`,
  },
  PRIVACY_POLICY: {
    title: "AllTripX Privacy & Cookie Policy",
    content: `ALLTRIPX PRIVACY & COOKIE POLICY

1. Overview
AllTripX respects your privacy. This policy outlines how cookies, device identifiers, and session tokens are used to provide a seamless travel mapping experience.

2. Cookies & Local Storage
We use strictly necessary cookies to maintain user authentication and language preferences (NEXT_LOCALE). We do not deploy third-party advertising cookies or cross-site tracking pixels.

3. Location Privacy
Your location data is stored according to your personal privacy settings (Public, Friends Only, Family Only, or Private). You retain complete granular control over who can view your travel map and route radar history.`,
  },
};

export function ForceContractSignature({
  userId,
  pendingContracts,
  onSignedSuccess,
}: ForceContractSignatureProps) {
  const { t, locale, setLanguage } = useTranslation();
  const [contractsList, setContractsList] = useState<Contract[]>(pendingContracts);
  const [initialTotal] = useState(pendingContracts.length);
  const [loading, setLoading] = useState(false);
  const [hasAgreedCheck, setHasAgreedCheck] = useState(true);

  if (!contractsList || contractsList.length === 0) return null;

  const currentContract = contractsList[0];
  const currentIndex = initialTotal - contractsList.length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "KVKK":
        return {
          label: t("agreements.badgeKvkk"),
          color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        };
      case "USER_AGREEMENT":
        return {
          label: t("agreements.badgeUserAgreement"),
          color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        };
      case "PRIVACY_POLICY":
        return {
          label: t("agreements.badgePrivacyPolicy"),
          color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        };
      default:
        return {
          label: t("agreements.badgeOther"),
          color: "bg-slate-500/15 text-slate-300 border-slate-500/30",
        };
    }
  };

  const badge = getTypeBadge(currentContract.type);

  // Dil tercihine göre başlık ve metin seçimi
  const displayTitle =
    locale === "en" && EN_CONTRACTS[currentContract.type]?.title
      ? EN_CONTRACTS[currentContract.type].title
      : currentContract.title;

  const displayContent =
    locale === "en" && EN_CONTRACTS[currentContract.type]?.content
      ? EN_CONTRACTS[currentContract.type].content
      : currentContract.content;

  async function handleAccept() {
    if (!hasAgreedCheck) {
      toast.error(t("agreements.checkboxWarning"));
      return;
    }

    setLoading(true);
    try {
      const res = await signContract(userId, currentContract.id);
      if (!res.success) {
        toast.error(res.error || (locale === "en" ? "Failed to accept contract." : "Sözleşme onaylanırken bir hata oluştu."));
        setLoading(false);
        return;
      }

      toast.success(
        locale === "en"
          ? `${displayTitle} accepted successfully. ✅`
          : `${displayTitle} başarıyla onaylandı. ✅`
      );

      // Listeden çıkar
      const remaining = contractsList.slice(1);
      setContractsList(remaining);

      if (remaining.length === 0 && onSignedSuccess) {
        onSignedSuccess();
      }
    } catch (err: any) {
      console.error("Onaylama hatası:", err);
      toast.error(locale === "en" ? "An unexpected error occurred." : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Üst Dil Seçici ve İkon */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-bold border border-cyan-500/25">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>AllTripX Compliance</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setLanguage("tr")}
            className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              locale === "tr"
                ? "bg-cyan-500 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇹🇷 TR
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              locale === "en"
                ? "bg-cyan-500 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇬🇧 EN
          </button>
        </div>
      </div>

      <header className="mb-5 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          {t("agreements.modalTitle")}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mt-1.5 leading-relaxed">
          {t("agreements.modalSubtitle")}
        </p>
      </header>

      {/* Sözleşme Kartı */}
      <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col backdrop-blur-xl">
        {/* Tip & Versiyon Barı */}
        <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              v{currentContract.version}
            </span>
          </div>
          <div className="text-[11px] font-bold px-2.5 py-1 bg-cyan-950/70 border border-cyan-800/60 rounded-full text-cyan-300">
            {t("agreements.pendingCount", {
              current: currentIndex + 1,
              total: initialTotal,
            })}
          </div>
        </div>

        {/* Başlık */}
        <h2 className="text-base sm:text-lg font-bold text-white mb-3">
          {displayTitle}
        </h2>

        {/* Kaydırılabilir Sözleşme Metni */}
        <div className="max-h-[44vh] sm:max-h-[48vh] overflow-y-auto p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap select-text space-y-2">
          {displayContent}
        </div>

        {/* Onay Seçeneği ve Buton */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-300 select-none w-full sm:w-auto min-h-[44px]">
            <input
              type="checkbox"
              checked={hasAgreedCheck}
              onChange={(e) => setHasAgreedCheck(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
            />
            <span>{t("agreements.checkboxLabel")}</span>
          </label>

          <button
            type="button"
            onClick={handleAccept}
            disabled={loading || !hasAgreedCheck}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("agreements.submittingBtn")}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t("agreements.submitBtn")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
