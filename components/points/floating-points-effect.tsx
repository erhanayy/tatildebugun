"use client";

import { useEffect, useState } from "react";
import { Sparkles, Trophy, Flame } from "lucide-react";

export interface FloatingPointEventDetail {
  points: number;
  label: string;
  multiplier?: string;
}

interface FloatingItem {
  id: string;
  points: number;
  label: string;
  multiplier?: string;
}

/**
 * Global helper to trigger dopamine floating points animation from any component.
 */
export function triggerFloatingPoints(detail: FloatingPointEventDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<FloatingPointEventDetail>("award-points", { detail })
    );
  }
}

export function FloatingPointsContainer() {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    function handleAwardPoints(e: Event) {
      const customEvent = e as CustomEvent<FloatingPointEventDetail>;
      if (!customEvent.detail || typeof customEvent.detail.points !== "number") return;

      const { points, label, multiplier } = customEvent.detail;
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Mobile haptic feedback (Section 81.6)
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([40, 50, 40]);
        } catch {
          // ignore if vibration is blocked by browser policy
        }
      }

      setItems((prev) => [...prev.slice(-3), { id, points, label, multiplier }]);

      // Remove after animation completes
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 2100);
    }

    window.addEventListener("award-points", handleAwardPoints);
    return () => window.removeEventListener("award-points", handleAwardPoints);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-3 w-full max-w-sm px-4"
    >
      {items.map((item) => {
        const isNegative = item.points < 0;
        return (
          <div
            key={item.id}
            className={`animate-float-dopamine w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-950/95 border-2 shadow-2xl backdrop-blur-xl pointer-events-none ${
              isNegative
                ? "border-rose-500/50 shadow-rose-500/30 text-rose-200"
                : "border-amber-500/50 shadow-amber-500/30 text-amber-200"
            }`}
          >
            {/* Sol: İkon & Çarpan */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  isNegative
                    ? "bg-rose-500/20 border-rose-500/40"
                    : "bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border-amber-500/40"
                }`}
              >
                {isNegative ? (
                  <Sparkles className="w-5 h-5 text-rose-400" />
                ) : item.multiplier ? (
                  <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                ) : (
                  <Trophy className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">{item.label}</span>
                  {item.multiplier && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                      {item.multiplier}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  {isNegative ? "Hesabınızdan Düşüldü" : "2026 Kurucu Havuzuna Eklendi"}
                </p>
              </div>
            </div>

            {/* Sağ: Puan Miktarı */}
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`text-lg font-black drop-shadow-sm ${
                  isNegative
                    ? "text-rose-400"
                    : "text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400"
                }`}
              >
                {item.points > 0 ? `+${item.points}` : `${item.points}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
