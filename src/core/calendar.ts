export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const COMMON_MONTH_LENGTHS = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
] as const;
const CYCLE_START = 2000n;
const CYCLE_YEARS = 400n;

export type MonthCalendar = Readonly<{
  name: (typeof MONTH_NAMES)[number];
  length: number;
  firstWeekday: number;
}>;

export type YearCalendar = Readonly<{
  year: bigint;
  leap: boolean;
  months: readonly MonthCalendar[];
}>;

export const modulo = (value: bigint, divisor: bigint): bigint => {
  const remainder = value % divisor;
  return remainder < 0n ? remainder + divisor : remainder;
};

export const isLeapYear = (year: bigint): boolean =>
  modulo(year, 400n) === 0n ||
  (modulo(year, 4n) === 0n && modulo(year, 100n) !== 0n);

const cycleYear = (year: bigint): number =>
  2000 + Number(modulo(year - CYCLE_START, CYCLE_YEARS));

const januaryFirst = (year: number): number => {
  const previousYear = year - 1;
  return (
    (previousYear +
      Math.floor(previousYear / 4) -
      Math.floor(previousYear / 100) +
      Math.floor(previousYear / 400) +
      1) %
    7
  );
};

export const calendarForYear = (year: bigint): YearCalendar => {
  const leap = isLeapYear(year);
  let firstWeekday = januaryFirst(cycleYear(year));

  const months = MONTH_NAMES.map((name, index): MonthCalendar => {
    const commonLength = COMMON_MONTH_LENGTHS[index];
    if (commonLength === undefined)
      throw new Error(`Missing month length at ${index}`);

    const length = index === 1 && leap ? 29 : commonLength;
    const month = { name, length, firstWeekday };
    firstWeekday = (firstWeekday + length) % 7;
    return month;
  });

  return { year, leap, months };
};

export const formatYear = (year: bigint): string =>
  year < 0n ? `−${(-year).toString()}` : year.toString();

export const yearsAround = (
  anchor: bigint,
  count: number,
): readonly bigint[] => {
  const before = BigInt(Math.floor(count / 2));
  return Array.from(
    { length: count },
    (_, index) => anchor - before + BigInt(index),
  );
};
