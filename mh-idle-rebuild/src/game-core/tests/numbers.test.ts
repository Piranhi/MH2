import { describe, expect, it } from "vitest";
import { createGame } from "../game";
import { formatGameNumber, gameNumber } from "../numbers";
import { parseGameSave, serializeGame } from "../save";

describe("game numbers", () => {
  it("formats early and large idle-game values", () => {
    expect(formatGameNumber(gameNumber(950))).toBe("950");
    expect(formatGameNumber(gameNumber(1250))).toBe("1.3K");
    expect(formatGameNumber(gameNumber("2.5e12"))).toBe("2.5T");
    expect(formatGameNumber(gameNumber("1e40"))).toBe("1.00e40");
  });

  it("round-trips huge saved values", () => {
    const state = createGame();
    state.player.gold = gameNumber("1e400");
    state.player.renown = gameNumber("9.5e250");
    state.resources["monster-bone"] = gameNumber("4.2e120");

    const loaded = parseGameSave(serializeGame(state));

    expect(loaded.player.gold.eq("1e400")).toBe(true);
    expect(loaded.player.renown.eq("9.5e250")).toBe(true);
    expect(loaded.resources["monster-bone"].eq("4.2e120")).toBe(true);
  });
});
