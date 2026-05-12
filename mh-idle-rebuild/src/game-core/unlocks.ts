import { balance } from "./balance";
import { greaterThan, greaterThanOrEqual } from "./numbers";
import { getTotalTrainingLevels } from "./training";
import type { AreaSpec, FeatureUnlocks, GameState, UnlockNotice } from "./types";

export function getFeatureUnlocks(state: GameState, currentArea: AreaSpec): FeatureUnlocks {
  const currentAreaState = state.areas[currentArea.id];
  const hasTraining = getTotalTrainingLevels(state) > 0;

  return {
    training: state.hunt.huntsCompleted >= 1 || hasTraining,
    performance: state.hunt.huntsCompleted >= 1,
    combatStats: state.hunt.huntsCompleted >= 3,
    drops: Object.values(state.resources).some((amount) => greaterThan(amount, 0)),
    inventory: state.inventory.items.length > 1,
    bossIdentity: currentAreaState.bossUnlocked || currentAreaState.bossDefeated,
    areaTravel: Object.values(state.areas).filter((area) => area.unlocked).length > 1,
    prestige: state.player.prestige > 0 || currentArea.tier > 1 || greaterThanOrEqual(state.player.renown, balance.prestigeRenownBase / 2)
  };
}

export function getUnlockNotices(features: FeatureUnlocks): UnlockNotice[] {
  const notices: UnlockNotice[] = [];

  if (features.performance) {
    notices.push({
      id: "performance",
      title: "Performance Readout",
      description: "Hunt rates are now visible."
    });
  }

  if (features.training) {
    notices.push({
      id: "training",
      title: "Training",
      description: "Gold can now be spent on hunter upgrades."
    });
  }

  if (features.combatStats) {
    notices.push({
      id: "combatStats",
      title: "Combat Stats",
      description: "Hunter combat details are now visible."
    });
  }

  if (features.drops) {
    notices.push({
      id: "drops",
      title: "Materials",
      description: "Recovered materials are now tracked."
    });
  }

  if (features.inventory) {
    notices.push({
      id: "inventory",
      title: "Inventory",
      description: "Equipment management is now available."
    });
  }

  if (features.bossIdentity) {
    notices.push({
      id: "bossIdentity",
      title: "Area Challenge",
      description: "The area boss has been revealed."
    });
  }

  if (features.areaTravel) {
    notices.push({
      id: "areaTravel",
      title: "Area Travel",
      description: "A new hunting area is open."
    });
  }

  if (features.prestige) {
    notices.push({
      id: "prestige",
      title: "Prestige",
      description: "Run resets can now build permanent power."
    });
  }

  return notices;
}
