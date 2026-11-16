"use client";

import { useState, useEffect } from "react";
import type { UserProfileData } from "@/lib/actions/user";
import { updateProfile, changePassword, checkUsernameAction } from "@/lib/actions/user";
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import {
  User,
  Mail,
  Phone,
  Lock,
  Globe2,
  MapPin,
  Navigation,
  Clock,
  CheckCircle2,
  Camera,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  Save,
  Palmtree,
  Home,
  AtSign,
  AlertCircle,
  Radar,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { POPULAR_COUNTRIES } from "@/lib/world-cities";
import { useTranslation } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/types";

interface ProfileViewProps {
  initialData: UserProfileData;
}

const PRESET_AVATARS = [
  "🧭", "🌴", "✈️", "🏖️", "🏔️", "🏕️", "🎒", "🛳️", "🌍", "🚂", "🗺️", "🚀"
];

export function ProfileView({ initialData }: ProfileViewProps) {
  const { locale, setLanguage, t, supportedLocales } = useTranslation();
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");

  // Profil Form State
  const [fullName, setFullName] = useState(initialData.user.fullName);
  const [username, setUsername] = useState(initialData.user.username || "");
  const [initialUsername] = useState(initialData.user.username || "");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; error?: string } | null>(null);

  const [phoneNumber, setPhoneNumber] = useState(initialData.user.phoneNumber || "");
  const [bio, setBio] = useState(initialData.user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialData.user.avatarUrl || "🌴");
  const [baseCountry, setBaseCountry] = useState(initialData.user.baseCountry || "TR");
  const [baseCity, setBaseCity] = useState(initialData.user.baseCity || "İstanbul");

  // Gizlilik ve İletişim Tercihleri State
  const [showFullName, setShowFullName] = useState(initialData.user.showFullName ?? true);
  const [showEmail, setShowEmail] = useState(initialData.user.showEmail ?? true);
  const [showPhone, setShowPhone] = useState(initialData.user.showPhone ?? false);
  const [searchPrivacy, setSearchPrivacy] = useState<"public" | "friend" | "relative" | "family" | "private">(
    (initialData.user.searchPrivacy as any) || "public"
  );
  const [radarPrivacy, setRadarPrivacy] = useState<"public" | "friend" | "relative" | "family" | "private">(
    (initialData.user.radarPrivacy as any) || "public"
  );
  const [mapPrivacy, setMapPrivacy] = useState<"public" | "friend" | "relative" | "family" | "private">(
    (initialData.user.mapPrivacy as any) || "public"
  );

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Kullanıcı adı müsaitlik canlı kontrolü
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

  // Şifre Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profil Bilgilerini Kaydet
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (usernameStatus && !usernameStatus.available) {
      toast.error(usernameStatus.error || "Lütfen geçerli ve müsait bir kullanıcı adı giriniz.");
      return;
    }

    setIsUpdatingProfile(true);

    const res = await updateProfile({
      fullName,
      username: username.trim() || undefined,
      phoneNumber,
      bio,
      avatarUrl,
      baseCountry,
      baseCity,
      preferredLanguage: locale,
      showFullName,
      showEmail,
      showPhone,
      searchPrivacy,
      radarPrivacy,
      mapPrivacy,
    });

    if (res.success) {
      toast.success(res.message || t("profile.saveSuccess"));
    } else {
      toast.error(res.message || t("common.error"));
    }

    setIsUpdatingProfile(false);
  }

  // Şifre Değiştir
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error(locale === "en" ? "Passwords do not match." : "Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error(locale === "en" ? "New password must be at least 6 characters." : "Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsChangingPassword(true);

    const res = await changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (res.success) {
      toast.success(res.message || t("profile.passwordSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      toast.error(res.message || t("common.error"));
    }

    setIsChangingPassword(false);
  }

  const { stats } = initialData;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Üst Profil Özeti ve Seyahat Karnesi */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-4xl shadow-xl shadow-cyan-500/20 select-none border-2 border-white/20">
              {avatarUrl.length <= 4 ? avatarUrl : "🌴"}
            </div>
          </div>

          {/* İsim ve Başlık */}
          <div className="text-center sm:text-left flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 text-xs font-bold">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{locale === "en" ? "Traveler Passport" : "Gezgin Pasaportu"}</span>
            </div>
            <h2 className="text-2xl font-black text-white">{fullName}</h2>
            <p className="text-xs text-slate-400">{initialData.user.email}</p>
            {bio && <p className="text-xs text-slate-300 italic pt-1 max-w-lg">"{bio}"</p>}
          </div>

          {/* İstatistik Rozetleri */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <Globe2 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-base font-black text-white">{stats.countryCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">{t("common.countries")}</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <MapPin className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-base font-black text-white">{stats.cityCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">{t("common.cities")}</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <Navigation className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <div className="text-base font-black text-white">{stats.tripCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">{t("common.trips")}</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-base font-black text-amber-400">{stats.totalDays}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">{t("common.days")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sekmeler */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "info"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{t("profile.tabInfo")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("password")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "password"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{t("profile.tabPassword")}</span>
        </button>
      </div>

      {/* 3. Profil Bilgileri Sekmesi */}
      {activeTab === "info" && (
        <form
          onSubmit={handleSaveProfile}
          className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
        >
          {/* Dil Tercihi Kartı (Language Preference Card) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-cyan-400" />
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    {t("profile.languageSectionTitle")}
                  </label>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t("profile.languageSectionDesc")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {supportedLocales.map((l) => {
                const isSelected = locale === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setLanguage(l.code);
                      toast.success(
                        l.code === "en"
                          ? "Language switched to English! 🇬🇧"
                          : "Arayüz dili Türkçe olarak ayarlandı! 🇹🇷"
                      );
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer min-h-[50px] ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-cyan-500 shadow-lg shadow-cyan-500/20 text-white"
                        : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none">
                        {l.code === "tr" ? "🇹🇷" : "🇬🇧"}
                      </span>
                      <div className="text-left">
                        <span className="text-xs font-bold block">{l.nativeName}</span>
                        <span className="text-[10px] text-slate-400">{l.name}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* Avatar Seçimi */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.avatarLabel")}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatarUrl(av)}
                    className={`w-10 h-10 rounded-2xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                      avatarUrl === av
                        ? "bg-cyan-500/20 border-cyan-500 scale-110 shadow-md shadow-cyan-500/20"
                        : "bg-slate-800/80 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Ad Soyad ve Kullanıcı Adı (Handle) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  {t("profile.fullNameLabel")} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between"
                >
                  <span>{t("profile.usernameLabel")} *</span>
                  {username && (
                    <span className="text-[10px] text-cyan-400 font-mono font-normal">
                      @{username}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold font-mono">
                    @
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                    className="w-full pl-8 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {isCheckingUsername ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : usernameStatus?.available ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : usernameStatus?.available === false ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : null}
                  </div>
                </div>
                {usernameStatus && !usernameStatus.available && (
                  <p className="text-[10px] text-rose-400 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{usernameStatus.error}</span>
                  </p>
                )}
              </div>
            </div>

            {/* E-posta (Salt Okunur) ve Telefon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {t("profile.emailReadOnlyLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={initialData.user.email || ""}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {t("profile.phoneLabel")}
                </label>
                <InternationalPhoneInput
                  value={phoneNumber}
                  onChange={(val) => setPhoneNumber(val)}
                  placeholder="5XX XXX XX XX"
                />
              </div>
            </div>

            {/* Ana İkametgah (Ülke & Şehir Seçimi) */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-cyan-400" />
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  {t("profile.baseLocationTitle")}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    {t("profile.countryLabel")}
                  </label>
                  <select
                    value={baseCountry}
                    onChange={(e) => setBaseCountry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    {POPULAR_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    {t("profile.cityLabel")}
                  </label>
                  <input
                    type="text"
                    required
                    value={baseCity}
                    onChange={(e) => setBaseCity(e.target.value)}
                    placeholder={locale === "en" ? "e.g. London, New York..." : "Örn: İstanbul, Bursa..."}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Biyografi */}
            <div>
              <label
                htmlFor="bio"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                {t("profile.bioLabel")}
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                placeholder={t("profile.bioPlaceholder")}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
              <div className="text-right text-[10px] text-slate-500 mt-1">{bio.length}/500</div>
            </div>

            {/* İletişim, Arama ve Görünürlük Tercihleri */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  {t("profile.privacyCardTitle")}
                </label>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t("profile.privacyCardDesc")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ad Soyad */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">{t("profile.showFullNameLabel")}</span>
                    <span className="text-[10px] text-slate-400">{t("profile.showFullNameDesc")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullName(!showFullName)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      showFullName ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {/* E-posta */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">{t("profile.showEmailLabel")}</span>
                    <span className="text-[10px] text-slate-400">{t("profile.showEmailDesc")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      showEmail ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {/* Telefon */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">{t("profile.showPhoneLabel")}</span>
                    <span className="text-[10px] text-slate-400">{t("profile.showPhoneDesc")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhone(!showPhone)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      showPhone ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>
              </div>

              {/* Hiyerarşik Arama ve Radar Gizliliği */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Radar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t("profile.radarPrivacyLabel")}</span>
                  </label>
                  <select
                    value={radarPrivacy}
                    onChange={(e) => setRadarPrivacy(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer min-h-[38px]"
                  >
                    <option value="public">🌍 {locale === "en" ? "Public (All Travelers)" : "Herkes (Tüm Gezginler)"}</option>
                    <option value="friend">👥 {locale === "en" ? "Friends, Relatives & Family" : "Arkadaşlarım & Akrabalarım & Ailem"}</option>
                    <option value="relative">🤝 {locale === "en" ? "Relatives & Family" : "Akrabalarım & Ailem"}</option>
                    <option value="family">🏡 {locale === "en" ? "Family Only" : "Sadece Ailem"}</option>
                    <option value="private">🔒 {locale === "en" ? "Private (Confidential)" : "Gizli (Kimse göremez)"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t("profile.searchPrivacyLabel")}</span>
                  </label>
                  <select
                    value={searchPrivacy}
                    onChange={(e) => setSearchPrivacy(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer min-h-[38px]"
                  >
                    <option value="public">🌍 {locale === "en" ? "Public Searchable" : "Herkes arayabilir"}</option>
                    <option value="friend">👥 {locale === "en" ? "Friends & Family Only" : "Sadece Arkadaşlarım & Ailem"}</option>
                    <option value="relative">🤝 {locale === "en" ? "Relatives & Family Only" : "Sadece Akrabalarım & Ailem"}</option>
                    <option value="family">🏡 {locale === "en" ? "Family Only" : "Sadece Ailem"}</option>
                    <option value="private">🔒 {locale === "en" ? "Private (Hidden from Search)" : "Gizli (Aramada çıkma)"}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer min-h-[44px]"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("common.saving")}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t("profile.saveProfileBtn")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 4. Şifre Değiştir Sekmesi */}
      {activeTab === "password" && (
        <form
          onSubmit={handleChangePassword}
          className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 max-w-lg"
        >
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {t("profile.currentPasswordLabel")} *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {t("profile.newPasswordLabel")} *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {t("profile.confirmNewPasswordLabel")} *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPassword || !currentPassword || !newPassword}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer min-h-[44px]"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("common.saving")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t("profile.changePasswordBtn")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
