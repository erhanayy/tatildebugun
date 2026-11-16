import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import {
  getTravelerDashboardData,
  getLeaderboard,
} from "@/lib/actions/traveler-dashboard";
import { TravelerDashboardView } from "@/components/dashboard/traveler-dashboard-view";

export const dynamic = "force-dynamic";

export default async function TravelerPassportPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [initialStats, initialLeaderboard] = await Promise.all([
    getTravelerDashboardData(false),
    getLeaderboard("friends"),
  ]);

  if (!initialStats) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader user={session.user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <TravelerDashboardView
          initialStats={initialStats}
          initialLeaderboard={initialLeaderboard}
        />
      </main>
    </div>
  );
}
