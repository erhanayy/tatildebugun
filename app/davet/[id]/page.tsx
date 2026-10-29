import Link from "next/link";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Palmtree, Compass, ArrowRight, Sparkles, MapPin, Users } from "lucide-react";

interface InvitePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { id } = await params;

  let inviterName = "Bir arkadaşın";
  try {
    const inviter = await db.select().from(users).where(eq(users.id, id));
    if (inviter.length > 0 && inviter[0].fullName) {
      inviterName = inviter[0].fullName;
    }
  } catch (e) {
    console.error("Davet eden kullanıcı sorgulanırken hata:", e);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Arka Plan Efekti */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-cyan-500/25">
          <Palmtree className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Özel Gezgin Daveti</span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            {inviterName} Seni TatildeBugün'e Davet Etti! 🌴
          </h1>

          <p className="text-xs text-slate-400 leading-relaxed">
            Kişisel dünya seyahat haritanı oluştur, gezdiğin ve hayal ettiğin rotaları işaretle.
            Aynı rotada buluştuğunuzda anında haberleşin!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Ziyaret ettiğin şehir bayraklarını haritaya işle</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Gelecek seyahatlerini ve rotalarını çiz</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Aynı şehirde çakışan gezginlerle tanış</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/register"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all"
          >
            <span>Hemen Ücretsiz Katıl</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="block text-xs text-slate-400 hover:text-white transition-colors"
          >
            Zaten hesabın var mı? <span className="text-cyan-400 font-bold">Giriş Yap</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
