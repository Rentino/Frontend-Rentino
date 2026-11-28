"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface GearImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
}

/**
 * Renders gear images reliably for every source the catalog uses:
 *  - local paths (`/images/...`) served by the app
 *  - remote http(s) URLs (any host — providers may use any image CDN)
 *  - missing/broken URLs show a neutral placeholder instead of a blank box.
 *
 * `unoptimized` bypasses Next's remote-pattern allow-list and avoids the
 * optimizer failing on arbitrary provider URLs (#52); the payment page already
 * worked because it used a plain `<img>`.
 */
export function GearImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fill = true,
  width,
  height,
}: GearImageProps) {
  const [failed, setFailed] = useState(false);
  const raw = src?.trim();
  // Backend uploads (/uploads/...) live on the API host, unlike SVGs under the
  // frontend's public/ directory. Prefix them so they load from the right host.
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
  ).replace(/\/api\/v1\/?$/, "");
  const value = raw?.startsWith("/uploads/") ? `${apiBase}${raw}` : raw;

  if (!value || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-surface-muted text-muted",
          className,
        )}
        aria-label="تصویر در دسترس نیست"
      >
        <ImageOff className="h-6 w-6 opacity-70" />
      </div>
    );
  }

  return (
    <Image
      src={value}
      alt={alt}
      {...(fill
        ? { fill: true }
        : { width: width ?? 300, height: height ?? 200 })}
      sizes={sizes}
      priority={priority}
      unoptimized
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
