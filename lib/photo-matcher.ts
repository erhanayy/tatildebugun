import ExifReader from "exifreader";
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
 * Her türlü EXIF / XMP / ExifReader GPS etiketini güvenle ondalık dereceye çevirir.
 * NaN, Infinity veya bozuk formatları kesinlikle eler ve undefined döner.
 */
export function extractCoordinate(
  tag: unknown,
  refTag?: unknown
): number | undefined {
  if (tag === null || tag === undefined) return undefined;

  // 1. Doğrudan sayı ise
  if (typeof tag === "number") {
    return Number.isFinite(tag) && !Number.isNaN(tag) ? tag : undefined;
  }

  let result: number | undefined;

  // 2. ExifReader Tag Nesnesi veya XMP ise
  if (typeof tag === "object") {
    const obj = tag as Record<string, any>;

    // 2a. description alanı geçerli sayı ise
    if (typeof obj.description === "number" && Number.isFinite(obj.description) && !Number.isNaN(obj.description)) {
      result = obj.description;
    } else if (typeof obj.description === "string") {
      // 2b. "41.8902" veya "41° 53' 24.5\"" gibi metin ise
      const dms = obj.description.match(/(\d+)[^\d]+(\d+)[^\d]+([\d.]+)/);
      if (dms) {
        const d = parseFloat(dms[1]);
        const m = parseFloat(dms[2]);
        const s = parseFloat(dms[3]);
        if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(s)) {
          result = d + m / 60 + s / 3600;
        }
      } else {
        const directNum = parseFloat(obj.description);
        if (Number.isFinite(directNum) && !Number.isNaN(directNum)) {
          result = directNum;
        }
      }
    }

    // 2c. value alanı dizi ise (Samsung S24 Ultra veya klasik EXIF)
    if (result === undefined && Array.isArray(obj.value) && obj.value.length >= 3) {
      const arr = obj.value;
      const d = typeof arr[0] === "number"
        ? arr[0]
        : Array.isArray(arr[0]) && arr[0].length >= 2 && arr[0][1] !== 0
        ? arr[0][0] / arr[0][1]
        : parseFloat(arr[0]);

      const m = typeof arr[1] === "number"
        ? arr[1]
        : Array.isArray(arr[1]) && arr[1].length >= 2 && arr[1][1] !== 0
        ? arr[1][0] / arr[1][1]
        : parseFloat(arr[1]);

      const s = typeof arr[2] === "number"
        ? arr[2]
        : Array.isArray(arr[2]) && arr[2].length >= 2 && arr[2][1] !== 0
        ? arr[2][0] / arr[2][1]
        : parseFloat(arr[2]);

      if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(s)) {
        result = d + m / 60 + s / 3600;
      }
    }
  }

  if (result === undefined || !Number.isFinite(result) || Number.isNaN(result)) {
    return undefined;
  }

  // Güney (S) veya Batı (W) referansı varsa negatif yap
  if (refTag) {
    const refObj = refTag as Record<string, any> | string;
    const refStr = typeof refObj === "string"
      ? refObj
      : typeof (refObj as any)?.description === "string"
      ? (refObj as any).description
      : Array.isArray((refObj as any)?.value)
      ? (refObj as any).value.join("")
      : String((refObj as any)?.value || "");

    const upperRef = refStr.trim().toUpperCase();
    if (upperRef.startsWith("S") || upperRef.startsWith("W")) {
      result = -Math.abs(result);
    }
  }

  return result;
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
      // 1. TIER-1: ExifReader (Samsung Galaxy S24 Ultra Hareketli HEIC, Apple Live Photo, JPEG, vb.)
      try {
        const arrayBuffer = await file.arrayBuffer();
        const tags = ExifReader.load(arrayBuffer, { expanded: true });

        if (tags) {
          const lat =
            extractCoordinate(tags.gps?.Latitude) ??
            extractCoordinate(tags.exif?.GPSLatitude, tags.exif?.GPSLatitudeRef) ??
            extractCoordinate((tags as any).GPSLatitude, (tags as any).GPSLatitudeRef);

          const lon =
            extractCoordinate(tags.gps?.Longitude) ??
            extractCoordinate(tags.exif?.GPSLongitude, tags.exif?.GPSLongitudeRef) ??
            extractCoordinate((tags as any).GPSLongitude, (tags as any).GPSLongitudeRef);

          if (lat !== undefined && lon !== undefined) {
            photoLat = lat;
            photoLon = lon;
          }

          if (tags.exif) {
            rawTagsCount += Object.keys(tags.exif).length;
            const make = tags.exif.Make?.description || "";
            const model = tags.exif.Model?.description || "";
            if (model) {
              cameraModel = `${make} ${model}`.trim();
            }

            const dateStr = tags.exif.DateTimeOriginal?.description || tags.exif.DateTime?.description;
            if (dateStr) {
              const parts = String(dateStr).split(/[: ]/);
              if (parts.length >= 6) {
                photoTime = new Date(
                  Number(parts[0]),
                  Number(parts[1]) - 1,
                  Number(parts[2]),
                  Number(parts[3]),
                  Number(parts[4]),
                  Number(parts[5])
                );
              }
            }
          }
        }
      } catch (exifReaderErr) {
        console.warn(`[ExifReader] okuma uyarısı (${file.name}):`, exifReaderErr);
      }

      // 2. TIER-2 FALLBACK: exifr (Klasik JPEG ve ek bloklar)
      if (photoLat === undefined || photoLon === undefined) {
        try {
          const gps = await exifr.gps(file);
          if (gps) {
            const lat = extractCoordinate(gps.latitude);
            const lon = extractCoordinate(gps.longitude);
            if (lat !== undefined && lon !== undefined) {
              photoLat = lat;
              photoLon = lon;
            }
          }
        } catch (gpsErr) {
          console.warn(`[EXIFR] gps() okuma uyarısı (${file.name}):`, gpsErr);
        }
      }

      if (cameraModel === null || photoTime === null || photoLat === undefined || photoLon === undefined) {
        try {
          const fullExif = await exifr.parse(file);
          if (fullExif) {
            rawTagsCount = Math.max(rawTagsCount, Object.keys(fullExif).length);

            if (photoLat === undefined) {
              const lat = extractCoordinate(fullExif.latitude);
              const lon = extractCoordinate(fullExif.longitude);
              if (lat !== undefined && lon !== undefined) {
                photoLat = lat;
                photoLon = lon;
              }
            }

            if (!photoTime) {
              if (fullExif.DateTimeOriginal) {
                photoTime = new Date(fullExif.DateTimeOriginal);
              } else if (fullExif.CreateDate) {
                photoTime = new Date(fullExif.CreateDate);
              }
            }

            if (!cameraModel && fullExif.Model) {
              cameraModel = `${fullExif.Make || ""} ${fullExif.Model}`.trim();
            }
          }
        } catch (parseErr) {
          console.warn(`[EXIFR] parse() okuma uyarısı (${file.name}):`, parseErr);
        }
      }

      // GPS Koordinatı geçerli değilse veya NaN/Infinity ise
      if (
        photoLat === undefined ||
        photoLon === undefined ||
        !Number.isFinite(photoLat) ||
        !Number.isFinite(photoLon) ||
        Number.isNaN(photoLat) ||
        Number.isNaN(photoLon)
      ) {
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
            details: `EXIF'ten ${rawTagsCount} adet meta veri etiketi okundu ancak geçerli GPS koordinatı çözülemedi.`,
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
