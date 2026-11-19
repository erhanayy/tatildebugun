"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Coins, Sparkles } from "lucide-react";
import { getUserPointsSummaryAction } from "@/lib/actions/points";
import type { FloatingPointEventDetail } from "@/components/points/floating-points-effect";

interface HeaderPointsBadgeProps {
  initialScore?: number;
  className?: string;
}

export function HeaderPointsBadge({ initialScore = 0, className = "" }: HeaderPointsBadgeProps) {
  const [points, setPoints] = useState<number>(initialScore);
  const [isGlowing, setIsGlowing] = useState(false);

  // İlk yüklemede ve canlıda güncel puanı al
  useEffect(() => {
    async function loadLivePoints() {
      try {
        const res = await getUserPointsSummaryAction();
        if (res.success && res.summary) {
          setPoints(res.summary.totalPoints);
        }
      } catch (err) {
        console.error("Failed to load header points:", err);
      }
    }
    loadLivePoints();

    // Sayfa odağa geldiğinde veya refresh-points olayı tetiklendiğinde senkronize et
    window.addEventListener("refresh-points", loadLivePoints);
    window.addEventListener("focus", loadLivePoints);

    return () => {
      window.removeEventListener("refresh-points", loadLivePoints);
      window.removeEventListener("focus", loadLivePoints);
    };
  }, []);

  // Canlı Puan Kazanma / İade Dopamin Senkronizasyonu
  useEffect(() => {
    function handleAwardPoints(e: Event) {
      const customEvent = e as CustomEvent<FloatingPointEventDetail>;
      if (!customEvent.detail || typeof customEvent.detail.points !== "number") return;

      const added = customEvent.detail.points;
      setPoints((prev) => Math.max(0, prev + added));
      setIsGlowing(true);

      const timer = setTimeout(() => {
        setIsGlowing(false);
      }, 2500);

      return () => clearTimeout(timer);
    }

    window.addEventListener("award-points", handleAwardPoints);

    return () => {
      window.removeEventListener("award-points", handleAwardPoints);
    };
  }, []);

  return (
    <Link
      href="/rewards"
      className={`relative flex items-center gap-1.5 px-2.5 h-[38px] rounded-xl border transition-all cursor-pointer group select-none min-h-[38px] ${
        isGlowing
          ? "bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/40 scale-105 animate-pulse"
          : "bg-slate-900/70 hover:bg-slate-800/80 border-amber-500/30 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 shadow-sm shadow-amber-500/10"
      } ${className}`}
      title="AllTripX Yıllık Kârı (%50) & Ödüller"
      aria-label="AllTripX Yıllık Kârı (%50) & Ödüller Sayfasına Git"
    >
      {/* Altın Paralar İkonu */}
      <div className="relative">
        <Coins className={`w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform ${isGlowing ? "animate-spin" : ""}`} />
        {isGlowing && (
          <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1.5 -right-1.5 animate-ping" />
        )}
      </div>

      {/* Puan Değeri */}
      <span className="text-xs font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
        {points.toLocaleString("tr-TR")}
        <span className="text-[10px] ml-0.5 opacity-80 uppercase font-bold text-amber-400">Pts</span>
      </span>

      {/* Masaüstü Zarif İpucu (Tooltip) */}
      <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
        AllTripX Yıllık Kârı (%50) & Ödüller 🪙
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700/80 rotate-45" />
      </span>
    </Link>
  );
}
