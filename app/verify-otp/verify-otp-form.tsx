"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyOtp, resendOtp } from "@/lib/actions/auth";
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  FileCode,
  Loader2,
  Palmtree,
} from "lucide-react";
import { toast } from "sonner";

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId") || "";
  const email = searchParams.get("email") || "";

  const [otpCode, setOtpCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (otpCode.length !== 6) {
      setErrorMessage("Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.");
      return;
    }

    if (!userId) {
      setErrorMessage("Kullanıcı kimliği eksik. Lütfen tekrar kayıt olmayı deneyin.");
      return;
    }

    setIsPending(true);

    const res = await verifyOtp({
      userId,
      code: otpCode.trim(),
    });

    if (res.success) {
      toast.success("Hesabınız başarıyla aktifleştirildi! Giriş yapabilirsiniz. 🎉");
      router.push("/login?verified=true");
    } else {
      setErrorMessage(res.message || "Doğrulama başarısız.");
      toast.error(res.message || "Kod doğrulanamadı.");
    }

    setIsPending(false);
  }

  async function handleResend() {
    if (!userId) return;
    setIsResending(true);
    const res = await resendOtp(userId);
    if (res.success) {
      toast.success(res.message || "Yeni kod üretildi ve sifreler.md dosyasına yazıldı.");
    } else {
      toast.error(res.message || "Yeni kod gönderilemedi.");
    }
    setIsResending(false);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-900">
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-emerald-600/20 blur-[130px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 text-white flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Hesap Aktivasyonu
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {email ? (
              <>
                <b className="text-slate-300">{email}</b> hesabınızı doğrulamak için 6 haneli OTP
                kodunu giriniz.
              </>
            ) : (
              "Lütfen 6 haneli aktivasyon kodunu giriniz."
            )}
          </p>
        </div>

        {/* sifreler.md Bilgi Kutusu */}
        <div className="mb-5 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs flex items-start gap-2.5">
          <FileCode className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div className="leading-relaxed text-[11px]">
            <b>Test & Canlı Deneme:</b> 6 haneli aktivasyon kodunuz otomatik olarak proje ana dizinindeki{" "}
            <code className="px-1.5 py-0.5 rounded bg-cyan-900/80 text-white font-mono text-[10px]">
              sifreler.md
            </code>{" "}
            dosyasına yazılmıştır. Oradan kopyalayabilirsiniz!
          </div>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 text-center">
              6 Haneli Doğrulama Kodu
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-[12px] font-mono text-2xl py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || otpCode.length !== 6}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Doğrulanıyor...</span>
              </>
            ) : (
              <>
                <span>Hesabı Doğrula ve Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={isResending}
            onClick={handleResend}
            className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
            <span>{isResending ? "Kod Üretiliyor..." : "Yeni Kod Gönder"}</span>
          </button>

          <Link href="/login" className="text-slate-400 hover:text-slate-200">
            Giriş Ekranına Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
