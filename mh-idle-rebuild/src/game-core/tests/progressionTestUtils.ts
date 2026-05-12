import {
  balance,
  getBossReadiness,
  getHunterStats,
  getKillSeconds
} from "../balance";
import { gameContent } from "../content/content";
import {
  attemptBoss,
  buyTraining,
  createGame,
  equipItem,
  getSnapshot,
  selectArea,
  tick
} from "../game";
import { formatGameNumber } from "../numbers";
import {
  canBuyTraining,
  getTrainingCost,
  trainingSpecs
} from "../training";
import type { AreaSpec, GameContent, GameState, InventoryItem, ItemSpec, MonsterSpec, TrainingId } from "../types";

export type ProgressionEvent =
  | { type: "areaEntered"; at: number; areaId: string; areaName: string }
  | { type: "bossUnlocked"; at: number; areaId: string; bossName: string }
  | { type: "bossAttempted"; at: number; areaId: string; bossName: string; readiness: number }
  | { type: "bossCleared"; at: number; areaId: string; bossName: string }
  | { type: "prestigeReady"; at: number; gain: number };

export type ProgressionRunResult = {
  elapsedSeconds: number;
  events: ProgressionEvent[];
  state: GameState;
};

export function findArea(areaId: string, content: GameContent = gameContent): AreaSpec {
  const area = content.areas.find((entry) => entry.id === areaId);

  if (!area) {
    throw new Error(`Missing area ${areaId}`);
  }

  return area;
}

export function findMonster(monsterId: string, content: GameContent = gameContent): MonsterSpec {
  const monster = content.monsters.find((entry) => entry.id === monsterId);

  if (!monster) {
    throw new Error(`Missing monster ${monsterId}`);
  }

  return monster;
}

export function findItem(itemId: string, content: GameContent = gameContent): ItemSpec {
  const item = content.items.find((entry) => entry.id === itemId);

  if (!item) {
    throw new Error(`Missing item ${itemId}`);
  }

  return item;
}

export function addItem(state: GameState, itemId: string, instanceId = `test-${itemId}`): GameState {
  return {
    ...state,
    inventory: {
      ...state.inventory,
      items: [
        ...state.inventory.items,
        {
          instanceId,
          itemId,
          acquiredAt: state.updatedAt
        }
      ]
    }
  };
}

export function unlockAreaForTest(state: GameState, areaId: string): GameState {
  const area = findArea(areaId);

  return {
    ...state,
    areas: {
      ...state.areas,
      [area.id]: {
        ...state.areas[area.id],
        visible: true,
        unlocked: true
      }
    }
  };
}

export function revealBossForTest(state: GameState, areaId: string): GameState {
  const area = findArea(areaId);

  return {
    ...state,
    areas: {
      ...state.areas,
      [area.id]: {
        ...state.areas[area.id],
        visible: true,
        unlocked: true,
        progress: area.progressRequired,
        bossUnlocked: true
      }
    }
  };
}

export function equipBestItems(state: GameState, content: GameContent = gameContent): GameState {
  const bestBySlot = new Map<string, InventoryItem>();

  for (const item of state.inventory.items) {
    const spec = content.items.find((entry) => entry.id === item.itemId);

    if (!spec?.slot) {
      continue;
    }

    const current = bestBySlot.get(spec.slot);
    const currentSpec = current ? content.items.find((entry) => entry.id === current.itemId) : undefined;

    if (!currentSpec || spec.value > currentSpec.value) {
      bestBySlot.set(spec.slot, item);
    }
  }

  let equipped = state;

  for (const item of bestBySlot.values()) {
    equipped = equipItem(equipped, item.instanceId, content);
  }

  return equipped;
}

export function buyAffordableTraining(state: GameState, maxPurchases = 50): GameState {
  let trained = state;

  for (let purchase = 0; purchase < maxPurchases; purchase += 1) {
    const affordable = trainingSpecs
      .filter((training) => canBuyTraining(trained, training.id))
      .sort((a, b) => getTrainingCost(trained, a.id).cmp(getTrainingCost(trained, b.id)));

    const nextTraining = pickTraining(affordable.map((training) => training.id), trained);

    if (!nextTraining) {
      return trained;
    }

    trained = buyTraining(trained, nextTraining);
  }

  return trained;
}

export function getKillSecondsForMonster(state: GameState, monsterId: string, content: GameContent = gameContent): number {
  return getKillSeconds(getHunterStats(state, content), findMonster(monsterId, content));
}

export function getBossReadinessForArea(state: GameState, areaId: string, content: GameContent = gameContent): number {
  const area = findArea(areaId, content);
  return getBossReadiness(getHunterStats(state, content), findMonster(area.bossId, content));
}

export function runProgressionPolicy({
  maxSeconds = 10 * 3600,
  stepSeconds = 30,
  bossReadinessThreshold = 0.9,
  content = gameContent
}: {
  maxSeconds?: number;
  stepSeconds?: number;
  bossReadinessThreshold?: number;
  content?: GameContent;
} = {}): ProgressionRunResult {
  let state = createGame(0);
  let elapsedSeconds = 0;
  let selectedAreaId = state.hunt.selectedAreaId;
  const bossUnlockedAreas = new Set<string>();
  const bossClearedAreas = new Set<string>();
  let prestigeReadyRecorded = false;
  const events: ProgressionEvent[] = [
    {
      type: "areaEntered",
      at: 0,
      areaId: selectedAreaId,
      areaName: findArea(selectedAreaId, content).name
    }
  ];

  while (elapsedSeconds < maxSeconds) {
    state = tick(state, stepSeconds, content);
    elapsedSeconds += stepSeconds;
    state = equipBestItems(state, content);
    state = buyAffordableTraining(state);

    const snapshot = getSnapshot(state, content);
    const area = snapshot.currentArea;
    const areaState = state.areas[area.id];

    if (selectedAreaId !== state.hunt.selectedAreaId) {
      selectedAreaId = state.hunt.selectedAreaId;
      events.push({
        type: "areaEntered",
        at: elapsedSeconds,
        areaId: selectedAreaId,
        areaName: findArea(selectedAreaId, content).name
      });
    }

    if (areaState.bossUnlocked && !bossUnlockedAreas.has(area.id)) {
      bossUnlockedAreas.add(area.id);
      events.push({
        type: "bossUnlocked",
        at: elapsedSeconds,
        areaId: area.id,
        bossName: snapshot.boss.name
      });
    }

    if (
      areaState.bossUnlocked &&
      !areaState.bossDefeated &&
      state.hunt.phase !== "fighting" &&
      snapshot.bossReadiness >= bossReadinessThreshold &&
      snapshot.hunterHealthPercent >= balance.bossAttemptHealthPercent * 100
    ) {
      events.push({
        type: "bossAttempted",
        at: elapsedSeconds,
        areaId: area.id,
        bossName: snapshot.boss.name,
        readiness: snapshot.bossReadiness
      });
      state = attemptBoss(state, content);
    }

    for (const routeArea of content.areas) {
      const routeAreaState = state.areas[routeArea.id];

      if (routeAreaState.bossDefeated && !bossClearedAreas.has(routeArea.id)) {
        bossClearedAreas.add(routeArea.id);
        events.push({
          type: "bossCleared",
          at: elapsedSeconds,
          areaId: routeArea.id,
          bossName: findMonster(routeArea.bossId, content).name
        });
      }
    }

    const nextAreaId = area.unlocksAreaId;

    if (areaState.bossDefeated && nextAreaId && state.areas[nextAreaId]?.unlocked) {
      state = selectArea(state, nextAreaId, content);
    }

    const currentPrestige = getSnapshot(state, content).prestige;

    if (currentPrestige.canPrestige && !prestigeReadyRecorded) {
      prestigeReadyRecorded = true;
      events.push({
        type: "prestigeReady",
        at: elapsedSeconds,
        gain: currentPrestige.gain
      });
    }
  }

  return {
    elapsedSeconds,
    events,
    state
  };
}

export function buildProgressionReport(result = runProgressionPolicy()): string {
  const snapshot = getSnapshot(result.state);
  const lines = [
    "Progression Report",
    "==================",
    `Elapsed: ${formatDuration(result.elapsedSeconds)}`,
    `Current Area: ${snapshot.currentArea.name}`,
    `Power / Survival: ${Math.round(snapshot.power)} / ${Math.round(snapshot.survival)}`,
    `Hunter HP / Recovery: ${Math.round(snapshot.hunterHp)} / ${Math.round(snapshot.survival)} (${roundTo(snapshot.recoveryPerSecond, 1)}/s, ${roundTo(snapshot.betweenBattleRecoveryPerSecond, 1)}/s between)`,
    `Gold / Renown: ${formatGameNumber(result.state.player.gold)} / ${formatGameNumber(result.state.player.renown)}`,
    `Prestige: ${snapshot.prestige.canPrestige ? `READY +${snapshot.prestige.gain}` : snapshot.prestige.capstoneCleared ? `waiting for renown (${formatGameNumber(snapshot.prestige.nextRenown)})` : "locked behind Moonfen capstone"}`,
    `Automation: autoBoss=${String(result.state.unlocks.autoBoss)}, autoAdvance=${String(result.state.unlocks.autoAdvanceArea)}`,
    "",
    "Route Events:"
  ];

  for (const event of result.events) {
    lines.push(`- ${formatDuration(event.at)} ${formatEvent(event)}`);
  }

  lines.push("", "Area State:");

  for (const area of gameContent.areas) {
    const areaState = result.state.areas[area.id];
    const readiness = getBossReadinessForArea(result.state, area.id);

    lines.push(
      `- T${area.tier} ${area.name}: ${areaState.visible ? "visible" : "hidden"}, ${areaState.unlocked ? "open" : "locked"}, progress ${Math.round(areaState.progress)}/${area.progressRequired}, boss ${areaState.bossDefeated ? "cleared" : areaState.bossUnlocked ? "revealed" : "hidden"}, readiness ${Math.round(readiness * 100)}%`
    );
  }

  lines.push("", "Training:");

  for (const training of trainingSpecs) {
    lines.push(`- ${training.name}: ${result.state.training[training.id].level}`);
  }

  lines.push("", `Inventory Items: ${result.state.inventory.items.length}`);

  return lines.join("\n");
}

function pickTraining(trainingIds: TrainingId[], state: GameState): TrainingId | undefined {
  if (trainingIds.length === 0) {
    return undefined;
  }

  const snapshot = getSnapshot(state);
  const area = snapshot.currentArea;
  const areaState = state.areas[area.id];

  if (areaState.bossUnlocked && snapshot.bossReadiness < 0.9) {
    return trainingIds.includes("mending") && snapshot.hunterHealthPercent < 80
      ? "mending"
      : trainingIds.includes("guard") && snapshot.survival < snapshot.boss.threat
      ? "guard"
      : trainingIds.includes("might")
        ? "might"
        : trainingIds[0];
  }

  return trainingIds[0];
}

function formatEvent(event: ProgressionEvent): string {
  if (event.type === "areaEntered") {
    return `entered ${event.areaName}`;
  }

  if (event.type === "bossUnlocked") {
    return `revealed ${event.bossName}`;
  }

  if (event.type === "bossAttempted") {
    return `attempted ${event.bossName} at ${Math.round(event.readiness * 100)}% readiness`;
  }

  if (event.type === "bossCleared") {
    return `cleared ${event.bossName}`;
  }

  return `prestige ready for +${event.gain}`;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
