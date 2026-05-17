import { describe, expect, it } from "vitest";
import { achievementSpecs, isAchievementComplete } from "../achievements";
import { createGame, getSnapshot, tick } from "../game";

describe("achievements", () => {
  it("tracks numbered visible and secret achievements", () => {
    const state = createGame();
    const visible = achievementSpecs.filter((achievement) => !achievement.secret);
    const secret = achievementSpecs.filter((achievement) => achievement.secret);
    const snapshot = getSnapshot(state);

    expect(visible.map((achievement) => achievement.number)).toContain(1);
    expect(secret.every((achievement) => achievement.number >= 100)).toBe(true);
    expect(snapshot.achievements.visibleTotal).toBe(visible.length);
    expect(snapshot.achievements.secretTotal).toBe(secret.length);
    expect(snapshot.achievements.completed).toBe(0);
  });

  it("completes milestones automatically and applies small permanent bonuses", () => {
    const hunted = tick(createGame(), 20);
    const snapshot = getSnapshot(hunted);

    expect(isAchievementComplete(hunted, "first-hunt")).toBe(true);
    expect(snapshot.achievements.completed).toBeGreaterThan(0);
    expect(snapshot.achievements.statMultiplier).toBeGreaterThan(1);
    expect(snapshot.achievements.rewardMultiplier).toBeGreaterThan(1);
  });

  it("awards banked time for larger achievements once", () => {
    const ready = createGame(100);
    ready.areas["emberfall-woods"].bossDefeated = true;

    const firstRefresh = tick(ready, 0);
    const secondRefresh = tick(firstRefresh, 0);

    expect(isAchievementComplete(firstRefresh, "bramblemaw-cleared")).toBe(true);
    expect(firstRefresh.time.bankedSeconds).toBe(5 * 60);
    expect(secondRefresh.time.bankedSeconds).toBe(5 * 60);
  });

  it("tracks secret achievement tokens for a later shop", () => {
    const state = createGame(100);
    for (let index = 0; index < 5; index += 1) {
      state.inventory.items.push({
        instanceId: `blade-${index}`,
        itemId: "scuffed-hunter-blade",
        acquiredAt: 100 + index,
        level: 1,
        locked: false
      });
    }

    const refreshed = tick(state, 0);

    expect(isAchievementComplete(refreshed, "same-item-stack")).toBe(true);
    expect(refreshed.achievements.secretTokens).toBe(1);
    expect(getSnapshot(refreshed).achievements.secretTokens).toBe(1);
  });

  it("unlocks duplicate auto-sell as a visible bag milestone", () => {
    const state = createGame(100);
    for (let index = 0; index < 20; index += 1) {
      state.inventory.items.push({
        instanceId: `loot-${index}`,
        itemId: index % 2 === 0 ? "mossfang-charm" : "mossguard-vest",
        acquiredAt: 100 + index,
        level: 1,
        locked: false
      });
    }

    const refreshed = tick(state, 0);

    expect(isAchievementComplete(refreshed, "bag-discipline")).toBe(true);
    expect(refreshed.unlocks.autoSellDuplicates).toBe(true);
  });
});
