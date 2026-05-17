import { createGame, normalizeAreaStates } from "./game";
import { reviveAchievementRecords } from "./achievements";
import { getChallengeSpec, reviveChallengeRecords } from "./challenges";
import { reviveGameNumber } from "./numbers";
import { reviveTrainingState } from "./training";
import { getItemLevel } from "./items";
import type { ChallengeLevel, GameState, RewardSummary, SettlementState } from "./types";

export const currentSaveVersion = 1;

type SaveEnvelope = {
  _version: 1;
  _createdAt: number;
  _updatedAt: number;
  state: GameState;
};

export function serializeGame(state: GameState): string {
  const envelope: SaveEnvelope = {
    _version: currentSaveVersion,
    _createdAt: state.createdAt,
    _updatedAt: state.updatedAt,
    state
  };

  return JSON.stringify(envelope);
}

export function parseGameSave(raw: string): GameState {
  const parsed = JSON.parse(raw) as Partial<SaveEnvelope>;

  if (parsed._version !== currentSaveVersion || !parsed.state) {
    throw new Error(`Unsupported save version ${String(parsed._version)}`);
  }

  return normalizeState(parsed.state);
}

function normalizeState(state: GameState): GameState {
  const fresh = createGame(state.createdAt);
  const { log: _legacyLog, ...stateWithoutLegacyLog } = state as GameState & { log?: unknown };

  return {
    ...fresh,
    ...stateWithoutLegacyLog,
    player: {
      ...fresh.player,
      ...stateWithoutLegacyLog.player,
      baseStats: {
        ...fresh.player.baseStats,
        ...stateWithoutLegacyLog.player.baseStats
      },
      xp: reviveGameNumber(stateWithoutLegacyLog.player.xp),
      gold: reviveGameNumber(stateWithoutLegacyLog.player.gold),
      renown: reviveGameNumber(stateWithoutLegacyLog.player.renown)
    },
    hunt: {
      ...fresh.hunt,
      ...stateWithoutLegacyLog.hunt,
      lastReward: stateWithoutLegacyLog.hunt.lastReward
        ? reviveRewardSummary(stateWithoutLegacyLog.hunt.lastReward)
        : undefined,
      hunterHp: Math.max(0, Number(
        stateWithoutLegacyLog.hunt.hunterHp
          ?? stateWithoutLegacyLog.hunt.combat?.hunterHp
          ?? fresh.hunt.hunterHp
      )),
      monsterCycle: {
        ...fresh.hunt.monsterCycle,
        ...stateWithoutLegacyLog.hunt.monsterCycle
      }
    },
    areas: normalizeAreaStates(stateWithoutLegacyLog.areas),
    inventory: {
      ...fresh.inventory,
      ...stateWithoutLegacyLog.inventory,
      items: (stateWithoutLegacyLog.inventory?.items ?? fresh.inventory.items).map((item) => ({
        ...item,
        level: getItemLevel(item),
        locked: Boolean(item.locked)
      })),
      equipped: {
        ...fresh.inventory.equipped,
        ...stateWithoutLegacyLog.inventory.equipped
      },
      autoSellDuplicates: Boolean(stateWithoutLegacyLog.inventory?.autoSellDuplicates)
    },
    training: reviveTrainingState(stateWithoutLegacyLog.training),
    activeTrainingId: stateWithoutLegacyLog.activeTrainingId && fresh.training[stateWithoutLegacyLog.activeTrainingId]
      ? stateWithoutLegacyLog.activeTrainingId
      : undefined,
    resources: {
      ...fresh.resources,
      ...Object.fromEntries(
        Object.entries(stateWithoutLegacyLog.resources ?? {}).map(([resourceId, amount]) => [
          resourceId,
          reviveGameNumber(amount)
        ])
      )
    },
    achievements: {
      records: reviveAchievementRecords(stateWithoutLegacyLog.achievements?.records),
      secretTokens: Math.max(0, Math.floor(Number(stateWithoutLegacyLog.achievements?.secretTokens ?? 0)))
    },
    challenges: {
      records: reviveChallengeRecords(stateWithoutLegacyLog.challenges?.records),
      active: stateWithoutLegacyLog.challenges?.active && getChallengeSpec(stateWithoutLegacyLog.challenges.active.challengeId)
        ? {
            challengeId: stateWithoutLegacyLog.challenges.active.challengeId,
            startedAt: Math.max(0, Number(stateWithoutLegacyLog.challenges.active.startedAt ?? stateWithoutLegacyLog.updatedAt)),
            completedAt: stateWithoutLegacyLog.challenges.active.completedAt === undefined
              ? undefined
              : Math.max(0, Number(stateWithoutLegacyLog.challenges.active.completedAt)),
            completedLevel: stateWithoutLegacyLog.challenges.active.completedLevel === undefined
              ? undefined
              : Math.max(1, Math.min(5, Math.floor(Number(stateWithoutLegacyLog.challenges.active.completedLevel)))) as ChallengeLevel
          }
        : undefined
    },
    settlement: reviveSettlementState(stateWithoutLegacyLog.settlement),
    time: {
      ...fresh.time,
      ...stateWithoutLegacyLog.time,
      bankedSeconds: Math.max(0, Number(stateWithoutLegacyLog.time?.bankedSeconds ?? fresh.time.bankedSeconds)),
      speedMultiplier: stateWithoutLegacyLog.time?.speedMultiplier === 2 || stateWithoutLegacyLog.time?.speedMultiplier === 3
        ? stateWithoutLegacyLog.time.speedMultiplier
        : 1,
      offlineEfficiencyLevel: Math.max(0, Math.min(5, Math.floor(Number(stateWithoutLegacyLog.time?.offlineEfficiencyLevel ?? 0)))),
      lastSeenAt: Number(stateWithoutLegacyLog.time?.lastSeenAt ?? stateWithoutLegacyLog.updatedAt),
      lastOfflineSeconds: Math.max(0, Number(stateWithoutLegacyLog.time?.lastOfflineSeconds ?? 0)),
      lastBankedSeconds: Math.max(0, Number(stateWithoutLegacyLog.time?.lastBankedSeconds ?? 0))
    },
    unlocks: {
      ...fresh.unlocks,
      ...stateWithoutLegacyLog.unlocks
    }
  };
}

function reviveSettlementState(settlement: Partial<SettlementState> | undefined): SettlementState {
  return {
    foundedAtPrestige: settlement?.foundedAtPrestige === undefined
      ? undefined
      : Math.max(1, Math.floor(Number(settlement.foundedAtPrestige))),
    seasonsPassed: Math.max(0, Math.floor(Number(settlement?.seasonsPassed ?? 0))),
    population: Math.max(0, Math.floor(Number(settlement?.population ?? 0))),
    stores: Math.max(0, Math.floor(Number(settlement?.stores ?? 0))),
    outpostScouts: Math.max(0, Math.floor(Number(settlement?.outpostScouts ?? 0))),
    forgeHeat: Math.max(0, Math.floor(Number(settlement?.forgeHeat ?? 0)))
  };
}

function reviveRewardSummary(reward: RewardSummary): RewardSummary {
  return {
    ...reward,
    xp: reviveGameNumber(reward.xp),
    gold: reviveGameNumber(reward.gold),
    autoSoldGold: reviveGameNumber((reward as Partial<RewardSummary>).autoSoldGold),
    renown: reviveGameNumber(reward.renown),
    autoSoldItemIds: reward.autoSoldItemIds ?? [],
    resources: Object.fromEntries(
      Object.entries(reward.resources ?? {}).map(([resourceId, amount]) => [
        resourceId,
        reviveGameNumber(amount)
      ])
    )
  };
}
