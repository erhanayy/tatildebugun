"use client";

import { useState, useEffect } from "react";
import { getOnboardingStatus, completeOnboardingAction, checkUsernameAction } from "@/lib/actions/user";
import {
  Sparkles,
  MapPin,
  AtSign,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  Phone,
  User,
  Radar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

// 81 Türkiye İli Listesi (Alfabetik)
const TURKEY_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya",
  "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik",
  "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
  "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale",
  "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
  "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
  "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak",
  "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
];

const POPULAR_COUNTRIES = [
  { code: "TR", name: "Türkiye 🇹🇷" },
  { code: "DE", name: "Almanya 🇩🇪" },
  { code: "NL", name: "Hollanda 🇳🇱" },
  { code: "GB", name: "İngiltere 🇬🇧" },
  { code: "US", name: "Amerika Birleşik Devletleri 🇺🇸" },
  { code: "FR", name: "Fransa 🇫🇷" },
  { code: "IT", name: "İtalya 🇮🇹" },
  { code: "ES", name: "İspanya 🇪🇸" },
  { code: "AZ", name: "Azerbaycan 🇦🇿" },
  { code: "GR", name: "Yunanistan 🇬🇷" },
];

export function OnboardingWizard() {
  const { locale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [baseCountry, setBaseCountry] = useState("TR");
  const [baseCity, setBaseCity] = useState("İstanbul");
  const [showFullName, setShowFullName] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [radarPrivacy, setRadarPrivacy] = useState<"public" | "friend" | "relative" | "family" | "private">("public");

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; error?: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await getOnboardingStatus();
        if (isMounted && res.needsOnboarding && res.user) {
          setUsername(res.user.username || "");
          setInitialUsername(res.user.username || "");
          setBaseCountry(res.user.baseCountry || "TR");
          setBaseCity(res.user.baseCity || "İstanbul");
          setShowFullName(res.user.showFullName ?? true);
          setShowEmail(res.user.showEmail ?? true);
          setShowPhone(res.user.showPhone ?? false);
          setRadarPrivacy((res.user.radarPrivacy as any) || "public");
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Onboarding kontrol hatası:", err);
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  // Username live debounce validation
  useEffect(() => {
    if (!username || username.trim() === initialUsername) {
      setUsernameStatus({ available: true });
      setIsCheckingUsername(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      const res = await checkUsernameAction(username.trim());
      setUsernameStatus(res);
      setIsCheckingUsername(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [username, initialUsername]);

  if (!isOpen) return null;

  async function handleComplete(skipCustomization: boolean = false) {
    if (!baseCity.trim()) {
      toast.error("Lütfen ikametgah şehrinizi seçiniz.");
      return;
    }

    if (!skipCustomization && usernameStatus && !usernameStatus.available) {
      toast.error(usernameStatus.error || "Lütfen geçerli ve müsait bir kullanıcı adı seçiniz.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = skipCustomization
        ? {
            username: initialUsername || undefined,
            baseCountry: baseCountry || "TR",
            baseCity: baseCity || "İstanbul",
            showFullName: true,
            showEmail: true,
            showPhone: false,
            radarPrivacy: "public" as const,
          }
        : {
            username: username.trim() || undefined,
            baseCountry,
            baseCity: baseCity.trim(),
            showFullName,
            showEmail,
            showPhone,
            radarPrivacy,
          };

      const res = await completeOnboardingAction(payload);
      if (res.success) {
        toast.success(res.message || "Kurulum tamamlandı! Hoş geldiniz 🌴");
        setIsOpen(false);
      } else {
        toast.error(res.message || "Kurulum kaydedilemedi.");
      }
    } catch {
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 my-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-black border border-cyan-500/30">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{locale === "en" ? "Traveler Setup Wizard" : "Gezgin Kurulum Sihirbazı"}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {locale === "en" ? "Welcome to AllTripX! 🌴" : "AllTripX'e Hoş Geldin! 🌴"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {t("onboarding.welcomeSubtitle")}
          </p>

          {/* Adım Göstergesi */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                step === 1 ? "w-10 bg-cyan-400" : "w-4 bg-slate-700"
              }`}
            />
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                step === 2 ? "w-10 bg-cyan-400" : "w-4 bg-slate-700"
              }`}
            />
          </div>
        </div>

        {/* Adım 1: Lokasyon ve Kullanıcı Adı */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Nickname / Handle Alanı */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AtSign className="w-4 h-4 text-cyan-400" />
                <span>{locale === "en" ? "Traveler Handle (Nickname)" : "Gezgin Kullanıcı Adı (Nickname)"}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                  placeholder="traveler_alex"
                  className="w-full pl-8 pr-10 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-cyan-400 transition-colors min-h-[44px]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingUsername ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : usernameStatus?.available ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : usernameStatus?.available === false ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                {locale === "en" ? "Unique profile link:" : "Benzersiz profil bağlantınız:"}{" "}
                <span className="text-cyan-400 font-mono">alltripx.com/@{username || "..."}</span>
              </p>
              {usernameStatus && !usernameStatus.available && (
                <p className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{usernameStatus.error}</span>
                </p>
              )}
            </div>

            {/* Ana İkametgah Ülkesi */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{locale === "en" ? "Country of Residence" : "Ana İkametgah Ülkesi"}</span>
              </label>
              <select
                value={baseCountry}
                onChange={(e) => setBaseCountry(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer min-h-[44px]"
              >
                {POPULAR_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ana İkametgah Şehri (Zorunlu) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>{locale === "en" ? "Home City (Required)" : "Ana İkametgah Şehri (Zorunlu)"}</span>
              </label>
              {baseCountry === "TR" ? (
                <select
                  value={baseCity}
                  onChange={(e) => setBaseCity(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer min-h-[44px]"
                >
                  {TURKEY_CITIES.map((city) => (
                    <option key={city} value={city} className="bg-slate-900 text-white">
                      {city}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={baseCity}
                  onChange={(e) => setBaseCity(e.target.value)}
                  placeholder={locale === "en" ? "Enter city (e.g. London, New York)" : "Şehir adı yazınız (Örn: Berlin, Londra, New York)"}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-cyan-400 transition-colors min-h-[44px]"
                />
              )}
              <p className="text-[11px] text-slate-400">
                {locale === "en" ? "Starting center for your routes and default map location." : "Rotanızın başlangıç merkezi ve haritanızın varsayılan konumudur."}
              </p>
            </div>

            {/* İlerleme Butonu */}
            <button
              type="button"
              onClick={() => {
                if (!baseCity.trim()) {
                  toast.error("Lütfen ikametgah şehrinizi seçiniz.");
                  return;
                }
                if (usernameStatus && !usernameStatus.available) {
                  toast.error(usernameStatus.error || "Lütfen geçerli bir kullanıcı adı seçiniz.");
                  return;
                }
                setStep(2);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer min-h-[44px]"
            >
              <span>{locale === "en" ? "Continue to Privacy Preferences" : "Gizlilik Tercihlerine Geç"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Adım 2: Gizlilik ve İletişim Tercihleri */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>İletişim ve Arama Görünürlüğü</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Kullanıcı adınız (<span className="text-cyan-400 font-mono">@{username}</span>) her zaman görünürdür. Diğer bilgilerinizi aşağıdan kontrol edebilirsiniz:
              </p>
            </div>

            {/* Ad Soyad Görünürlüğü Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="space-y-0.5 max-w-[80%]">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ad Soyad Görünürlüğü</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {showFullName
                    ? "Adınız profilinizde görünür ve adınızla arama yapılabilir."
                    : "Adınız gizlenir, sadece @kullanıcı_adı ile görünürsünüz."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullName(!showFullName)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer min-h-[24px] ${
                  showFullName ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* E-posta Görünürlüğü Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="space-y-0.5 max-w-[80%]">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>E-posta Görünürlüğü</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {showEmail
                    ? "E-postanız profilinizde görünür ve e-postanızla arama yapılabilir."
                    : "E-postanız tamamen gizlenir."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmail(!showEmail)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer min-h-[24px] ${
                  showEmail ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Telefon Numarası Görünürlüğü Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="space-y-0.5 max-w-[80%]">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Telefon Numarası Görünürlüğü</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {showPhone
                    ? "Telefon numaranız rehber aramalarında eşleşebilir."
                    : "Gizli (Varsayılan KVKK Güvenliği)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhone(!showPhone)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer min-h-[24px] ${
                  showPhone ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Rota Radarı Görünürlüğü (Radar Privacy) */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Radar className="w-4 h-4 text-cyan-400" />
                <span>{locale === "en" ? "Route Radar Visibility" : "Rota Radarı Görünürlüğü"}</span>
              </label>
              <select
                value={radarPrivacy}
                onChange={(e) => setRadarPrivacy(e.target.value as any)}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer min-h-[44px]"
              >
                <option value="public" className="bg-slate-900 text-white">
                  {locale === "en" ? "🌍 Everyone (All travelers can see matching routes)" : "🌍 Herkes (Tüm gezginler ortak rotaları görebilir)"}
                </option>
                <option value="friend" className="bg-slate-900 text-white">
                  {locale === "en" ? "👥 Friends, Relatives & Family" : "👥 Arkadaşlarım & Akrabalarım & Ailem"}
                </option>
                <option value="relative" className="bg-slate-900 text-white">
                  {locale === "en" ? "🤝 Relatives & Family Only" : "🤝 Sadece Akrabalarım ve Ailem"}
                </option>
                <option value="family" className="bg-slate-900 text-white">
                  {locale === "en" ? "🏡 Family Only" : "🏡 Sadece Ailem"}
                </option>
                <option value="private" className="bg-slate-900 text-white">
                  {locale === "en" ? "🔒 Private (Do not appear on Radar)" : "🔒 Gizli (Radarda görünme)"}
                </option>
              </select>
            </div>

            {/* Tamamlama Butonları */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleComplete(false)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? (locale === "en" ? "Saving..." : "Kaydediliyor...")
                    : (locale === "en" ? "Save Preferences & Start 🚀" : "Tercihlerimi Kaydet ve Başla 🚀")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs text-slate-400 hover:text-white py-2 transition-colors cursor-pointer"
              >
                {locale === "en" ? "← Back (Location & Username)" : "← Geri Dön (Lokasyon & Kullanıcı Adı)"}
              </button>
            </div>
          </div>
        )}

        {/* Hızlı Atlama (Varsayılanlarla Geç) */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => handleComplete(true)}
            disabled={isSubmitting}
            className="text-xs text-slate-400 hover:text-cyan-400 underline underline-offset-4 transition-colors cursor-pointer min-h-[30px]"
          >
            {locale === "en" ? "Quick Skip with Defaults ⚡" : "Varsayılan Ayarlarla Hızlıca Geç ⚡"}
          </button>
        </div>
      </div>
    </div>
  );
}
