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
import { canBuyTraining, createTrainingState, getAffordableTrainingPurchases, getTrainingCost } from "./training";
import { getFeatureUnlocks, getUnlockNotices } from "./unlocks";
import type { AreaSpec, AreaState, ChallengeLevel, GameContent, GameSnapshot, GameState, InventoryItem, LootEntry, MonsterSpec, OfflineSummary, RewardSummary, SpeedMultiplier, TimeState, TimeUpgradeId, TrainingId } from "./types";

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
          acquiredAt: now
        }
      ],
      equipped: {
        weapon: "starter-blade-1"
      }
    },
    training: createTrainingState(),
    resources: {},
    time: createTimeState(now),
    challenges: {
      records: createChallengeRecords()
    },
    unlocks: {
      autoBoss: false,
      autoAdvanceArea: false
    }
  };
}

export function tick(input: GameState, seconds: number, content = gameContent): GameState {
  const state = cloneState(input);
  const elapsedSeconds = Math.max(0, seconds);
  const targetTime = state.updatedAt + elapsedSeconds;
  state.hunt.activeSeconds += elapsedSeconds;

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

  return state;
}

export function advanceRealtime(input: GameState, realSeconds: number, content = gameContent): GameState {
  const state = cloneState(input);
  const elapsedSeconds = Math.max(0, realSeconds);
  const speedMultiplier = normalizeSpeedMultiplier(state.time.speedMultiplier);
  const requestedBankedSeconds = (speedMultiplier - 1) * elapsedSeconds;
  const spentBankedSeconds = Math.min(state.time.bankedSeconds, requestedBankedSeconds);
  const advanced = tick(state, elapsedSeconds + spentBankedSeconds, content);

  advanced.time.bankedSeconds = roundTime(Math.max(0, state.time.bankedSeconds - spentBankedSeconds));
  advanced.time.speedMultiplier = spentBankedSeconds < requestedBankedSeconds ? 1 : speedMultiplier;
  return advanced;
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
  advanced.time.bankedSeconds = roundTime(Math.max(0, state.time.bankedSeconds - spentSeconds));
  return advanced;
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
    return state;
  }

  const cost = getTimeUpgradeCost(state, upgradeId);
  state.player.gold = subtract(state.player.gold, cost);

  if (upgradeId === "offlineEfficiency") {
    state.time.offlineEfficiencyLevel += 1;
  }

  return state;
}

export function selectArea(input: GameState, areaId: string, content = gameContent): GameState {
  const state = cloneState(input);
  const area = getArea(content, areaId);

  if (!state.areas[area.id]?.visible || !state.areas[area.id]?.unlocked) {
    return state;
  }

  moveToArea(state, area.id);
  return state;
}

export function attemptBoss(input: GameState, content = gameContent): GameState {
  const state = cloneState(input);
  const area = getArea(content, state.hunt.selectedAreaId);
  const areaState = state.areas[area.id];
  const boss = getMonster(content, area.bossId);

  if (!areaState.bossUnlocked || areaState.bossDefeated) {
    return state;
  }

  if (state.hunt.phase === "fighting" && state.hunt.targetMonsterId === boss.id) {
    return state;
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
    return state;
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
  next.unlocks = {
    ...next.unlocks,
    autoBoss: isChallengeSystemEnabled(next, "autoBoss") ? state.unlocks.autoBoss : false,
    autoAdvanceArea: isChallengeSystemEnabled(next, "autoAdvance") ? state.unlocks.autoAdvanceArea : false
  };
  next.time = {
    ...state.time,
    speedMultiplier: 1,
    lastSeenAt: state.updatedAt,
    lastOfflineSeconds: 0,
    lastBankedSeconds: 0
  };
  next.hunt.hunterHp = getHunterCombatHealth(getHunterStats(next, content));

  return next;
}

export function abandonChallenge(input: GameState): GameState {
  const state = cloneState(input);

  if (!state.challenges.active) {
    return state;
  }

  const next = createGame(state.updatedAt);
  next.createdAt = state.createdAt;
  next.rngSeed = state.rngSeed;
  next.player.prestige = state.player.prestige;
  next.challenges = {
    records: state.challenges.records
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

  return next;
}

export function prestigeRun(input: GameState): GameState {
  const state = cloneState(input);
  const prestigeGain = getPrestigeGain(state);

  if (!canPrestigeRun(state)) {
    return state;
  }

  const next = createGame(state.updatedAt);
  next.createdAt = state.createdAt;
  next.rngSeed = state.rngSeed;
  next.player.prestige = state.player.prestige + prestigeGain;
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

  return next;
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

  return state;
}

export function buyTraining(input: GameState, trainingId: TrainingId, requestedPurchases: number | "max" = 1): GameState {
  const state = cloneState(input);

  if (!canBuyTraining(state, trainingId)) {
    return state;
  }

  const purchases = requestedPurchases === "max"
    ? getAffordableTrainingPurchases(state, trainingId)
    : Math.max(1, Math.floor(requestedPurchases));

  for (let purchase = 0; purchase < purchases; purchase += 1) {
    if (!canBuyTraining(state, trainingId)) {
      break;
    }

    const cost = getTrainingCost(state, trainingId);
    state.player.gold = subtract(state.player.gold, cost);
    state.training[trainingId].level += 1;
  }

  return state;
}

export function getSnapshot(state: GameState, content = gameContent): GameSnapshot {
  const currentArea = getArea(content, state.hunt.selectedAreaId);
  const boss = getMonster(content, currentArea.bossId);
  const currentTarget = state.hunt.targetMonsterId ? getMonster(content, state.hunt.targetMonsterId) : undefined;
  const stats = getHunterStats(state, content);
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

  return {
    state,
    currentArea,
    currentTarget,
    lastReward: state.hunt.lastReward,
    combat,
    boss,
    stats,
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
  const progress = monster.role === "regular" ? Math.max(0, Math.min(monster.progress * getChallengeProgressMultiplier(state), area.progressRequired - areaState.progress)) : 0;

  state.player.xp = add(state.player.xp, xp);
  state.player.gold = add(state.player.gold, gold);
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
    gold,
    renown,
    progress,
    resources: loot.resources,
    itemIds: loot.items.map((item) => item.itemId),
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
): { resources: Record<string, ReturnType<typeof gameNumber>>; items: InventoryItem[] } {
  const resources: Record<string, ReturnType<typeof gameNumber>> = {};
  const items: InventoryItem[] = [];
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
      items.push({
        instanceId: `${loot.itemId}-${state.updatedAt}-${state.inventory.items.length + items.length}`,
        itemId: loot.itemId,
        acquiredAt: state.updatedAt
      });
    }
  }

  return { resources, items };
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
  cloned.areas = normalizeAreaStates(cloned.areas);
  cloned.time = reviveTimeState(cloned.time, cloned.updatedAt);
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
    renown: gameNumber(reward.renown),
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
