import { describe, expect, it } from "vitest";
import { advanceRealtime, attemptBoss, bankOfflineTime, buyTimeUpgrade, createGame, getOfflineBankRate, getSnapshot, prestigeRun, selectArea, setTimeSpeed, simulateOffline, spendBankedTime, tick } from "../game";
import { gameContent } from "../content/content";
import { gameNumber } from "../numbers";
import { serializeGame, parseGameSave } from "../save";

const emberfall = gameContent.areas.find((area) => area.id === "emberfall-woods")!;
const ironroot = gameContent.areas.find((area) => area.id === "ironroot-basin")!;

describe("headless hunt simulation", () => {
  it("simulates ten minutes of hunting from a fresh save", () => {
    const state = tick(createGame(), 600);

    expect(state.hunt.huntsCompleted).toBeGreaterThan(0);
    expect(state.player.gold.gt(0)).toBe(true);
    expect(state.player.renown.gt(0)).toBe(true);
    expect(state.areas["emberfall-woods"].bossUnlocked).toBe(true);
    expect(state.areas["emberfall-woods"].bossDefeated).toBe(false);
  });

  it("keeps save/load deterministic", () => {
    const state = tick(createGame(), 600);
    const loaded = parseGameSave(serializeGame(state));

    expect(loaded).toEqual(state);
  });

  it("tracks active combat while a monster fight is underway", () => {
    const state = tick(createGame(), 5);
    const snapshot = getSnapshot(state);

    expect(state.hunt.phase).toBe("fighting");
    expect(snapshot.currentTarget?.role).toBe("regular");
    expect(snapshot.combat?.enemyHp).toBeLessThan(snapshot.combat?.enemyMaxHp ?? 0);
    expect(snapshot.combat?.hunterHp).toBeLessThan(snapshot.combat?.hunterMaxHp ?? 0);
  });

  it("keeps a defeated monster visible briefly before recovering", () => {
    const state = tick(createGame(), 10);
    const snapshot = getSnapshot(state);

    expect(state.hunt.phase).toBe("defeated");
    expect(snapshot.currentTarget?.id).toBe("mossfang-stalker");
    expect(snapshot.combat?.enemyHp).toBe(0);
    expect(snapshot.lastReward?.monsterId).toBe("mossfang-stalker");
    expect(snapshot.lastReward?.gold.gt(0)).toBe(true);
    expect(snapshot.lastReward?.xp.gt(0)).toBe(true);
    expect(snapshot.lastReward?.progress).toBeGreaterThan(0);
    expect(state.hunt.huntsCompleted).toBe(1);
  });

  it("keeps hunter HP persistent instead of resetting each battle", () => {
    const state = createGame();
    state.player.baseStats.recoveryRate = 0;

    const afterFirstKill = tick(state, 10);
    const woundedHp = afterFirstKill.hunt.hunterHp;
    const nextFight = tick(afterFirstKill, 8);
    const snapshot = getSnapshot(nextFight);

    expect(woundedHp).toBeGreaterThan(0);
    expect(woundedHp).toBeLessThan(snapshot.survival);
    expect(nextFight.hunt.phase).toBe("fighting");
    expect(snapshot.combat?.hunterHp).toBeLessThan(woundedHp);
  });

  it("heals continuously and much faster between battles", () => {
    const afterFirstKill = tick(createGame(), 10);
    const woundedHp = afterFirstKill.hunt.hunterHp;
    const healing = tick(afterFirstKill, 1);

    expect(woundedHp).toBeLessThan(getSnapshot(afterFirstKill).survival);
    expect(healing.hunt.hunterHp).toBeGreaterThan(woundedHp);
    expect(getSnapshot(healing).betweenBattleRecoveryPerSecond).toBeGreaterThan(getSnapshot(healing).recoveryPerSecond);
  });

  it("stays in recovery until hunter HP reaches the safe hunting floor", () => {
    const state = createGame();
    state.hunt.phase = "recovering";
    state.hunt.phaseEndsAt = 2;
    state.hunt.hunterHp = 10;

    const stillRecovering = tick(state, 2.1);

    expect(stillRecovering.hunt.phase).toBe("recovering");
    expect(stillRecovering.hunt.targetMonsterId).toBeUndefined();
    expect(stillRecovering.hunt.hunterHp).toBeGreaterThan(10);
  });

  it("blocks boss attempts while the hunter is badly wounded", () => {
    const farmed = createBossReadyState("emberfall-woods");
    farmed.hunt.hunterHp = 100;

    const attempted = attemptBoss(farmed);

    expect(attempted.hunt.phase).toBe("recovering");
    expect(attempted.hunt.targetMonsterId).toBeUndefined();
    expect(attempted.areas["emberfall-woods"].bossDefeated).toBe(false);
  });

  it("uses manual boss clears to unlock the next area", () => {
    const farmed = createBossReadyState("emberfall-woods");
    const attempted = attemptBoss(farmed);
    const cleared = tick(attempted, 60);

    expect(attempted.hunt.targetMonsterId).toBe("elder-bramblemaw");
    expect(cleared.areas["emberfall-woods"].bossDefeated).toBe(true);
    expect(cleared.areas["ironroot-basin"].visible).toBe(true);
    expect(cleared.areas["ironroot-basin"].unlocked).toBe(true);
    expect(cleared.areas["moonfen-ruins"].visible).toBe(true);
    expect(cleared.areas["moonfen-ruins"].unlocked).toBe(false);
    expect(selectArea(cleared, "ironroot-basin").hunt.selectedAreaId).toBe("ironroot-basin");
  });

  it("can auto advance to the next area after a boss clear when enabled", () => {
    const farmed = createBossReadyState("emberfall-woods");
    farmed.unlocks.autoAdvanceArea = true;
    const attempted = attemptBoss(farmed);
    const advanced = tick(attempted, 60);

    expect(advanced.areas["emberfall-woods"].bossDefeated).toBe(true);
    expect(advanced.areas["ironroot-basin"].unlocked).toBe(true);
    expect(advanced.hunt.selectedAreaId).toBe("ironroot-basin");
  });

  it("unlocks and uses auto-boss after the Matriarch gate", () => {
    const state = createGame(100);
    state.hunt.selectedAreaId = "ironroot-basin";
    state.player.baseStats.attack = 600;
    state.player.baseStats.health = 5000;
    state.hunt.hunterHp = getSnapshot(state).survival;
    state.areas["ironroot-basin"] = {
      ...state.areas["ironroot-basin"],
      visible: true,
      unlocked: true,
      progress: ironroot.progressRequired,
      bossUnlocked: true
    };

    const cleared = tick(attemptBoss(state), 60);

    expect(cleared.areas["ironroot-basin"].bossDefeated).toBe(true);
    expect(cleared.unlocks.autoBoss).toBe(true);

    const repeat = createGame(200);
    repeat.unlocks.autoBoss = true;
    repeat.player.baseStats.attack = 600;
    repeat.player.baseStats.health = 5000;
    repeat.hunt.hunterHp = getSnapshot(repeat).survival;
    repeat.areas["emberfall-woods"].progress = emberfall.progressRequired;
    repeat.areas["emberfall-woods"].bossUnlocked = true;
    const autoAttempted = tick(repeat, 5);

    expect(autoAttempted.hunt.targetMonsterId).toBe("elder-bramblemaw");
  });

  it("resets the run for prestige power once enough renown is earned", () => {
    const state = createGame(100);
    const freshStats = getSnapshot(state).stats;
    state.player.renown = gameNumber(130);
    state.player.gold = gameNumber(500);
    state.training.might.level = 3;
    state.areas["ironroot-basin"].unlocked = true;
    state.areas["moonfen-ruins"].bossDefeated = true;

    const prestiged = prestigeRun(state);
    const snapshot = getSnapshot(prestiged);

    expect(prestiged.player.prestige).toBe(1);
    expect(prestiged.player.renown.eq(0)).toBe(true);
    expect(prestiged.player.gold.eq(0)).toBe(true);
    expect(prestiged.training.might.level).toBe(0);
    expect(prestiged.areas["ironroot-basin"].unlocked).toBe(false);
    expect(snapshot.stats.attack).toBeGreaterThan(freshStats.attack);
    expect(snapshot.prestige.statMultiplier).toBe(1.05);
  });

  it("does not allow the first prestige before the Moonfen capstone", () => {
    const state = createGame(100);
    state.player.renown = gameNumber(500);

    const snapshot = getSnapshot(state);
    const blocked = prestigeRun(state);

    expect(snapshot.prestige.gain).toBeGreaterThan(0);
    expect(snapshot.prestige.canPrestige).toBe(false);
    expect(blocked.player.prestige).toBe(0);
    expect(blocked.player.renown.eq(500)).toBe(true);
  });

  it("does not unlock later areas from a fresh save", () => {
    const state = createGame();

    expect(state.areas["emberfall-woods"].visible).toBe(true);
    expect(state.areas["ironroot-basin"].visible).toBe(true);
    expect(state.areas["ironroot-basin"].unlocked).toBe(false);
    expect(selectArea(state, "ironroot-basin").hunt.selectedAreaId).toBe("emberfall-woods");
    expect(state.areas["moonfen-ruins"].visible).toBe(false);
    expect(state.areas["moonfen-ruins"].unlocked).toBe(false);
    expect(getSnapshot(state).bossReadiness).toBeLessThan(1);
  });

  it("banks offline time without silently simulating rewards", () => {
    const initial = createGame(100);
    const offline = simulateOffline(initial, 10 * 3600);

    expect(offline.state.hunt.huntsCompleted).toBe(0);
    expect(offline.state.player.gold.eq(0)).toBe(true);
    expect(offline.state.time.bankedSeconds).toBe(5 * 3600);
    expect(offline.summary.bankedSeconds).toBe(5 * 3600);
  });

  it("spends banked time through speed boosts and chunk warps", () => {
    const banked = bankOfflineTime(createGame(100), 100 + 120);
    const spedUp = setTimeSpeed(banked, 3);
    const advanced = advanceRealtime(spedUp, 1);
    const warped = spendBankedTime(advanced, 30);

    expect(banked.time.bankedSeconds).toBe(60);
    expect(advanced.updatedAt - banked.updatedAt).toBe(3);
    expect(advanced.time.bankedSeconds).toBe(58);
    expect(warped.updatedAt - advanced.updatedAt).toBe(30);
    expect(warped.time.bankedSeconds).toBe(28);
  });

  it("upgrades offline bank efficiency", () => {
    const state = createGame(100);
    state.player.gold = gameNumber(1000);
    const upgraded = buyTimeUpgrade(state, "offlineEfficiency");
    const offline = bankOfflineTime(upgraded, 100 + 100);

    expect(upgraded.time.offlineEfficiencyLevel).toBe(1);
    expect(getOfflineBankRate(upgraded)).toBe(0.6);
    expect(offline.time.bankedSeconds).toBe(60);
  });
});

function createBossReadyState(areaId: "emberfall-woods") {
  const state = createGame();
  const area = gameContent.areas.find((entry) => entry.id === areaId)!;

  state.player.baseStats.attack = 180;
  state.player.baseStats.health = 1200;
  state.hunt.hunterHp = getSnapshot(state).survival;
  state.areas[area.id].progress = area.progressRequired;
  state.areas[area.id].bossUnlocked = true;

  return state;
}
