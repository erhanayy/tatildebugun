import { auth } from "@/auth";
import { getFeedPosts } from "@/lib/actions/social";
import { AppHeader } from "@/components/navigation/app-header";
import { FeedView } from "@/components/social/feed-view";
import { redirect } from "next/navigation";
import { Users, Compass, Sparkles } from "lucide-react";

export const metadata = {
  title: "Gezgin Akışı | TatildeBugün",
  description: "Diğer gezginlerin rotalarını, şehir ziyaretlerini ve seyahat anılarını keşfedin.",
};

export default async function FeedPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const posts = await getFeedPosts("all");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Üst Navigasyon */}
      <AppHeader user={session.user} />

      {/* Ana Gövde */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Başlık Alanı */}
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Topluluk & Keşif Akışı</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gezginlerin Seyahat Akışı 🌴
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gezginlerin dünya genelinde eklediği bayrakları, planladığı rotaları keşfedin ve ilham alın.
          </p>
        </div>

        {/* Akış Bileşeni */}
        <FeedView initialFeed={posts} currentUserId={session.user.id!} />
      </main>
    </div>
  );
}
