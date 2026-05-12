import { describe, expect, it } from "vitest";
import { getHunterStats } from "../balance";
import { gameContent } from "../content/content";
import { buyTraining, createGame, getSnapshot, tick } from "../game";
import { getAffordableTrainingPurchases, getTrainingBonus, getTrainingCost, getTrainingMilestoneBonus, getTrainingPotency, getTrainingPurchaseCost } from "../training";
import { gameNumber } from "../numbers";

describe("hunter training", () => {
  it("spends gold and increases a training level", () => {
    const state = tick(createGame(), 600);
    const cost = getTrainingCost(state, "might");
    const trained = buyTraining(state, "might");

    expect(trained.training.might.level).toBe(state.training.might.level + 1);
    expect(trained.player.gold.eq(state.player.gold.minus(cost))).toBe(true);
  });

  it("does not buy training when gold is too low", () => {
    const state = createGame();
    const trained = buyTraining(state, "might");

    expect(trained.training.might.level).toBe(0);
    expect(trained.player.gold.eq(0)).toBe(true);
  });

  it("feeds training bonuses into combat stats and boss readiness", () => {
    const state = tick(createGame(), 600);
    const trained = buyTraining(state, "might");

    expect(getHunterStats(trained, gameContent).attack).toBeGreaterThan(getHunterStats(state, gameContent).attack);
    expect(getSnapshot(trained).bossReadiness).toBeGreaterThan(getSnapshot(state).bossReadiness);
  });

  it("supports bulk purchases for late-run catchup", () => {
    const state = createGame();
    state.player.gold = gameNumber(10000);

    const affordable = getAffordableTrainingPurchases(state, "might", 10);
    const cost = getTrainingPurchaseCost(state, "might", affordable);
    const trained = buyTraining(state, "might", 10);

    expect(affordable).toBe(10);
    expect(cost.gt(getTrainingCost(state, "might"))).toBe(true);
    expect(trained.training.might.level).toBe(10);
    expect(trained.player.gold.lt(state.player.gold)).toBe(true);
  });

  it("keeps training relevant through milestones and legacy potency", () => {
    const state = createGame();
    state.training.might.level = 10;
    const normalBonus = getTrainingBonus(state, "might");

    state.player.prestige = 2;
    const legacyBonus = getTrainingBonus(state, "might");

    expect(getTrainingMilestoneBonus(10)).toBeGreaterThan(0);
    expect(getTrainingPotency(state)).toBeGreaterThan(1);
    expect(legacyBonus).toBeGreaterThan(normalBonus);
  });
});
