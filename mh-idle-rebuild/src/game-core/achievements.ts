import type { AchievementRecord, GameState } from "./types";

export type AchievementReward = {
  statPercent?: number;
  rewardPercent?: number;
  bankedSeconds?: number;
  unlock?: "autoBoss" | "autoAdvanceArea" | "autoSellDuplicates";
  shopCurrency?: number;
};

export type AchievementSpec = {
  id: string;
  number: number;
  name: string;
  requirement: string;
  secret?: boolean;
  reward: AchievementReward;
  isComplete: (state: GameState) => boolean;
};

const baseReward: AchievementReward = {
  statPercent: 0.0025,
  rewardPercent: 0.0025
};

export const achievementSpecs: AchievementSpec[] = [
  {
    id: "first-hunt",
    number: 1,
    name: "First Tracks",
    requirement: "Complete 1 regular hunt.",
    reward: baseReward,
    isComplete: (state) => state.hunt.huntsCompleted >= 1
  },
  {
    id: "ten-hunts",
    number: 2,
    name: "Trail Routine",
    requirement: "Complete 10 regular hunts.",
    reward: baseReward,
    isComplete: (state) => state.hunt.huntsCompleted >= 10
  },
  {
    id: "first-training",
    number: 3,
    name: "Camp Drills",
    requirement: "Buy any training level.",
    reward: baseReward,
    isComplete: (state) => Object.values(state.training).some((training) => training.level > 0)
  },
  {
    id: "first-drop",
    number: 4,
    name: "Useful Spoils",
    requirement: "Find your first non-starter equipment drop.",
    reward: baseReward,
    isComplete: (state) => state.inventory.items.some((item) => item.instanceId !== "starter-blade-1")
  },
  {
    id: "bramblemaw-revealed",
    number: 5,
    name: "Challenge Sighted",
    requirement: "Reveal Elder Bramblemaw in Emberfall Woods.",
    reward: baseReward,
    isComplete: (state) => Boolean(state.areas["emberfall-woods"]?.bossUnlocked)
  },
  {
    id: "bramblemaw-cleared",
    number: 6,
    name: "Bramble Broken",
    requirement: "Defeat Elder Bramblemaw.",
    reward: { ...baseReward, bankedSeconds: 5 * 60 },
    isComplete: (state) => Boolean(state.areas["emberfall-woods"]?.bossDefeated)
  },
  {
    id: "ironroot-reached",
    number: 7,
    name: "Ironroot Footing",
    requirement: "Unlock Ironroot Basin.",
    reward: baseReward,
    isComplete: (state) => Boolean(state.areas["ironroot-basin"]?.unlocked)
  },
  {
    id: "matriarch-cleared",
    number: 8,
    name: "Matriarch Gate",
    requirement: "Defeat Stonebound Matriarch.",
    reward: { ...baseReward, unlock: "autoBoss" },
    isComplete: (state) => Boolean(state.areas["ironroot-basin"]?.bossDefeated)
  },
  {
    id: "moonfen-reached",
    number: 9,
    name: "Moonfen Crossing",
    requirement: "Unlock Moonfen Ruins.",
    reward: { ...baseReward, bankedSeconds: 10 * 60 },
    isComplete: (state) => Boolean(state.areas["moonfen-ruins"]?.unlocked)
  },
  {
    id: "moonvein-cleared",
    number: 10,
    name: "Legacy Spark",
    requirement: "Defeat Moonvein Colossus.",
    reward: { ...baseReward, unlock: "autoAdvanceArea" },
    isComplete: (state) => Boolean(state.areas["moonfen-ruins"]?.bossDefeated)
  },
  {
    id: "bag-discipline",
    number: 11,
    name: "Bag Discipline",
    requirement: "Hold 20 equipment items at once.",
    reward: { ...baseReward, unlock: "autoSellDuplicates" },
    isComplete: (state) => state.inventory.items.length >= 20
  },
  {
    id: "same-item-stack",
    number: 101,
    name: "Quartermaster's Problem",
    requirement: "Hold 5 copies of the same item at once.",
    secret: true,
    reward: { ...baseReward, bankedSeconds: 15 * 60, shopCurrency: 1 },
    isComplete: (state) => {
      const counts = new Map<string, number>();
      for (const item of state.inventory.items) {
        counts.set(item.itemId, (counts.get(item.itemId) ?? 0) + 1);
      }
      return Array.from(counts.values()).some((count) => count >= 5);
    }
  },
  {
    id: "deep-bag",
    number: 102,
    name: "Packed For A Month",
    requirement: "Hold 50 equipment items at once.",
    secret: true,
    reward: { ...baseReward, bankedSeconds: 20 * 60, shopCurrency: 1 },
    isComplete: (state) => state.inventory.items.length >= 50
  },
  {
    id: "close-call",
    number: 103,
    name: "One Breath Left",
    requirement: "Survive after falling below 10% hunter health.",
    secret: true,
    reward: { ...baseReward, bankedSeconds: 20 * 60, shopCurrency: 1 },
    isComplete: (state) => {
      const hp = state.hunt.combat?.hunterHp ?? state.hunt.hunterHp;
      const maxHp = state.hunt.combat?.hunterMaxHp;
      return typeof maxHp === "number" && maxHp > 0 && hp > 0 && hp / maxHp <= 0.1;
    }
  }
];

export function createAchievementRecords(): Record<string, AchievementRecord> {
  return Object.fromEntries(achievementSpecs.map((achievement) => [
    achievement.id,
    {}
  ]));
}

export function reviveAchievementRecords(records?: Partial<Record<string, AchievementRecord>>): Record<string, AchievementRecord> {
  const fresh = createAchievementRecords();

  for (const achievement of achievementSpecs) {
    const record = records?.[achievement.id];
    fresh[achievement.id] = {
      completedAt: record?.completedAt === undefined ? undefined : Math.max(0, Number(record.completedAt))
    };
  }

  return fresh;
}

export function getCompletedAchievementCount(state: GameState): number {
  return achievementSpecs.filter((achievement) => isAchievementComplete(state, achievement.id)).length;
}

export function getAchievementStatMultiplier(state: GameState): number {
  const totalPercent = getCompletedRewardTotal(state, "statPercent");
  return 1 + totalPercent;
}

export function getAchievementRewardMultiplier(state: GameState): number {
  const totalPercent = getCompletedRewardTotal(state, "rewardPercent");
  return 1 + totalPercent;
}

export function isAchievementComplete(state: GameState, achievementId: string): boolean {
  return state.achievements.records[achievementId]?.completedAt !== undefined;
}

export function refreshAchievements(input: GameState): GameState {
  const state = input;

  for (const achievement of achievementSpecs) {
    if (isAchievementComplete(state, achievement.id) || !achievement.isComplete(state)) {
      continue;
    }

    state.achievements.records[achievement.id] = {
      completedAt: state.updatedAt
    };
    applyAchievementReward(state, achievement.reward);
  }

  return state;
}

function applyAchievementReward(state: GameState, reward: AchievementReward): void {
  if (reward.bankedSeconds) {
    state.time.bankedSeconds += reward.bankedSeconds;
  }

  if (reward.unlock) {
    state.unlocks[reward.unlock] = true;
  }

  if (reward.shopCurrency) {
    state.achievements.secretTokens += reward.shopCurrency;
  }
}

function getCompletedRewardTotal(state: GameState, key: "statPercent" | "rewardPercent"): number {
  return achievementSpecs.reduce((total, achievement) => {
    if (!isAchievementComplete(state, achievement.id)) {
      return total;
    }

    return total + (achievement.reward[key] ?? 0);
  }, 0);
}
