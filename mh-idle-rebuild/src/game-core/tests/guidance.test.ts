import { describe, expect, it } from "vitest";
import { getRouteGuidance } from "../guidance";
import { createGame, getSnapshot, selectArea } from "../game";
import { gameNumber } from "../numbers";

describe("route guidance", () => {
  it("starts by pointing the player at area progress", () => {
    const guidance = getRouteGuidance(createGame());

    expect(guidance.id).toBe("progress");
    expect(guidance.primaryAction).toBe("hunt");
    expect(guidance.title).toContain("Build area progress");
  });

  it("warns when the boss is revealed before the hunter is ready", () => {
    const state = createGame();
    state.areas["emberfall-woods"].progress = 150;
    state.areas["emberfall-woods"].bossUnlocked = true;

    const guidance = getRouteGuidance(state);

    expect(guidance.id).toBe("boss-low");
    expect(guidance.primaryAction).toBe("train");
    expect(guidance.secondaryAction).toBe("inventory");
  });

  it("warns when the hunter is too wounded to push", () => {
    const state = createGame();
    state.hunt.hunterHp = 10;

    const guidance = getRouteGuidance(state);

    expect(guidance.id).toBe("wounded");
    expect(guidance.primaryAction).toBe("train");
  });

  it("switches to boss attempts once readiness is high enough", () => {
    const state = createGame();
    state.player.baseStats.attack = 180;
    state.player.baseStats.health = 1200;
    state.hunt.hunterHp = getSnapshot(state).survival;
    state.areas["emberfall-woods"].progress = 150;
    state.areas["emberfall-woods"].bossUnlocked = true;

    const guidance = getRouteGuidance(state);

    expect(["boss-risk", "boss-ready"]).toContain(guidance.id);
    expect(guidance.primaryAction).toBe("boss");
  });

  it("points to the next area after a boss gate is cleared", () => {
    const state = createGame();
    state.areas["emberfall-woods"].progress = 150;
    state.areas["emberfall-woods"].bossUnlocked = true;
    state.areas["emberfall-woods"].bossDefeated = true;
    state.areas["ironroot-basin"].visible = true;
    state.areas["ironroot-basin"].unlocked = true;

    const guidance = getRouteGuidance(state);

    expect(guidance.id).toBe("travel");
    expect(guidance.primaryAction).toBe("travel");
    expect(guidance.targetAreaId).toBe("ironroot-basin");
  });

  it("points back to safer farming when a new tier is too dangerous", () => {
    const state = createGame();
    state.areas["ironroot-basin"].visible = true;
    state.areas["ironroot-basin"].unlocked = true;
    const ironroot = selectArea(state, "ironroot-basin");

    const guidance = getRouteGuidance(ironroot);

    expect(guidance.id).toBe("danger");
    expect(guidance.primaryAction).toBe("train");
    expect(guidance.secondaryAction).toBe("farm");
    expect(guidance.targetAreaId).toBe("emberfall-woods");
  });

  it("prioritizes prestige when the capstone and renown are ready", () => {
    const state = createGame();
    state.player.renown = gameNumber(500);
    state.areas["moonfen-ruins"].bossDefeated = true;

    const guidance = getRouteGuidance(state);

    expect(guidance.id).toBe("prestige");
    expect(guidance.primaryAction).toBe("prestige");
  });
});
