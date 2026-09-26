"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

/** Haalt de serverdata elke N seconden opnieuw op (Logfire-cache blijft 60s). */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
