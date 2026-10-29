import Link from "next/link";
import { Palmtree, Compass, ArrowRight, ShieldCheck, Hotel, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-white relative overflow-hidden">
      {/* Dekoratif Işıklar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-500/20 to-transparent blur-[140px] pointer-events-none" />

      {/* Üst Menü / Navbar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Palmtree className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Tatilde<span className="text-cyan-400">Bugün</span>
          </span>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all duration-200"
        >
          <span>Giriş Yap</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero Bölümü */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-6 backdrop-blur-md">
          <Compass className="w-4 h-4" />
          Yeni Nesil Tatil ve Konaklama Deneyimi
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Hayalinizdeki Tatil{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
            TatildeBugün
          </span>{" "}
          ile Başlar
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl">
          Seçkin butik oteller, lüks villalar, rehberli rota ve etkinlikleri tek bir akıllı platformda keşfedin ve yönetin.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:opacity-95 shadow-xl shadow-cyan-400/20 transition-all duration-150 transform hover:-translate-y-0.5"
          >
            <span>Panele Giriş Yap</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Güven ve Özellik İpuçları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <Hotel className="w-6 h-6 text-cyan-400 mb-3" />
            <h3 className="font-semibold text-sm text-white">Doğrulanmış Tesisler</h3>
            <p className="text-xs text-slate-400 mt-1">Özenle seçilmiş, yüksek standartlı konaklama noktaları.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <MapPin className="w-6 h-6 text-teal-400 mb-3" />
            <h3 className="font-semibold text-sm text-white">Özel Keşif Rotaları</h3>
            <p className="text-xs text-slate-400 mt-1">Bölgenin en popüler koyları, lezzet durakları ve aktiviteleri.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <ShieldCheck className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="font-semibold text-sm text-white">Güvenli Yönetim</h3>
            <p className="text-xs text-slate-400 mt-1">Google Cloud SQL ve NextAuth v5 ile uçtan uca koruma.</p>
          </div>
        </div>
      </section>

      {/* Alt Bilgi / Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-slate-500">
        © 2026 TatildeBugün - Tüm hakları saklıdır.
      </footer>
    </main>
  );
}
