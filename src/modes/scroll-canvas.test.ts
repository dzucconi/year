import { describe, expect, it } from "vitest";

import { moveScrollCursor, scrollCanvasLayout } from "./scroll-canvas.ts";

describe("scroll canvas", () => {
  it("matches the measured phone layout", () => {
    const layout = scrollCanvasLayout(390, 844);
    expect(layout.containerWidth).toBe(390);
    expect(layout.headingSize).toBe(36);
    expect(layout.daySize).toBe(10);
    expect(layout.yearHeight).toBeCloseTo(612.92, 2);
  });

  it("preserves the centered desktop width and type scale", () => {
    const layout = scrollCanvasLayout(1440, 900);
    expect(layout.containerWidth).toBe(768);
    expect(layout.containerLeft).toBe(336);
    expect(layout.headingSize).toBe(60);
    expect(layout.daySize).toBe(14);
  });

  it("moves an infinite cursor in either direction", () => {
    expect(moveScrollCursor(2028n, 600, 20, 610)).toEqual({
      year: 2029n,
      offset: 10,
      yearsMoved: 1,
    });
    expect(moveScrollCursor(2028n, 10, -20, 610)).toEqual({
      year: 2027n,
      offset: 600,
      yearsMoved: -1,
    });
  });

  it("can jump many years without accumulating state", () => {
    expect(moveScrollCursor(0n, 0, 6_100_025, 610)).toEqual({
      year: 10_000n,
      offset: 25,
      yearsMoved: 10_000,
    });
  });
});
