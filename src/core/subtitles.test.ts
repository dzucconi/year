import { describe, expect, it } from "vitest";

import { readingDuration } from "./subtitles.ts";

describe("subtitle timing", () => {
  it("matches the legacy doubled 200-word-per-minute duration", () => {
    expect(readingDuration("one two three")).toBe(1800);
    expect(readingDuration("  one\n two  ")).toBe(1200);
    expect(readingDuration("")).toBe(0);
  });
});
