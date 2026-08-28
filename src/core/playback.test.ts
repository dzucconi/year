import { describe, expect, it } from "vitest";

import {
  accumulateScroll,
  createInertialSwipe,
  inertialSwipePosition,
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

  it("converts pixel velocity into distance", () => {
    expect(scrollDistance(120, 1_000)).toBe(120);
    expect(scrollDistance(-240, 500)).toBe(-120);
  });

  it("varies swipe duration, pause, distance, and decay", () => {
    const values = [0.25, 0.75, 0.5, 0.25];
    const swipe = createInertialSwipe(1_000, 20, () => values.shift() ?? 0);
    expect(swipe.startedAt).toBe(1_000);
    expect(swipe.tau).toBeCloseTo(276.25);
    expect(swipe.duration).toBeCloseTo(1_122.265625);
    expect(swipe.nextAt).toBeCloseTo(2_207.266);
    expect(swipe.distance).toBeCloseTo(21.429);
  });

  it("uses a longer glance pause on some flicks", () => {
    const values = [0.2, 0.4, 0.92, 0.5];
    const swipe = createInertialSwipe(0, 1_800, () => values.shift() ?? 0);
    expect(swipe.nextAt - swipe.duration).toBeGreaterThan(420);
  });

  it("can start the next flick before the coast finishes", () => {
    const values = [0.3, 0.5, 0.15, 0.5];
    const swipe = createInertialSwipe(0, 1_800, () => values.shift() ?? 0);
    expect(swipe.nextAt).toBeLessThan(swipe.duration);
    expect(
      inertialSwipePosition(swipe, swipe.nextAt) /
        inertialSwipePosition(swipe, swipe.startedAt + swipe.duration),
    ).toBeLessThan(1);
  });

  it("throws then coasts like an iPhone flick", () => {
    const forward = {
      startedAt: 0,
      duration: 1_000,
      nextAt: 1_200,
      distance: 100,
      tau: 300,
    };
    const positions = [0, 250, 500, 750, 1_000].map((timestamp) =>
      inertialSwipePosition(forward, timestamp),
    );
    const increments = positions.slice(1).map((position, index) => {
      const previous = positions[index];
      if (previous === undefined) throw new Error("Missing swipe position");
      return position - previous;
    });
    expect(positions.at(-1)).toBeCloseTo(100);
    expect(positions[1] ?? 0).toBeGreaterThan(50);
    expect(increments[0]).toBeGreaterThan(increments[1] ?? 0);
    expect(increments[1]).toBeGreaterThan(increments[2] ?? 0);
    expect(increments[2]).toBeGreaterThan(increments[3] ?? 0);
    expect(
      inertialSwipePosition({ ...forward, distance: -100 }, 500),
    ).toBeLessThan(0);
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
