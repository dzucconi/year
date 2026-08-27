import { describe, expect, it } from "vitest";

import {
  accumulateScroll,
  normalizeScrollPosition,
  scrollDistance,
  stackedYearAt,
  wrapStackedYear,
} from "./playback.ts";

describe("playback", () => {
  it("derives stacked years from elapsed time and wraps", () => {
    expect(stackedYearAt(2000n, 1000, 12)).toBe(2012n);
    expect(wrapStackedYear(199999n)).toBe(1970n);
    expect(wrapStackedYear(1969n)).toBe(199998n);
  });

  it("normalizes forward and backward scroll positions", () => {
    expect(normalizeScrollPosition(100n, 550, 100, 4)).toEqual({
      anchorYear: 101n,
      scrollTop: 450,
      progress: 0.5,
      yearsMoved: 1,
    });
    expect(normalizeScrollPosition(100n, 390, 100, 4)).toEqual({
      anchorYear: 99n,
      scrollTop: 490,
      progress: 0.9,
      yearsMoved: -1,
    });
  });

  it("ignores sub-pixel drift at a year boundary", () => {
    expect(normalizeScrollPosition(2240n, 399.75, 100, 4)).toEqual({
      anchorYear: 2240n,
      scrollTop: 399.75,
      progress: -0.0025,
      yearsMoved: 0,
    });
  });

  it("converts years per minute into viewport distance", () => {
    expect(scrollDistance(1200, 1, 60_000)).toBe(1200);
    expect(scrollDistance(1200, -2, 30_000)).toBe(-1200);
  });

  it("accumulates sub-pixel scroll in either direction", () => {
    expect(accumulateScroll(0.8, 0.4)).toEqual({
      pixels: 1,
      remainder: 0.20000000000000018,
    });
    expect(accumulateScroll(-0.8, -0.4)).toEqual({
      pixels: -1,
      remainder: -0.20000000000000018,
    });
  });

  it("can rebase ten thousand years without growing state", () => {
    expect(normalizeScrollPosition(0n, 1_000_400, 100, 4).anchorYear).toBe(
      10_000n,
    );
  });
});
