"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarImageProps {
  src?: string | null;
  alt: string;
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AvatarImage({
  src,
  alt,
  name,
  size = 64,
  className = "",
  style = {},
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const initial = (name || "T").trim().charAt(0).toUpperCase() || "T";

  if (!src || hasError) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0329B2 0%, #016EF8 100%)",
          color: "white",
          fontWeight: 800,
          fontSize: `${Math.round(size * 0.4)}px`,
          textTransform: "uppercase",
          userSelect: "none",
          flexShrink: 0,
          ...style,
        }}
        aria-label={alt}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        backgroundColor: "#e2e8f0",
        ...style,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        sizes={`${size}px`}
        priority={size >= 96}
        unoptimized
        onError={() => setHasError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
