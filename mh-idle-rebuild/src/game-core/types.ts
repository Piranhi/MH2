import type { GameNumber } from "./numbers";

export type EquipmentSlot = "weapon" | "helm" | "armor" | "gloves" | "boots" | "charm" | "ring" | "relic";

export type Rarity = "common" | "uncommon" | "rare";

export type TrainingId = "might" | "vigor" | "guard" | "mending";

export type SpeedMultiplier = 1 | 2 | 3;

export type TimeUpgradeId = "offlineEfficiency";

export type ChallengeLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type StatBlock = {
  health: number;
  attack: number;
  defence: number;
  speed: number;
  critChance: number;
  luck: number;
  recoveryRate: number;
};

export type ItemEffect = {
  stat: keyof StatBlock | "goldFind" | "xpGain" | "materialFind";
  mode: "flat" | "percent";
  value: number;
};

export type ItemSpec = {
  id: string;
  name: string;
  slot?: EquipmentSlot;
  tier: number;
  rarity: Rarity;
  value: number;
  tags: string[];
  description: string;
  effects: ItemEffect[];
};

export type ResourceSpec = {
  id: string;
  name: string;
  tier: number;
  value: number;
  tags: string[];
};

export type LootEntry =
  | {
      type: "resource";
      resourceId: string;
      chance: number;
      min: number;
      max: number;
    }
  | {
      type: "item";
      itemId: string;
      chance: number;
    };

export type MonsterSpec = {
  id: string;
  name: string;
  areaId: string;
  role: "regular" | "boss";
  tier: number;
  power: number;
  threat: number;
  xp: number;
  gold: number;
  renown: number;
  progress: number;
  loot: LootEntry[];
};

export type AreaSpec = {
  id: string;
  name: string;
  tier: number;
  powerBand: [number, number];
  progressRequired: number;
  monsterIds: string[];
  bossId: string;
  unlocksAreaId?: string;
};

export type GameContent = {
  areas: AreaSpec[];
  monsters: MonsterSpec[];
  items: ItemSpec[];
  resources: ResourceSpec[];
};

export type AreaState = {
  visible: boolean;
  unlocked: boolean;
  progress: number;
  bossUnlocked: boolean;
  bossDefeated: boolean;
  clears: number;
};

export type InventoryItem = {
  instanceId: string;
  itemId: string;
  acquiredAt: number;
};

export type TrainingState = {
  level: number;
};

export type CombatState = {
  enemyHp: number;
  enemyMaxHp: number;
  hunterHp: number;
  hunterMaxHp: number;
  startedAt: number;
  elapsed: number;
};

export type RewardSummary = {
  monsterId: string;
  monsterName: string;
  xp: GameNumber;
  gold: GameNumber;
  renown: GameNumber;
  progress: number;
  resources: Record<string, GameNumber>;
  itemIds: string[];
  at: number;
};

export type TimeState = {
  bankedSeconds: number;
  speedMultiplier: SpeedMultiplier;
  offlineEfficiencyLevel: number;
  lastSeenAt: number;
  lastOfflineSeconds: number;
  lastBankedSeconds: number;
};

export type ChallengeRecord = {
  level: ChallengeLevel;
  bestSeconds?: number;
  completions: number;
};

export type ActiveChallenge = {
  challengeId: string;
  startedAt: number;
  completedAt?: number;
  completedLevel?: ChallengeLevel;
};

export type FeatureUnlocks = {
  training: boolean;
  performance: boolean;
  combatStats: boolean;
  drops: boolean;
  inventory: boolean;
  bossIdentity: boolean;
  areaTravel: boolean;
  prestige: boolean;
};

export type UnlockNotice = {
  id: keyof FeatureUnlocks;
  title: string;
  description: string;
};

export type GameState = {
  schemaVersion: 1;
  createdAt: number;
  updatedAt: number;
  rngSeed: number;
  player: {
    level: number;
    xp: GameNumber;
    gold: GameNumber;
    renown: GameNumber;
    prestige: number;
    baseStats: StatBlock;
  };
  hunt: {
    selectedAreaId: string;
    phase: "searching" | "fighting" | "defeated" | "recovering";
    phaseEndsAt: number;
    hunterHp: number;
    targetMonsterId?: string;
    combat?: CombatState;
    lastReward?: RewardSummary;
    huntsCompleted: number;
    activeSeconds: number;
    monsterCycle: Record<string, number>;
  };
  areas: Record<string, AreaState>;
  inventory: {
    items: InventoryItem[];
    equipped: Partial<Record<EquipmentSlot, string>>;
  };
  training: Record<TrainingId, TrainingState>;
  resources: Record<string, GameNumber>;
  time: TimeState;
  challenges: {
    active?: ActiveChallenge;
    records: Record<string, ChallengeRecord>;
  };
  unlocks: {
    autoBoss: boolean;
    autoAdvanceArea: boolean;
  };
};

export type GameSnapshot = {
  state: GameState;
  currentArea: AreaSpec;
  currentTarget?: MonsterSpec;
  lastReward?: RewardSummary;
  combat?: {
    enemyHp: number;
    enemyMaxHp: number;
    enemyHealthPercent: number;
    hunterHp: number;
    hunterMaxHp: number;
    hunterHealthPercent: number;
    hunterDamagePerSecond: number;
    enemyDamagePerSecond: number;
    hunterRecoveryPerSecond: number;
    enemyTimeToDefeat: number;
    hunterTimeToDefeat: number;
  };
  boss: MonsterSpec;
  stats: StatBlock;
  power: number;
  survival: number;
  hunterHp: number;
  hunterHealthPercent: number;
  recoveryPerSecond: number;
  betweenBattleRecoveryPerSecond: number;
  bossReadiness: number;
  prestige: {
    canPrestige: boolean;
    capstoneCleared: boolean;
    gain: number;
    nextRenown: GameNumber;
    statMultiplier: number;
    rewardMultiplier: number;
  };
  features: FeatureUnlocks;
  unlockNotices: UnlockNotice[];
  rates: {
    huntsPerHour: number;
    xpPerHour: GameNumber;
    goldPerHour: GameNumber;
    renownPerHour: GameNumber;
    materialsPerHour: GameNumber;
  };
};

export type OfflineSummary = {
  seconds: number;
  bankedSeconds: number;
  huntsCompleted: number;
  xp: GameNumber;
  gold: GameNumber;
  renown: GameNumber;
  resources: Record<string, GameNumber>;
  itemIds: string[];
};
