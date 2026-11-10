import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Keep server/initial client output consistent before reading the persisted cart.
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
