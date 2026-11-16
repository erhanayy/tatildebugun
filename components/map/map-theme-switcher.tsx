"use client";

import { Layers, Moon, Sun, Compass, Globe } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export type MapThemeId = "voyager" | "dark" | "positron" | "satellite";

export interface MapTheme {
  id: MapThemeId;
  nameTr: string;
  nameEn: string;
  url: string;
  attribution: string;
  icon: any;
}

export const MAP_THEMES: Record<MapThemeId, MapTheme> = {
  voyager: {
    id: "voyager",
    nameTr: "Seyahat & Keşif",
    nameEn: "Travel & Explore",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom",
    icon: Compass,
  },
  dark: {
    id: "dark",
    nameTr: "Koyu Gece Modu",
    nameEn: "Dark Night Mode",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    icon: Moon,
  },
  positron: {
    id: "positron",
    nameTr: "Açık Standart (OSM)",
    nameEn: "Light Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    icon: Sun,
  },
  satellite: {
    id: "satellite",
    nameTr: "Uydu Görüntüsü",
    nameEn: "Satellite Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    icon: Globe,
  },
};

interface MapThemeSwitcherProps {
  currentTheme: MapThemeId;
  onThemeChange: (themeId: MapThemeId) => void;
}

export function MapThemeSwitcher({ currentTheme, onThemeChange }: MapThemeSwitcherProps) {
  const { locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const getThemeName = (theme: MapTheme) => {
    return locale === "en" ? theme.nameEn : theme.nameTr;
  };

  return (
    <div className="relative z-[1000]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[38px]"
        title={locale === "en" ? "Change Map Theme" : "Harita Temasını Değiştir"}
      >
        <Layers className="w-4 h-4 text-cyan-500" />
        <span className="hidden sm:inline">{getThemeName(MAP_THEMES[currentTheme])}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {locale === "en" ? "Map Theme" : "Harita Teması"}
          </div>
          {(Object.keys(MAP_THEMES) as MapThemeId[]).map((themeId) => {
            const theme = MAP_THEMES[themeId];
            const Icon = theme.icon;
            const isSelected = currentTheme === themeId;

            return (
              <button
                key={themeId}
                type="button"
                onClick={() => {
                  onThemeChange(themeId);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer min-h-[38px] ${
                  isSelected
                    ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-cyan-500" : "text-slate-400"}`} />
                <span>{getThemeName(theme)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
