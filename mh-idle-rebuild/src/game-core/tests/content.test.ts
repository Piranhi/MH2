import { describe, expect, it } from "vitest";
import { gameContent } from "../content/content";
import { validateContent } from "../content/validation";

describe("content validation", () => {
  it("ships with valid MVP content references", () => {
    expect(validateContent(gameContent)).toEqual([]);
  });
});
