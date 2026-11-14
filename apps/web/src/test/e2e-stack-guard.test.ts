import { describe, expect, it } from "vitest";
import { assertTestStack } from "../../tests/e2e/stack-guard";

function stack() {
  return ["web", "api", "postgres"].map((service) => ({
    Config: {
      Labels: {
        "com.docker.compose.project": "brewlite-a2-e2e",
        "com.docker.compose.service": service,
        "brewlite.e2e": "task-40",
      },
      Env:
        service === "api"
          ? [
              "DATABASE_URL=postgresql://e2e:test@postgres:5432/brewlite_e2e_test",
              "ADMIN_EMAIL=staff@brewlite-e2e.test",
              "ADMIN_PASSWORD=E2e-Local-Only-Password!24",
            ]
          : service === "postgres"
            ? ["POSTGRES_DB=brewlite_e2e_test"]
            : [
                "NEXT_PUBLIC_API_URL=http://127.0.0.1:3201",
                "API_INTERNAL_URL=http://api:3001",
              ],
    },
    State: { Running: true, Health: { Status: "healthy" } },
    Mounts:
      service === "postgres"
        ? [{ Type: "tmpfs", Destination: "/var/lib/postgresql/data" }]
        : [],
    NetworkSettings: {
      Ports: {
        [service === "web"
          ? "3000/tcp"
          : service === "api"
            ? "3001/tcp"
            : "5432/tcp"]: [
          {
            HostIp: "127.0.0.1",
            HostPort:
              service === "web" ? "3200" : service === "api" ? "3201" : "35432",
          },
        ],
      },
    },
  }));
}
describe("WEB-T110 prevent browser writes against a project/shared database", () => {
  it("accepts Docker Engine tmpfs metadata in HostConfig when Mounts is null", () => {
    const rows = stack();
    expect(() =>
      assertTestStack([
        rows[0],
        rows[1],
        {
          ...rows[2],
          Mounts: null,
          HostConfig: { Tmpfs: { "/var/lib/postgresql/data": "rw,size=192m" } },
        },
      ]),
    ).not.toThrow();
  });
  it("a tmpfs declaration must not mask a persistent PostgreSQL mount", () => {
    const rows = stack();
    expect(() =>
      assertTestStack([
        rows[0],
        rows[1],
        {
          ...rows[2],
          Mounts: [{ Type: "volume", Destination: "/var/lib/postgresql/data" }],
          HostConfig: { Tmpfs: { "/var/lib/postgresql/data": "rw,size=192m" } },
        },
      ]),
    ).toThrow("tmpfs");
  });
  it("accepts only the disposable labeled 3-service stack", () =>
    expect(() => assertTestStack(stack())).not.toThrow());
  it("refuses an A1/shared project even with matching ports", () => {
    const rows = stack();
    rows[0].Config.Labels["com.docker.compose.project"] = "brewlite";
    expect(() => assertTestStack(rows)).toThrow("ngoài Compose E2E");
  });
  it("refuses project DB name and persistent volume", () => {
    const rows = stack();
    rows[2].Mounts = [
      { Type: "volume", Destination: "/var/lib/postgresql/data" },
    ];
    expect(() => assertTestStack(rows)).toThrow("tmpfs");
    rows[2].Mounts = [
      { Type: "tmpfs", Destination: "/var/lib/postgresql/data" },
    ];
    rows[1].Config.Env[0] =
      "DATABASE_URL=postgresql://e2e:test@postgres:5432/brewlite";
    expect(() => assertTestStack(rows)).toThrow("database");
  });
  it("refuses a foreign/public port, duplicate or unhealthy service", () => {
    const rows = stack();
    rows[0].NetworkSettings.Ports["3000/tcp"][0].HostIp = "0.0.0.0";
    expect(() => assertTestStack(rows)).toThrow("Cổng");
    expect(() => assertTestStack([stack()[0], stack()[0], stack()[2]])).toThrow(
      "trùng",
    );
    const unhealthy = stack();
    unhealthy[1].State.Health.Status = "starting";
    expect(() => assertTestStack(unhealthy)).toThrow("healthy");
  });
  it("malformed database URL is rejected without printing its input", () => {
    const rows = stack();
    rows[1].Config.Env[0] = "DATABASE_URL=invalid-secret-url";
    expect(() => assertTestStack(rows)).toThrow(
      "DATABASE_URL của API E2E không hợp lệ.",
    );
  });
});
