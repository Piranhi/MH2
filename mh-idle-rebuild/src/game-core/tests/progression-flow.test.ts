import { describe, expect, it } from "vitest";
import { getSnapshot } from "../game";
import {
  buildProgressionReport,
  runProgressionPolicy
} from "./progressionTestUtils";

describe("progression route harness", () => {
  it("can simulate a training-and-equipment route and emit useful events", () => {
    const result = runProgressionPolicy({ maxSeconds: 2 * 3600 });
    const eventTypes = result.events.map((event) => event.type);

    expect(eventTypes).toContain("areaEntered");
    expect(eventTypes).toContain("bossUnlocked");
    expect(eventTypes).toContain("bossAttempted");
    expect(eventTypes).toContain("bossCleared");
    expect(result.state.areas["emberfall-woods"].bossDefeated).toBe(true);
    expect(result.state.areas["ironroot-basin"].unlocked).toBe(true);
  });

  it("keeps a readable progression report available for tuning", () => {
    const result = runProgressionPolicy({ maxSeconds: 90 * 60 });
    const report = buildProgressionReport(result);

    expect(report).toContain("Progression Report");
    expect(report).toContain("Route Events:");
    expect(report).toContain("Area State:");
    expect(report).toContain("Emberfall Woods");
  });

  it("records prestige readiness only after the capstone gate and enough renown", () => {
    const result = runProgressionPolicy({ maxSeconds: 10 * 3600, bossReadinessThreshold: 0.78 });
    const snapshot = getSnapshot(result.state);
    const prestigeReadyEvent = result.events.find((event) => event.type === "prestigeReady");

    if (prestigeReadyEvent) {
      expect(snapshot.prestige.capstoneCleared).toBe(true);
      expect(snapshot.prestige.gain).toBeGreaterThan(0);
    } else {
      expect(snapshot.prestige.canPrestige).toBe(false);
    }
  });
});
