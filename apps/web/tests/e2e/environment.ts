// Deliberately fixed to a disposable local Compose project. Do not point tests
// that place orders or transfer money at a shared dev/production database.
export const E2E = {
  project: "brewlite-a2-e2e",
  label: "task-40",
  database: "brewlite_e2e_test",
  web: "http://127.0.0.1:3200",
  api: "http://127.0.0.1:3201",
  adminEmail: "staff@brewlite-e2e.test",
  adminPassword: "E2e-Local-Only-Password!24",
} as const;

export function staffMode(): "ui" | "api" {
  const value = process.env.E2E_STAFF_MODE ?? "ui";
  if (value !== "ui" && value !== "api")
    throw new Error("E2E_STAFF_MODE chỉ nhận ui hoặc api.");
  return value;
}
