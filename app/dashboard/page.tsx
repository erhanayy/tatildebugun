import { auth } from "@/auth";
import { getUserVisits } from "@/lib/actions/visits";
import { getUserTrips } from "@/lib/actions/trips";
import { WorldMapWrapper } from "@/components/map/world-map-wrapper";
import { AppHeader } from "@/components/navigation/app-header";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import type { Visit } from "@/lib/db/schema";

export const metadata = {
  title: "Seyahat Haritam | TatildeBugün",
  description: "Ziyaret ettiğiniz ülkeleri ve şehirleri dünya haritasında keşfedin.",
};

// İlk açılışta kullanıcının hayal ettiği senaryoyu (İspanya 4 şehir, Barselona 2 ziyaret vb.)
// hemen görebilmesi için örnek veriler (Kullanıcı kendi gezilerini ekledikçe veritabanından listelenir)
const DEMO_VISITS: Visit[] = [
  {
    id: "demo-1",
    userId: "demo",
    countryCode: "ES",
    countryName: "İspanya",
    cityName: "Barselona",
    districtName: null,
    latitude: 41.3879,
    longitude: 2.16992,
    dateType: "exact",
    startDate: new Date("2024-06-10"),
    endDate: new Date("2024-06-15"),
    visitYear: 2024,
    visitMonth: 6,
    stayDurationDays: 5,
    visitType: "touristic",
    visibility: "public",
    notes: "Sagrada Familia ve Park Güell gezisi",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-2",
    userId: "demo",
    countryCode: "ES",
    countryName: "İspanya",
    cityName: "Barselona",
    districtName: null,
    latitude: 41.3879,
    longitude: 2.16992,
    dateType: "month_year",
    startDate: null,
    endDate: null,
    visitYear: 2023,
    visitMonth: 9,
    stayDurationDays: 3,
    visitType: "touristic",
    visibility: "public",
    notes: "Tapas festivali ve Gotik mahalle",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-3",
    userId: "demo",
    countryCode: "ES",
    countryName: "İspanya",
    cityName: "Madrid",
    districtName: null,
    latitude: 40.4168,
    longitude: -3.7038,
    dateType: "exact",
    startDate: new Date("2024-01-20"),
    endDate: new Date("2024-01-24"),
    visitYear: 2024,
    visitMonth: 1,
    stayDurationDays: 4,
    visitType: "business",
    visibility: "public",
    notes: "Prado Müzesi ve iş toplantıları",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-4",
    userId: "demo",
    countryCode: "ES",
    countryName: "İspanya",
    cityName: "Valensiya",
    districtName: null,
    latitude: 39.4699,
    longitude: -0.3763,
    dateType: "month_year",
    startDate: null,
    endDate: null,
    visitYear: 2022,
    visitMonth: 8,
    stayDurationDays: 4,
    visitType: "touristic",
    visibility: "public",
    notes: "Bilim ve Sanat Şehri",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-5",
    userId: "demo",
    countryCode: "ES",
    countryName: "İspanya",
    cityName: "Sevilla",
    districtName: null,
    latitude: 37.3891,
    longitude: -5.9845,
    dateType: "month_year",
    startDate: null,
    endDate: null,
    visitYear: 2022,
    visitMonth: 5,
    stayDurationDays: 3,
    visitType: "touristic",
    visibility: "public",
    notes: "Flamenko gecesi ve Alcázar",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-6",
    userId: "demo",
    countryCode: "IT",
    countryName: "İtalya",
    cityName: "Roma",
    districtName: null,
    latitude: 41.9028,
    longitude: 12.4964,
    dateType: "exact",
    startDate: new Date("2023-05-15"),
    endDate: new Date("2023-05-20"),
    visitYear: 2023,
    visitMonth: 5,
    stayDurationDays: 5,
    visitType: "touristic",
    visibility: "public",
    notes: "Kolezyum ve Trastevere sokakları",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-7",
    userId: "demo",
    countryCode: "TR",
    countryName: "Türkiye",
    cityName: "Antalya",
    districtName: "Kaş",
    latitude: 36.8969,
    longitude: 30.7133,
    dateType: "exact",
    startDate: new Date("2024-07-01"),
    endDate: new Date("2024-07-08"),
    visitYear: 2024,
    visitMonth: 7,
    stayDurationDays: 7,
    visitType: "touristic",
    visibility: "public",
    notes: "Kaş ve Kalkan koyları",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const dbVisits = await getUserVisits();
  const dbTrips = await getUserTrips();
  const visits = dbVisits;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Üst Bar / Ortak Navigasyon */}
      <AppHeader user={user} />

      {/* Ana Gövde */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Başlık ve Hoş Geldin Mesajı */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Gezgin Pasaportu & Rota Karnesi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Kişisel Dünya Haritam 🗺️
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gittiğiniz ülkeleri, şehir bayraklarını ve seyahat hatıralarınızı canlı olarak yönetin.
            </p>
          </div>
        </div>

        {/* Yeni Kullanıcı Karşılama Kartı (Hiç seyahat veya rota yoksa) */}
        {visits.length === 0 && dbTrips.length === 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 border border-cyan-800/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-xl shrink-0 shadow-inner">
                ✨
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Hoş geldiniz! Haritanız henüz boş ve keşfedilmeyi bekliyor
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Ziyaret ettiğiniz veya planladığınız bir şehri eklemek için haritada gitmek istediğiniz şehre <b>sağ tıklayın</b> (mobilde basılı tutun) veya yukarıdaki <b>&quot;Seyahat & Keşif&quot;</b> butonunu kullanın.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* İnteraktif Harita Bileşeni */}
        <section className="w-full">
          <WorldMapWrapper initialVisits={visits} initialTrips={dbTrips} />
        </section>

        {/* Hızlı Bilgilendirme ve Kullanım Rehberi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
              <span className="text-base">🚩</span>
              <span>Ülke & Şehir Sayacı</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dünya görünümünde bayraklar üzerinde o ülkede gördüğünüz <b>farklı şehir sayısı</b> gösterilir.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
              <span className="text-base">🔍</span>
              <span>Çift Tıklama İle Şehirler</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              İstediğiniz ülkeye <b>çift tıklayarak</b> o ülkedeki şehir pinlerini ve o şehre kaç kez gittiğinizi görebilirsiniz.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
              <span className="text-base">📍</span>
              <span>Sağ Tık / Uzun Basma</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Haritada herhangi bir yere <b>sağ tıklayarak</b> (mobilde uzun basarak) o şehre anında bayrak ekleyebilirsiniz.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
