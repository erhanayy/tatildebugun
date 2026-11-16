import { auth } from "@/auth";
import { getTravelMatches, getMyMatchRequests } from "@/lib/actions/match";
import { AppHeader } from "@/components/navigation/app-header";
import { MatchView } from "@/components/social/match-view";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerTranslation();
  return {
    title: `${t("match.title")} | AllTripX`,
    description: t("match.subtitle"),
  };
}

export default async function MatchPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { t } = await getServerTranslation();
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
            <span>{t("match.badge")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t("match.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("match.subtitle")}
          </p>
        </div>

        {/* Eşleşme Bileşeni */}
        <MatchView
          candidates={candidates}
          incomingRequests={requests.incoming}
          outgoingRequests={requests.outgoing}
          currentUser={{
            id: session.user.id || "",
            name: session.user.name || "Gezgin",
          }}
        />
      </main>
    </div>
  );
}
