"use client";

import { useEffect, useState } from "react";

/**
 * Current time on the server's clock, ticking every second: countdowns use
 * the API's serverTime so a wrong phone/PC clock does not change deadlines.
 */
export function useServerClock(
  serverTime: string | undefined,
  receivedAt: number,
): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const server = serverTime ? Date.parse(serverTime) : NaN;
    const offset = Number.isFinite(server) && receivedAt ? server - receivedAt : 0;
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [serverTime, receivedAt]);
  return now;
}
