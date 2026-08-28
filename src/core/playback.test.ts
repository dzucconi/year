import { describe, expect, it } from "vitest";

import {
  createInertialSwipe,
  inertialSwipePosition,
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

  it("converts pixel velocity into distance", () => {
    expect(scrollDistance(120, 1_000)).toBe(120);
    expect(scrollDistance(-240, 500)).toBe(-120);
  });

  it("varies swipe duration, pause, distance, and decay", () => {
    const values = [0.25, 0.75, 0.5, 0.25];
    const swipe = createInertialSwipe(1_000, 20, () => values.shift() ?? 0);
    expect(swipe.startedAt).toBe(1_000);
    expect(swipe.decelerationRate).toBeCloseTo(0.99794);
    expect(swipe.duration).toBeCloseTo(2_662.637);
    expect(swipe.nextAt).toBeCloseTo(3_787.637);
    expect(swipe.distance).toBeCloseTo(49.481);
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
      duration: 3_000,
      nextAt: 3_200,
      distance: 100,
      decelerationRate: 0.998,
    };
    const positions = [0, 750, 1_500, 2_250, 3_000].map((timestamp) =>
      inertialSwipePosition(forward, timestamp),
    );
    const increments = positions.slice(1).map((position, index) => {
      const previous = positions[index];
      if (previous === undefined) throw new Error("Missing swipe position");
      return position - previous;
    });
    expect(positions.at(-1)).toBeCloseTo(100);
    expect(positions[1] ?? 0).toBeGreaterThan(50);
    expect(positions[2] ?? 100).toBeLessThan(96);
    expect(increments[0]).toBeGreaterThan(increments[1] ?? 0);
    expect(increments[1]).toBeGreaterThan(increments[2] ?? 0);
    expect(increments[2]).toBeGreaterThan(increments[3] ?? 0);
    expect(
      inertialSwipePosition({ ...forward, distance: -100 }, 500),
    ).toBeLessThan(0);
  });
});
