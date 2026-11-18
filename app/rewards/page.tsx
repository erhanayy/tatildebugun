import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import { getUserPointsSummary } from "@/lib/points/engine";
import { getPaginatedPointActivitiesAction } from "@/lib/actions/points";
import { RewardsView } from "@/components/rewards/rewards-view";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [summary, initialLedgerRes] = await Promise.all([
    getUserPointsSummary(session.user.id),
    getPaginatedPointActivitiesAction(1, 8),
  ]);

  const initialLedger =
    initialLedgerRes.success && "items" in initialLedgerRes
      ? {
          items: initialLedgerRes.items,
          page: initialLedgerRes.page,
          pageSize: initialLedgerRes.pageSize,
          totalCount: initialLedgerRes.totalCount,
          totalPages: initialLedgerRes.totalPages,
        }
      : {
          items: [],
          page: 1,
          pageSize: 8,
          totalCount: 0,
          totalPages: 1,
        };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader user={session.user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <RewardsView
          initialSummary={summary}
          initialLedger={initialLedger}
          user={session.user}
        />
      </main>
    </div>
  );
}
