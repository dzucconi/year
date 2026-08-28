import { describe, expect, it } from "vitest";

import { COLOR_NAMES } from "./colors.ts";
import { parseConfig } from "./config.ts";
import { choose } from "./random.ts";

const environment = {
  currentYear: 2024,
  supportsColor: (value: string) =>
    ["black", "white", "red", "#123456"].includes(value),
} as const;

describe("configuration", () => {
  it("matches the original stacked defaults", () => {
    const { config, warnings } = parseConfig(
      new URLSearchParams(),
      environment,
    );
    expect(config.mode).toBe("stacked");
    if (config.mode === "stacked") expect(config.fps).toBe(30);
    expect(warnings).toEqual([]);
  });

  it("preserves valid stacked parameters", () => {
    const { config, warnings } = parseConfig(
      new URLSearchParams(
        "year=2240&background=%23123456&color=black&play=true&subtitles=true&fps=120&refreshIntervalSeconds=0&seed=x",
      ),
      environment,
    );
    expect(config).toEqual({
      mode: "stacked",
      year: 2240n,
      background: "#123456",
      color: "black",
      play: true,
      subtitles: true,
      refreshIntervalMilliseconds: null,
      seed: "x",
      fps: 120,
    });
    expect(warnings).toEqual([]);
  });

  it("uses scroll-specific defaults and signed years", () => {
    const { config } = parseConfig(
      new URLSearchParams("mode=scroll&year=-44&speed=-2"),
      environment,
    );
    expect(config.mode).toBe("scroll");
    expect(config.year).toBe(-44n);
    expect(config.background).toBe("black");
    expect(config.color).toBe("white");
    if (config.mode === "scroll") expect(config.speed).toBe(-2);

    const defaults = parseConfig(
      new URLSearchParams("mode=scroll"),
      environment,
    ).config;
    if (defaults.mode === "scroll") expect(defaults.speed).toBe(160);
  });

  it("isolates invalid values and records concise warnings", () => {
    const { config, warnings } = parseConfig(
      new URLSearchParams(
        "year=nope&background=invalid&play=yes&fps=-1&refreshIntervalSeconds=-1&seed=",
      ),
      environment,
    );
    expect(config.mode).toBe("stacked");
    expect(config.background).toBe("white");
    expect(config.play).toBe(false);
    expect(warnings).toHaveLength(6);
  });

  it("makes seeded defaults repeatable", () => {
    const parameters = new URLSearchParams(
      "seed=repeat&background=random&color=random",
    );
    expect(parseConfig(parameters, environment).config).toEqual(
      parseConfig(parameters, environment).config,
    );
  });

  it("can select the final palette entry", () => {
    expect(choose(() => 0.999999999, COLOR_NAMES)).toBe("yellowgreen");
  });
});
