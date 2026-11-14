/** Random request key; callers must reuse the saved key for a network retry. */
export function newIdempotencyKey(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
