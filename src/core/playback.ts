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
  yearHeight: number,
  yearsPerMinute: number,
  elapsedMilliseconds: number,
): number => yearHeight * yearsPerMinute * (elapsedMilliseconds / 60_000);

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
