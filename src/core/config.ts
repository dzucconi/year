import { COLOR_NAMES } from "./colors.ts";
import { choose, randomFor, randomInteger } from "./random.ts";

export type Mode = "stacked" | "scroll";

type SharedConfig = Readonly<{
  year: bigint;
  background: string;
  color: string;
  play: boolean;
  subtitles: boolean;
  refreshIntervalMilliseconds: number | null;
  seed: string | null;
}>;

export type StackedConfig = SharedConfig &
  Readonly<{
    mode: "stacked";
    fps: number;
  }>;

export type ScrollConfig = SharedConfig &
  Readonly<{
    mode: "scroll";
    speed: number;
  }>;

export type AppConfig = StackedConfig | ScrollConfig;

export type ConfigEnvironment = Readonly<{
  currentYear: number;
  supportsColor: (value: string) => boolean;
}>;

export type ParsedConfig = Readonly<{
  config: AppConfig;
  warnings: readonly string[];
}>;

const STACKED_MIN_YEAR = 1970n;
const STACKED_MAX_YEAR = 199998n;
const MAX_TIMER_SECONDS = 2_147_483.647;
const YEAR_PATTERN = /^-?\d+$/;

const parseBoolean = (
  parameters: URLSearchParams,
  key: string,
  fallback: boolean,
  warnings: string[],
): boolean => {
  const value = parameters.get(key);
  if (value === null) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  warnings.push(`${key} must be true or false`);
  return fallback;
};

const parseNumber = (
  parameters: URLSearchParams,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
  warnings: string[],
): number => {
  const value = parameters.get(key);
  if (value === null) return fallback;
  const number = Number(value);
  if (Number.isFinite(number) && number >= minimum && number <= maximum)
    return number;
  warnings.push(`${key} must be between ${minimum} and ${maximum}`);
  return fallback;
};

const parseNonNegativeNumber = (
  parameters: URLSearchParams,
  key: string,
  fallback: number,
  warnings: string[],
): number => {
  const value = parameters.get(key);
  if (value === null) return fallback;
  const number = Number(value);
  if (Number.isFinite(number) && number >= 0) return number;
  warnings.push(`${key} must be a non-negative number`);
  return fallback;
};

const parseSeed = (
  parameters: URLSearchParams,
  warnings: string[],
): string | null => {
  const seed = parameters.get("seed");
  if (seed === null) return null;
  if (seed.length > 0) return seed;
  warnings.push("seed must not be empty");
  return null;
};

const defaultYear = (
  environment: ConfigEnvironment,
  seed: string | null,
): bigint =>
  BigInt(environment.currentYear) *
  BigInt(randomInteger(randomFor(seed, "year"), 1, 10));

const parseYear = (
  parameters: URLSearchParams,
  mode: Mode,
  fallback: bigint,
  warnings: string[],
): bigint => {
  const value = parameters.get("year");
  if (value === null) return fallback;
  if (!YEAR_PATTERN.test(value)) {
    warnings.push("year must be a signed integer");
    return fallback;
  }

  const year = BigInt(value);
  if (
    mode === "stacked" &&
    (year < STACKED_MIN_YEAR || year > STACKED_MAX_YEAR)
  ) {
    warnings.push(
      `year must be between ${STACKED_MIN_YEAR} and ${STACKED_MAX_YEAR}`,
    );
    return fallback;
  }
  return year;
};

const parseColor = (
  parameters: URLSearchParams,
  key: "background" | "color",
  fallback: string,
  seed: string | null,
  environment: ConfigEnvironment,
  warnings: string[],
): string => {
  const value = parameters.get(key);
  if (value === null) return fallback;
  if (value === "random") return choose(randomFor(seed, key), COLOR_NAMES);
  if (environment.supportsColor(value)) return value;
  warnings.push(`${key} must be a valid CSS color or random`);
  return fallback;
};

const parseRefresh = (
  parameters: URLSearchParams,
  warnings: string[],
): number | null => {
  const seconds = parseNumber(
    parameters,
    "refreshIntervalSeconds",
    3600,
    0,
    MAX_TIMER_SECONDS,
    warnings,
  );
  return seconds === 0 ? null : seconds * 1000;
};

export const parseConfig = (
  parameters: URLSearchParams,
  environment: ConfigEnvironment,
): ParsedConfig => {
  const warnings: string[] = [];
  const mode: Mode = parameters.get("mode") === "scroll" ? "scroll" : "stacked";
  const seed = parseSeed(parameters, warnings);
  const fallbackYear = defaultYear(environment, seed);
  const shared = {
    year: parseYear(parameters, mode, fallbackYear, warnings),
    background: parseColor(
      parameters,
      "background",
      mode === "scroll" ? "black" : "white",
      seed,
      environment,
      warnings,
    ),
    color: parseColor(
      parameters,
      "color",
      mode === "scroll" ? "white" : "red",
      seed,
      environment,
      warnings,
    ),
    play: parseBoolean(parameters, "play", false, warnings),
    subtitles: parseBoolean(parameters, "subtitles", false, warnings),
    refreshIntervalMilliseconds: parseRefresh(parameters, warnings),
    seed,
  } as const;

  const config: AppConfig =
    mode === "scroll"
      ? {
          ...shared,
          mode,
          speed: parseNumber(parameters, "speed", 160, -720, 720, warnings),
        }
      : {
          ...shared,
          mode,
          fps: parseNonNegativeNumber(parameters, "fps", 30, warnings),
        };

  return { config, warnings };
};
