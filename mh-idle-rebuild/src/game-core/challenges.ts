import type { ChallengeLevel, ChallengeRecord, EquipmentSlot, GameState, StatBlock } from "./types";

export type ChallengeGoal =
  | { type: "defeatBoss"; bossId: string }
  | { type: "reachArea"; areaId: string };

export type ChallengeRewardLevel = {
  level: Exclude<ChallengeLevel, 0>;
  seconds?: number;
  label: string;
  reward: string;
};

export type ChallengeSpec = {
  id: string;
  name: string;
  chunk: "Ember Trials";
  summary: string;
  unlockLabel: string;
  goal: ChallengeGoal;
  goalLabel: string;
  allowed: string[];
  disabled: string[];
  rewardLevels: ChallengeRewardLevel[];
};

export const challengeSpecs: ChallengeSpec[] = [
  {
    id: "bare-hands",
    name: "Bare Hands",
    chunk: "Ember Trials",
    summary: "Weapons are disabled. Training, charms, and armor have to carry the first boss.",
    unlockLabel: "Complete the first Legacy Rite.",
    goal: { type: "defeatBoss", bossId: "elder-bramblemaw" },
    goalLabel: "Defeat Elder Bramblemaw",
    allowed: ["Training", "Armor", "Charms", "Offline bank"],
    disabled: ["Weapon stats"],
    rewardLevels: [
      { level: 1, label: "Complete", reward: "+5% base attack" },
      { level: 2, seconds: 45 * 60, label: "Under 45m", reward: "+8% base attack" },
      { level: 3, seconds: 30 * 60, label: "Under 30m", reward: "Start runs with +1 Weapon Forms" },
      { level: 4, seconds: 20 * 60, label: "Under 20m", reward: "Auto-equip ignores weaker weapons" },
      { level: 5, seconds: 12 * 60, label: "Under 12m", reward: "Weapon Doctrine preview" }
    ]
  },
  {
    id: "no-campfire",
    name: "No Campfire",
    chunk: "Ember Trials",
    summary: "Recovery is heavily reduced and banked time is disabled.",
    unlockLabel: "Complete the first Legacy Rite.",
    goal: { type: "defeatBoss", bossId: "stonebound-matriarch" },
    goalLabel: "Defeat Stonebound Matriarch",
    allowed: ["Training", "Gear", "Manual area travel"],
    disabled: ["Banked time", "Fast recovery"],
    rewardLevels: [
      { level: 1, label: "Complete", reward: "+10% recovery speed" },
      { level: 2, seconds: 90 * 60, label: "Under 90m", reward: "+15% recovery speed" },
      { level: 3, seconds: 65 * 60, label: "Under 65m", reward: "Defeats lose less route momentum" },
      { level: 4, seconds: 45 * 60, label: "Under 45m", reward: "Auto-route safer retreat preview" },
      { level: 5, seconds: 30 * 60, label: "Under 30m", reward: "Camp Discipline preview" }
    ]
  },
  {
    id: "greenhorn-route",
    name: "Greenhorn Route",
    chunk: "Ember Trials",
    summary: "Auto-boss and auto-advance are disabled. Push the route manually.",
    unlockLabel: "Complete the first Legacy Rite.",
    goal: { type: "reachArea", areaId: "moonfen-ruins" },
    goalLabel: "Reach Moonfen Ruins",
    allowed: ["Training", "Gear", "Manual bosses"],
    disabled: ["Auto-boss", "Auto-advance"],
    rewardLevels: [
      { level: 1, label: "Complete", reward: "+5% area progress speed" },
      { level: 2, seconds: 75 * 60, label: "Under 75m", reward: "+10% area progress speed" },
      { level: 3, seconds: 50 * 60, label: "Under 50m", reward: "Better next-wall estimates" },
      { level: 4, seconds: 35 * 60, label: "Under 35m", reward: "Solved-area skip preview" },
      { level: 5, seconds: 22 * 60, label: "Under 22m", reward: "Route Memory preview" }
    ]
  }
];

export function getChallengeSpec(challengeId: string): ChallengeSpec | undefined {
  return challengeSpecs.find((challenge) => challenge.id === challengeId);
}

export function createChallengeRecords(): Record<string, ChallengeRecord> {
  return Object.fromEntries(
    challengeSpecs.map((challenge) => [
      challenge.id,
      {
        level: 0,
        completions: 0
      }
    ])
  );
}

export function reviveChallengeRecords(records: Partial<Record<string, Partial<ChallengeRecord>>> | undefined): Record<string, ChallengeRecord> {
  const fresh = createChallengeRecords();

  for (const challenge of challengeSpecs) {
    const existing = records?.[challenge.id];

    fresh[challenge.id] = {
      level: normalizeChallengeLevel(existing?.level),
      bestSeconds: existing?.bestSeconds === undefined ? undefined : Math.max(0, Number(existing.bestSeconds)),
      completions: Math.max(0, Math.floor(Number(existing?.completions ?? 0)))
    };
  }

  return fresh;
}

export function getChallengeRecord(state: GameState, challengeId: string): ChallengeRecord {
  return state.challenges.records[challengeId] ?? { level: 0, completions: 0 };
}

export function isChallengeUnlocked(state: GameState, challenge: ChallengeSpec): boolean {
  if (state.player.prestige > 0) {
    return true;
  }

  const capstoneCleared = Boolean(state.areas["moonfen-ruins"]?.bossDefeated);
  return capstoneCleared || getChallengeRecord(state, challenge.id).level > 0;
}

export function getChallengeElapsedSeconds(state: GameState): number {
  return state.challenges.active ? Math.max(0, state.updatedAt - state.challenges.active.startedAt) : 0;
}

export function getChallengeCompletionLevel(challenge: ChallengeSpec, elapsedSeconds: number): ChallengeLevel {
  let level: ChallengeLevel = 1;

  for (const rewardLevel of challenge.rewardLevels) {
    if (rewardLevel.seconds !== undefined && elapsedSeconds <= rewardLevel.seconds && rewardLevel.level > level) {
      level = rewardLevel.level;
    }
  }

  return level;
}

export function getNextChallengeReward(challenge: ChallengeSpec, record: ChallengeRecord): ChallengeRewardLevel | undefined {
  return challenge.rewardLevels.find((rewardLevel) => rewardLevel.level > record.level);
}

export function getChallengeStatMultiplier(state: GameState, stat: keyof StatBlock): number {
  if (stat === "attack") {
    const level = getChallengeRecord(state, "bare-hands").level;

    if (level >= 5) {
      return 1.1;
    }

    return level >= 2 ? 1.08 : level >= 1 ? 1.05 : 1;
  }

  if (stat === "recoveryRate") {
    const level = getChallengeRecord(state, "no-campfire").level;

    if (level >= 5) {
      return 1.25;
    }

    return level >= 2 ? 1.15 : level >= 1 ? 1.1 : 1;
  }

  return 1;
}

export function getChallengeProgressMultiplier(state: GameState): number {
  const level = getChallengeRecord(state, "greenhorn-route").level;

  if (level >= 5) {
    return 1.2;
  }

  if (level >= 4) {
    return 1.15;
  }

  return level >= 2 ? 1.1 : level >= 1 ? 1.05 : 1;
}

export function getActiveChallengeStatMultiplier(state: GameState, stat: keyof StatBlock): number {
  if (state.challenges.active?.challengeId === "no-campfire" && stat === "recoveryRate") {
    return 0.35;
  }

  return 1;
}

export function isEquipmentSlotEnabled(state: GameState, slot: EquipmentSlot): boolean {
  if (state.challenges.active?.challengeId === "bare-hands" && slot === "weapon") {
    return false;
  }

  return true;
}

export function isChallengeSystemEnabled(state: GameState, system: "bankedTime" | "autoBoss" | "autoAdvance"): boolean {
  const activeChallengeId = state.challenges.active?.challengeId;

  if (activeChallengeId === "no-campfire" && system === "bankedTime") {
    return false;
  }

  if (activeChallengeId === "greenhorn-route" && (system === "autoBoss" || system === "autoAdvance")) {
    return false;
  }

  return true;
}

function normalizeChallengeLevel(value: unknown): ChallengeLevel {
  const level = Math.max(0, Math.min(5, Math.floor(Number(value ?? 0))));
  return level as ChallengeLevel;
}
