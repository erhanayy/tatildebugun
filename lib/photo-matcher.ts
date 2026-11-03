import exifr from "exifr";
import { type CityPlaceItem } from "@/lib/actions/places";

export interface PhotoMatchResult {
  fileName: string;
  previewUrl: string;
  latitude?: number;
  longitude?: number;
  timestamp?: Date | null;
  hasGps: boolean;
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

    try {
      // EXIF verilerini oku (Yalnızca başlığı tarar, dosyanın tamamını belleğe yüklemez)
      const exif = await exifr.parse(file, {
        gps: true,
        pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"],
      });

      if (!exif || exif.latitude === undefined || exif.longitude === undefined) {
        results.push({
          fileName: file.name,
          previewUrl,
          hasGps: false,
          errorNote: "Fotoğrafta GPS/konum bilgisi bulunamadı.",
        });
        continue;
      }

      const photoLat = exif.latitude;
      const photoLon = exif.longitude;
      const photoTime = exif.DateTimeOriginal
        ? new Date(exif.DateTimeOriginal)
        : exif.CreateDate
        ? new Date(exif.CreateDate)
        : null;

      // Mekanlar arasında en yakın olanı bul
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

      if (closestPlace && minDistance <= maxDistanceMeters) {
        results.push({
          fileName: file.name,
          previewUrl,
          latitude: photoLat,
          longitude: photoLon,
          timestamp: photoTime,
          hasGps: true,
          matchedPlace: {
            id: closestPlace.id,
            name: closestPlace.name,
            category: closestPlace.category,
            imageUrl: closestPlace.imageUrl,
            latitude: closestPlace.latitude!,
            longitude: closestPlace.longitude!,
            distanceMeters: minDistance,
          },
        });
      } else {
        results.push({
          fileName: file.name,
          previewUrl,
          latitude: photoLat,
          longitude: photoLon,
          timestamp: photoTime,
          hasGps: true,
          matchedPlace: null,
          errorNote: closestPlace
            ? `En yakın mekan (${closestPlace.name}) ${minDistance}m uzakta (Eşik: ${maxDistanceMeters}m).`
            : "Yakında bilinen bir mekan bulunamadı.",
        });
      }
    } catch (err) {
      console.warn(`EXIF okuma hatası (${file.name}):`, err);
      results.push({
        fileName: file.name,
        previewUrl,
        hasGps: false,
        errorNote: "Fotoğraf formatı veya EXIF okunamadı.",
      });
    }
  }

  return results;
}
