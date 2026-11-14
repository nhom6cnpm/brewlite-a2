"use client";

import { useEffect, useState } from "react";

/** Display-only server clock; expiry/cancellation is always decided by the API. */
export function usePaymentClock(serverTime: string | undefined, receivedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return serverTime ? Date.parse(serverTime) + Math.max(0, now - receivedAt) : now;
}
