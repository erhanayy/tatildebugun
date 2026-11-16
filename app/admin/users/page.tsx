import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import { getAdminUsersList } from "@/lib/actions/admin-dashboard";
import { UsersManagementView } from "@/components/admin/users-view";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();

  // Yalnızca sistem yöneticileri (admin) erişebilir
  if (!session?.user || (session.user as any).role !== "admin") {
    redirect("/dashboard");
  }

  const initialUsers = await getAdminUsersList("", "all", "all");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader user={session.user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <UsersManagementView
          initialUsers={initialUsers}
          currentAdminId={session.user.id!}
        />
      </main>
    </div>
  );
}
