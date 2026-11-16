"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyOtp, resendOtp } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n";
import {
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Mail,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale, setLanguage } = useTranslation();

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
      const msg = locale === "en" ? "Please enter the complete 6-digit code." : "Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.";
      setErrorMessage(msg);
      return;
    }

    if (!userId) {
      const msg = locale === "en" ? "User ID is missing. Please try registering again." : "Kullanıcı kimliği eksik. Lütfen tekrar kayıt olmayı deneyin.";
      setErrorMessage(msg);
      return;
    }

    setIsPending(true);

    const res = await verifyOtp({
      userId,
      code: otpCode.trim(),
    });

    if (res.success) {
      toast.success(locale === "en" ? "Account verified successfully! You can now sign in. 🎉" : "Hesabınız başarıyla aktifleştirildi! Giriş yapabilirsiniz. 🎉");
      router.push("/login?verified=true");
    } else {
      setErrorMessage(res.message || (locale === "en" ? "Verification failed." : "Doğrulama başarısız."));
      toast.error(res.message || (locale === "en" ? "Code could not be verified." : "Kod doğrulanamadı."));
    }

    setIsPending(false);
  }

  async function handleResend() {
    if (!userId) return;
    setIsResending(true);
    const res = await resendOtp(userId);
    if (res.success) {
      toast.success(res.message || (locale === "en" ? "New verification code has been sent to your email." : "Yeni doğrulama kodunuz e-posta adresinize gönderildi."));
    } else {
      toast.error(res.message || (locale === "en" ? "Failed to resend code." : "Yeni kod gönderilemedi."));
    }
    setIsResending(false);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-950">
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 text-slate-100">
        {/* Üst Bar: Marka Rozeti ve Hızlı Dil Seçici */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-black border border-cyan-500/25">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AllTripX</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setLanguage("tr")}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                locale === "tr"
                  ? "bg-cyan-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇹🇷 TR
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                locale === "en"
                  ? "bg-cyan-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 text-white flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-extrabold text-white">
            {t("auth.verifyOtpTitle")}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
            {email ? (
              <>
                <b className="text-cyan-400">{email}</b>{" "}
                {locale === "en" ? "account verification: please enter the 6-digit code sent to your email." : "hesabınızı doğrulamak için e-postanıza gönderilen 6 haneli OTP kodunu giriniz."}
              </>
            ) : (
              t("auth.verifyOtpSubtitle")
            )}
          </p>
        </div>

        {/* Giriş Ekranından Yönlendirilme Bilgisi */}
        {searchParams.get("relogin") === "true" && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-medium text-center flex items-center justify-center gap-2">
            <span>
              {locale === "en"
                ? "⚠️ Your account was not yet activated. A new verification code has been sent to your email!"
                : "⚠️ Hesabınız henüz onaylanmamıştı. Yeni doğrulama kodunuz e-posta adresinize gönderildi!"}
            </span>
          </div>
        )}

        {/* Önemli Spam / Gereksiz Kutusu Uyarısı */}
        <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t("auth.spamNoticeTitle")}</span>
          </div>
          <p className="text-[12px] leading-relaxed text-amber-100/90">
            {t("auth.spamNoticeDesc")}
          </p>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 text-center">
              {t("auth.codePlaceholder")}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-[12px] font-mono text-2xl py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold min-h-[48px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || otpCode.length !== 6}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{locale === "en" ? "Verifying..." : "Doğrulanıyor..."}</span>
              </>
            ) : (
              <>
                <span>{t("auth.verifyAndLoginBtn")}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={isResending}
            onClick={handleResend}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 flex items-center gap-1 cursor-pointer min-h-[30px]"
          >
            <RotateCcw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
            <span>{isResending ? t("auth.generatingCode") : t("auth.resendOtp")}</span>
          </button>

          <Link href="/login" className="text-slate-400 hover:text-white transition-colors min-h-[30px] flex items-center">
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
