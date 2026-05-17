import {
  balance,
  getBossReadiness,
  getHunterCombatHealth,
  getHunterDamagePerSecond,
  getHunterPower,
  getHunterRecoveryPerSecond,
  getHunterStats,
  getHunterSurvival,
  getKillSeconds,
  getMonsterDamagePerSecond,
  getMonsterMaxHealth,
  getPrestigeGain,
  getPrestigeRenownRequirement,
  getPrestigeRewardMultiplier,
  getPrestigeStatMultiplier,
  getRewardModifier,
  xpForNextLevel
} from "./balance";
import { gameContent } from "./content/content";
import {
  achievementSpecs,
  createAchievementRecords,
  getAchievementRewardMultiplier,
  getAchievementStatMultiplier,
  getCompletedAchievementCount,
  reviveAchievementRecords,
  refreshAchievements
} from "./achievements";
import {
  createChallengeRecords,
  getChallengeCompletionLevel,
  getChallengeElapsedSeconds,
  getChallengeProgressMultiplier,
  getChallengeSpec,
  isChallengeUnlocked,
  isChallengeSystemEnabled,
  reviveChallengeRecords
} from "./challenges";
import { add, floor, gameNumber, greaterThanOrEqual, multiply, subtract } from "./numbers";
import { advanceTrainingProgress, createTrainingState, getTrainingSpec } from "./training";
import { getFeatureUnlocks, getUnlockNotices } from "./unlocks";
import { getItemGearScoreTotal, getItemLevel, getItemSellValue, maxItemLevel } from "./items";
import type { AreaSpec, AreaState, ChallengeLevel, GameContent, GameSnapshot, GameState, InventoryItem, LootEntry, MonsterSpec, OfflineSummary, RewardSummary, SettlementState, SpeedMultiplier, TimeState, TimeUpgradeId, TrainingId } from "./types";

const initialAreaId = "emberfall-woods";
const timeEpsilon = 0.000001;
const allowedSpeedMultipliers: SpeedMultiplier[] = [1, 2, 3];

export function createGame(now = 0): GameState {
  return {
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    rngSeed: 42,
    player: {
      level: 1,
      xp: gameNumber(0),
      gold: gameNumber(0),
      renown: gameNumber(0),
      prestige: 0,
      baseStats: {
        health: 100,
        attack: 18,
        defence: 10,
        speed: 1,
        critChance: 0.05,
        luck: 0,
        recoveryRate: 0.003
      }
    },
    hunt: {
      selectedAreaId: initialAreaId,
      phase: "searching",
      phaseEndsAt: now + balance.searchSeconds,
      hunterHp: 110,
      huntsCompleted: 0,
      activeSeconds: 0,
      monsterCycle: {}
    },
    areas: createInitialAreaStates(gameContent),
    inventory: {
      items: [
        {
          instanceId: "starter-blade-1",
          itemId: "scuffed-hunter-blade",
          acquiredAt: now,
          level: 1,
          locked: false
        }
      ],
      equipped: {
        weapon: "starter-blade-1"
      },
      autoSellDuplicates: false
    },
    training: createTrainingState(),
    resources: {},
    time: createTimeState(now),
    achievements: {
      records: createAchievementRecords(),
      secretTokens: 0
    },
    challenges: {
      records: createChallengeRecords()
    },
    settlement: createSettlementState(),
    unlocks: {
      autoBoss: false,
      autoAdvanceArea: false,
      autoSellDuplicates: false
    }
  };
}

export function tick(input: GameState, seconds: number, content = gameContent): GameState {
  const state = cloneState(input);
  const elapsedSeconds = Math.max(0, seconds);
  const targetTime = state.updatedAt + elapsedSeconds;
  state.hunt.activeSeconds += elapsedSeconds;
  advanceTrainingProgress(state, elapsedSeconds);

  while (state.updatedAt < targetTime - timeEpsilon) {
    if (state.hunt.phase === "fighting") {
      advanceFight(state, targetTime - state.updatedAt, content);
      continue;
    }

    if (state.hunt.phaseEndsAt > targetTime) {
      recoverHunter(state, targetTime - state.updatedAt, content, getPassiveRecoveryMultiplier(state));
      state.updatedAt = targetTime;
      break;
    }

    recoverHunter(state, state.hunt.phaseEndsAt - state.updatedAt, content, getPassiveRecoveryMultiplier(state));
    state.updatedAt = Math.max(state.updatedAt, state.hunt.phaseEndsAt);
    advancePhase(state, content);
  }

  return refreshAchievements(state);
}

export function advanceRealtime(input: GameState, realSeconds: number, content = gameContent): GameState {
  const state = cloneState(input);
  const elapsedSeconds = Math.max(0, realSeconds);
  const speedMultiplier = normalizeSpeedMultiplier(state.time.speedMultiplier);
  const requestedBankedSeconds = (speedMultiplier - 1) * elapsedSeconds;
  const spentBankedSeconds = Math.min(state.time.bankedSeconds, requestedBankedSeconds);
  const advanced = tick(state, elapsedSeconds + spentBankedSeconds, content);

  const achievementBankedSeconds = Math.max(0, advanced.time.bankedSeconds - state.time.bankedSeconds);
  advanced.time.bankedSeconds = roundTime(Math.max(0, state.time.bankedSeconds + achievementBankedSeconds - spentBankedSeconds));
  advanced.time.speedMultiplier = spentBankedSeconds < requestedBankedSeconds ? 1 : speedMultiplier;
  return refreshAchievements(advanced);
}

export function setTimeSpeed(input: GameState, speedMultiplier: SpeedMultiplier): GameState {
  const state = cloneState(input);
  if (!isChallengeSystemEnabled(state, "bankedTime")) {
    state.time.speedMultiplier = 1;
    return state;
  }

  const normalizedSpeed = normalizeSpeedMultiplier(speedMultiplier);
  state.time.speedMultiplier = normalizedSpeed > 1 && state.time.bankedSeconds <= 0 ? 1 : normalizedSpeed;
  return state;
}

export function spendBankedTime(input: GameState, seconds: number, content = gameContent): GameState {
  const state = cloneState(input);
  if (!isChallengeSystemEnabled(state, "bankedTime")) {
    state.time.speedMultiplier = 1;
    return state;
  }

  const spentSeconds = Math.min(state.time.bankedSeconds, Math.max(0, seconds));

  if (spentSeconds <= 0) {
    return state;
  }

  const advanced = tick(state, spentSeconds, content);
  const achievementBankedSeconds = Math.max(0, advanced.time.bankedSeconds - state.time.bankedSeconds);
  advanced.time.bankedSeconds = roundTime(Math.max(0, state.time.bankedSeconds + achievementBankedSeconds - spentSeconds));
  return refreshAchievements(advanced);
}

export function bankOfflineTime(input: GameState, now = Date.now() / 1000): GameState {
  const state = cloneState(input);
  const offlineSeconds = Math.max(0, now - state.time.lastSeenAt);
  const bankedSeconds = offlineSeconds * getOfflineBankRate(state);

  state.time.bankedSeconds = roundTime(state.time.bankedSeconds + bankedSeconds);
  state.time.lastSeenAt = now;
  state.time.lastOfflineSeconds = offlineSeconds;
  state.time.lastBankedSeconds = bankedSeconds;
  return state;
}

export function markSeen(input: GameState, now = Date.now() / 1000): GameState {
  const state = cloneState(input);
  state.time.lastSeenAt = now;
  return state;
}

export function getOfflineBankRate(state: GameState): number {
  return Math.min(
    balance.offlineBankRateMax,
    balance.offlineBankRate + state.time.offlineEfficiencyLevel * balance.offlineBankRatePerLevel
  );
}

export function getTimeUpgradeCost(state: GameState, upgradeId: TimeUpgradeId): ReturnType<typeof gameNumber> {
  if (upgradeId === "offlineEfficiency") {
    return floor(multiply(balance.offlineEfficiencyBaseGold, Math.pow(balance.offlineEfficiencyCostGrowth, state.time.offlineEfficiencyLevel)));
  }

  return gameNumber(0);
}

export function canBuyTimeUpgrade(state: GameState, upgradeId: TimeUpgradeId): boolean {
  if (upgradeId === "offlineEfficiency" && state.time.offlineEfficiencyLevel >= balance.offlineEfficiencyMaxLevel) {
    return false;
  }

  return greaterThanOrEqual(state.player.gold, getTimeUpgradeCost(state, upgradeId));
}

export function buyTimeUpgrade(input: GameState, upgradeId: TimeUpgradeId): GameState {
  const state = cloneState(input);

  if (!canBuyTimeUpgrade(state, upgradeId)) {
    return refreshAchievements(state);
  }

  const cost = getTimeUpgradeCost(state, upgradeId);
  state.player.gold = subtract(state.player.gold, cost);

  if (upgradeId === "offlineEfficiency") {
    state.time.offlineEfficiencyLevel += 1;
  }

  return refreshAchievements(state);
}

export function selectArea(input: GameState, areaId: string, content = gameContent): GameState {
  const state = cloneState(input);
  const area = getArea(content, areaId);

  if (!state.areas[area.id]?.visible || !state.areas[area.id]?.unlocked) {
    return refreshAchievements(state);
  }

  moveToArea(state, area.id);
  return refreshAchievements(state);
}

export function attemptBoss(input: GameState, content = gameContent): GameState {
  const state = cloneState(input);
  const area = getArea(content, state.hunt.selectedAreaId);
  const areaState = state.areas[area.id];
  const boss = getMonster(content, area.bossId);

  if (!areaState.bossUnlocked || areaState.bossDefeated) {
    return refreshAchievements(state);
  }

  if (state.hunt.phase === "fighting" && state.hunt.targetMonsterId === boss.id) {
    return refreshAchievements(state);
  }

  if (!canAttemptBossAtCurrentHealth(state, content)) {
    state.hunt.phase = "recovering";
    state.hunt.targetMonsterId = undefined;
    state.hunt.combat = undefined;
    state.hunt.phaseEndsAt = state.updatedAt + balance.recoverySeconds;
    return state;
  }

  startFight(state, boss, content);

  return state;
}

export function startChallenge(input: GameState, challengeId: string, content = gameContent): GameState {
  const state = cloneState(input);
  const challenge = getChallengeSpec(challengeId);

  if (!challenge || state.challenges.active || !isChallengeUnlocked(state, challenge)) {
    return refreshAchievements(state);
  }

  const next = createGame(state.updatedAt);
  next.createdAt = state.createdAt;
  next.rngSeed = state.rngSeed;
  next.player.prestige = state.player.prestige;
  next.challenges = {
    records: state.challenges.records,
    active: {
      challengeId: challenge.id,
      startedAt: state.updatedAt
    }
  };
  next.achievements = {
    records: state.achievements.records,
    secretTokens: state.achievements.secretTokens
  };
  next.unlocks = {
    ...next.unlocks,
    autoBoss: isChallengeSystemEnabled(next, "autoBoss") ? state.unlocks.autoBoss : false,
    autoAdvanceArea: isChallengeSystemEnabled(next, "autoAdvance") ? state.unlocks.autoAdvanceArea : false,
    autoSellDuplicates: state.unlocks.autoSellDuplicates
  };
  next.inventory.autoSellDuplicates = state.unlocks.autoSellDuplicates && state.inventory.autoSellDuplicates;
  next.time = {
    ...state.time,
    speedMultiplier: 1,
    lastSeenAt: state.updatedAt,
    lastOfflineSeconds: 0,
    lastBankedSeconds: 0
  };
  next.hunt.hunterHp = getHunterCombatHealth(getHunterStats(next, content));

  return refreshAchievements(next);
}

export function abandonChallenge(input: GameState): GameState {
  const state = cloneState(input);

  if (!state.challenges.active) {
    return refreshAchievements(state);
  }

  const next = createGame(state.updatedAt);
  next.createdAt = state.createdAt;
  next.rngSeed = state.rngSeed;
  next.player.prestige = state.player.prestige;
  next.challenges = {
    records: state.challenges.records
  };
  next.achievements = {
    records: state.achievements.records,
    secretTokens: state.achievements.secretTokens
  };
  next.unlocks = {
    ...next.unlocks,
    ...state.unlocks
  };
  next.time = {
    ...state.time,
    speedMultiplier: state.time.bankedSeconds > 0 ? state.time.speedMultiplier : 1,
    lastSeenAt: state.updatedAt,
    lastOfflineSeconds: 0,
    lastBankedSeconds: 0
  };

  return refreshAchievements(next);
}

export function prestigeRun(input: GameState): GameState {
  const state = cloneState(input);
  const prestigeGain = getPrestigeGain(state);

  if (!canPrestigeRun(state)) {
    return refreshAchievements(state);
  }

  const next = createGame(state.updatedAt);
  next.createdAt = state.createdAt;
  next.rngSeed = state.rngSeed;
  next.player.prestige = state.player.prestige + prestigeGain;
  next.settlement = advanceSettlementForPrestige(state.settlement, next.player.prestige, prestigeGain);
  next.unlocks = {
    ...next.unlocks,
    ...state.unlocks
  };
  next.time = {
    ...state.time,
    speedMultiplier: state.time.bankedSeconds > 0 ? state.time.speedMultiplier : 1,
    lastSeenAt: state.updatedAt,
    lastOfflineSeconds: 0,
    lastBankedSeconds: 0
  };
  next.hunt.hunterHp = getHunterCombatHealth(getHunterStats(next, gameContent));
  next.challenges = {
    records: state.challenges.records
  };
  next.achievements = {
    records: state.achievements.records,
    secretTokens: state.achievements.secretTokens
  };

  return refreshAchievements(next);
}

export function getSettlementBonuses(settlement: SettlementState): { trainingRate: number; goldFind: number; materialFind: number } {
  return {
    trainingRate: 1 + settlement.seasonsPassed * 0.01,
    goldFind: 1 + settlement.stores * 0.0025,
    materialFind: 1 + settlement.outpostScouts * 0.003
  };
}

export function canPrestigeRun(state: GameState, content = gameContent): boolean {
  return getPrestigeGain(state) > 0 && hasPrestigeCapstoneCleared(state, content);
}

export function equipItem(input: GameState, instanceId: string, content = gameContent): GameState {
  const state = cloneState(input);
  const instance = state.inventory.items.find((item) => item.instanceId === instanceId);
  const spec = instance ? content.items.find((item) => item.id === instance.itemId) : undefined;

  if (spec?.slot) {
    state.inventory.equipped[spec.slot] = instanceId;
  }

  return refreshAchievements(state);
}

export function sellItem(input: GameState, instanceId: string, content = gameContent): GameState {
  const state = cloneState(input);
  const itemIndex = state.inventory.items.findIndex((item) => item.instanceId === instanceId);
  const instance = state.inventory.items[itemIndex];
  const spec = instance ? content.items.find((item) => item.id === instance.itemId) : undefined;

  if (itemIndex < 0 || !spec || instance.locked || Object.values(state.inventory.equipped).includes(instanceId)) {
    return refreshAchievements(state);
  }

  state.inventory.items.splice(itemIndex, 1);
  state.player.gold = add(state.player.gold, gameNumber(getItemSellValue(spec, instance)));

  return refreshAchievements(state);
}

export function mergeItem(input: GameState, targetInstanceId: string, sourceInstanceId: string): GameState {
  const state = cloneState(input);

  if (targetInstanceId === sourceInstanceId || Object.values(state.inventory.equipped).includes(sourceInstanceId)) {
    return refreshAchievements(state);
  }

  const target = state.inventory.items.find((item) => item.instanceId === targetInstanceId);
  const sourceIndex = state.inventory.items.findIndex((item) => item.instanceId === sourceInstanceId);
  const source = state.inventory.items[sourceIndex];

  if (!target || !source || source.locked || target.itemId !== source.itemId || getItemLevel(target) >= maxItemLevel || getItemLevel(source) >= maxItemLevel) {
    return refreshAchievements(state);
  }

  target.level = Math.min(maxItemLevel, getItemLevel(target) + getItemLevel(source));
  state.inventory.items.splice(sourceIndex, 1);

  return refreshAchievements(state);
}

export function setItemLocked(input: GameState, instanceId: string, locked: boolean): GameState {
  const state = cloneState(input);
  const item = state.inventory.items.find((entry) => entry.instanceId === instanceId);

  if (item) {
    item.locked = locked;
  }

  return refreshAchievements(state);
}

export function setAutoSellDuplicates(input: GameState, enabled: boolean): GameState {
  const state = cloneState(input);
  state.inventory.autoSellDuplicates = state.unlocks.autoSellDuplicates ? enabled : false;
  return refreshAchievements(state);
}

export function setActiveTraining(input: GameState, trainingId: TrainingId): GameState {
  const state = cloneState(input);
  getTrainingSpec(trainingId);
  state.activeTrainingId = trainingId;
  return refreshAchievements(state);
}

export function stopActiveTraining(input: GameState): GameState {
  const state = cloneState(input);
  state.activeTrainingId = undefined;
  return refreshAchievements(state);
}

export function getSnapshot(state: GameState, content = gameContent): GameSnapshot {
  const currentArea = getArea(content, state.hunt.selectedAreaId);
  const boss = getMonster(content, currentArea.bossId);
  const currentTarget = state.hunt.targetMonsterId ? getMonster(content, state.hunt.targetMonsterId) : undefined;
  const stats = getHunterStats(state, content);
  const gearScore = getItemGearScoreTotal(state.inventory.items, content.items, state.inventory.equipped);
  const combat = getCombatSnapshot(state, stats, currentTarget);
  const power = getHunterPower(stats);
  const survival = getHunterSurvival(stats);
  const hunterHp = getCurrentHunterHp(state, stats);
  const recoveryPerSecond = getHunterRecoveryPerSecond(stats);
  const betweenBattleRecoveryPerSecond = getHunterRecoveryPerSecond(stats, balance.betweenBattleRecoveryMultiplier);
  const previewMonster = currentTarget ?? getMonster(content, currentArea.monsterIds[0]);
  const cycleSeconds = balance.searchSeconds + getKillSeconds(stats, previewMonster) + balance.defeatPauseSeconds + balance.recoverySeconds;
  const huntsPerHour = 3600 / cycleSeconds;
  const xpModifier = getRewardModifier(state, content, "xpGain");
  const goldModifier = getRewardModifier(state, content, "goldFind");
  const materialModifier = getRewardModifier(state, content, "materialFind");
  const features = getFeatureUnlocks(state, currentArea);
  const prestigeGain = getPrestigeGain(state);
  const capstoneCleared = hasPrestigeCapstoneCleared(state, content);
  const visibleAchievements = achievementSpecs.filter((achievement) => !achievement.secret);
  const secretAchievements = achievementSpecs.filter((achievement) => achievement.secret);

  return {
    state,
    currentArea,
    currentTarget,
    lastReward: state.hunt.lastReward,
    combat,
    boss,
    stats,
    gearScore,
    power,
    survival,
    hunterHp,
    hunterHealthPercent: Math.max(0, Math.min(100, (hunterHp / survival) * 100)),
    recoveryPerSecond,
    betweenBattleRecoveryPerSecond,
    bossReadiness: getBossReadiness(stats, boss),
    prestige: {
      canPrestige: prestigeGain > 0 && capstoneCleared,
      capstoneCleared,
      gain: prestigeGain,
      nextRenown: getPrestigeRenownRequirement(prestigeGain + 1),
      statMultiplier: getPrestigeStatMultiplier(state),
      rewardMultiplier: getPrestigeRewardMultiplier(state)
    },
    achievements: {
      completed: getCompletedAchievementCount(state),
      visibleCompleted: visibleAchievements.filter((achievement) => state.achievements.records[achievement.id]?.completedAt !== undefined).length,
      visibleTotal: visibleAchievements.length,
      secretCompleted: secretAchievements.filter((achievement) => state.achievements.records[achievement.id]?.completedAt !== undefined).length,
      secretTotal: secretAchievements.length,
      secretTokens: state.achievements.secretTokens,
      statMultiplier: getAchievementStatMultiplier(state),
      rewardMultiplier: getAchievementRewardMultiplier(state)
    },
    features,
    unlockNotices: getUnlockNotices(features),
    rates: {
      huntsPerHour,
      xpPerHour: multiply(previewMonster.xp, huntsPerHour * xpModifier),
      goldPerHour: multiply(previewMonster.gold, huntsPerHour * goldModifier),
      renownPerHour: multiply(previewMonster.renown, huntsPerHour),
      materialsPerHour: multiply(huntsPerHour, materialModifier)
    }
  };
}

export function simulateOffline(input: GameState, seconds: number): { state: GameState; summary: OfflineSummary } {
  const state = cloneState(input);
  const beforeBankedSeconds = state.time.bankedSeconds;
  const after = bankOfflineTime(state, state.time.lastSeenAt + Math.max(0, seconds));
  const bankedSeconds = after.time.bankedSeconds - beforeBankedSeconds;

  return {
    state: after,
    summary: {
      seconds,
      bankedSeconds,
      huntsCompleted: 0,
      xp: gameNumber(0),
      gold: gameNumber(0),
      renown: gameNumber(0),
      resources: {},
      itemIds: []
    }
  };
}

function advancePhase(state: GameState, content: GameContent): void {
  if (state.hunt.phase === "searching") {
    if (!canLeaveRecovery(state, content)) {
      state.hunt.phase = "recovering";
      state.hunt.targetMonsterId = undefined;
      state.hunt.combat = undefined;
      state.hunt.phaseEndsAt = state.updatedAt + balance.recoverySeconds;
      return;
    }

    const target = chooseAutoBossTarget(state, content) ?? chooseNextMonster(state, content);
    startFight(state, target, content);
    return;
  }

  if (state.hunt.phase === "fighting") {
    advanceFight(state, 0, content);
    return;
  }

  if (state.hunt.phase === "defeated") {
    const nextAreaId = getAutoAdvanceAreaId(state, content);

    if (nextAreaId) {
      moveToArea(state, nextAreaId);
      return;
    }

    state.hunt.phase = "recovering";
    state.hunt.targetMonsterId = undefined;
    state.hunt.combat = undefined;
    state.hunt.phaseEndsAt = state.updatedAt + balance.recoverySeconds;
    return;
  }

  if (!canLeaveRecovery(state, content)) {
    state.hunt.phase = "recovering";
    state.hunt.phaseEndsAt = state.updatedAt + balance.recoverySeconds;
    return;
  }

  state.hunt.phase = "searching";
  state.hunt.phaseEndsAt = state.updatedAt + balance.searchSeconds;
}

function moveToArea(state: GameState, areaId: string): void {
  state.hunt.selectedAreaId = areaId;
  state.hunt.phase = "searching";
  state.hunt.targetMonsterId = undefined;
  state.hunt.combat = undefined;
  state.hunt.lastReward = undefined;
  state.hunt.phaseEndsAt = state.updatedAt + balance.searchSeconds;
}

function getAutoAdvanceAreaId(state: GameState, content: GameContent): string | undefined {
  if (!state.unlocks.autoAdvanceArea || !isChallengeSystemEnabled(state, "autoAdvance") || !state.hunt.targetMonsterId) {
    return undefined;
  }

  const target = getMonster(content, state.hunt.targetMonsterId);

  if (target.role !== "boss") {
    return undefined;
  }

  const area = getArea(content, target.areaId);
  const nextAreaId = area.unlocksAreaId;

  if (!nextAreaId || !state.areas[nextAreaId]?.visible || !state.areas[nextAreaId]?.unlocked) {
    return undefined;
  }

  return nextAreaId;
}

function chooseAutoBossTarget(state: GameState, content: GameContent): MonsterSpec | undefined {
  if (!state.unlocks.autoBoss || !isChallengeSystemEnabled(state, "autoBoss")) {
    return undefined;
  }

  const area = getArea(content, state.hunt.selectedAreaId);
  const areaState = state.areas[area.id];

  if (!areaState.bossUnlocked || areaState.bossDefeated) {
    return undefined;
  }

  const boss = getMonster(content, area.bossId);
  const stats = getHunterStats(state, content);

  return getBossReadiness(stats, boss) >= 0.9 && canAttemptBossAtCurrentHealth(state, content) ? boss : undefined;
}

function chooseNextMonster(state: GameState, content: GameContent): MonsterSpec {
  const area = getArea(content, state.hunt.selectedAreaId);
  const cycleIndex = state.hunt.monsterCycle[area.id] ?? 0;
  const monsterId = area.monsterIds[cycleIndex % area.monsterIds.length];
  state.hunt.monsterCycle[area.id] = cycleIndex + 1;
  return getMonster(content, monsterId);
}

function startFight(state: GameState, monster: MonsterSpec, content: GameContent): void {
  const stats = getHunterStats(state, content);
  const hunterMaxHp = getHunterCombatHealth(stats);
  const enemyMaxHp = getMonsterMaxHealth(monster);
  const hunterHp = getCurrentHunterHp(state, stats);

  state.hunt.phase = "fighting";
  state.hunt.targetMonsterId = monster.id;
  state.hunt.lastReward = undefined;
  state.hunt.combat = {
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    hunterHp,
    hunterMaxHp,
    startedAt: state.updatedAt,
    elapsed: 0
  };
  state.hunt.phaseEndsAt = state.updatedAt + getKillSeconds(stats, monster);
}

function advanceFight(state: GameState, availableSeconds: number, content: GameContent): void {
  if (!state.hunt.targetMonsterId) {
    state.hunt.phase = "searching";
    state.hunt.phaseEndsAt = state.updatedAt + balance.searchSeconds;
    state.hunt.combat = undefined;
    return;
  }

  const monster = getMonster(content, state.hunt.targetMonsterId);
  const stats = getHunterStats(state, content);

  if (!state.hunt.combat) {
    startFight(state, monster, content);
  }

  const combat = state.hunt.combat!;
  const hunterDamagePerSecond = getHunterDamagePerSecond(stats, monster);
  const enemyDamagePerSecond = getMonsterDamagePerSecond(monster);
  const hunterRecoveryPerSecond = getHunterRecoveryPerSecond(stats);
  const netHunterDamagePerSecond = enemyDamagePerSecond - hunterRecoveryPerSecond;
  const timeToEnemyDefeat = combat.enemyHp / hunterDamagePerSecond;
  const timeToHunterDefeat = netHunterDamagePerSecond > 0 ? combat.hunterHp / netHunterDamagePerSecond : Number.POSITIVE_INFINITY;
  const elapsed = Math.max(0, Math.min(availableSeconds, timeToEnemyDefeat, timeToHunterDefeat));

  combat.enemyHp = Math.max(0, combat.enemyHp - hunterDamagePerSecond * elapsed);
  combat.hunterMaxHp = getHunterCombatHealth(stats);
  combat.hunterHp = Math.max(0, Math.min(combat.hunterMaxHp, combat.hunterHp - netHunterDamagePerSecond * elapsed));
  combat.elapsed += elapsed;
  state.hunt.hunterHp = combat.hunterHp;
  state.updatedAt += elapsed;

  if (combat.enemyHp <= timeEpsilon || timeToEnemyDefeat <= elapsed + timeEpsilon) {
    combat.enemyHp = 0;
    awardMonster(state, monster, content);
    if (monster.role === "boss") {
      completeBossClear(state, monster, content);
      completeChallengeIfSatisfied(state, { type: "boss", monsterId: monster.id });
    }
    state.hunt.phase = "defeated";
    state.hunt.phaseEndsAt = state.updatedAt + balance.defeatPauseSeconds;
    return;
  }

  if (combat.hunterHp <= timeEpsilon || timeToHunterDefeat <= elapsed + timeEpsilon) {
    state.hunt.hunterHp = 0;
    state.hunt.phase = "recovering";
    state.hunt.targetMonsterId = undefined;
    state.hunt.combat = undefined;
    state.hunt.phaseEndsAt = state.updatedAt + balance.recoverySeconds * 2;
  }
}

function getCombatSnapshot(
  state: GameState,
  stats: ReturnType<typeof getHunterStats>,
  monster?: MonsterSpec
): GameSnapshot["combat"] {
  if ((state.hunt.phase !== "fighting" && state.hunt.phase !== "defeated") || !monster) {
    return undefined;
  }

  const hunterMaxHp = state.hunt.combat?.hunterMaxHp ?? getHunterCombatHealth(stats);
  const enemyMaxHp = state.hunt.combat?.enemyMaxHp ?? getMonsterMaxHealth(monster);
  const hunterHp = state.hunt.combat?.hunterHp ?? hunterMaxHp;
  const enemyHp = state.hunt.combat?.enemyHp ?? enemyMaxHp;
  const hunterDamagePerSecond = getHunterDamagePerSecond(stats, monster);
  const enemyDamagePerSecond = getMonsterDamagePerSecond(monster);
  const hunterRecoveryPerSecond = getHunterRecoveryPerSecond(stats, state.hunt.phase === "fighting" ? 1 : balance.betweenBattleRecoveryMultiplier);
  const netHunterDamagePerSecond = enemyDamagePerSecond - hunterRecoveryPerSecond;

  return {
    enemyHp,
    enemyMaxHp,
    enemyHealthPercent: Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100)),
    hunterHp,
    hunterMaxHp,
    hunterHealthPercent: Math.max(0, Math.min(100, (hunterHp / hunterMaxHp) * 100)),
    hunterDamagePerSecond,
    enemyDamagePerSecond,
    hunterRecoveryPerSecond,
    enemyTimeToDefeat: enemyHp / hunterDamagePerSecond,
    hunterTimeToDefeat: netHunterDamagePerSecond > 0 ? hunterHp / netHunterDamagePerSecond : Number.POSITIVE_INFINITY
  };
}

function recoverHunter(state: GameState, seconds: number, content: GameContent, multiplier: number): void {
  const elapsed = Math.max(0, seconds);

  if (elapsed <= 0) {
    return;
  }

  const stats = getHunterStats(state, content);
  const maxHp = getHunterCombatHealth(stats);
  const recoveredHp = getCurrentHunterHp(state, stats) + getHunterRecoveryPerSecond(stats, multiplier) * elapsed;
  const nextHp = Math.max(0, Math.min(maxHp, recoveredHp));

  state.hunt.hunterHp = nextHp;

  if (state.hunt.combat) {
    state.hunt.combat.hunterMaxHp = maxHp;
    state.hunt.combat.hunterHp = nextHp;
  }
}

function getCurrentHunterHp(state: GameState, stats: ReturnType<typeof getHunterStats>): number {
  const maxHp = getHunterCombatHealth(stats);
  const combatHp = state.hunt.combat?.hunterHp;
  const storedHp = state.hunt.hunterHp;
  const currentHp = typeof storedHp === "number" && Number.isFinite(storedHp)
    ? storedHp
    : typeof combatHp === "number" && Number.isFinite(combatHp)
      ? combatHp
      : maxHp;

  return Math.max(0, Math.min(maxHp, currentHp));
}

function canLeaveRecovery(state: GameState, content: GameContent): boolean {
  const stats = getHunterStats(state, content);
  const maxHp = getHunterCombatHealth(stats);

  return getCurrentHunterHp(state, stats) / maxHp >= balance.minimumRecoveryHealthPercent;
}

function canAttemptBossAtCurrentHealth(state: GameState, content: GameContent): boolean {
  const stats = getHunterStats(state, content);
  const maxHp = getHunterCombatHealth(stats);

  return getCurrentHunterHp(state, stats) / maxHp >= balance.bossAttemptHealthPercent;
}

function getPassiveRecoveryMultiplier(state: GameState): number {
  return state.hunt.phase === "fighting" ? 1 : balance.betweenBattleRecoveryMultiplier;
}

function awardMonster(
  state: GameState,
  monster: MonsterSpec,
  content: GameContent
): RewardSummary {
  const area = getArea(content, monster.areaId);
  const areaState = state.areas[area.id];
  const xp = floor(multiply(monster.xp, getRewardModifier(state, content, "xpGain")));
  const gold = floor(multiply(monster.gold, getRewardModifier(state, content, "goldFind")));
  const renown = gameNumber(monster.renown);
  const loot = rollLoot(state, monster.loot, content);
  const totalGold = add(gold, loot.autoSoldGold);
  const progress = monster.role === "regular" ? Math.max(0, Math.min(monster.progress * getChallengeProgressMultiplier(state), area.progressRequired - areaState.progress)) : 0;

  state.player.xp = add(state.player.xp, xp);
  state.player.gold = add(state.player.gold, totalGold);
  state.player.renown = add(state.player.renown, renown);
  state.hunt.huntsCompleted += monster.role === "regular" ? 1 : 0;

  for (const [resourceId, amount] of Object.entries(loot.resources)) {
    state.resources[resourceId] = add(state.resources[resourceId] ?? 0, amount);
  }

  state.inventory.items.push(...loot.items);

  if (monster.role === "regular") {
    areaState.progress = Math.min(area.progressRequired, areaState.progress + progress);
    areaState.bossUnlocked = areaState.progress >= area.progressRequired;
  }

  state.hunt.lastReward = {
    monsterId: monster.id,
    monsterName: monster.name,
    xp,
    gold: totalGold,
    autoSoldGold: loot.autoSoldGold,
    renown,
    progress,
    resources: loot.resources,
    itemIds: loot.items.map((item) => item.itemId),
    autoSoldItemIds: loot.autoSoldItemIds,
    at: state.updatedAt
  };

  levelUp(state);

  return state.hunt.lastReward;
}

function completeBossClear(state: GameState, boss: MonsterSpec, content: GameContent): void {
  const area = getArea(content, boss.areaId);
  const areaState = state.areas[area.id];

  areaState.bossUnlocked = true;
  areaState.bossDefeated = true;
  areaState.clears += 1;

  if (area.tier >= 2) {
    state.unlocks.autoBoss = true;
  }

  if (area.unlocksAreaId && state.areas[area.unlocksAreaId]) {
    const unlockedArea = getArea(content, area.unlocksAreaId);
    state.areas[area.unlocksAreaId].visible = true;
    state.areas[area.unlocksAreaId].unlocked = true;

    if (unlockedArea.unlocksAreaId && state.areas[unlockedArea.unlocksAreaId]) {
      state.areas[unlockedArea.unlocksAreaId].visible = true;
    }
  }

  completeChallengeIfSatisfied(state, { type: "area" });
}

function completeChallengeIfSatisfied(state: GameState, event: { type: "boss"; monsterId: string } | { type: "area" }): void {
  const active = state.challenges.active;
  const challenge = active ? getChallengeSpec(active.challengeId) : undefined;

  if (!active || !challenge || active.completedAt !== undefined) {
    return;
  }

  const satisfied = challenge.goal.type === "defeatBoss"
    ? event.type === "boss" && event.monsterId === challenge.goal.bossId
    : Boolean(state.areas[challenge.goal.areaId]?.unlocked);

  if (!satisfied) {
    return;
  }

  const elapsedSeconds = getChallengeElapsedSeconds(state);
  const completedLevel = getChallengeCompletionLevel(challenge, elapsedSeconds);
  const currentRecord = state.challenges.records[challenge.id] ?? { level: 0 as ChallengeLevel, completions: 0 };
  const bestSeconds = currentRecord.bestSeconds === undefined
    ? elapsedSeconds
    : Math.min(currentRecord.bestSeconds, elapsedSeconds);

  state.challenges.records[challenge.id] = {
    level: Math.max(currentRecord.level, completedLevel) as ChallengeLevel,
    bestSeconds,
    completions: currentRecord.completions + 1
  };
  active.completedAt = state.updatedAt;
  active.completedLevel = completedLevel;
}

function rollLoot(
  state: GameState,
  lootTable: LootEntry[],
  content: GameContent
): { resources: Record<string, ReturnType<typeof gameNumber>>; items: InventoryItem[]; autoSoldGold: ReturnType<typeof gameNumber>; autoSoldItemIds: string[] } {
  const resources: Record<string, ReturnType<typeof gameNumber>> = {};
  const items: InventoryItem[] = [];
  let autoSoldGold = gameNumber(0);
  const autoSoldItemIds: string[] = [];
  const materialModifier = getRewardModifier(state, content, "materialFind");

  for (const loot of lootTable) {
    const chance = loot.chance * (loot.type === "resource" ? materialModifier : 1);
    if (random(state) > chance) {
      continue;
    }

    if (loot.type === "resource") {
      const amount = Math.max(1, Math.floor(randomInt(state, loot.min, loot.max) * materialModifier));
      resources[loot.resourceId] = add(resources[loot.resourceId] ?? 0, amount);
    } else {
      const itemSpec = content.items.find((item) => item.id === loot.itemId);
      const alreadyOwned = state.inventory.items.some((item) => item.itemId === loot.itemId)
        || items.some((item) => item.itemId === loot.itemId);

      if (state.unlocks.autoSellDuplicates && state.inventory.autoSellDuplicates && alreadyOwned && itemSpec) {
        autoSoldGold = add(autoSoldGold, itemSpec.value);
        autoSoldItemIds.push(loot.itemId);
        continue;
      }

      items.push({
        instanceId: `${loot.itemId}-${state.updatedAt}-${state.inventory.items.length + items.length}`,
        itemId: loot.itemId,
        acquiredAt: state.updatedAt,
        level: 1,
        locked: false
      });
    }
  }

  return { resources, items, autoSoldGold, autoSoldItemIds };
}

function levelUp(state: GameState): void {
  while (state.player.xp.gte(xpForNextLevel(state.player.level))) {
    state.player.xp = subtract(state.player.xp, xpForNextLevel(state.player.level));
    state.player.level += 1;
  }
}

function random(state: GameState): number {
  state.rngSeed = (1664525 * state.rngSeed + 1013904223) >>> 0;
  return state.rngSeed / 4294967296;
}

function randomInt(state: GameState, min: number, max: number): number {
  return Math.floor(random(state) * (max - min + 1)) + min;
}

function getArea(content: GameContent, areaId: string): AreaSpec {
  const area = content.areas.find((entry) => entry.id === areaId);
  if (!area) {
    throw new Error(`Missing area ${areaId}`);
  }

  return area;
}

function getMonster(content: GameContent, monsterId: string): MonsterSpec {
  const monster = content.monsters.find((entry) => entry.id === monsterId);
  if (!monster) {
    throw new Error(`Missing monster ${monsterId}`);
  }

  return monster;
}

function cloneState(state: GameState): GameState {
  const cloned = JSON.parse(JSON.stringify(state)) as GameState;
  const fresh = createGame(cloned.createdAt);
  cloned.player.baseStats = {
    ...fresh.player.baseStats,
    ...cloned.player.baseStats
  };
  cloned.player.xp = gameNumber(cloned.player.xp);
  cloned.player.gold = gameNumber(cloned.player.gold);
  cloned.player.renown = gameNumber(cloned.player.renown);
  cloned.resources = Object.fromEntries(
    Object.entries(cloned.resources).map(([resourceId, amount]) => [resourceId, gameNumber(amount)])
  );
  cloned.training = {
    ...createTrainingState(),
    ...cloned.training
  };
  for (const trainingId of Object.keys(cloned.training) as TrainingId[]) {
    cloned.training[trainingId] = {
      level: Math.max(0, Math.floor(Number(cloned.training[trainingId]?.level ?? 0))),
      progressSeconds: Math.max(0, Number(cloned.training[trainingId]?.progressSeconds ?? 0))
    };
  }
  cloned.activeTrainingId = cloned.activeTrainingId && cloned.training[cloned.activeTrainingId]
    ? cloned.activeTrainingId
    : undefined;
  cloned.areas = normalizeAreaStates(cloned.areas);
  cloned.inventory = {
    ...fresh.inventory,
    ...cloned.inventory,
    equipped: {
      ...fresh.inventory.equipped,
      ...cloned.inventory?.equipped
    },
    autoSellDuplicates: Boolean(cloned.inventory?.autoSellDuplicates)
  };
  cloned.inventory.items = cloned.inventory.items.map((item) => ({
    ...item,
    level: getItemLevel(item),
    locked: Boolean(item.locked)
  }));
  cloned.time = reviveTimeState(cloned.time, cloned.updatedAt);
  cloned.achievements = {
    records: reviveAchievementRecords(cloned.achievements?.records),
    secretTokens: Math.max(0, Math.floor(Number(cloned.achievements?.secretTokens ?? 0)))
  };
  cloned.challenges = {
    records: reviveChallengeRecords(cloned.challenges?.records),
    active: cloned.challenges?.active && getChallengeSpec(cloned.challenges.active.challengeId)
      ? {
          challengeId: cloned.challenges.active.challengeId,
          startedAt: Math.max(0, Number(cloned.challenges.active.startedAt ?? cloned.updatedAt)),
          completedAt: cloned.challenges.active.completedAt === undefined ? undefined : Math.max(0, Number(cloned.challenges.active.completedAt)),
          completedLevel: cloned.challenges.active.completedLevel === undefined
            ? undefined
            : Math.max(1, Math.min(5, Math.floor(Number(cloned.challenges.active.completedLevel)))) as ChallengeLevel
        }
      : undefined
  };
  cloned.settlement = reviveSettlementState(cloned.settlement);
  if (cloned.hunt.lastReward) {
    cloned.hunt.lastReward = reviveRewardSummary(cloned.hunt.lastReward);
  }
  normalizeHunterHp(cloned, gameContent);

  return cloned;
}

function normalizeHunterHp(state: GameState, content: GameContent): void {
  const stats = getHunterStats(state, content);
  const maxHp = getHunterCombatHealth(stats);
  const currentHp = Number.isFinite(state.hunt.hunterHp)
    ? state.hunt.hunterHp
    : Number.isFinite(state.hunt.combat?.hunterHp)
      ? state.hunt.combat!.hunterHp
      : maxHp;

  state.hunt.hunterHp = Math.max(0, Math.min(maxHp, currentHp));

  if (state.hunt.combat) {
    state.hunt.combat.hunterMaxHp = maxHp;
    state.hunt.combat.hunterHp = Math.max(0, Math.min(maxHp, state.hunt.combat.hunterHp ?? state.hunt.hunterHp));
    state.hunt.hunterHp = state.hunt.combat.hunterHp;
  }
}

export function createInitialAreaStates(content = gameContent): Record<string, AreaState> {
  const firstArea = content.areas[0];
  const initialVisibleAreaIds = new Set<string>();

  if (firstArea) {
    initialVisibleAreaIds.add(firstArea.id);
    if (firstArea.unlocksAreaId) {
      initialVisibleAreaIds.add(firstArea.unlocksAreaId);
    }
  }

  return Object.fromEntries(
    content.areas.map((area, index) => [
      area.id,
      {
        visible: initialVisibleAreaIds.has(area.id),
        unlocked: index === 0,
        progress: 0,
        bossUnlocked: false,
        bossDefeated: false,
        clears: 0
      }
    ])
  );
}

export function normalizeAreaStates(areas: Partial<Record<string, Partial<AreaState>>> | undefined, content = gameContent): Record<string, AreaState> {
  const normalized = createInitialAreaStates(content);

  for (const area of content.areas) {
    const existing = areas?.[area.id];

    if (!existing) {
      continue;
    }

    normalized[area.id] = {
      ...normalized[area.id],
      ...existing,
      visible: Boolean(existing.visible ?? normalized[area.id].visible),
      unlocked: Boolean(existing.unlocked ?? normalized[area.id].unlocked),
      progress: Math.max(0, Number(existing.progress ?? normalized[area.id].progress)),
      bossUnlocked: Boolean(existing.bossUnlocked ?? normalized[area.id].bossUnlocked),
      bossDefeated: Boolean(existing.bossDefeated ?? normalized[area.id].bossDefeated),
      clears: Math.max(0, Math.floor(Number(existing.clears ?? normalized[area.id].clears)))
    };
  }

  for (const area of content.areas) {
    const areaState = normalized[area.id];

    if (areaState.unlocked) {
      areaState.visible = true;
    }

    if ((areaState.unlocked || areaState.bossDefeated) && area.unlocksAreaId && normalized[area.unlocksAreaId]) {
      normalized[area.unlocksAreaId].visible = true;
    }
  }

  return normalized;
}

function hasPrestigeCapstoneCleared(state: GameState, content: GameContent): boolean {
  const capstoneArea = content.areas[content.areas.length - 1];

  return Boolean(capstoneArea && state.areas[capstoneArea.id]?.bossDefeated);
}

function reviveRewardSummary(reward: RewardSummary): RewardSummary {
  return {
    ...reward,
    xp: gameNumber(reward.xp),
    gold: gameNumber(reward.gold),
    autoSoldGold: gameNumber(reward.autoSoldGold ?? 0),
    renown: gameNumber(reward.renown),
    autoSoldItemIds: reward.autoSoldItemIds ?? [],
    resources: Object.fromEntries(
      Object.entries(reward.resources ?? {}).map(([resourceId, amount]) => [resourceId, gameNumber(amount)])
    )
  };
}

function createTimeState(now: number): TimeState {
  return {
    bankedSeconds: 0,
    speedMultiplier: 1,
    offlineEfficiencyLevel: 0,
    lastSeenAt: now,
    lastOfflineSeconds: 0,
    lastBankedSeconds: 0
  };
}

function createSettlementState(): SettlementState {
  return {
    foundedAtPrestige: undefined,
    seasonsPassed: 0,
    population: 0,
    stores: 0,
    outpostScouts: 0,
    forgeHeat: 0
  };
}

function reviveSettlementState(settlement: Partial<SettlementState> | undefined): SettlementState {
  const fresh = createSettlementState();

  return {
    foundedAtPrestige: settlement?.foundedAtPrestige === undefined
      ? fresh.foundedAtPrestige
      : Math.max(1, Math.floor(Number(settlement.foundedAtPrestige))),
    seasonsPassed: Math.max(0, Math.floor(Number(settlement?.seasonsPassed ?? fresh.seasonsPassed))),
    population: Math.max(0, Math.floor(Number(settlement?.population ?? fresh.population))),
    stores: Math.max(0, Math.floor(Number(settlement?.stores ?? fresh.stores))),
    outpostScouts: Math.max(0, Math.floor(Number(settlement?.outpostScouts ?? fresh.outpostScouts))),
    forgeHeat: Math.max(0, Math.floor(Number(settlement?.forgeHeat ?? fresh.forgeHeat)))
  };
}

function advanceSettlementForPrestige(settlement: SettlementState | undefined, totalPrestige: number, prestigeGain: number): SettlementState {
  const next = reviveSettlementState(settlement);
  const seasonsGained = Math.max(1, Math.floor(prestigeGain));

  if (totalPrestige <= 0) {
    return next;
  }

  next.foundedAtPrestige ??= totalPrestige;
  next.seasonsPassed += seasonsGained;
  next.population += seasonsGained * 3 + Math.floor(totalPrestige / 2);
  next.stores += seasonsGained * 2;
  next.outpostScouts += seasonsGained;
  next.forgeHeat += seasonsGained * 2 + Math.floor(totalPrestige / 3);

  return next;
}

function reviveTimeState(time: Partial<TimeState> | undefined, fallbackSeenAt: number): TimeState {
  const fresh = createTimeState(fallbackSeenAt);

  return {
    ...fresh,
    ...time,
    bankedSeconds: Math.max(0, Number(time?.bankedSeconds ?? fresh.bankedSeconds)),
    speedMultiplier: normalizeSpeedMultiplier(time?.speedMultiplier ?? fresh.speedMultiplier),
    offlineEfficiencyLevel: Math.max(0, Math.min(balance.offlineEfficiencyMaxLevel, Math.floor(Number(time?.offlineEfficiencyLevel ?? 0)))),
    lastSeenAt: Number(time?.lastSeenAt ?? fallbackSeenAt),
    lastOfflineSeconds: Math.max(0, Number(time?.lastOfflineSeconds ?? 0)),
    lastBankedSeconds: Math.max(0, Number(time?.lastBankedSeconds ?? 0))
  };
}

function normalizeSpeedMultiplier(speedMultiplier: unknown): SpeedMultiplier {
  return allowedSpeedMultipliers.includes(speedMultiplier as SpeedMultiplier)
    ? speedMultiplier as SpeedMultiplier
    : 1;
}

function roundTime(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}
