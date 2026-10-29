import { auth } from "@/auth";
import { getUserProfile } from "@/lib/actions/user";
import { AppHeader } from "@/components/navigation/app-header";
import { ProfileView } from "@/components/profile/profile-view";
import { redirect } from "next/navigation";
import { User, Sparkles } from "lucide-react";

export const metadata = {
  title: "Profilim & Hesap Ayarları | TatildeBugün",
  description: "Kişisel bilgilerinizi güncelleyin, şifrenizi değiştirin ve seyahat karnenizi inceleyin.",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const profileData = await getUserProfile();

  if (!profileData) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Üst Navigasyon */}
      <AppHeader user={session.user} />

      {/* Ana Gövde */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
            <User className="w-3.5 h-3.5" />
            <span>Hesap & Güvenlik Yönetimi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gezgin Profili 🌴
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kişisel bilgilerinizi, profil fotoğrafınızı ve hesap güvenliğinizi yönetin.
          </p>
        </div>

        <ProfileView initialData={profileData} />
      </main>
    </div>
  );
}
