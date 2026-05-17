import { multiply, power } from "./numbers";
import type { GameState, StatBlock, TrainingId, TrainingState } from "./types";

export type TrainingSpec = {
  id: TrainingId;
  name: string;
  description: string;
  stat: keyof StatBlock;
  statGain: number;
  baseSeconds: number;
  timeGrowth: number;
};

export const trainingSpecs: TrainingSpec[] = [
  {
    id: "might",
    name: "Weapon Forms",
    description: "Practiced strikes increase attack.",
    stat: "attack",
    statGain: 3,
    baseSeconds: 45,
    timeGrowth: 1.55
  },
  {
    id: "vigor",
    name: "Hard Conditioning",
    description: "Long marches increase health.",
    stat: "health",
    statGain: 18,
    baseSeconds: 38,
    timeGrowth: 1.52
  },
  {
    id: "guard",
    name: "Guard Drills",
    description: "Defensive drills increase defence.",
    stat: "defence",
    statGain: 2,
    baseSeconds: 50,
    timeGrowth: 1.57
  },
  {
    id: "mending",
    name: "Field Mending",
    description: "Triage habits increase health recovery.",
    stat: "recoveryRate",
    statGain: 0.0005,
    baseSeconds: 55,
    timeGrowth: 1.58
  }
];

export function createTrainingState(): Record<TrainingId, TrainingState> {
  return Object.fromEntries(trainingSpecs.map((spec) => [spec.id, { level: 0, progressSeconds: 0 }])) as Record<TrainingId, TrainingState>;
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

export function getTrainingRate(state: GameState): number {
  return (1 + state.player.prestige * 0.35) * (1 + (state.settlement?.seasonsPassed ?? 0) * 0.01);
}

export function getTrainingDuration(state: GameState, trainingId: TrainingId): number {
  const spec = getTrainingSpec(trainingId);
  const level = state.training?.[trainingId]?.level ?? 0;
  return getTrainingDurationAtLevel(spec, level);
}

export function getTrainingProgressPercent(state: GameState, trainingId: TrainingId): number {
  const progress = state.training?.[trainingId]?.progressSeconds ?? 0;
  return Math.max(0, Math.min(100, (progress / getTrainingDuration(state, trainingId)) * 100));
}

export function getTrainingSecondsRemaining(state: GameState, trainingId: TrainingId): number {
  const progress = state.training?.[trainingId]?.progressSeconds ?? 0;
  return Math.max(0, (getTrainingDuration(state, trainingId) - progress) / getTrainingRate(state));
}

export function getTrainingDurationAtLevel(spec: TrainingSpec, level: number): number {
  return Math.ceil(multiply(spec.baseSeconds, power(spec.timeGrowth, Math.max(0, level))).toNumber());
}

export function advanceTrainingProgress(state: GameState, seconds: number): void {
  const activeTrainingId = state.activeTrainingId;

  if (!activeTrainingId) {
    return;
  }

  const training = state.training[activeTrainingId];

  if (!training) {
    return;
  }

  training.progressSeconds += Math.max(0, seconds) * getTrainingRate(state);

  let completions = 0;
  while (training.progressSeconds >= getTrainingDuration(state, activeTrainingId) && completions < 10000) {
    training.progressSeconds -= getTrainingDuration(state, activeTrainingId);
    training.level += 1;
    completions += 1;
  }
}

export function reviveTrainingState(value: Partial<Record<TrainingId, TrainingState>> | undefined): Record<TrainingId, TrainingState> {
  const fresh = createTrainingState();

  for (const spec of trainingSpecs) {
    fresh[spec.id] = {
      level: Math.max(0, Math.floor(value?.[spec.id]?.level ?? 0)),
      progressSeconds: Math.max(0, Number(value?.[spec.id]?.progressSeconds ?? 0))
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
