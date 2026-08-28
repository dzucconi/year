import { modulo } from "./calendar.ts";

export const STACKED_MIN_YEAR = 1970n;
export const STACKED_MAX_YEAR = 199998n;
const STACKED_YEAR_COUNT = STACKED_MAX_YEAR - STACKED_MIN_YEAR + 1n;

export const wrapStackedYear = (year: bigint): bigint =>
  STACKED_MIN_YEAR + modulo(year - STACKED_MIN_YEAR, STACKED_YEAR_COUNT);

export const stackedYearAt = (
  initialYear: bigint,
  elapsedMilliseconds: number,
  yearsPerSecond: number,
): bigint =>
  wrapStackedYear(
    initialYear +
      BigInt(Math.floor((elapsedMilliseconds * yearsPerSecond) / 1000)),
  );

export type ScrollPosition = Readonly<{
  anchorYear: bigint;
  scrollTop: number;
  progress: number;
  yearsMoved: number;
}>;

export const normalizeScrollPosition = (
  anchorYear: bigint,
  scrollTop: number,
  yearHeight: number,
  anchorIndex: number,
): ScrollPosition => {
  if (!(yearHeight > 0)) {
    return { anchorYear, scrollTop, progress: 0, yearsMoved: 0 };
  }

  const anchorTop = anchorIndex * yearHeight;
  const rawYearsMoved = (scrollTop - anchorTop) / yearHeight;
  const nearestBoundary = Math.round(rawYearsMoved);
  const flooredYearsMoved = Math.floor(
    Math.abs(rawYearsMoved - nearestBoundary) * yearHeight < 1
      ? nearestBoundary
      : rawYearsMoved,
  );
  const yearsMoved = flooredYearsMoved === 0 ? 0 : flooredYearsMoved;
  const normalizedTop = scrollTop - yearsMoved * yearHeight;
  return {
    anchorYear: anchorYear + BigInt(yearsMoved),
    scrollTop: normalizedTop,
    progress: (normalizedTop - anchorTop) / yearHeight,
    yearsMoved,
  };
};

export const scrollDistance = (
  pixelsPerSecond: number,
  elapsedMilliseconds: number,
): number => pixelsPerSecond * (elapsedMilliseconds / 1_000);

const SWIPE_TAU_MIN = 255;
const SWIPE_TAU_RANGE = 85;
const SWIPE_DURATION_FACTOR_MIN = 3.05;
const SWIPE_DURATION_FACTOR_RANGE = 1.35;
const SWIPE_OVERLAP_CHANCE = 0.4;
const SWIPE_OVERLAP_PROGRESS_MIN = 0.46;
const SWIPE_OVERLAP_PROGRESS_RANGE = 0.36;
const SWIPE_PAUSE_CHANCE = 0.44;
const SWIPE_PAUSE_MIN = 35;
const SWIPE_PAUSE_RANGE = 220;
const SWIPE_GLANCE_MIN = 420;
const SWIPE_GLANCE_RANGE = 700;
const SWIPE_DISTANCE_MIN = 0.7;
const SWIPE_DISTANCE_RANGE = 0.75;

export type InertialSwipe = Readonly<{
  startedAt: number;
  duration: number;
  nextAt: number;
  distance: number;
  tau: number;
}>;

const swipeCurve = (elapsed: number, duration: number, tau: number): number => {
  const t = Math.min(duration, Math.max(0, elapsed));
  const travelled = 1 - Math.exp(-t / tau);
  const total = 1 - Math.exp(-duration / tau);
  return travelled / total;
};

const swipeGap = (random: () => number, duration: number): number => {
  const roll = random();
  if (roll < SWIPE_OVERLAP_CHANCE) {
    const progress =
      SWIPE_OVERLAP_PROGRESS_MIN +
      (roll / SWIPE_OVERLAP_CHANCE) * SWIPE_OVERLAP_PROGRESS_RANGE;
    return duration * progress - duration;
  }
  if (roll < SWIPE_OVERLAP_CHANCE + SWIPE_PAUSE_CHANCE) {
    const progress = (roll - SWIPE_OVERLAP_CHANCE) / SWIPE_PAUSE_CHANCE;
    return SWIPE_PAUSE_MIN + progress * SWIPE_PAUSE_RANGE;
  }
  const progress =
    (roll - SWIPE_OVERLAP_CHANCE - SWIPE_PAUSE_CHANCE) /
    (1 - SWIPE_OVERLAP_CHANCE - SWIPE_PAUSE_CHANCE);
  return SWIPE_GLANCE_MIN + progress * SWIPE_GLANCE_RANGE;
};

export const createInertialSwipe = (
  startedAt: number,
  pixelsPerSecond: number,
  random: () => number,
): InertialSwipe => {
  const tau = SWIPE_TAU_MIN + random() * SWIPE_TAU_RANGE;
  const duration =
    tau * (SWIPE_DURATION_FACTOR_MIN + random() * SWIPE_DURATION_FACTOR_RANGE);
  const gap = swipeGap(random, duration);
  const distanceFactor = SWIPE_DISTANCE_MIN + random() * SWIPE_DISTANCE_RANGE;
  const interval = duration + gap;
  const travelled = swipeCurve(interval, duration, tau);
  const distance =
    (scrollDistance(pixelsPerSecond, interval) * distanceFactor) / travelled;
  return {
    startedAt,
    duration,
    nextAt: startedAt + interval,
    distance,
    tau,
  };
};

export const inertialSwipePosition = (
  swipe: InertialSwipe,
  timestamp: number,
): number =>
  swipe.distance *
  swipeCurve(timestamp - swipe.startedAt, swipe.duration, swipe.tau);

export type AccumulatedScroll = Readonly<{
  pixels: number;
  remainder: number;
}>;

export const accumulateScroll = (
  remainder: number,
  distance: number,
): AccumulatedScroll => {
  const total = remainder + distance;
  const pixels = Math.trunc(total);
  return { pixels, remainder: total - pixels };
};
