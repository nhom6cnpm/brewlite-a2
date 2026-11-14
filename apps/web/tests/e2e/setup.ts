import { execFileSync } from "node:child_process";
import { E2E, staffMode } from "./environment";
import { assertTestStack } from "./stack-guard";

export default async function setup() {
  const ids = execFileSync(
    "docker",
    [
      "ps",
      "--filter",
      `label=com.docker.compose.project=${E2E.project}`,
      "--format",
      "{{.ID}}",
    ],
    { encoding: "utf8", windowsHide: true },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (ids.length !== 3)
    throw new Error(
      "Chưa có stack E2E riêng. Chạy lệnh Compose trong tests/e2e/README.md; không dùng stack đồ án hiện tại.",
    );
  // Never print inspect output: environment contains the disposable test secrets.
  assertTestStack(
    JSON.parse(
      execFileSync("docker", ["inspect", ...ids], {
        encoding: "utf8",
        windowsHide: true,
      }),
    ),
  );
  const health = await fetch(E2E.api + "/health", {
    signal: AbortSignal.timeout(10_000),
  });
  if (!health.ok) throw new Error("API E2E chưa sẵn sàng.");
  const products = await fetch(E2E.api + "/products", {
    signal: AbortSignal.timeout(10_000),
  });
  const rows: unknown = await products.json();
  if (
    !products.ok ||
    !Array.isArray(rows) ||
    !rows.some((row) => row?.id === "p1")
  )
    throw new Error("Stack chưa chạy API A2 với seed p1..p6.");
  if (process.env.E2E_PREPARE_ONLY !== "1") {
    const missing: string[] = [];
    for (const [path, dependency] of [
      ["/checkout/ORD-E2E-readiness", "#57 checkout"],
      ...(staffMode() === "ui" ? [["/admin/payments", "#56 admin"]] : []),
    ]) {
      const response = await fetch(E2E.web + path, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) missing.push(dependency);
    }
    if (missing.length)
      throw new Error(
        "E2E-T01 chưa đủ phụ thuộc: " +
          missing.join(", ") +
          ". Ghép/build lại rồi chạy; không bỏ qua bước hoặc dùng response giả để báo xanh.",
      );
  }
}
