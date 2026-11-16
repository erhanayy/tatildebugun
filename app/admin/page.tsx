import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/navigation/app-header";
import { getAdminDashboardMetrics } from "@/lib/actions/admin-dashboard";
import {
  ShieldCheck,
  FileText,
  Users,
  Compass,
  Sliders,
  ArrowRight,
  Lock,
  MapPin,
  Route,
  Landmark,
  Activity,
  Calendar,
  Clock,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHubPage() {
  const session = await auth();

  // Yalnızca sistem yöneticileri (admin) erişebilir
  if (!session?.user || (session.user as any).role !== "admin") {
    redirect("/dashboard");
  }

  const metrics = await getAdminDashboardMetrics();

  const kpis = [
    {
      title: "Toplam Gezgin",
      value: metrics?.totalUsers ?? 0,
      icon: Users,
      color: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30",
      accent: "text-cyan-400",
      description: "Platforma kayıtlı tüm üyeler",
    },
    {
      title: "Harita Pini / Ziyaret",
      value: metrics?.totalVisits ?? 0,
      icon: MapPin,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      accent: "text-emerald-400",
      description: "Eklenen şehir & ülke ziyaretleri",
    },
    {
      title: "Seyahat Rotası",
      value: metrics?.totalTrips ?? 0,
      icon: Route,
      color: "from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30",
      accent: "text-purple-400",
      description: "Oluşturulan çok duraklı rotalar",
    },
    {
      title: "Tarihi Mekan Check-in",
      value: metrics?.totalPoiVisits ?? 0,
      icon: Landmark,
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
      accent: "text-amber-400",
      description: "Ziyaret edilen anıt & POI noktaları",
    },
  ];

  const loginActivities = [
    {
      title: "Son 24 Saat (DAU)",
      value: metrics?.loginsLast24h ?? 0,
      icon: Clock,
      badge: "Günlük Aktif",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Son 7 Gün (WAU)",
      value: metrics?.loginsLast7d ?? 0,
      icon: Calendar,
      badge: "Haftalık Aktif",
      badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    },
    {
      title: "Son 30 Gün (MAU)",
      value: metrics?.loginsLast30d ?? 0,
      icon: Activity,
      badge: "Aylık Aktif",
      badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    },
    {
      title: "Son 1 Yıl (YAU)",
      value: metrics?.loginsLast1y ?? 0,
      icon: UserCheck,
      badge: "Yıllık Aktif",
      badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    },
  ];

  const modules = [
    {
      id: "users",
      title: "Kullanıcı & Üye Yönetimi",
      description:
        "Tüm kayıtlı gezginleri listeleyin, isim/e-posta/şehre göre arayın, rol ve durumları denetleyin, hesap askıya alma veya aktifleştirme işlemlerini uygulayın.",
      href: "/admin/users",
      icon: Users,
      active: true,
      badge: "Aktif Modül",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      btnText: "Üyeleri Yönet",
      btnColor: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white",
    },
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Üst Karşılama Başlığı */}
        <div className="border-b border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10 shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Yönetim Merkezi (Admin Hub) 🛡️
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Platform genel metrikleri, üye operasyonları ve idari modüller
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

        {/* 1. Temel Platform KPI Sayaçları */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Genel Platform İstatistikleri
            </h2>
            <span className="text-[11px] text-slate-500">Canlı Veritabanı Sayaçları</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 leading-tight">
                      {kpi.title}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border bg-gradient-to-tr ${kpi.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {kpi.value.toLocaleString("tr-TR")}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      {kpi.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Giriş Aktivitesi & Zaman Serisi Analizi */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Kullanıcı Giriş Aktivitesi (Tekil Girişler)
            </h2>
            <span className="text-[11px] text-emerald-400/80 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Giriş Logları
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {loginActivities.map((act, idx) => {
              const Icon = act.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs text-slate-400 font-medium truncate">
                      {act.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${act.badgeColor}`}
                    >
                      {act.badge}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {act.value.toLocaleString("tr-TR")}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">tekil kullanıcı</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. İdari Yönetim Modülleri */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Yönetimsel Modüller
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
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
        </div>
      </main>
    </div>
  );
}
