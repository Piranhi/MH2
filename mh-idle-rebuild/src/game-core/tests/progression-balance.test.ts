import { describe, expect, it } from "vitest";
import { getBossReadiness, getHunterStats } from "../balance";
import { gameContent } from "../content/content";
import { createGame, getSnapshot, prestigeRun } from "../game";
import { gameNumber } from "../numbers";
import {
  addItem,
  equipBestItems,
  findArea,
  findMonster,
  getKillSecondsForMonster,
  unlockAreaForTest
} from "./progressionTestUtils";

describe("progression balance gates", () => {
  it("keeps area power bands ordered by tier", () => {
    for (let index = 1; index < gameContent.areas.length; index += 1) {
      const previous = gameContent.areas[index - 1];
      const current = gameContent.areas[index];

      expect(current.tier).toBeGreaterThan(previous.tier);
      expect(current.powerBand[0]).toBeGreaterThan(previous.powerBand[0]);
      expect(current.powerBand[1]).toBeGreaterThan(previous.powerBand[1]);
    }
  });

  it("keeps bosses as area gates and later regulars as real jumps", () => {
    for (const area of gameContent.areas) {
      const boss = findMonster(area.bossId);
      const regulars = area.monsterIds.map((monsterId) => findMonster(monsterId));
      const strongestRegular = Math.max(...regulars.map((monster) => monster.power));

      expect(boss.role).toBe("boss");
      expect(boss.power).toBeGreaterThan(strongestRegular);
      expect(boss.threat).toBeGreaterThan(Math.max(...regulars.map((monster) => monster.threat)));
    }

    const emberfallBoss = findMonster(findArea("emberfall-woods").bossId);
    const weakestIronrootRegular = Math.min(...findArea("ironroot-basin").monsterIds.map((monsterId) => findMonster(monsterId).power));
    const weakestMoonfenRegular = Math.min(...findArea("moonfen-ruins").monsterIds.map((monsterId) => findMonster(monsterId).power));
    const ironrootBoss = findMonster(findArea("ironroot-basin").bossId);

    expect(weakestIronrootRegular).toBeGreaterThan(emberfallBoss.power);
    expect(weakestMoonfenRegular).toBeGreaterThan(ironrootBoss.power);
  });

  it("does not let a fresh save skip into later areas or prestige", () => {
    const state = createGame();
    const snapshot = getSnapshot(state);

    expect(state.areas["emberfall-woods"].unlocked).toBe(true);
    expect(state.areas["ironroot-basin"].visible).toBe(true);
    expect(state.areas["ironroot-basin"].unlocked).toBe(false);
    expect(state.areas["moonfen-ruins"].visible).toBe(false);
    expect(snapshot.prestige.canPrestige).toBe(false);
  });

  it("requires the Moonfen capstone before a renown prestige can fire", () => {
    const state = createGame();
    state.player.renown = gameNumber(500);

    expect(getSnapshot(state).prestige.gain).toBeGreaterThan(0);
    expect(getSnapshot(state).prestige.canPrestige).toBe(false);
    expect(prestigeRun(state).player.prestige).toBe(0);

    state.areas["moonfen-ruins"].bossDefeated = true;

    expect(getSnapshot(state).prestige.canPrestige).toBe(true);
    expect(prestigeRun(state).player.prestige).toBeGreaterThan(0);
  });

  it("makes tier-appropriate loot improve farming speed", () => {
    const base = unlockAreaForTest(createGame(), "ironroot-basin");
    base.player.baseStats.attack = 72;
    base.player.baseStats.health = 420;
    base.player.baseStats.defence = 24;
    const withIronrootWeapon = equipBestItems(addItem(base, "cinderfang-axe"));
    const withIronrootArmor = equipBestItems(addItem(base, "ironroot-hauberk"));

    const baseTuskerKill = getKillSecondsForMonster(base, "ironhide-tusker");
    const weaponTuskerKill = getKillSecondsForMonster(withIronrootWeapon, "ironhide-tusker");
    const baseMatriarchReadiness = getBossReadiness(getHunterStats(base, gameContent), findMonster("stonebound-matriarch"));
    const armoredMatriarchReadiness = getBossReadiness(getHunterStats(withIronrootArmor, gameContent), findMonster("stonebound-matriarch"));

    expect(weaponTuskerKill).toBeLessThan(baseTuskerKill);
    expect(armoredMatriarchReadiness).toBeGreaterThan(baseMatriarchReadiness);
  });
});
