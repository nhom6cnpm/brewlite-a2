import { E2E } from "./environment";

interface Container {
  Config: { Labels: Record<string, string>; Env: string[] };
  State: { Running: boolean; Health?: { Status: string } };
  Mounts?: { Type: string; Destination: string }[] | null;
  HostConfig?: { Tmpfs?: Record<string, string> | null };
  NetworkSettings: {
    Ports: Record<string, { HostIp: string; HostPort: string }[] | null>;
  };
}

export function assertTestStack(containers: Container[]): void {
  if (containers.length !== 3)
    throw new Error(
      "Cần đúng 3 container web/api/postgres của project E2E riêng.",
    );
  const services = new Set<string>();
  for (const container of containers) {
    const labels = container.Config.Labels;
    const service = labels["com.docker.compose.service"];
    if (
      labels["com.docker.compose.project"] !== E2E.project ||
      labels["brewlite.e2e"] !== E2E.label ||
      !["web", "api", "postgres"].includes(service) ||
      services.has(service)
    )
      throw new Error(
        "Từ chối dùng container ngoài Compose E2E hoặc service trùng.",
      );
    services.add(service);
    if (
      !container.State.Running ||
      container.State.Health?.Status !== "healthy"
    )
      throw new Error(`Container E2E ${service} chưa healthy.`);
    const target =
      service === "web"
        ? "3000/tcp"
        : service === "api"
          ? "3001/tcp"
          : "5432/tcp";
    const published =
      service === "web" ? "3200" : service === "api" ? "3201" : "35432";
    const ports = container.NetworkSettings.Ports[target];
    if (
      !ports ||
      ports.length !== 1 ||
      ports[0].HostIp !== "127.0.0.1" ||
      ports[0].HostPort !== published
    )
      throw new Error(`Cổng E2E ${service} không khớp cấu hình test.`);
    const env = Object.fromEntries(
      container.Config.Env.map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at), line.slice(at + 1)];
      }),
    );
    const mounts = container.Mounts ?? [];
    const tmpfs = container.HostConfig?.Tmpfs ?? {};
    if (
      service === "postgres" &&
      (env.POSTGRES_DB !== E2E.database ||
        !(
          Object.hasOwn(tmpfs, "/var/lib/postgresql/data") ||
          mounts.some(
            (m) =>
              m.Type === "tmpfs" &&
              m.Destination === "/var/lib/postgresql/data",
          )
        ) ||
        mounts.some(
          (m) =>
            m.Type !== "tmpfs" &&
            m.Destination.startsWith("/var/lib/postgresql"),
        ))
    )
      throw new Error(
        "Database E2E phải dùng tmpfs riêng, không dùng volume/bind của đồ án.",
      );
    if (service === "api") {
      let database: URL;
      try {
        database = new URL(env.DATABASE_URL);
      } catch {
        throw new Error("DATABASE_URL của API E2E không hợp lệ.");
      }
      if (
        database.hostname !== "postgres" ||
        database.pathname !== "/" + E2E.database ||
        env.ADMIN_EMAIL !== E2E.adminEmail ||
        env.ADMIN_PASSWORD !== E2E.adminPassword
      )
        throw new Error("API không trỏ đến database/tài khoản E2E riêng.");
    }
    if (
      service === "web" &&
      (env.NEXT_PUBLIC_API_URL !== E2E.api ||
        env.API_INTERNAL_URL !== "http://api:3001")
    )
      throw new Error("Web không trỏ đến API E2E riêng.");
  }
}
