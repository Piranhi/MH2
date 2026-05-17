import { describe, expect, it } from "vitest";
import { getHunterStats } from "../balance";
import { gameContent } from "../content/content";
import { createGame, getSnapshot, setActiveTraining, tick } from "../game";
import { getNextTrainingGain, getTrainingBonus, getTrainingDuration, getTrainingMilestoneBonus, getTrainingPotency, getTrainingProgressPercent, getTrainingRate } from "../training";

describe("hunter training", () => {
  it("trains the active discipline over time", () => {
    const state = setActiveTraining(createGame(), "might");
    const duration = getTrainingDuration(state, "might");
    const trained = tick(state, duration);

    expect(trained.activeTrainingId).toBe("might");
    expect(trained.training.might.level).toBe(1);
    expect(trained.training.might.progressSeconds).toBe(0);
  });

  it("stores partial progress without gold costs", () => {
    const state = setActiveTraining(createGame(), "might");
    const seconds = getTrainingDuration(state, "might") / 2;
    const trained = tick(state, seconds);
    const huntingOnly = tick(createGame(), seconds);

    expect(trained.training.might.level).toBe(0);
    expect(getTrainingProgressPercent(trained, "might")).toBeGreaterThan(45);
    expect(trained.player.gold.eq(huntingOnly.player.gold)).toBe(true);
  });

  it("feeds completed training bonuses into combat stats and boss readiness", () => {
    const state = setActiveTraining(createGame(), "might");
    const trained = tick(state, getTrainingDuration(state, "might"));

    expect(getHunterStats(trained, gameContent).attack).toBeGreaterThan(getHunterStats(state, gameContent).attack);
    expect(getSnapshot(trained).bossReadiness).toBeGreaterThan(getSnapshot(state).bossReadiness);
  });

  it("keeps training relevant through milestones and legacy potency", () => {
    const state = createGame();
    state.training.might.level = 10;
    const normalBonus = getTrainingBonus(state, "might");

    state.player.prestige = 2;
    const legacyBonus = getTrainingBonus(state, "might");

    expect(getTrainingMilestoneBonus(10)).toBeGreaterThan(0);
    expect(getTrainingPotency(state)).toBeGreaterThan(1);
    expect(getTrainingRate(state)).toBeGreaterThan(1);
    expect(legacyBonus).toBeGreaterThan(normalBonus);
  });

  it("makes later levels exponentially slower", () => {
    const state = createGame();
    const earlyDuration = getTrainingDuration(state, "might");
    state.training.might.level = 10;

    expect(getTrainingDuration(state, "might")).toBeGreaterThan(earlyDuration * 10);
    expect(getNextTrainingGain(state, "might")).toBeGreaterThan(0);
  });
});
