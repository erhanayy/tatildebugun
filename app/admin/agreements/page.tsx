import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminContracts } from "@/lib/actions/agreements";
import { AppHeader } from "@/components/navigation/app-header";
import { CreateContractForm } from "./create-contract-form";
import { ShieldCheck, CheckCircle2, History, FileText, XCircle, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAgreementsPage() {
  const session = await auth();

  // Yalnızca sistem yöneticileri (admin) erişebilir
  if (!session?.user || (session.user as any).role !== "admin") {
    redirect("/dashboard");
  }

  const contractsList = await getAdminContracts();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "KVKK":
        return { label: "KVKK", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
      case "USER_AGREEMENT":
        return { label: "Kullanıcı Sözleşmesi", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
      case "PRIVACY_POLICY":
        return { label: "Gizlilik Politikası", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
      default:
        return { label: "Diğer", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader user={session.user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Üst Başlık Bilgilendirme */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-cyan-400 mb-2.5 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>← Yönetim Merkezine Dön</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Yasal Sözleşme & KVKK Yönetimi
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Kullanıcılara zorunlu olarak onaylatılacak KVKK, Kullanıcı Sözleşmesi ve Veri Politikalarını buradan yönetebilirsiniz. Yeni bir versiyon yayınladığınızda, kullanıcılar giriş yaptıklarında bu yeni metni onaylamadan sisteme devam edemezler.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-bold">
              Yönetici Paneli (Admin) 🛡️
            </span>
          </div>
        </div>

        {/* Ana Izgara (Grid): Sol Form, Sağ Versiyon Geçmişi */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sol Kolon: Yeni Versiyon Yayınla Formu */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-4 pb-3 border-b border-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>Yeni Sözleşme Versiyonu Ekle</span>
            </h2>
            <CreateContractForm />
          </div>

          {/* Sağ Kolon: Mevcut Sözleşmeler ve Versiyon Geçmişi */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col backdrop-blur-md">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Sözleşme & Versiyon Geçmişi</h2>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Toplam: {contractsList.length} Metin
              </span>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[720px] space-y-4">
              {contractsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Henüz kayıtlı hiçbir sözleşme bulunmamaktadır.
                </div>
              ) : (
                contractsList.map((c) => {
                  const typeBadge = getTypeLabel(c.type);
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all ${
                        c.isActive
                          ? "bg-slate-950/80 border-cyan-500/40 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/20"
                          : "bg-slate-950/40 border-slate-800/80 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                            v{c.version}
                          </span>
                        </div>

                        <div>
                          {c.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Yayında (Aktif)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              <XCircle className="w-3.5 h-3.5" />
                              Eski Versiyon (Arşiv)
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1.5">{c.title}</h3>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-3">
                        {c.content}
                      </p>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-2">
                        <span>Yayın Tarihi: {new Date(c.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="font-mono text-[10px] text-slate-600 truncate max-w-[150px]">ID: {c.id}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
