import { describe, expect, it } from "vitest";
import { buildProgressionReport, runProgressionPolicy } from "./progressionTestUtils";

declare const process: {
  env: Record<string, string | undefined>;
};

describe("progression report", () => {
  it("generates the current progression route report", () => {
    const report = buildProgressionReport(runProgressionPolicy({ maxSeconds: 10 * 3600, bossReadinessThreshold: 0.78 }));

    if (process.env.PROGRESSION_REPORT === "1") {
      console.log(`\n${report}\n`);
    }

    expect(report).toContain("Progression Report");
    expect(report).toContain("Area State:");
  });
});
