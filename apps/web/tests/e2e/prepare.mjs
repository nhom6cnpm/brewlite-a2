import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

// Cross-platform npm script; selecting preparation never makes E2E-T01 pass.
const require = createRequire(import.meta.url);
const result = spawnSync(
  process.execPath,
  [
    require.resolve("@playwright/test/cli"),
    "test",
    "--grep",
    "@prepare",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, E2E_PREPARE_ONLY: "1" },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
