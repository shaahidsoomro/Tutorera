"use client";

import { useEffect,useState } from "react";

/**
 * Safe hook to retrieve current client timestamp in compliance with
 * React Compiler purity rules and SSR hydration consistency.
 */
export function useCurrentTime(tickIntervalMs?: number): number {
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    if (!tickIntervalMs) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, tickIntervalMs);

    return () => clearInterval(interval);
  }, [tickIntervalMs]);

  return now;
}
