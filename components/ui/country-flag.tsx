"use client";

import { useState, useEffect } from "react";
import { getCountryFlagEmoji, getCountryFlagUrl } from "@/lib/country-flags";

interface CountryFlagProps {
  countryCode: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

export function CountryFlag({
  countryCode,
  width = 24,
  height = 16,
  className = "",
  alt,
}: CountryFlagProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [countryCode]);

  if (!countryCode) {
    return <span className={className} style={{ fontSize: height * 0.85 }}>🌍</span>;
  }

  const code = countryCode.toUpperCase();

  // 1. KKTC Özel Vektörel SVG Çizimi
  if (code === "KKTC" || code === "TRNC" || code === "NC") {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 30 20"
        className={`inline-block align-middle rounded-xs shadow-xs border border-slate-300 dark:border-slate-700/60 shrink-0 ${className}`}
        style={{ width, height }}
        aria-label={alt || "KKTC Bayrağı"}
      >
        <rect width="30" height="20" fill="#fff" />
        <rect y="2" width="30" height="2.5" fill="#e30a17" />
        <rect y="15.5" width="30" height="2.5" fill="#e30a17" />
        <circle cx="12" cy="10" r="4.2" fill="#e30a17" />
        <circle cx="13.2" cy="10" r="3.3" fill="#fff" />
        <polygon
          points="16.5,10 14.5,10.6 15.2,12 13.8,11 13.2,12.5 13,10.7 11.5,10.7 12.7,9.7 11.8,8.5 13.4,9.1 14.2,7.7 14.2,9.5"
          fill="#e30a17"
        />
      </svg>
    );
  }

  // 2. Standart 2 Haneli ISO ve Desteklenen Alt Bölge Kodları (GB-SCT, GB-WLS, GB-ENG, GB-NIR)
  const url = getCountryFlagUrl(code, "w80");
  if (url && !imgFailed) {
    return (
      <img
        src={url}
        width={width}
        height={height}
        alt={alt || `${code} Bayrağı`}
        className={`inline-block align-middle rounded-xs shadow-xs border border-slate-300 dark:border-slate-700/60 object-cover shrink-0 ${className}`}
        style={{ width, height }}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <span className={className} style={{ fontSize: height * 0.85 }}>{getCountryFlagEmoji(code)}</span>;
}
