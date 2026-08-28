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

export const IOS_NORMAL_DECELERATION_RATE = 0.998;
const SWIPE_DECELERATION_VARIATION = 0.00012;
const SWIPE_REMAINING_VELOCITY_MIN = 0.0015;
const SWIPE_REMAINING_VELOCITY_RANGE = 0.0035;
const SWIPE_OVERLAP_CHANCE = 0.32;
const SWIPE_OVERLAP_PROGRESS_MIN = 0.62;
const SWIPE_OVERLAP_PROGRESS_RANGE = 0.26;
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
  decelerationRate: number;
}>;

const swipeCurve = (
  elapsed: number,
  duration: number,
  decelerationRate: number,
): number => {
  const t = Math.min(duration, Math.max(0, elapsed));
  const travelled = 1 - decelerationRate ** t;
  const total = 1 - decelerationRate ** duration;
  return travelled / total;
};

export const deceleratedVelocity = (
  velocity: number,
  elapsedMilliseconds: number,
  decelerationRate = IOS_NORMAL_DECELERATION_RATE,
): number => velocity * decelerationRate ** Math.max(0, elapsedMilliseconds);

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
  const decelerationRate =
    IOS_NORMAL_DECELERATION_RATE +
    (random() * 2 - 1) * SWIPE_DECELERATION_VARIATION;
  const remainingVelocity =
    SWIPE_REMAINING_VELOCITY_MIN + random() * SWIPE_REMAINING_VELOCITY_RANGE;
  const duration = Math.log(remainingVelocity) / Math.log(decelerationRate);
  const gap = swipeGap(random, duration);
  const distanceFactor = SWIPE_DISTANCE_MIN + random() * SWIPE_DISTANCE_RANGE;
  const interval = duration + gap;
  const travelled = swipeCurve(interval, duration, decelerationRate);
  const distance =
    (scrollDistance(pixelsPerSecond, interval) * distanceFactor) / travelled;
  return {
    startedAt,
    duration,
    nextAt: startedAt + interval,
    distance,
    decelerationRate,
  };
};

export const inertialSwipePosition = (
  swipe: InertialSwipe,
  timestamp: number,
): number =>
  swipe.distance *
  swipeCurve(
    timestamp - swipe.startedAt,
    swipe.duration,
    swipe.decelerationRate,
  );

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
