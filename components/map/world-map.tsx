"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { Visit } from "@/lib/db/schema";
import { getCountryFlagEmoji, COUNTRY_CENTERS } from "@/lib/country-flags";
import { MapThemeSwitcher, MAP_THEMES, type MapThemeId } from "./map-theme-switcher";
import { AddVisitModal } from "./add-visit-modal";
import { TripsDrawer } from "./trips-drawer";
import { CreateTripModal } from "./create-trip-modal";
import { TripRoutesDrawer } from "./trip-routes-drawer";
import { deleteTrip, updateTripStatus, type TripWithStops } from "@/lib/actions/trips";
import {
  Globe2,
  MapPin,
  Calendar,
  Compass,
  Plus,
  RotateCcw,
  Sparkles,
  Plane,
  Clock,
  Pencil,
  Trash2,
  ListFilter,
  Navigation,
  Route,
} from "lucide-react";
import { deleteVisit } from "@/lib/actions/visits";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

interface WorldMapProps {
  initialVisits: Visit[];
  initialTrips?: TripWithStops[];
}

export function WorldMap({ initialVisits, initialTrips = [] }: WorldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const routesLayerRef = useRef<any>(null);

  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [tripsList, setTripsList] = useState<TripWithStops[]>(initialTrips);
  const [currentTheme, setCurrentTheme] = useState<MapThemeId>("voyager");
  const [currentZoom, setCurrentZoom] = useState<number>(2.5);
  const [isMapReady, setIsMapReady] = useState(false);

  // initialVisits veya initialTrips sunucudan güncellendiğinde senkronize et
  useEffect(() => {
    if (initialVisits && initialVisits.length > 0) {
      setVisits(initialVisits);
    }
  }, [initialVisits]);

  useEffect(() => {
    if (initialTrips) {
      setTripsList(initialTrips);
    }
  }, [initialTrips]);

  // Modal State (Ziyaret Ekleme / Düzenleme)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Rota State'leri (Yeni Rota Modalı, Rotalar Çekmecesi, Seçili Rota, Düzenlenen Rota)
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripWithStops | null>(null);
  const [isTripRoutesDrawerOpen, setIsTripRoutesDrawerOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);

  // Seyahat Listesi Çekmecesi (Drawer)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // İstatistikler
  const stats = useMemo(() => {
    const uniqueCountries = new Set(visits.map((v) => v.countryCode.toUpperCase()));
    const uniqueCities = new Set(
      visits.map((v) => `${v.countryCode}_${v.cityName.toLowerCase().trim()}`)
    );
    const totalDays = visits.reduce((acc, v) => acc + (v.stayDurationDays || 1), 0);

    return {
      countryCount: uniqueCountries.size,
      cityCount: uniqueCities.size,
      tripCount: visits.length,
      totalDays,
    };
  }, [visits]);

  // Ülke Bazlı Gruplama (Dünya Seviyesi: Ülke Bayrağı + Görülen Farklı Şehir Sayısı)
  const countryAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        countryCode: string;
        countryName: string;
        distinctCities: Set<string>;
        lat: number;
        lng: number;
        visits: Visit[];
      }
    >();

    for (const v of visits) {
      const code = v.countryCode.toUpperCase();
      if (!map.has(code)) {
        const center = COUNTRY_CENTERS[code];
        map.set(code, {
          countryCode: code,
          countryName: v.countryName,
          distinctCities: new Set([v.cityName.trim().toLowerCase()]),
          lat: center ? center.lat : v.latitude,
          lng: center ? center.lng : v.longitude,
          visits: [v],
        });
      } else {
        const item = map.get(code)!;
        item.distinctCities.add(v.cityName.trim().toLowerCase());
        item.visits.push(v);
      }
    }

    return Array.from(map.values());
  }, [visits]);

  // Şehir Bazlı Gruplama (Şehir Seviyesi: Şehir Pini + Ziyaret Sayısı)
  const cityAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        cityName: string;
        countryName: string;
        countryCode: string;
        lat: number;
        lng: number;
        visitCount: number;
        visits: Visit[];
      }
    >();

    for (const v of visits) {
      const key = `${v.countryCode}_${v.cityName.trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          cityName: v.cityName,
          countryName: v.countryName,
          countryCode: v.countryCode,
          lat: v.latitude,
          lng: v.longitude,
          visitCount: 1,
          visits: [v],
        });
      } else {
        const item = map.get(key)!;
        item.visitCount += 1;
        item.visits.push(v);
      }
    }

    return Array.from(map.values());
  }, [visits]);

  // 1. Haritayı Başlat (Leaflet Client Instance)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [25, 15],
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        worldCopyJump: true,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Tema Katmanı
      const savedTheme = (localStorage.getItem("tatilde_map_theme") as MapThemeId) || "voyager";
      setCurrentTheme(savedTheme);
      const themeConfig = MAP_THEMES[savedTheme];

      const tileLayer = L.tileLayer(themeConfig.url, {
        attribution: themeConfig.attribution,
        maxZoom: 19,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Rota Çizgileri ve İşaretçiler Grupları
      const routesLayer = L.layerGroup().addTo(map);
      routesLayerRef.current = routesLayer;

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      map.on("zoomend", () => {
        setCurrentZoom(map.getZoom());
      });

      // Sağ Tıklama (Desktop ContextMenu -> Bayrak Ekle)
      map.on("contextmenu", (e: any) => {
        setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setEditingVisit(null);
        setIsModalOpen(true);
      });

      // Mobil Uzun Basma (Long-Press Gesture)
      let touchTimer: any = null;
      let touchCoords: any = null;

      const container = mapContainerRef.current;
      if (container) {
        container.addEventListener(
          "touchstart",
          (e: TouchEvent) => {
            if (e.touches.length === 1) {
              const touch = e.touches[0];
              const containerPoint = L.point(
                touch.clientX - container.getBoundingClientRect().left,
                touch.clientY - container.getBoundingClientRect().top
              );
              touchCoords = map.containerPointToLatLng(containerPoint);

              touchTimer = setTimeout(() => {
                if (touchCoords) {
                  setSelectedCoords({ lat: touchCoords.lat, lng: touchCoords.lng });
                  setEditingVisit(null);
                  setIsModalOpen(true);
                  if (navigator.vibrate) navigator.vibrate(50);
                }
              }, 600);
            }
          },
          { passive: true }
        );

        container.addEventListener(
          "touchend",
          () => {
            if (touchTimer) clearTimeout(touchTimer);
          },
          { passive: true }
        );

        container.addEventListener(
          "touchmove",
          () => {
            if (touchTimer) clearTimeout(touchTimer);
          },
          { passive: true }
        );
      }

      mapInstanceRef.current = map;

      // Harita hazır olduğunda boyutunu tazele ve bayrak çizimini anında tetikle
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 50);
      setIsMapReady(true);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Harita Temasını Güncelle
  const handleThemeChange = (themeId: MapThemeId) => {
    setCurrentTheme(themeId);
    localStorage.setItem("tatilde_map_theme", themeId);

    if (mapInstanceRef.current && tileLayerRef.current) {
      import("leaflet").then((L) => {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
        const themeConfig = MAP_THEMES[themeId];
        const newLayer = L.tileLayer(themeConfig.url, {
          attribution: themeConfig.attribution,
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
        tileLayerRef.current = newLayer;
      });
    }
  };

  // 3. Zoom Seviyesine ve Harita Hazırlığına Göre Markerları Çiz
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !isMapReady) return;

    import("leaflet").then((L) => {
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      const map = mapInstanceRef.current;
      const isCountryLevel = currentZoom >= 5;

      if (!isCountryLevel) {
        // --- 1. DÜNYA SEVİYESİ (Ülke Bayrağı + Görülen Şehir / Ziyaret Sayısı Rozeti) ---
        countryAggregates.forEach((item) => {
          const cityCount = item.distinctCities.size;
          const totalVisits = item.visits.length;
          const flag = getCountryFlagEmoji(item.countryCode);

          // Tek şehirde çoklu ziyaret varsa (örn: Batum 3) ziyaret adedini (3) gösterir, birden çok şehir varsa şehir adedini gösterir
          const badgeText = cityCount === 1 && totalVisits > 1 ? totalVisits : cityCount;
          const badgeTitle = `${item.countryName}: ${cityCount} Şehir, ${totalVisits} Ziyaret`;

          const html = `
            <div class="relative group cursor-pointer transform hover:scale-125 transition-transform duration-200" title="${badgeTitle}">
              <div class="flex items-center justify-center w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border-2 border-cyan-500/80 hover:border-cyan-400">
                <span class="text-xl select-none">${flag}</span>
              </div>
              <div class="absolute -top-2 -right-2 flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[11px] font-extrabold shadow-md border-2 border-white dark:border-slate-900">
                ${badgeText}
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            html,
            className: "custom-country-flag-icon",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });

          const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(markersLayer);

          marker.on("dblclick", (e: any) => {
            L.DomEvent.stopPropagation(e);
            map.flyTo([item.lat, item.lng], 6, { duration: 1.2 });
          });

          marker.on("click", (e: any) => {
            if (window.innerWidth < 768) {
              L.DomEvent.stopPropagation(e);
              map.flyTo([item.lat, item.lng], 6, { duration: 1.2 });
            }
          });

          const popupHtml = `
            <div class="p-3 text-slate-900 font-sans">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-2xl">${flag}</span>
                <span class="font-extrabold text-sm">${item.countryName}</span>
              </div>
              <p class="text-xs text-slate-600 mb-2">
                Bu ülkede <b>${cityCount}</b> farklı şehir, toplam <b>${totalVisits}</b> ziyaret kaydınız var.
              </p>
              <div class="text-[11px] text-cyan-600 font-bold">
                👉 Şehirleri görmek için çift tıklayın
              </div>
            </div>
          `;
          marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });
        });
      } else {
        // --- 2. ŞEHİR SEVİYESİ (Şehir Pini + Toplam Ziyaret Sayısı + Doğrudan Düzenleme/Silme) ---
        cityAggregates.forEach((city) => {
          const visitCount = city.visitCount;
          const flag = getCountryFlagEmoji(city.countryCode);

          const html = `
            <div class="relative group cursor-pointer transform hover:scale-125 transition-transform duration-200">
              <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg border-2 border-white dark:border-slate-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div class="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black shadow-md border-2 border-white dark:border-slate-900">
                ${visitCount}
              </div>
              <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold shadow-md pointer-events-none">
                ${city.cityName}
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            html,
            className: "custom-city-pin-icon",
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });

          const marker = L.marker([city.lat, city.lng], { icon: customIcon }).addTo(markersLayer);

          // Şehir Detay Kartı DOM & Olay Dinleyicileri
          const popupContent = document.createElement("div");
          popupContent.className = "p-3 font-sans text-slate-900 min-w-[240px]";

          let visitsListHtml = city.visits
            .map((v) => {
              const dateStr =
                v.dateType === "exact" && v.startDate && v.endDate
                  ? `${new Date(v.startDate).toLocaleDateString("tr-TR")} - ${new Date(
                      v.endDate
                    ).toLocaleDateString("tr-TR")}`
                  : v.dateType === "timeless"
                  ? "Zamansız Ziyaret"
                  : `${v.visitYear || ""} ${v.visitMonth ? `(${v.visitMonth}. Ay)` : ""}`;

              const durationBadge =
                v.dateType === "timeless"
                  ? `<span class="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">Zamansız</span>`
                  : `<span class="text-cyan-600 font-bold">${v.stayDurationDays} Gün</span>`;

              return `
                <div class="py-2 border-b border-slate-100 last:border-0 text-xs space-y-1">
                  <div class="flex items-center justify-between font-semibold text-slate-800">
                    <div class="flex items-center gap-1.5">
                      <span>${v.visitType === "business" ? "💼 İş Ziyareti" : "🏖️ Turistik"}</span>
                      ${v.districtName ? `<span class="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">📍 ${v.districtName}</span>` : ""}
                    </div>
                    ${durationBadge}
                  </div>
                  <div class="text-[11px] text-slate-500">${dateStr}</div>
                  ${v.notes ? `<div class="text-[11px] text-slate-600 italic">"${v.notes}"</div>` : ""}
                  
                  <div class="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      data-edit-id="${v.id}"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-600 transition-colors cursor-pointer"
                    >
                      ✏️ Düzenle
                    </button>
                    <button
                      type="button"
                      data-delete-id="${v.id}"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              `;
            })
            .join("");

          popupContent.innerHTML = `
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
              <span class="text-xl">${flag}</span>
              <div>
                <h4 class="font-bold text-sm leading-tight">${city.cityName}</h4>
                <p class="text-[11px] text-slate-500">${city.countryName}</p>
              </div>
            </div>
            <div class="mb-2">
              <span class="inline-block px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                Toplam ${visitCount} Kez Ziyaret Edildi
              </span>
            </div>
            <div class="max-h-48 overflow-y-auto space-y-1">
              ${visitsListHtml}
            </div>
          `;

          // Popup içi Düzenle ve Sil Olay Dinleyicileri
          popupContent.addEventListener("click", (e) => {
            const target = (e.target as HTMLElement).closest("[data-edit-id]") as HTMLElement;
            if (target) {
              const vId = target.getAttribute("data-edit-id");
              const found = city.visits.find((x) => x.id === vId);
              if (found) {
                marker.closePopup();
                setEditingVisit(found);
                setSelectedCoords({ lat: found.latitude, lng: found.longitude });
                setIsModalOpen(true);
              }
            }

            const delTarget = (e.target as HTMLElement).closest("[data-delete-id]") as HTMLElement;
            if (delTarget) {
              const vId = delTarget.getAttribute("data-delete-id");
              if (vId && confirm("Bu seyahat kaydını silmek istediğinize emin misiniz?")) {
                marker.closePopup();
                deleteVisit(vId).then((res) => {
                  if (res.success) {
                    toast.success("Seyahat kaydı başarıyla silindi. 🗑️");
                    handleDeleteVisit(vId);
                  } else {
                    toast.error(res.message || "Silme başarısız.");
                  }
                });
              }
            }
          });

          marker.bindPopup(popupContent, { offset: [0, -15] });
        });
      }
    });
  }, [countryAggregates, cityAggregates, currentZoom, isMapReady]);

  // 4. Rota Çizgilerini (Polyline) Çiz
  useEffect(() => {
    if (!mapInstanceRef.current || !routesLayerRef.current || !isMapReady) return;

    import("leaflet").then((L) => {
      const routesLayer = routesLayerRef.current;
      routesLayer.clearLayers();

      if (!showRoutes || tripsList.length === 0) return;

      const map = mapInstanceRef.current;

      tripsList.forEach((trip) => {
        if (!trip.stops || trip.stops.length < 2) return;

        const sortedStops = [...trip.stops].sort((a, b) => a.stopOrder - b.stopOrder);
        const latlngs: [number, number][] = sortedStops.map((s) => [s.latitude, s.longitude]);

        const isPlanned = trip.status === "planned";
        const isSelected = selectedTripId === trip.id;

        // Tamamlananlar: Zümrüt Yeşili/Turkuaz (#06b6d4)
        // Planlananlar: Pembe/Fuşya (#ec4899)
        // Seçili Olan: Parlak Mavi (#3b82f6)
        const color = isSelected ? "#3b82f6" : isPlanned ? "#ec4899" : "#06b6d4";
        const weight = isSelected ? 5 : 3.5;
        const opacity = selectedTripId ? (isSelected ? 1 : 0.25) : 0.85;
        const dashArray = isPlanned ? "8, 8" : undefined;

        const polyline = L.polyline(latlngs, {
          color,
          weight,
          opacity,
          dashArray,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(routesLayer);

        const dateStr =
          trip.startDate && trip.endDate
            ? `${new Date(trip.startDate).toLocaleDateString("tr-TR")} - ${new Date(
                trip.endDate
              ).toLocaleDateString("tr-TR")}`
            : "Tarihsiz Rota";

        const stopsFlow = sortedStops
          .map((s) => `<b>${s.cityName}</b> (${getCountryFlagEmoji(s.countryCode)})`)
          .join(" ➔ ");

        const popupHtml = `
          <div class="p-3 text-slate-900 font-sans max-w-xs">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="font-extrabold text-sm">${trip.title}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isPlanned ? "bg-pink-100 text-pink-700" : "bg-cyan-100 text-cyan-800"
              }">
                ${isPlanned ? "Planlanan" : "Tamamlandı"}
              </span>
            </div>
            <div class="text-[11px] text-slate-500 mb-2">
              📅 ${dateStr} • 🚗 ${trip.transportType.toUpperCase()}
            </div>
            <div class="text-xs text-slate-700 bg-slate-100 p-2 rounded-lg leading-relaxed">
              ${stopsFlow}
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              ${
                isPlanned
                  ? `<button type="button" onclick="window.__tatildeCompleteTrip('${trip.id}')" style="background:#059669; color:white; padding:4px 9px; border-radius:8px; font-size:11px; font-weight:bold; border:none; cursor:pointer; display:flex; align-items:center; gap:3px; box-shadow:0 1px 3px rgba(0,0,0,0.15);">✓ Gerçekleştirdim</button>`
                  : `<span style="font-size:11px; color:#059669; font-weight:bold; display:flex; align-items:center; gap:2px;">🏆 Tamamlandı</span>`
              }
              <div style="display:flex; align-items:center; gap:4px;">
                <button type="button" onclick="window.__tatildeEditTrip('${trip.id}')" style="background:#f1f5f9; color:#1e293b; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:bold; border:1px solid #cbd5e1; cursor:pointer;">✏️ Düzenle</button>
                <button type="button" onclick="window.__tatildeDeleteTrip('${trip.id}')" style="background:#fef2f2; color:#dc2626; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:bold; border:1px solid #fecaca; cursor:pointer;">🗑️ Sil</button>
              </div>
            </div>
          </div>
        `;

        polyline.bindPopup(popupHtml);
        polyline.on("click", () => {
          setSelectedTripId(trip.id);
        });

        // Rota çizgisi ortası (Midpoint) hesabı:
        let midLat = latlngs[0][0];
        let midLng = latlngs[0][1];
        if (latlngs.length >= 2) {
          const midIdx = Math.floor(latlngs.length / 2);
          const p1 = latlngs[midIdx - 1];
          const p2 = latlngs[midIdx];
          midLat = (p1[0] + p2[0]) / 2;
          midLng = (p1[1] + p2[1]) / 2;
        }

        // Ulaşım ikonu
        const transportEmoji =
          trip.transportType === "flight"
            ? "✈️"
            : trip.transportType === "car"
            ? "🚗"
            : trip.transportType === "train"
            ? "🚆"
            : trip.transportType === "bus"
            ? "🚌"
            : trip.transportType === "motorbike"
            ? "🏍️"
            : trip.transportType === "bicycle"
            ? "🚲"
            : "🚗";

        // Varış veya ana rota ülkesi bayrağı
        const destStop = sortedStops.length > 2 ? sortedStops[1] : sortedStops[sortedStops.length - 1];
        const mainFlag = getCountryFlagEmoji(destStop.countryCode);

        // Çizgi Ortası Rota Rozeti / Bayrağı (Route Center Badge)
        const centerBadgeBg = isSelected ? "#2563eb" : isPlanned ? "#ec4899" : "#059669";
        const centerBadgeIcon = L.divIcon({
          className: "trip-center-badge-marker",
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; transform: scale(${isSelected ? 1.08 : 1}); transition: transform 0.2s;">
              <div style="
                background: ${isSelected ? "#1e293b" : "rgba(255, 255, 255, 0.96)"};
                color: ${isSelected ? "#ffffff" : "#0f172a"};
                border-radius: 999px;
                padding: 4px 10px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.3), 0 0 0 2px ${centerBadgeBg};
                display: flex;
                align-items: center;
                gap: 5px;
                font-family: ui-sans-serif, system-ui, sans-serif;
                font-size: 11px;
                font-weight: 800;
                white-space: nowrap;
              ">
                <span style="font-size: 12px;">${transportEmoji}</span>
                <span style="font-size: 13px;">${mainFlag}</span>
                <span style="max-width: 110px; overflow: hidden; text-overflow: ellipsis;">${trip.title}</span>
                <span style="
                  background: ${centerBadgeBg};
                  color: white;
                  border-radius: 999px;
                  padding: 1px 6px;
                  font-size: 9px;
                  line-height: 1.2;
                  font-weight: bold;
                ">
                  ${isPlanned ? "Plan" : "🏆"}
                </span>
              </div>
              <div style="
                width: 0; 
                height: 0; 
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 5px solid ${centerBadgeBg};
              "></div>
            </div>
          `,
          iconSize: [140, 32],
          iconAnchor: [70, 32],
        });

        const centerMarker = L.marker([midLat, midLng], {
          icon: centerBadgeIcon,
          zIndexOffset: isSelected ? 1000 : 500,
        }).addTo(routesLayer);

        centerMarker.bindPopup(popupHtml);
        centerMarker.on("click", () => {
          setSelectedTripId(trip.id);
          centerMarker.openPopup();
        });

        // Her durak için o ülkenin bayrağı ve durak rozetini taşıyan harita pini ekle
        sortedStops.forEach((stop, idx) => {
          const isOrigin = stop.stopOrder === 0 || idx === 0;
          const isReturn = stop.stopOrder === sortedStops.length - 1 || idx === sortedStops.length - 1;
          const flag = getCountryFlagEmoji(stop.countryCode);
          const badgeLabel = isOrigin ? "🛫" : isReturn ? "🛬" : `${idx}`;
          const badgeBg = isOrigin ? "#10b981" : isReturn ? "#6366f1" : isPlanned ? "#ec4899" : "#06b6d4";

          const icon = L.divIcon({
            className: "trip-stop-flag-marker",
            html: `
              <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="background: white; border-radius: 999px; padding: 2px 7px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; border: 2px solid ${badgeBg}; font-size: 11px; font-weight: bold; white-space: nowrap;">
                  <span style="font-size: 13px;">${flag}</span>
                  <span style="font-size: 10px; color: #1e293b; max-width: 75px; overflow: hidden; text-overflow: ellipsis;">${stop.cityName}</span>
                  <span style="background: ${badgeBg}; color: white; border-radius: 999px; padding: 1px 4px; font-size: 9px; line-height: 1;">${badgeLabel}</span>
                </div>
              </div>
            `,
            iconSize: [85, 26],
            iconAnchor: [42, 13],
          });

          const stopDates =
            stop.arrivalDate && stop.departureDate
              ? `${new Date(stop.arrivalDate).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                })} - ${new Date(stop.departureDate).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                })}`
              : "";

          const marker = L.marker([stop.latitude, stop.longitude], { icon }).addTo(routesLayer);
          marker.bindPopup(`
            <div style="padding: 4px 6px; font-family: sans-serif; font-size: 12px;">
              <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">${flag} ${stop.cityName}</div>
              <div style="font-size: 11px; color: #64748b;">${stop.notes || (isOrigin ? "Başlangıç Noktası" : isReturn ? "Dönüş Noktası" : `${idx}. Durak`)}</div>
              ${stopDates ? `<div style="font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 4px;">📅 ${stopDates}</div>` : ""}
            </div>
          `);
        });

        // Eğer bu rota seçildiyse haritayı bu rotaya odakla
        if (isSelected) {
          map.fitBounds(polyline.getBounds(), {
            padding: [60, 60],
            maxZoom: 7,
          });
        }
      });
    });
  }, [tripsList, showRoutes, selectedTripId, isMapReady]);

  // Yeni veya Düzenlenen Ziyaret(ler) Kaydedildiğinde
  const handleVisitSuccess = (savedVisits: Visit | Visit[]) => {
    const list = Array.isArray(savedVisits) ? savedVisits : [savedVisits];
    setVisits((prev) => {
      let updated = [...prev];
      for (const sv of list) {
        const idx = updated.findIndex((v) => v.id === sv.id);
        if (idx >= 0) {
          updated[idx] = sv;
        } else {
          updated.unshift(sv);
        }
      }
      return updated;
    });
    setEditingVisit(null);

    // Yeni eklenen şehre otomatik yumuşak zoom yap ve odaklan (Şehir seviyesine geç)
    if (list.length > 0 && mapInstanceRef.current) {
      const first = list[0];
      mapInstanceRef.current.flyTo([first.latitude, first.longitude], 7, {
        duration: 1.2,
      });
    }
  };

  // Ziyaret Silindiğinde
  const handleDeleteVisit = (visitId: string) => {
    setVisits((prev) => prev.filter((v) => v.id !== visitId));
  };

  // Şehre Odaklan (flyTo)
  const handleFocusCity = (lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 8, { duration: 1.2 });
    }
  };

  // Düzenleme Başlat
  const handleEditVisitFromDrawer = (visit: Visit) => {
    setEditingVisit(visit);
    setSelectedCoords({ lat: visit.latitude, lng: visit.longitude });
    setIsModalOpen(true);
  };

  // Zoom Sıfırlama
  const handleResetZoom = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([25, 15], 2.5, { duration: 1 });
    }
  };

  // Yeni Rota Oluşturulduğunda
  const handleTripCreated = (newTrip: TripWithStops) => {
    setTripsList((prev) => [newTrip, ...prev]);
    setSelectedTripId(newTrip.id);
  };

  // Rota Güncellendiğinde
  const handleTripUpdated = (updatedTrip: TripWithStops) => {
    setTripsList((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
    setSelectedTripId(updatedTrip.id);
  };

  // Rota Düzenleme Başlat
  const handleEditTrip = (trip: TripWithStops) => {
    setEditingTrip(trip);
    setIsCreateTripModalOpen(true);
  };

  // Rota Durumunu "Tamamlandı" Yap ("Evet Gerçekleştirdim")
  const handleCompleteTrip = async (tripId: string) => {
    const res = await updateTripStatus(tripId, "completed");
    if (res.success && res.trip) {
      toast.success("Tebrikler! Rota 'Tamamlandı' olarak işaretlendi! 🏆🎉");
      setTripsList((prev) => prev.map((t) => (t.id === tripId ? res.trip! : t)));
    } else {
      toast.error(res.message || "Rota durumu güncellenemedi.");
    }
  };

  // Haritadan veya Popup'tan Rota Sil
  const handleDeleteTripFromMap = async (tripId: string) => {
    if (window.confirm("Bu seyahat rotasını silmek istediğinize emin misiniz?")) {
      const res = await deleteTrip(tripId);
      if (res.success) {
        toast.success("Rota başarıyla silindi. 🗑️");
        setTripsList((prev) => prev.filter((t) => t.id !== tripId));
        if (selectedTripId === tripId) {
          setSelectedTripId(null);
        }
      } else {
        toast.error(res.message || "Rota silinemedi.");
      }
    }
  };

  // Harita Popup Butonları İçin Window Dinleyicileri
  useEffect(() => {
    (window as any).__tatildeCompleteTrip = (tripId: string) => {
      handleCompleteTrip(tripId);
    };
    (window as any).__tatildeEditTrip = (tripId: string) => {
      const target = tripsList.find((t) => t.id === tripId);
      if (target) handleEditTrip(target);
    };
    (window as any).__tatildeDeleteTrip = (tripId: string) => {
      handleDeleteTripFromMap(tripId);
    };

    return () => {
      delete (window as any).__tatildeCompleteTrip;
      delete (window as any).__tatildeEditTrip;
      delete (window as any).__tatildeDeleteTrip;
    };
  }, [tripsList, selectedTripId]);

  // Rota Silindiğinde (Çekmeceden)
  const handleDeleteTripFromDrawer = (tripId: string) => {
    setTripsList((prev) => prev.filter((t) => t.id !== tripId));
    if (selectedTripId === tripId) {
      setSelectedTripId(null);
    }
  };

  return (
    <div className="relative w-full h-[650px] sm:h-[720px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-950">
      {/* 1. Üst Canlı İstatistik ve Kontrol Barı */}
      <div className="absolute top-4 left-4 right-4 z-[990] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* İstatistik Rozetleri */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white">
            <Globe2 className="w-4 h-4 text-cyan-500" />
            <span>
              <strong className="text-cyan-600 dark:text-cyan-400 text-sm">
                {stats.countryCount}
              </strong>{" "}
              Ülke
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>
              <strong className="text-blue-600 dark:text-blue-400 text-sm">
                {stats.cityCount}
              </strong>{" "}
              Şehir
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white">
            <Navigation className="w-4 h-4 text-indigo-500" />
            <span>
              <strong className="text-indigo-600 dark:text-indigo-400 text-sm">
                {tripsList.length}
              </strong>{" "}
              Rota
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white">
            <Plane className="w-4 h-4 text-teal-500" />
            <span>
              <strong className="text-teal-600 dark:text-teal-400 text-sm">
                {stats.tripCount}
              </strong>{" "}
              Seyahat
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>
              <strong className="text-amber-500 text-sm">{stats.totalDays}</strong> Gün Yolda
            </span>
          </div>
        </div>

        {/* Sağ Üst Aksiyonlar: Rotalar, Seyahatler, Reset Zoom & Tema Seçici */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {currentZoom >= 5 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition-all animate-in fade-in cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Dünya Görünümüne Dön</span>
            </button>
          )}

          {/* Rotalarım Butonu */}
          <button
            type="button"
            onClick={() => setIsTripRoutesDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Rotalarımı Görüntüle ve Yönet"
          >
            <Navigation className="w-4 h-4 text-indigo-500" />
            <span>Rotalarım ({tripsList.length})</span>
          </button>

          {/* Seyahatlerim Çekmece Butonu */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Tüm Seyahatlerimi Gör ve Yönet"
          >
            <Compass className="w-4 h-4 text-cyan-500" />
            <span>Seyahatlerim ({visits.length})</span>
          </button>

          <MapThemeSwitcher currentTheme={currentTheme} onThemeChange={handleThemeChange} />
        </div>
      </div>

      {/* 2. Harita DOM Konteyneri */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* 3. İpuçları Alt Barı */}
      <div className="absolute bottom-4 left-4 z-[990] hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[11px] text-slate-300 border border-slate-700 pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>
          {currentZoom < 5
            ? "Rotalar şehirleri çizgilerle birbirine bağlar. Ülkelere çift tıklayarak şehir detaylarına inebilirsiniz."
            : "Şehir pinlerine tıklayarak ziyaretleri düzenleyebilir veya silebilirsiniz."}
        </span>
      </div>

      {/* 4. Sağ Alt: + Bayrak Ekle & + Rota Oluştur (Floating Action Buttons) */}
      <div className="absolute bottom-6 right-6 z-[990] flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsCreateTripModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-2xl shadow-indigo-500/30 transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>Rota Oluştur</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const center = mapInstanceRef.current
              ? mapInstanceRef.current.getCenter()
              : { lat: 41, lng: 29 };
            setSelectedCoords({ lat: center.lat, lng: center.lng });
            setEditingVisit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-2xl shadow-cyan-500/30 transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Bayrak Ekle</span>
        </button>
      </div>

      {/* 5. Ziyaret Ekleme & Düzenleme Modalı */}
      <AddVisitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVisit(null);
        }}
        initialCoords={selectedCoords}
        editingVisit={editingVisit}
        onSuccess={handleVisitSuccess}
      />

      {/* 6. Rota Oluşturma & Düzenleme Modalı */}
      <CreateTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => {
          setIsCreateTripModalOpen(false);
          setEditingTrip(null);
        }}
        existingVisits={visits}
        onTripCreated={handleTripCreated}
        initialTrip={editingTrip}
        onTripUpdated={handleTripUpdated}
      />

      {/* 7. Seyahatlerim Yönetim Çekmecesi */}
      <TripsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        visits={visits}
        onFocusCity={handleFocusCity}
        onEditVisit={handleEditVisitFromDrawer}
        onDeleteVisit={handleDeleteVisit}
      />

      {/* 8. Rotalarım Yönetim Çekmecesi */}
      <TripRoutesDrawer
        isOpen={isTripRoutesDrawerOpen}
        onClose={() => setIsTripRoutesDrawerOpen(false)}
        trips={tripsList}
        selectedTripId={selectedTripId}
        onSelectTrip={(t) => setSelectedTripId(t ? t.id : null)}
        onDeleteTrip={handleDeleteTripFromDrawer}
        onEditTrip={(trip) => {
          setIsTripRoutesDrawerOpen(false);
          handleEditTrip(trip);
        }}
        onTripUpdated={handleTripUpdated}
      />
    </div>
  );
}
