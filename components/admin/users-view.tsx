"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  AdminUserItem,
  getAdminUsersList,
  toggleUserStatusAction,
} from "@/lib/actions/admin-dashboard";
import {
  Search,
  Filter,
  ArrowLeft,
  Users,
  Shield,
  ShieldAlert,
  UserX,
  UserCheck,
  MapPin,
  Route,
  Landmark,
  Calendar,
  Clock,
  Mail,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface UsersManagementViewProps {
  initialUsers: AdminUserItem[];
  currentAdminId: string;
}

export function UsersManagementView({
  initialUsers,
  currentAdminId,
}: UsersManagementViewProps) {
  const [usersList, setUsersList] = useState<AdminUserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Onay Modalı State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    user: AdminUserItem | null;
    action: "suspend" | "activate";
  }>({
    isOpen: false,
    user: null,
    action: "suspend",
  });

  // Filtreleme (Client-side anında tepki)
  const filteredUsers = usersList.filter((u) => {
    // 1. Arama Metni Filtresi
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchUser = u.username?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchCity = u.baseCity?.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchEmail && !matchCity) return false;
    }

    // 2. Rol Filtresi
    if (roleFilter !== "all" && u.role !== roleFilter) return false;

    // 3. Durum Filtresi
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "suspended" && u.isActive) return false;

    return true;
  });

  // Durum Değiştirme
  async function handleConfirmToggle() {
    if (!confirmModal.user) return;
    const targetUser = confirmModal.user;
    const newStatus = confirmModal.action === "activate";

    setConfirmModal({ isOpen: false, user: null, action: "suspend" });

    // Optimistic UI
    setUsersList((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: newStatus } : u))
    );

    startTransition(async () => {
      const res = await toggleUserStatusAction(targetUser.id, newStatus);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
        // Hata durumunda geri al
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === targetUser.id ? { ...u, isActive: !newStatus } : u
          )
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Üst Navigasyon ve Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors mb-1 min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Yönetim Merkezine Dön</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              Üye & Gezgin Yönetimi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-bold">
              {filteredUsers.length} / {usersList.length} Üye
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Alfabetik sırada tüm gezgin profilleri, seyahat istatistikleri ve hesap kontrolleri
          </p>
        </div>
      </div>

      {/* 2. Arama ve Filtreleme Çubuğu (Mobile First: wrap ve dikey akış) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Arama Alanı */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, kullanıcı adı (@), e-posta veya şehir ara..."
              className="w-full min-h-[44px] bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtre Seçenekleri */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
            {/* Rol Filtresi */}
            <div className="flex-1 sm:w-40">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950/80 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">Tüm Roller</option>
                <option value="admin">Yöneticiler (Admin)</option>
                <option value="host">Ev Sahipleri (Host)</option>
                <option value="guest">Gezginler (Guest)</option>
              </select>
            </div>

            {/* Durum Filtresi */}
            <div className="flex-1 sm:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950/80 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif Hesaplar</option>
                <option value="suspended">Askıya Alınanlar</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Kullanıcı Kartları Listesi (Mobile-first dikey kartlar, sıfır yatay kaydırma) */}
      {filteredUsers.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <UserX className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Kriterlere Uygun Gezgin Bulunamadı
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Arama sorgunuzu veya filtreleri temizleyerek yeniden deneyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredUsers.map((user) => {
            const isSelf = user.id === currentAdminId;

            return (
              <div
                key={user.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  !user.isActive
                    ? "bg-rose-950/15 border-rose-900/40"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Üst Kısım: Avatar, İsim, Roller, Durum */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      avatarUrl={user.avatarUrl}
                      name={user.fullName}
                      size="lg"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-white truncate">
                          {user.fullName}
                        </h3>

                        {/* Rol Rozeti */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            user.role === "admin"
                              ? "bg-purple-950/60 border-purple-800/60 text-purple-300"
                              : user.role === "host"
                              ? "bg-cyan-950/60 border-cyan-800/60 text-cyan-300"
                              : "bg-slate-800 border-slate-700 text-slate-400"
                          }`}
                        >
                          {user.role === "admin"
                            ? "🛡️ Yönetici"
                            : user.role === "host"
                            ? "🏡 Ev Sahibi"
                            : "🎒 Gezgin"}
                        </span>

                        {/* Durum Rozeti */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 inline-flex items-center gap-1 ${
                            user.isActive
                              ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                              : "bg-rose-950/60 border-rose-800/60 text-rose-400"
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Askıda</span>
                            </>
                          )}
                        </span>

                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                            Siz
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        {user.username && <span>@{user.username}</span>}
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {user.email}
                          </span>
                        )}
                        {user.baseCity && (
                          <span className="flex items-center gap-1 text-slate-300 font-medium">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {user.baseCity}
                            {user.baseCountry ? `, ${user.baseCountry}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* İstatistik Çipleri */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <div
                      className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center gap-1.5"
                      title="Ziyaret / Harita Pini Sayısı"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold text-white">{user.visitCount}</span>
                      <span className="text-[10px] text-slate-500">Pin</span>
                    </div>

                    <div
                      className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center gap-1.5"
                      title="Seyahat Rotası Sayısı"
                    >
                      <Route className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-bold text-white">{user.tripCount}</span>
                      <span className="text-[10px] text-slate-500">Rota</span>
                    </div>

                    <div
                      className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center gap-1.5"
                      title="Tarihi Mekan Check-in Sayısı"
                    >
                      <Landmark className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-white">{user.poiCount}</span>
                      <span className="text-[10px] text-slate-500">POI</span>
                    </div>
                  </div>
                </div>

                {/* Alt Kısım: Tarihler ve İşlem Butonu */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Kayıt:{" "}
                      <strong className="text-slate-300 font-semibold">
                        {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                      </strong>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Son Giriş:{" "}
                      <strong className="text-slate-300 font-semibold">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Henüz giriş yok"}
                      </strong>
                    </span>
                  </div>

                  {/* Eylem Butonu (Askıya Al / Aktifleştir) */}
                  <div>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            user,
                            action: user.isActive ? "suspend" : "activate",
                          })
                        }
                        className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          user.isActive
                            ? "bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-white"
                            : "bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 hover:text-white"
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Hesabı Askıya Al</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Hesabı Aktifleştir</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Onay Modalı */}
      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModal.action === "suspend"
                    ? "bg-rose-950/60 border border-rose-800 text-rose-400"
                    : "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                }`}
              >
                {confirmModal.action === "suspend" ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <Shield className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {confirmModal.action === "suspend"
                    ? "Hesabı Askıya Al"
                    : "Hesabı Yeniden Aktif Et"}
                </h3>
                <p className="text-xs text-slate-400">
                  {confirmModal.user.fullName} ({confirmModal.user.email})
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {confirmModal.action === "suspend"
                ? "Bu kullanıcının hesabını askıya aldığınızda, sisteme giriş yapması engellenecek ve seyahat paylaşımları durdurulacaktır. Onaylıyor musunuz?"
                : "Bu kullanıcının hesabını yeniden aktif ettiğinizde, sisteme normal şekilde giriş yapabilecek ve gezgin özelliklerini kullanabilecektir."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({ isOpen: false, user: null, action: "suspend" })
                }
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                  confirmModal.action === "suspend"
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {confirmModal.action === "suspend" ? "Evet, Askıya Al" : "Evet, Aktif Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
