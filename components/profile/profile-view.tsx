"use client";

import { useState } from "react";
import type { UserProfileData } from "@/lib/actions/user";
import { updateProfile, changePassword } from "@/lib/actions/user";
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
} from "lucide-react";
import { toast } from "sonner";
import { POPULAR_COUNTRIES } from "@/lib/world-cities";

interface ProfileViewProps {
  initialData: UserProfileData;
}

const PRESET_AVATARS = [
  "🧭", "🌴", "✈️", "🏖️", "🏔️", "🏕️", "🎒", "🛳️", "🌍", "🚂", "🗺️", "🚀"
];

export function ProfileView({ initialData }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");

  // Profil Form State
  const [fullName, setFullName] = useState(initialData.user.fullName);
  const [phoneNumber, setPhoneNumber] = useState(initialData.user.phoneNumber || "");
  const [bio, setBio] = useState(initialData.user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialData.user.avatarUrl || "🌴");
  const [baseCountry, setBaseCountry] = useState(initialData.user.baseCountry || "TR");
  const [baseCity, setBaseCity] = useState(initialData.user.baseCity || "İstanbul");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Şifre Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profil Bilgilerini Kaydet
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingProfile(true);

    const res = await updateProfile({
      fullName,
      phoneNumber,
      bio,
      avatarUrl,
      baseCountry,
      baseCity,
    });

    if (res.success) {
      toast.success(res.message || "Profil başarıyla güncellendi! ✅");
    } else {
      toast.error(res.message || "Profil güncellenemedi.");
    }

    setIsUpdatingProfile(false);
  }

  // Şifre Değiştir
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error("Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsChangingPassword(true);

    const res = await changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (res.success) {
      toast.success(res.message || "Şifreniz başarıyla değiştirildi! 🔒");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      toast.error(res.message || "Şifre değiştirilemedi.");
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
              <span>Gezgin Pasaportu</span>
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
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Ülke</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <MapPin className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-base font-black text-white">{stats.cityCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Şehir</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <Navigation className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <div className="text-base font-black text-white">{stats.tripCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Rota</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-base font-black text-amber-400">{stats.totalDays}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Gün</div>
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
          <span>Profil Bilgileri</span>
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
          <span>Şifre Değiştir</span>
        </button>
      </div>

      {/* 3. Profil Bilgileri Sekmesi */}
      {activeTab === "info" && (
        <form
          onSubmit={handleSaveProfile}
          className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5"
        >
          <div className="space-y-4">
            {/* Avatar Seçimi */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Gezgin Avatarı Seç
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

            {/* Ad Soyad */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Ad Soyad *
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

            {/* E-posta (Salt Okunur) ve Telefon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  E-posta (Değiştirilemez)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    readOnly
                    value={initialData.user.email || ""}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-400 cursor-not-allowed select-none outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Cep Telefonu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Ana İkametgah / Çıkış Şehri (Base Location) */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Home className="w-4 h-4" />
                <span>Ana İkametgah / Ev Şehriniz (Base City)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Oluşturacağınız seyahat rotalarının Başlangıç ve Dönüş noktası otomatik olarak bu şehirden başlar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Ülke
                  </label>
                  <select
                    value={baseCountry}
                    onChange={(e) => setBaseCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white outline-none cursor-pointer"
                  >
                    {POPULAR_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Şehir
                  </label>
                  <input
                    type="text"
                    value={baseCity}
                    onChange={(e) => setBaseCity(e.target.value)}
                    placeholder="Örn: Bursa, İstanbul, İzmir..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Biyografi / Hakkında */}
            <div>
              <label
                htmlFor="bio"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                Gezgin Biyografisi (Hakkında)
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Gezgin tarzın, en sevdiğin rotalar veya seyahat tutkun hakkında kısa bir not..."
                className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Değişiklikleri Kaydet</span>
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
              Mevcut Şifre *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mevcut parolanız"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
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
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Yeni Şifre Tekrarı *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Yeni parolayı tekrar giriniz"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPassword || !currentPassword || !newPassword}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Şifre Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Şifreyi Değiştir</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
