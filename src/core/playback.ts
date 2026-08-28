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

const SWIPE_DURATION_MIN = 1_100;
const SWIPE_DURATION_RANGE = 900;
const SWIPE_PAUSE_MIN = 450;
const SWIPE_PAUSE_RANGE = 1_750;
const SWIPE_DISTANCE_MIN = 0.65;
const SWIPE_DISTANCE_RANGE = 0.7;
const SWIPE_DECELERATION_MIN = 0.9974;
const SWIPE_DECELERATION_RANGE = 0.0012;

export type InertialSwipe = Readonly<{
  startedAt: number;
  duration: number;
  nextAt: number;
  distance: number;
  deceleration: number;
}>;

export const createInertialSwipe = (
  startedAt: number,
  pixelsPerSecond: number,
  random: () => number,
): InertialSwipe => {
  const duration = SWIPE_DURATION_MIN + random() * SWIPE_DURATION_RANGE;
  const pause = SWIPE_PAUSE_MIN + random() * SWIPE_PAUSE_RANGE;
  const distanceFactor = SWIPE_DISTANCE_MIN + random() * SWIPE_DISTANCE_RANGE;
  const deceleration =
    SWIPE_DECELERATION_MIN + random() * SWIPE_DECELERATION_RANGE;
  const interval = duration + pause;
  return {
    startedAt,
    duration,
    nextAt: startedAt + interval,
    distance: scrollDistance(pixelsPerSecond, interval) * distanceFactor,
    deceleration,
  };
};

export const inertialSwipePosition = (
  swipe: InertialSwipe,
  timestamp: number,
): number => {
  const elapsed = Math.min(
    swipe.duration,
    Math.max(0, timestamp - swipe.startedAt),
  );
  const travelled = 1 - swipe.deceleration ** elapsed;
  const total = 1 - swipe.deceleration ** swipe.duration;
  return swipe.distance * (travelled / total);
};

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
