"use client";

import dynamic from "next/dynamic";
import type { Visit } from "@/lib/db/schema";
import { Loader2 } from "lucide-react";

const WorldMapDynamic = dynamic(
  () => import("./world-map").then((mod) => mod.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[650px] rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <span className="text-sm font-medium">Dünya Haritası ve Bayraklar Yükleniyor...</span>
      </div>
    ),
  }
);

import type { TripWithStops } from "@/lib/actions/trips";

interface WorldMapWrapperProps {
  initialVisits: Visit[];
  initialTrips?: TripWithStops[];
}

export function WorldMapWrapper({ initialVisits, initialTrips = [] }: WorldMapWrapperProps) {
  return <WorldMapDynamic initialVisits={initialVisits} initialTrips={initialTrips} />;
}

