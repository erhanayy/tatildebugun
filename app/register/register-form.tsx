"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/actions/auth";
import {
  Palmtree,
  Compass,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import { useTranslation } from "@/lib/i18n/context";

export function RegisterForm() {
  const router = useRouter();
  const { locale, setLanguage, t } = useTranslation();
  const isEn = locale === "en";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage(
        isEn
          ? "Passwords do not match."
          : "Girdiğiniz parolalar birbiriyle eşleşmiyor."
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        isEn
          ? "Password must be at least 6 characters."
          : "Parola en az 6 karakter olmalıdır."
      );
      return;
    }

    setIsPending(true);

    const res = await registerUser({
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
    });

    if (res.success && res.userId) {
      toast.success(
        isEn
          ? "Account created successfully! Verification code sent."
          : "Hesabınız başarıyla oluşturuldu! Lütfen kodu giriniz."
      );
      router.push(`/verify-otp?userId=${res.userId}`);
    } else {
      setIsPending(false);
      setErrorMessage(res.message || (isEn ? "Registration failed." : "Kayıt işlemi başarısız oldu."));
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-950">
      {/* Arka Plan Dekoratif Işık Efektleri */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[130px] pointer-events-none" />

      {/* Ana Kayıt Kartı */}
      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 transition-all duration-300">
        
        {/* Dil Seçici (Sağ Üst) */}
        <div className="absolute top-6 right-6 flex items-center bg-slate-950/80 border border-slate-800 rounded-full p-0.5 z-10">
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
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 text-white mb-3 transform hover:scale-105 transition-transform duration-200">
            <Palmtree className="w-7 h-7" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 text-cyan-300 text-xs font-semibold mb-2 border border-cyan-800/40">
            <Compass className="w-3.5 h-3.5" />
            <span>{isEn ? "Join Traveler Network" : "Gezgin Ailesine Katıl"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            All<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">TripX</span> {isEn ? "Sign Up" : "Kayıt"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isEn
              ? "Build your travel map, chart routes, and meet fellow explorers!"
              : "Haritanı oluştur, rotalarını çiz ve yeni seyahat arkadaşlarıyla tanış!"}
          </p>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div
            className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs font-medium flex items-center justify-center text-center animate-shake"
            aria-live="polite"
          >
            {errorMessage}
          </div>
        )}

        {/* Kayıt Formu */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Ad Soyad */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
            >
              {isEn ? "Full Name *" : "Ad Soyad *"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="fullName"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isEn ? "e.g. John Doe" : "Örn: Erhan Ayyıldız"}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* E-posta */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
            >
              {isEn ? "Email Address *" : "E-posta Adresi *"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isEn ? "example@domain.com" : "ornek@alltripx.com"}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
            >
              {isEn ? "Mobile Phone *" : "Cep Telefonu *"}
            </label>
            <InternationalPhoneInput
              value={phoneNumber}
              onChange={(val) => setPhoneNumber(val)}
              placeholder={isEn ? "5XX XXX XX XX" : "5XX XXX XX XX"}
              required
            />
          </div>

          {/* Şifre ve Tekrar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
              >
                {isEn ? "Password *" : "Şifre *"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
              >
                {isEn ? "Confirm Password *" : "Şifre (Tekrar) *"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Kayıt Butonu */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-3 py-3.5 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:brightness-110 shadow-lg shadow-cyan-500/20 active:scale-[0.99] disabled:opacity-60 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>{isEn ? "Creating Account..." : "Hesap Oluşturuluyor..."}</span>
              </>
            ) : (
              <>
                <span>{isEn ? "Join AllTripX Free" : "Hemen Kayıt Ol"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Giriş Yap Alt Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            {isEn ? "Already have an account?" : "Zaten bir hesabınız var mı?"}{" "}
            <Link
              href="/login"
              className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1"
            >
              {isEn ? "Sign In" : "Giriş Yapın"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
