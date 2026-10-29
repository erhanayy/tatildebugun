"use client";

import { useState, useMemo } from "react";
import type { Visit } from "@/lib/db/schema";
import { getCountryFlagEmoji } from "@/lib/country-flags";
import {
  X,
  Search,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  Pencil,
  Trash2,
  Compass,
  FileText,
  AlertCircle,
} from "lucide-react";
import { deleteVisit } from "@/lib/actions/visits";
import { toast } from "sonner";

interface TripsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visits: Visit[];
  onFocusCity: (lat: number, lng: number) => void;
  onEditVisit: (visit: Visit) => void;
  onDeleteVisit: (visitId: string) => void;
}

export function TripsDrawer({
  isOpen,
  onClose,
  visits,
  onFocusCity,
  onEditVisit,
  onDeleteVisit,
}: TripsDrawerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredVisits = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return visits;
    return visits.filter(
      (v) =>
        v.cityName.toLowerCase().includes(q) ||
        (v.districtName && v.districtName.toLowerCase().includes(q)) ||
        v.countryName.toLowerCase().includes(q) ||
        (v.notes && v.notes.toLowerCase().includes(q))
    );
  }, [visits, searchTerm]);

  if (!isOpen) return null;

  async function handleDelete(visitId: string) {
    setDeletingId(visitId);
    const res = await deleteVisit(visitId);
    if (res.success) {
      toast.success("Seyahat kaydı başarıyla silindi. 🗑️");
      onDeleteVisit(visitId);
      setConfirmDeleteId(null);
    } else {
      toast.error(res.message || "Silme işlemi sırasında hata oluştu.");
    }
    setDeletingId(null);
  }

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Üst Başlık Barı */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Seyahatlerim</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toplam <b>{visits.length}</b> kayıtlı gezi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Arama Alanı */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Şehir, ilçe, ülke veya notlarda ara..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Liste Alanı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredVisits.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs">Eşleşen seyahat kaydı bulunamadı.</p>
            </div>
          ) : (
            filteredVisits.map((visit) => {
              const flag = getCountryFlagEmoji(visit.countryCode);
              const dateStr =
                visit.dateType === "exact" && visit.startDate && visit.endDate
                  ? `${new Date(visit.startDate).toLocaleDateString("tr-TR")} - ${new Date(
                      visit.endDate
                    ).toLocaleDateString("tr-TR")}`
                  : visit.dateType === "timeless"
                  ? "Zamansız Ziyaret"
                  : `${visit.visitYear || ""} ${visit.visitMonth ? `(${visit.visitMonth}. Ay)` : ""}`;

              const isConfirming = confirmDeleteId === visit.id;

              return (
                <div
                  key={visit.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:border-cyan-500/50 transition-all space-y-2.5"
                >
                  {/* Başlık ve Şehir */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{flag}</span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                          <span>{visit.cityName}</span>
                          {visit.districtName && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              ({visit.districtName})
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {visit.countryName}
                        </p>
                      </div>
                    </div>

                    {visit.dateType === "timeless" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                        Zamansız
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800">
                        {visit.stayDurationDays} Gün
                      </span>
                    )}
                  </div>

                  {/* Tarih ve Ziyaret Türü */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                      <Calendar className="w-3 h-3 text-cyan-500" />
                      <span>{dateStr}</span>
                    </span>

                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                      <Briefcase className="w-3 h-3 text-blue-500" />
                      <span>{visit.visitType === "business" ? "İş Ziyareti" : "Turistik"}</span>
                    </span>
                  </div>

                  {/* Notlar */}
                  {visit.notes && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      "{visit.notes}"
                    </div>
                  )}

                  {/* Silme Onay Kutusu */}
                  {isConfirming && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span>Bu seyahati silmek istediğinize emin misiniz?</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === visit.id}
                          onClick={() => handleDelete(visit.id)}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer"
                        >
                          {deletingId === visit.id ? "Siliniyor..." : "Evet, Sil"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  {!isConfirming && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          onFocusCity(visit.latitude, visit.longitude);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Haritada Gör</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onEditVisit(visit);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Düzenle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(visit.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/60 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
