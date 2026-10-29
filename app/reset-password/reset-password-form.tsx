"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/actions/auth";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  FileCode,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (code.length !== 6) {
      setErrorMessage("Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Girdiğiniz yeni parolalar birbiriyle eşleşmiyor.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Yeni parola en az 6 karakter olmalıdır.");
      return;
    }

    if (!userId) {
      setErrorMessage("Kullanıcı kimliği bulunamadı. Lütfen işlemi baştan başlatın.");
      return;
    }

    setIsPending(true);

    const res = await resetPassword({
      userId,
      code: code.trim(),
      newPassword,
      confirmPassword,
    });

    if (res.success) {
      toast.success("Şifreniz başarıyla yenilendi! Yeni şifrenizle giriş yapabilirsiniz. 🔒");
      router.push("/login?reset=success");
    } else {
      setErrorMessage(res.message || "Şifre yenilenirken bir hata oluştu.");
      toast.error(res.message || "İşlem başarısız.");
    }

    setIsPending(false);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-900">
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 text-white flex items-center justify-center mb-3">
            <Lock className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Yeni Şifre Belirle
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Doğrulama kodunuzu ve yeni şifrenizi girerek hesabınızı güvenceye alın.
          </p>
        </div>

        {/* sifreler.md Bilgi Kutusu */}
        <div className="mb-5 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs flex items-start gap-2.5">
          <FileCode className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div className="leading-relaxed text-[11px]">
            Sıfırlama kodunuz <code className="px-1.5 py-0.5 rounded bg-cyan-900/80 text-white font-mono text-[10px]">sifreler.md</code> dosyasına kaydedilmiş ve <b>erhanayyildiz@gmail.com</b> adresine CC ile iletilmiştir.
          </div>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 6 Haneli Kod */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              6 Haneli Sıfırlama Kodu *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-[10px] font-mono text-xl py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Yeni Şifre */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Yeni Şifre *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Yeni Şifre Tekrar */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Yeni Şifre Tekrarı *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifreyi tekrar giriniz"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || code.length !== 6}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Şifre Güncelleniyor...</span>
              </>
            ) : (
              <>
                <span>Şifremi Güncelle ve Giriş Yap</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link href="/login" className="text-xs text-slate-400 hover:text-white">
            Giriş Ekranına Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
