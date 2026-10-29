import { auth } from "@/auth";
import { getTravelMatches, getMyMatchRequests } from "@/lib/actions/match";
import { AppHeader } from "@/components/navigation/app-header";
import { MatchView } from "@/components/social/match-view";
import { redirect } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";

export const metadata = {
  title: "Gezgin Eşleşmesi & Rota Radarı | TatildeBugün",
  description: "Aynı şehirde ve tarihlerde seyahat eden diğer gezginlerle tanışın, rotanızı birleştirin.",
};

export default async function MatchPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [candidates, requests] = await Promise.all([
    getTravelMatches(),
    getMyMatchRequests(),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Üst Navigasyon */}
      <AppHeader user={session.user} />

      {/* Ana Gövde */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Başlık Alanı */}
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Akıllı Rota & Tarih Çakışma Radarı</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gezgin Eşleşmesi 🧭
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gittiğin veya planladığın rotalarda seninle aynı tarihte aynı şehirde olan gezginleri
            keşfet, tanış ve birlikte gez!
          </p>
        </div>

        {/* Eşleşme Bileşeni */}
        <MatchView
          candidates={candidates}
          incomingRequests={requests.incoming}
          outgoingRequests={requests.outgoing}
        />
      </main>
    </div>
  );
}
