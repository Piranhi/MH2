import { add, gameNumber, greaterThanOrEqual, multiply, power, subtract } from "./numbers";
import type { GameNumber, GameNumberSource } from "./numbers";
import type { GameState, StatBlock, TrainingId, TrainingState } from "./types";

export type TrainingSpec = {
  id: TrainingId;
  name: string;
  description: string;
  stat: keyof StatBlock;
  statGain: number;
  baseCost: GameNumberSource;
  costGrowth: number;
};

export const trainingSpecs: TrainingSpec[] = [
  {
    id: "might",
    name: "Weapon Forms",
    description: "Practiced strikes increase attack.",
    stat: "attack",
    statGain: 3,
    baseCost: 25,
    costGrowth: 1.55
  },
  {
    id: "vigor",
    name: "Hard Conditioning",
    description: "Long marches increase health.",
    stat: "health",
    statGain: 18,
    baseCost: 20,
    costGrowth: 1.5
  },
  {
    id: "guard",
    name: "Guard Drills",
    description: "Defensive drills increase defence.",
    stat: "defence",
    statGain: 2,
    baseCost: 30,
    costGrowth: 1.6
  },
  {
    id: "mending",
    name: "Field Mending",
    description: "Triage habits increase health recovery.",
    stat: "recoveryRate",
    statGain: 0.0005,
    baseCost: 35,
    costGrowth: 1.58
  }
];

export function createTrainingState(): Record<TrainingId, TrainingState> {
  return Object.fromEntries(trainingSpecs.map((spec) => [spec.id, { level: 0 }])) as Record<TrainingId, TrainingState>;
}

export function getTrainingCost(state: GameState, trainingId: TrainingId): GameNumber {
  const spec = getTrainingSpec(trainingId);
  const level = state.training?.[trainingId]?.level ?? 0;
  return getTrainingCostAtLevel(spec, level);
}

export function canBuyTraining(state: GameState, trainingId: TrainingId): boolean {
  return greaterThanOrEqual(state.player.gold, getTrainingCost(state, trainingId));
}

export function getTrainingSpec(trainingId: TrainingId): TrainingSpec {
  const spec = trainingSpecs.find((entry) => entry.id === trainingId);
  if (!spec) {
    throw new Error(`Missing training ${trainingId}`);
  }

  return spec;
}

export function getTotalTrainingLevels(state: GameState): number {
  return Object.values(state.training ?? {}).reduce((total, training) => total + training.level, 0);
}

export function getTrainingBonus(state: GameState, trainingId: TrainingId): number {
  const spec = getTrainingSpec(trainingId);
  const level = state.training?.[trainingId]?.level ?? 0;

  return roundTrainingBonus(spec.statGain * getTrainingLevelEffect(level) * getTrainingPotency(state));
}

export function getNextTrainingGain(state: GameState, trainingId: TrainingId): number {
  const spec = getTrainingSpec(trainingId);
  const level = state.training?.[trainingId]?.level ?? 0;
  const current = spec.statGain * getTrainingLevelEffect(level);
  const next = spec.statGain * getTrainingLevelEffect(level + 1);

  return roundTrainingBonus((next - current) * getTrainingPotency(state));
}

export function getTrainingMilestoneBonus(level: number): number {
  return Math.floor(Math.max(0, level) / 10) * 0.05;
}

export function getTrainingPotency(state: GameState): number {
  return 1 + state.player.prestige * 0.1;
}

export function getAffordableTrainingPurchases(state: GameState, trainingId: TrainingId, limit = 1000): number {
  const spec = getTrainingSpec(trainingId);
  let gold = gameNumber(state.player.gold);
  let level = state.training?.[trainingId]?.level ?? 0;
  let purchases = 0;

  while (purchases < limit) {
    const cost = getTrainingCostAtLevel(spec, level);

    if (!greaterThanOrEqual(gold, cost)) {
      break;
    }

    gold = subtract(gold, cost);
    level += 1;
    purchases += 1;
  }

  return purchases;
}

export function getTrainingPurchaseCost(state: GameState, trainingId: TrainingId, purchases: number): GameNumber {
  const spec = getTrainingSpec(trainingId);
  const startLevel = state.training?.[trainingId]?.level ?? 0;
  let total = gameNumber(0);

  for (let offset = 0; offset < Math.max(0, Math.floor(purchases)); offset += 1) {
    total = add(total, getTrainingCostAtLevel(spec, startLevel + offset));
  }

  return total;
}

export function getTrainingCostAtLevel(spec: TrainingSpec, level: number): GameNumber {
  return multiply(spec.baseCost, power(spec.costGrowth, Math.max(0, level))).ceil();
}

export function reviveTrainingState(value: Partial<Record<TrainingId, TrainingState>> | undefined): Record<TrainingId, TrainingState> {
  const fresh = createTrainingState();

  for (const spec of trainingSpecs) {
    fresh[spec.id] = {
      level: Math.max(0, Math.floor(value?.[spec.id]?.level ?? 0))
    };
  }

  return fresh;
}

function getTrainingLevelEffect(level: number): number {
  const normalizedLevel = Math.max(0, level);
  return normalizedLevel * (1 + getTrainingMilestoneBonus(normalizedLevel));
}

function roundTrainingBonus(value: number): number {
  return Math.round(value * 10000) / 10000;
}
