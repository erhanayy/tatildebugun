"use client";

import { useState } from "react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  fallbackEmoji?: string;
}

const SIZE_CLASSES = {
  xs: "w-7 h-7 text-xs rounded-lg",
  sm: "w-8 h-8 text-xs rounded-xl",
  md: "w-10 h-10 text-sm rounded-xl",
  lg: "w-12 h-12 text-base rounded-2xl",
  xl: "w-24 h-24 text-4xl rounded-3xl",
};

export function UserAvatar({
  avatarUrl,
  name,
  size = "md",
  className = "",
  fallbackEmoji = "🌴",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const isImage =
    !imageError &&
    Boolean(
      avatarUrl &&
        (avatarUrl.startsWith("data:image") ||
          avatarUrl.startsWith("http://") ||
          avatarUrl.startsWith("https://") ||
          avatarUrl.startsWith("/"))
    );

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const initials = name
    ? name
        .trim()
        .replace(/\./g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  return (
    <div
      className={`bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-extrabold shadow-md overflow-hidden relative select-none shrink-0 ${sizeClass} ${className}`}
    >
      {isImage ? (
        <img
          src={avatarUrl!}
          alt={name || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : avatarUrl && avatarUrl.length <= 8 ? (
        <span className="select-none leading-none">{avatarUrl}</span>
      ) : initials ? (
        <span className="select-none leading-none tracking-tight">{initials}</span>
      ) : (
        <span className="select-none leading-none">{fallbackEmoji}</span>
      )}
    </div>
  );
}
