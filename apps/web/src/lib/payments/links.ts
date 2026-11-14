/** Public origin for a phone; avoid localhost when the app was opened via LAN. */
export function publicAppOrigin(currentOrigin: string, configured?: string): string {
  const current = new URL(currentOrigin);
  try {
    const selected = new URL(configured?.trim() || currentOrigin);
    if (!["http:", "https:"].includes(selected.protocol)) return current.origin;
    if (["localhost", "127.0.0.1"].includes(selected.hostname) &&
      !["localhost", "127.0.0.1"].includes(current.hostname)) return current.origin;
    return selected.origin;
  } catch { return current.origin; }
}

export const paymentSelectionPath = (orderId: string) => `/pay/order/${encodeURIComponent(orderId)}`;
export const paymentConfirmationPath = (orderId: string) => `/orders/${encodeURIComponent(orderId)}/confirmation`;

export function formatPaymentRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
