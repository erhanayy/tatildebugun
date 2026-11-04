import exifr from "exifr";
import { type CityPlaceItem } from "@/lib/actions/places";

export interface PhotoMatchResult {
  fileName: string;
  fileSizeFormatted: string;
  fileType: string;
  previewUrl: string;
  latitude?: number;
  longitude?: number;
  timestamp?: Date | null;
  cameraModel?: string | null;
  hasGps: boolean;
  rawTagsCount: number;
  closestPlace?: {
    id: string;
    name: string;
    distanceMeters: number;
  } | null;
  matchedPlace?: {
    id: string;
    name: string;
    category: string;
    imageUrl?: string | null;
    latitude: number;
    longitude: number;
    distanceMeters: number;
  } | null;
  errorNote?: string;
  debugInfo: {
    status: "matched" | "distance_exceeded" | "no_gps" | "read_error";
    coordsFormatted: string;
    closestPlaceName?: string;
    distanceMeters?: number;
    thresholdMeters: number;
    details: string;
  };
}

/**
 * Dosya boyutunu okunabilir biçime çevirir (örn: 2.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * İki koordinat arasındaki mesafeyi metre cinsinden hesaplar (Haversine formülü)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Dünya yarıçapı (metre)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Seçilen fotoğrafların EXIF GPS başlıklarını tarar ve şehir mekanlarıyla eşleştirir
 * @param files Kullanıcının galeriden seçtiği fotoğraf dosyaları
 * @param places İlgili şehirdeki doğrulanmış mekanlar
 * @param maxDistanceMeters Eşleşme kabul edilecek maksimum mesafe (varsayılan 400m)
 */
export async function matchPhotosWithPlaces(
  files: File[],
  places: CityPlaceItem[],
  maxDistanceMeters: number = 400
): Promise<PhotoMatchResult[]> {
  const results: PhotoMatchResult[] = [];

  for (const file of files) {
    const previewUrl = URL.createObjectURL(file);
    const sizeStr = formatFileSize(file.size);
    const fileType = file.type || "image/unknown";

    let photoLat: number | undefined;
    let photoLon: number | undefined;
    let photoTime: Date | null = null;
    let cameraModel: string | null = null;
    let rawTagsCount = 0;

    try {
      // 1. Önce doğrudan hızlı ve en geniş GPS okuyucusunu çağır (Filtresiz!)
      try {
        const gps = await exifr.gps(file);
        if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
          photoLat = gps.latitude;
          photoLon = gps.longitude;
        }
      } catch (gpsErr) {
        console.warn(`[EXIFR] gps() okuma uyarısı (${file.name}):`, gpsErr);
      }

      // 2. exifr.parse ile genel meta verileri (Tarih, Kamera, fallback GPS) çek (pick KULLANILMAZ!)
      try {
        const fullExif = await exifr.parse(file);
        if (fullExif) {
          rawTagsCount = Object.keys(fullExif).length;

          if (photoLat === undefined && typeof fullExif.latitude === "number") {
            photoLat = fullExif.latitude;
            photoLon = fullExif.longitude;
          }

          if (fullExif.DateTimeOriginal) {
            photoTime = new Date(fullExif.DateTimeOriginal);
          } else if (fullExif.CreateDate) {
            photoTime = new Date(fullExif.CreateDate);
          }

          if (fullExif.Model) {
            cameraModel = `${fullExif.Make || ""} ${fullExif.Model}`.trim();
          }
        }
      } catch (parseErr) {
        console.warn(`[EXIFR] parse() okuma uyarısı (${file.name}):`, parseErr);
      }

      // GPS Koordinatı bulunamadıysa (İşletim sistemi tarafından silinmiş veya konumsuz)
      if (photoLat === undefined || photoLon === undefined) {
        results.push({
          fileName: file.name,
          fileSizeFormatted: sizeStr,
          fileType,
          previewUrl,
          hasGps: false,
          cameraModel,
          rawTagsCount,
          errorNote: "Fotoğrafta GPS konumu bulunamadı. Mobil işletim sistemi (iOS/Android) galeri dosya seçicisinden aktarırken konumu sansürlemiş olabilir.",
          debugInfo: {
            status: "no_gps",
            coordsFormatted: "Yok",
            thresholdMeters: maxDistanceMeters,
            details: `EXIF'ten ${rawTagsCount} adet meta veri etiketi okundu ancak GPS (0x8825) bloğu mevcut değil.`,
          },
        });
        continue;
      }

      const coordsStr = `${photoLat.toFixed(5)}, ${photoLon.toFixed(5)}`;

      // 3. Mekanlar arasında en yakın olanı bul
      let closestPlace: CityPlaceItem | null = null;
      let minDistance = Infinity;

      for (const place of places) {
        if (place.latitude != null && place.longitude != null) {
          const dist = calculateDistanceMeters(
            photoLat,
            photoLon,
            place.latitude,
            place.longitude
          );

          if (dist < minDistance) {
            minDistance = dist;
            closestPlace = place;
          }
        }
      }

      const isMatched = closestPlace && minDistance <= maxDistanceMeters;

      if (isMatched && closestPlace) {
        results.push({
          fileName: file.name,
          fileSizeFormatted: sizeStr,
          fileType,
          previewUrl,
          latitude: photoLat,
          longitude: photoLon,
          timestamp: photoTime,
          cameraModel,
          hasGps: true,
          rawTagsCount,
          closestPlace: {
            id: closestPlace.id,
            name: closestPlace.name,
            distanceMeters: minDistance,
          },
          matchedPlace: {
            id: closestPlace.id,
            name: closestPlace.name,
            category: closestPlace.category,
            imageUrl: closestPlace.imageUrl,
            latitude: closestPlace.latitude!,
            longitude: closestPlace.longitude!,
            distanceMeters: minDistance,
          },
          debugInfo: {
            status: "matched",
            coordsFormatted: coordsStr,
            closestPlaceName: closestPlace.name,
            distanceMeters: minDistance,
            thresholdMeters: maxDistanceMeters,
            details: `GPS başarıyla okundu (${coordsStr}). En yakın mekan (${closestPlace.name}) ${minDistance}m mesafede bulundu (Eşik: ${maxDistanceMeters}m).`,
          },
        });
      } else {
        const placeNote = closestPlace
          ? `En yakın mekan (${closestPlace.name}) ${minDistance}m uzakta (Eşik: ${maxDistanceMeters}m).`
          : "Şehir listesindeki hiçbir mekana yakın değil.";

        results.push({
          fileName: file.name,
          fileSizeFormatted: sizeStr,
          fileType,
          previewUrl,
          latitude: photoLat,
          longitude: photoLon,
          timestamp: photoTime,
          cameraModel,
          hasGps: true,
          rawTagsCount,
          closestPlace: closestPlace
            ? {
                id: closestPlace.id,
                name: closestPlace.name,
                distanceMeters: minDistance,
              }
            : null,
          matchedPlace: null,
          errorNote: placeNote,
          debugInfo: {
            status: "distance_exceeded",
            coordsFormatted: coordsStr,
            closestPlaceName: closestPlace?.name,
            distanceMeters: minDistance === Infinity ? undefined : minDistance,
            thresholdMeters: maxDistanceMeters,
            details: `GPS okundu (${coordsStr}) fakat en yakın mekan ${minDistance}m mesafede, ${maxDistanceMeters}m eşiğinin dışında kaldı.`,
          },
        });
      }
    } catch (err) {
      console.warn(`[EXIFR] Genel okuma hatası (${file.name}):`, err);
      results.push({
        fileName: file.name,
        fileSizeFormatted: sizeStr,
        fileType,
        previewUrl,
        hasGps: false,
        rawTagsCount: 0,
        errorNote: "Fotoğraf formatı veya EXIF başlığı okunamadı.",
        debugInfo: {
          status: "read_error",
          coordsFormatted: "Hata",
          thresholdMeters: maxDistanceMeters,
          details: String(err),
        },
      });
    }
  }

  return results;
}

/**
 * Roma Kolezyum koordinatına sahip gerçek örnek test görselini yükler
 */
export async function loadSampleColosseumPhoto(): Promise<File> {
  const res = await fetch("/samples/rome_colosseum_sample.jpg");
  const blob = await res.blob();
  return new File([blob], "ornek_roma_kolezyum.jpg", { type: "image/jpeg" });
}
