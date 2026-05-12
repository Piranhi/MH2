import { describe, expect, it } from "vitest";
import { getHunterStats } from "../balance";
import { isEquipmentSlotEnabled } from "../challenges";
import { gameContent } from "../content/content";
import { attemptBoss, createGame, getSnapshot, startChallenge, tick } from "../game";
import { gameNumber } from "../numbers";
import type { GameState } from "../types";

describe("challenge runs", () => {
  it("starts an unlocked challenge as a fresh challenge run", () => {
    const state = createGame(100);
    state.player.prestige = 1;
    state.player.gold = gameNumber(500);
    state.training.might.level = 5;

    const challenge = startChallenge(state, "bare-hands");

    expect(challenge.challenges.active?.challengeId).toBe("bare-hands");
    expect(challenge.player.prestige).toBe(1);
    expect(challenge.player.gold.eq(0)).toBe(true);
    expect(challenge.training.might.level).toBe(0);
  });

  it("disables weapon stats during Bare Hands", () => {
    const normal = createGame();
    normal.player.prestige = 1;
    const challenge = startChallenge(normal, "bare-hands");

    expect(isEquipmentSlotEnabled(challenge, "weapon")).toBe(false);
    expect(getHunterStats(challenge, gameContent).attack).toBeLessThan(getHunterStats(normal, gameContent).attack);
  });

  it("records challenge completion level and best time", () => {
    const state = createGame(100);
    state.player.prestige = 1;
    const challenge = startChallenge(state, "bare-hands");
    const ready = makeBossReady(challenge, "emberfall-woods", 180, 1200);
    const completed = tick(attemptBoss(ready), 60);
    const record = completed.challenges.records["bare-hands"];

    expect(completed.challenges.active?.completedLevel).toBeGreaterThan(0);
    expect(record.level).toBeGreaterThan(0);
    expect(record.bestSeconds).toBeDefined();
    expect(record.completions).toBe(1);
  });

  it("applies permanent challenge rewards outside the challenge", () => {
    const base = createGame();
    const rewarded = createGame();
    rewarded.challenges.records["bare-hands"] = {
      level: 1,
      completions: 1,
      bestSeconds: 1200
    };

    expect(getSnapshot(rewarded).stats.attack).toBeGreaterThan(getSnapshot(base).stats.attack);
  });
});

function makeBossReady(state: GameState, areaId: string, attack: number, health: number): GameState {
  const ready = state;
  ready.player.baseStats.attack = attack;
  ready.player.baseStats.health = health;
  ready.hunt.hunterHp = getSnapshot(ready).survival;
  ready.areas[areaId].progress = 9999;
  ready.areas[areaId].bossUnlocked = true;
  return ready;
}
