"use client";

import { useState } from "react";
import { signContract } from "@/lib/actions/agreements";
import { Contract } from "@/lib/db/schema";
import { ShieldCheck, FileText, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ForceContractSignatureProps {
  userId: string;
  pendingContracts: Contract[];
  onSignedSuccess?: () => void;
}

export function ForceContractSignature({
  userId,
  pendingContracts,
  onSignedSuccess,
}: ForceContractSignatureProps) {
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
          label: "KVKK & Kişisel Veri Politikası",
          color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        };
      case "USER_AGREEMENT":
        return {
          label: "Kullanıcı & Gezgin Sözleşmesi",
          color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        };
      case "PRIVACY_POLICY":
        return {
          label: "Gizlilik & Çerez Politikası",
          color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        };
      default:
        return {
          label: "Sözleşme & Bildirim",
          color: "bg-slate-500/15 text-slate-300 border-slate-500/30",
        };
    }
  };

  const badge = getTypeBadge(currentContract.type);

  async function handleAccept() {
    if (!hasAgreedCheck) {
      toast.error("Lütfen sözleşme şartlarını okuduğunuzu onaylayın.");
      return;
    }

    setLoading(true);
    try {
      const res = await signContract(userId, currentContract.id);
      if (!res.success) {
        toast.error(res.error || "Sözleşme onaylanırken bir hata oluştu.");
        setLoading(false);
        return;
      }

      toast.success(`${currentContract.title} başarıyla onaylandı. ✅`);

      // Listeden çıkar
      const remaining = contractsList.slice(1);
      setContractsList(remaining);

      if (remaining.length === 0 && onSignedSuccess) {
        onSignedSuccess();
      }
    } catch (err: any) {
      console.error("Onaylama hatası:", err);
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Üst Başlık & İkon */}
      <header className="mb-5 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Güncel Sözleşme Onayı Gerekiyor
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mt-1.5 leading-relaxed">
          TatildeBugün'ü güvenle kullanabilmeniz ve kişisel verilerinizin yasal güvencede olması için lütfen aşağıdaki güncel metni onaylayın.
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
            {currentIndex + 1} / {initialTotal} Onay Bekliyor
          </div>
        </div>

        {/* Başlık */}
        <h2 className="text-base sm:text-lg font-bold text-white mb-3">
          {currentContract.title}
        </h2>

        {/* Kaydırılabilir Sözleşme Metni */}
        <div className="max-h-[44vh] sm:max-h-[48vh] overflow-y-auto p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap select-text space-y-2">
          {currentContract.content}
        </div>

        {/* Onay Seçeneği ve Buton */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-300 select-none w-full sm:w-auto">
            <input
              type="checkbox"
              checked={hasAgreedCheck}
              onChange={(e) => setHasAgreedCheck(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
            />
            <span>Metni okudum, anladım ve kabul ediyorum.</span>
          </label>

          <button
            type="button"
            onClick={handleAccept}
            disabled={loading || !hasAgreedCheck}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Onaylanıyor...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Okudum ve Kabul Ediyorum</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
