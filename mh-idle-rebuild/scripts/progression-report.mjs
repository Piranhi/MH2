import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  [
    "vitest",
    "run",
    "src/game-core/tests/progression-report.test.ts",
    "--reporter=verbose"
  ],
  {
    env: {
      ...process.env,
      PROGRESSION_REPORT: "1"
    },
    shell: process.platform === "win32",
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
