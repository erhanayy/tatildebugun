"use client";

import { useState } from "react";
import type { TripWithStops } from "@/lib/actions/trips";
import { deleteTrip, updateTripStatus } from "@/lib/actions/trips";
import { getCountryFlagEmoji } from "@/lib/country-flags";
import {
  X,
  Navigation,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Compass,
  Plane,
  Car,
  Train,
  Bus,
  Motorbike,
  Bike,
  MapPin,
  AlertCircle,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

interface TripRoutesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trips: TripWithStops[];
  selectedTripId: string | null;
  onSelectTrip: (trip: TripWithStops | null) => void;
  onDeleteTrip: (tripId: string) => void;
  onEditTrip?: (trip: TripWithStops) => void;
  onTripUpdated?: (trip: TripWithStops) => void;
}

export function TripRoutesDrawer({
  isOpen,
  onClose,
  trips,
  selectedTripId,
  onSelectTrip,
  onDeleteTrip,
  onEditTrip,
  onTripUpdated,
}: TripRoutesDrawerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  async function handleToggleStatus(tripId: string, currentStatus: string) {
    const newStatus = currentStatus === "planned" ? "completed" : "planned";
    setUpdatingStatusId(tripId);
    const res = await updateTripStatus(tripId, newStatus);
    if (res.success && res.trip) {
      toast.success(
        newStatus === "completed"
          ? "Tebrikler! Rota 'Tamamlandı' olarak işaretlendi! 🏆🎉"
          : "Rota 'Planlanan' olarak güncellendi. ⏳"
      );
      if (onTripUpdated) {
        onTripUpdated(res.trip);
      }
    } else {
      toast.error(res.message || "Rota durumu güncellenemedi.");
    }
    setUpdatingStatusId(null);
  }

  if (!isOpen) return null;

  async function handleDelete(tripId: string) {
    setDeletingId(tripId);
    const res = await deleteTrip(tripId);
    if (res.success) {
      toast.success("Rota başarıyla silindi. 🗑️");
      onDeleteTrip(tripId);
      if (selectedTripId === tripId) {
        onSelectTrip(null);
      }
      setConfirmDeleteId(null);
    } else {
      toast.error(res.message || "Rota silinirken bir hata oluştu.");
    }
    setDeletingId(null);
  }

  function getTransportIcon(type: string) {
    switch (type) {
      case "flight":
        return <Plane className="w-3.5 h-3.5" />;
      case "car":
        return <Car className="w-3.5 h-3.5" />;
      case "train":
        return <Train className="w-3.5 h-3.5" />;
      case "bus":
        return <Bus className="w-3.5 h-3.5" />;
      case "motorbike":
        return <Motorbike className="w-3.5 h-3.5" />;
      case "bicycle":
        return <Bike className="w-3.5 h-3.5" />;
      default:
        return <Navigation className="w-3.5 h-3.5" />;
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Üst Başlık Barı */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Rotalarım</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toplam <b>{trips.length}</b> kayıtlı seyahat rotası
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

        {/* Rota Listesi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {trips.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Navigation className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs">Henüz oluşturulmuş bir rota yok.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                "Yeni Rota" butonuna tıklayarak durakları birleştiren rotalar oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            trips.map((trip) => {
              const isSelected = selectedTripId === trip.id;
              const isConfirming = confirmDeleteId === trip.id;
              const isPlanned = trip.status === "planned";

              const dateStr =
                trip.startDate && trip.endDate
                  ? `${new Date(trip.startDate).toLocaleDateString("tr-TR")} - ${new Date(
                      trip.endDate
                    ).toLocaleDateString("tr-TR")}`
                  : "Tarihsiz Seyahat";

              return (
                <div
                  key={trip.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isSelected
                      ? "bg-cyan-500/5 dark:bg-cyan-950/20 border-cyan-500 shadow-md ring-1 ring-cyan-500/50"
                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  {/* Başlık ve Rozetler */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                        {trip.title}
                      </h4>
                      {trip.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {trip.description}
                        </p>
                      )}
                    </div>

                    {isPlanned ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Planlanan</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tamamlandı</span>
                      </span>
                    )}
                  </div>

                  {/* Tarih ve Ulaşım Türü */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                      <Calendar className="w-3 h-3 text-cyan-500" />
                      <span>{dateStr}</span>
                    </span>

                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                      {getTransportIcon(trip.transportType)}
                      <span className="capitalize">{trip.transportType}</span>
                    </span>
                  </div>

                  {/* Duraklar Sıralaması */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Duraklar ({trip.stops?.length || 0})</span>
                      <span className="text-[9px] font-normal text-slate-400">Rota Akışı</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {[...(trip.stops || [])]
                        .sort((a, b) => a.stopOrder - b.stopOrder)
                        .map((stop, idx, arr) => (
                          <span key={stop.id} className="inline-flex items-center gap-1">
                            <span className="text-[11px]">{getCountryFlagEmoji(stop.countryCode)}</span>
                            <span>{stop.cityName}</span>
                            {idx < arr.length - 1 && (
                              <span className="text-cyan-500 font-bold mx-0.5">➔</span>
                            )}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Silme Onay Kutusu */}
                  {isConfirming && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span>Bu rotayı silmek istediğinize emin misiniz?</span>
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
                          disabled={deletingId === trip.id}
                          onClick={() => handleDelete(trip.id)}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer"
                        >
                          {deletingId === trip.id ? "Siliniyor..." : "Evet, Sil"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Evet, Gerçekleştirdim Butonu (Planlanan rotalar için) */}
                  {!isConfirming && isPlanned && (
                    <button
                      type="button"
                      disabled={updatingStatusId === trip.id}
                      onClick={() => handleToggleStatus(trip.id, trip.status)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {updatingStatusId === trip.id ? "Güncelleniyor..." : "Evet, Gerçekleştirdim! 🏆"}
                      </span>
                    </button>
                  )}

                  {/* Aksiyon Butonları */}
                  {!isConfirming && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => onSelectTrip(isSelected ? null : trip)}
                        className={`inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? "text-cyan-600 dark:text-cyan-400"
                            : "text-slate-600 dark:text-slate-300 hover:text-cyan-500"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Vurguyu Kaldır</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Haritada Vurgula</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        {onEditTrip && (
                          <button
                            type="button"
                            onClick={() => onEditTrip(trip)}
                            title="Rotayı Düzenle"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Düzenle</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(trip.id)}
                          title="Rotayı Sil"
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
