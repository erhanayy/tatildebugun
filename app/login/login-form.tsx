"use client";

import { useActionState, useState } from "react";
import { authenticate } from "@/lib/actions/auth";
import Link from "next/link";
import { Compass, Eye, EyeOff, Lock, Mail, Palmtree, ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function LoginForm() {
  const { locale, setLanguage, t } = useTranslation();
  const isEn = locale === "en";

  const [errorMessage, dispatch, isPending] = useActionState(
    authenticate,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-950">
      {/* Arka Plan Dekoratif Işık Efektleri */}
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[25%] w-[350px] h-[350px] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />

      {/* Ana Giriş Kartı */}
      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-800 transition-all duration-300">
        
        {/* Dil Seçici (Sağ Üst) */}
        <div className="absolute top-6 right-6 flex items-center bg-slate-950/80 border border-slate-800 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              isEn ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage("tr")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              !isEn ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            TR
          </button>
        </div>

        {/* Logo ve Başlık */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 text-white mb-4 transform hover:scale-105 transition-transform duration-200">
            <Palmtree className="w-8 h-8" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400"></span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 text-cyan-300 text-xs font-semibold mb-2 border border-cyan-800/40">
            <Compass className="w-3.5 h-3.5" />
            <span>{isEn ? "Global Travel Network" : "Küresel Gezgin Ağı"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            All<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">TripX</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            {isEn
              ? "Sign in to manage your travel map & routes"
              : "Hesabınıza giriş yaparak seyahat haritanızı yönetin"}
          </p>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div
            className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-sm font-medium flex items-center justify-center text-center animate-shake"
            aria-live="polite"
          >
            {errorMessage}
          </div>
        )}

        {/* Giriş Formu */}
        <form action={dispatch} className="space-y-5">
          {/* E-posta, Telefon veya Kullanıcı Adı */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              {isEn ? "Email, Phone or Username" : "E-posta veya Cep Telefonu"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                autoComplete="username"
                placeholder={isEn ? "you@example.com or @username" : "ornek@alltripx.com veya 05XX..."}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Şifre */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                {isEn ? "Password" : "Şifre"}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {isEn ? "Forgot Password?" : "Şifremi Unuttum?"}
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={4}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Beni Hatırla */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="remember"
                name="remember"
                className="w-4 h-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-800"
              />
              <span className="text-xs font-medium text-slate-400">
                {isEn ? "Remember Me" : "Beni Hatırla"}
              </span>
            </label>
          </div>

          {/* Giriş Butonu */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:brightness-110 shadow-lg shadow-cyan-500/20 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>{isEn ? "Signing in..." : "Giriş Yapılıyor..."}</span>
              </>
            ) : (
              <>
                <span>{isEn ? "Sign In" : "Giriş Yap"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Kayıt Ol Alt Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            {isEn ? "Don't have an AllTripX account yet?" : "Henüz bir AllTripX hesabınız yok mu?"}{" "}
            <Link
              href="/register"
              className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1"
            >
              {isEn ? "Join Now Free" : "Hemen Kayıt Olun"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
