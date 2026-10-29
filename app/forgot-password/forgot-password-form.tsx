"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import {
  KeyRound,
  Mail,
  ArrowRight,
  Loader2,
  FileCode,
  Palmtree,
  ArrowLeft,
  Send,
} from "lucide-react";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage("Lütfen e-posta veya telefon numaranızı giriniz.");
      return;
    }

    setIsPending(true);

    const res = await requestPasswordReset({
      identifier: identifier.trim(),
    });

    if (res.success && res.userId) {
      toast.success("Şifre sıfırlama kodu oluşturuldu! 🎉");
      router.push(`/reset-password?userId=${res.userId}`);
    } else {
      setErrorMessage(res.message || "İşlem sırasında bir hata oluştu.");
      toast.error(res.message || "Kullanıcı bulunamadı.");
    }

    setIsPending(false);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-900">
      <div className="absolute top-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 text-white flex items-center justify-center mb-3">
            <KeyRound className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Şifremi Unuttum
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
            Hesabınıza kayıtlı e-posta adresinizi veya telefon numaranızı giriniz.
          </p>
        </div>

        {/* sifreler.md Bilgi Kutusu */}
        <div className="mb-5 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs flex items-start gap-2.5">
          <FileCode className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div className="leading-relaxed text-[11px]">
            <b>Test & Canlı Bildirim:</b> Sıfırlama kodunuz anında <code className="px-1.5 py-0.5 rounded bg-cyan-900/80 text-white font-mono text-[10px]">sifreler.md</code> dosyasına yazılacak ve <b>erhanayyildiz@gmail.com</b> adresine CC ile iletilecektir.
          </div>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="identifier"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              E-posta veya Cep Telefonu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ornek@tatildebugun.com veya 05XX XXX XX XX"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !identifier.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Kod Gönderiliyor...</span>
              </>
            ) : (
              <>
                <span>Sıfırlama Kodu Gönder</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Giriş Ekranına Geri Dön</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
