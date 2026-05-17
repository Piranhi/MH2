import { describe, expect, it } from "vitest";
import { gameContent } from "../content/content";
import { attemptBoss, createGame, getSnapshot, tick } from "../game";
import { gameNumber } from "../numbers";

describe("feature unlocks", () => {
  it("starts with optional dashboard systems hidden", () => {
    const snapshot = getSnapshot(createGame());

    expect(snapshot.features).toEqual({
      training: false,
      performance: false,
      combatStats: false,
      drops: false,
      inventory: false,
      bossIdentity: false,
      areaTravel: false,
      prestige: false,
      settlement: false
    });
    expect(snapshot.unlockNotices).toEqual([]);
  });

  it("reveals hunt information as the first area progresses", () => {
    const snapshot = getSnapshot(tick(createGame(), 600));

    expect(snapshot.features.training).toBe(true);
    expect(snapshot.features.performance).toBe(true);
    expect(snapshot.features.combatStats).toBe(true);
    expect(snapshot.features.drops).toBe(true);
    expect(snapshot.features.bossIdentity).toBe(true);
    expect(snapshot.unlockNotices.map((notice) => notice.id)).toContain("bossIdentity");
  });

  it("unlocks inventory and area travel from their own progression signals", () => {
    const withItem = createGame();
    withItem.inventory.items.push({
      instanceId: "test-drop-1",
      itemId: "mossguard-vest",
      acquiredAt: 1,
      level: 1,
      locked: false
    });
    withItem.resources["green-herb"] = gameNumber(3);

    expect(getSnapshot(withItem).features.inventory).toBe(true);
    expect(getSnapshot(withItem).features.drops).toBe(true);

    const bossReady = createGame();
    const emberfall = gameContent.areas.find((area) => area.id === "emberfall-woods")!;
    bossReady.player.baseStats.attack = 180;
    bossReady.player.baseStats.health = 1200;
    bossReady.hunt.hunterHp = getSnapshot(bossReady).survival;
    bossReady.areas["emberfall-woods"].progress = emberfall.progressRequired;
    bossReady.areas["emberfall-woods"].bossUnlocked = true;
    const cleared = getSnapshot(tick(attemptBoss(bossReady), 60));

    expect(cleared.features.areaTravel).toBe(true);
    expect(cleared.unlockNotices.map((notice) => notice.id)).toContain("areaTravel");
  });

  it("keeps settlement hidden until the first prestige", () => {
    const state = createGame();

    expect(getSnapshot(state).features.settlement).toBe(false);

    state.player.prestige = 1;

    expect(getSnapshot(state).features.settlement).toBe(true);
    expect(getSnapshot(state).unlockNotices.map((notice) => notice.id)).toContain("settlement");
  });
});
