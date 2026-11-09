import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/navigation/app-header";
import {
  ShieldCheck,
  FileText,
  Users,
  Compass,
  Sliders,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHubPage() {
  const session = await auth();

  // Yalnızca sistem yöneticileri (admin) erişebilir
  if (!session?.user || (session.user as any).role !== "admin") {
    redirect("/dashboard");
  }

  const modules = [
    {
      id: "agreements",
      title: "Sözleşme & KVKK Yönetimi",
      description:
        "KVKK Aydınlatma Metni, Gezgin Kullanıcı Sözleşmesi ve veri politikalarını yönetin. Yeni versiyon yayınlayarak tüm kullanıcıların zorunlu onaylamasını sağlayın.",
      href: "/admin/agreements",
      icon: FileText,
      active: true,
      badge: "Aktif Modül",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      btnText: "Sözleşmeleri Yönet",
      btnColor: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white",
    },
    {
      id: "users",
      title: "Kullanıcı & Gezgin Yönetimi",
      description:
        "Sistemdeki tüm kayıtlı gezginler, kullanıcı rolleri (Admin, Host, Guest), hesap aktivasyonları ve profil durumları.",
      href: "#",
      icon: Users,
      active: false,
      badge: "Yakında",
      badgeColor: "bg-slate-800 text-slate-400 border-slate-700",
      btnText: "Hazırlanıyor",
      btnColor: "bg-slate-800 text-slate-500 cursor-not-allowed",
    },
    {
      id: "places",
      title: "Mekan & Rota Kürasyonu",
      description:
        "Popüler turistik mekanlar, Wikimedia kapak fotoğrafları, GPS koordinatları ve 1-5 günlük akıllı şehir yürüyüş rotaları.",
      href: "#",
      icon: Compass,
      active: false,
      badge: "Yakında",
      badgeColor: "bg-slate-800 text-slate-400 border-slate-700",
      btnText: "Hazırlanıyor",
      btnColor: "bg-slate-800 text-slate-500 cursor-not-allowed",
    },
    {
      id: "settings",
      title: "Sistem & İletişim Ayarları",
      description:
        "Resend e-posta motoru yapılandırması, bildirim ayarları, sistem logları ve genel platform parametreleri.",
      href: "#",
      icon: Sliders,
      active: false,
      badge: "Yakında",
      badgeColor: "bg-slate-800 text-slate-400 border-slate-700",
      btnText: "Hazırlanıyor",
      btnColor: "bg-slate-800 text-slate-500 cursor-not-allowed",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader user={session.user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Üst Karşılama Başlığı */}
        <div className="border-b border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Yönetim Merkezi (Admin Hub) 🛡️
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  TatildeBugün sistem yönetim paneli ve idari modüller
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Yetkili: {session.user.name || session.user.email}
              </span>
            </div>
          </div>
        </div>

        {/* Modül Kartları Izgarası */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 sm:gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  m.active
                    ? "bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/5 backdrop-blur-md"
                    : "bg-slate-900/50 border-slate-800/60 opacity-80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        m.active
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${m.badgeColor}`}
                    >
                      {m.badge}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-white mb-2">
                    {m.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                    {m.description}
                  </p>
                </div>

                <div>
                  {m.active ? (
                    <Link
                      href={m.href}
                      className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 group ${m.btnColor}`}
                    >
                      <span>{m.btnText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 ${m.btnColor}`}
                    >
                      <span>{m.btnText}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
