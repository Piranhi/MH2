import { getTrainingBonus, trainingSpecs } from "./training";
import { getActiveChallengeStatMultiplier, getChallengeStatMultiplier, isEquipmentSlotEnabled } from "./challenges";
import { floor, multiply, toFiniteNumber } from "./numbers";
import type { GameContent, GameState, MonsterSpec, StatBlock } from "./types";

export const balance = {
  searchSeconds: 4,
  defeatPauseSeconds: 1.4,
  recoverySeconds: 2,
  betweenBattleRecoveryMultiplier: 10,
  minimumRecoveryHealthPercent: 0.55,
  bossAttemptHealthPercent: 0.85,
  baseKillSeconds: 10,
  minKillSeconds: 2,
  maxKillSeconds: 120,
  monsterDamageScale: 2.25,
  offlineBankRate: 0.5,
  offlineBankRatePerLevel: 0.1,
  offlineBankRateMax: 1,
  offlineEfficiencyMaxLevel: 5,
  offlineEfficiencyBaseGold: 180,
  offlineEfficiencyCostGrowth: 2.15,
  prestigeRenownBase: 120,
  prestigeGainExponent: 0.62,
  prestigeStatBonus: 0.05,
  prestigeRewardBonus: 0.04
};

export function xpForNextLevel(level: number): number {
  return Math.floor(90 * Math.pow(level, 1.48));
}

export function getHunterStats(state: GameState, content: GameContent): StatBlock {
  const levelBonus = state.player.level - 1;
  const stats: StatBlock = {
    health: state.player.baseStats.health + levelBonus * 12,
    attack: state.player.baseStats.attack + levelBonus * 3,
    defence: state.player.baseStats.defence + levelBonus * 1.5,
    speed: state.player.baseStats.speed,
    critChance: state.player.baseStats.critChance,
    luck: state.player.baseStats.luck,
    recoveryRate: state.player.baseStats.recoveryRate
  };

  for (const training of trainingSpecs) {
    stats[training.stat] += getTrainingBonus(state, training.id);
  }

  const percentEffects: Partial<Record<keyof StatBlock, number>> = {};
  const equippedIds = Object.values(state.inventory.equipped);

  for (const instanceId of equippedIds) {
    const instance = state.inventory.items.find((item) => item.instanceId === instanceId);
    const spec = instance ? content.items.find((item) => item.id === instance.itemId) : undefined;
    if (!spec) {
      continue;
    }

    if (spec.slot && !isEquipmentSlotEnabled(state, spec.slot)) {
      continue;
    }

    for (const effect of spec.effects) {
      if (effect.stat === "goldFind" || effect.stat === "xpGain" || effect.stat === "materialFind") {
        continue;
      }

      if (effect.mode === "flat") {
        stats[effect.stat] += effect.value;
      } else {
        percentEffects[effect.stat] = (percentEffects[effect.stat] ?? 0) + effect.value;
      }
    }
  }

  for (const [stat, percent] of Object.entries(percentEffects) as [keyof StatBlock, number][]) {
    stats[stat] *= 1 + percent;
  }

  const prestigeMultiplier = getPrestigeStatMultiplier(state);
  stats.health *= prestigeMultiplier;
  stats.attack *= prestigeMultiplier;
  stats.defence *= prestigeMultiplier;
  stats.recoveryRate *= getPrestigeRewardMultiplier(state);
  stats.attack *= getChallengeStatMultiplier(state, "attack") * getActiveChallengeStatMultiplier(state, "attack");
  stats.recoveryRate *= getChallengeStatMultiplier(state, "recoveryRate") * getActiveChallengeStatMultiplier(state, "recoveryRate");

  return {
    health: round(stats.health),
    attack: round(stats.attack),
    defence: round(stats.defence),
    speed: round(Math.max(0.4, stats.speed)),
    critChance: round(Math.max(0, stats.critChance)),
    luck: round(stats.luck),
    recoveryRate: roundTo(Math.max(0, stats.recoveryRate), 4)
  };
}

export function getRewardModifier(
  state: GameState,
  content: GameContent,
  stat: "goldFind" | "xpGain" | "materialFind"
): number {
  let total = getPrestigeRewardMultiplier(state);

  for (const instanceId of Object.values(state.inventory.equipped)) {
    const instance = state.inventory.items.find((item) => item.instanceId === instanceId);
    const spec = instance ? content.items.find((item) => item.id === instance.itemId) : undefined;
    if (!spec) {
      continue;
    }

    for (const effect of spec.effects) {
      if (effect.stat === stat) {
        total += effect.value;
      }
    }
  }

  return total;
}

export function getPrestigeGain(state: GameState): number {
  const renown = toFiniteNumber(state.player.renown);

  if (renown < balance.prestigeRenownBase) {
    return 0;
  }

  return Math.floor(Math.pow(renown / balance.prestigeRenownBase, balance.prestigeGainExponent));
}

export function getPrestigeRenownRequirement(gain: number): ReturnType<typeof floor> {
  const targetGain = Math.max(1, gain);
  return floor(multiply(balance.prestigeRenownBase, Math.pow(targetGain, 1 / balance.prestigeGainExponent)));
}

export function getPrestigeStatMultiplier(state: GameState): number {
  return round(1 + state.player.prestige * balance.prestigeStatBonus);
}

export function getPrestigeRewardMultiplier(state: GameState): number {
  return round(1 + state.player.prestige * balance.prestigeRewardBonus);
}

export function getHunterPower(stats: StatBlock): number {
  const critFactor = 1 + stats.critChance * 0.75;
  const speedFactor = Math.max(0.4, stats.speed);
  return round(stats.attack * 4 * speedFactor * critFactor);
}

export function getHunterSurvival(stats: StatBlock): number {
  const defenceFactor = 1 + stats.defence / 100;
  return round(stats.health * defenceFactor);
}

export function getEffectivePower(stats: StatBlock, monster: MonsterSpec): number {
  const power = getHunterPower(stats);
  const survival = getHunterSurvival(stats);
  const survivalGate = clamp(survival / monster.threat, 0.35, 1.25);
  return round(power * survivalGate);
}

export function getKillSeconds(stats: StatBlock, monster: MonsterSpec): number {
  return round(clamp(getMonsterMaxHealth(monster) / getHunterDamagePerSecond(stats, monster), balance.minKillSeconds, balance.maxKillSeconds));
}

export function getBossReadiness(stats: StatBlock, boss: MonsterSpec): number {
  const effectivePower = getEffectivePower(stats, boss);
  return round(clamp(effectivePower / boss.power, 0, 1.5));
}

export function canDefeatBoss(stats: StatBlock, boss: MonsterSpec): boolean {
  return getBossReadiness(stats, boss) >= 0.78;
}

export function getHunterCombatHealth(stats: StatBlock): number {
  return getHunterSurvival(stats);
}

export function getHunterRecoveryPerSecond(stats: StatBlock, multiplier = 1): number {
  return round(getHunterCombatHealth(stats) * stats.recoveryRate * multiplier);
}

export function getMonsterMaxHealth(monster: MonsterSpec): number {
  return monster.power;
}

export function getHunterDamagePerSecond(stats: StatBlock, monster: MonsterSpec): number {
  return round(Math.max(0.1, getEffectivePower(stats, monster) / balance.baseKillSeconds));
}

export function getMonsterDamagePerSecond(monster: MonsterSpec): number {
  return round(Math.max(0.1, monster.threat / (balance.baseKillSeconds * balance.monsterDamageScale)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
