import { bankOfflineTime, createGame, markSeen } from "../game-core/game";
import { parseGameSave, serializeGame } from "../game-core/save";
import type { GameState } from "../game-core/types";

const saveKey = "hunter-idle-rebuild.save.v1";

export function loadBrowserSave(): GameState {
  const raw = window.localStorage.getItem(saveKey);

  if (!raw) {
    return createGame(Date.now() / 1000);
  }

  try {
    return bankOfflineTime(parseGameSave(raw), Date.now() / 1000);
  } catch {
    return createGame(Date.now() / 1000);
  }
}

export function writeBrowserSave(state: GameState): void {
  window.localStorage.setItem(saveKey, serializeGame(markSeen(state, Date.now() / 1000)));
}

export function clearBrowserSave(): GameState {
  window.localStorage.removeItem(saveKey);
  return createGame(Date.now() / 1000);
}
