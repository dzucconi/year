import { describe, expect, it } from "vitest";

import {
  calendarForYear,
  formatYear,
  isLeapYear,
  modulo,
  yearsAround,
} from "./calendar.ts";

describe("proleptic Gregorian calendar", () => {
  it("uses Euclidean modulo for negative values", () => {
    expect(modulo(-1n, 400n)).toBe(399n);
  });

  it("handles Gregorian leap centuries and astronomical year zero", () => {
    expect(isLeapYear(2000n)).toBe(true);
    expect(isLeapYear(1900n)).toBe(false);
    expect(isLeapYear(0n)).toBe(true);
    expect(isLeapYear(-400n)).toBe(true);
  });

  it("computes known January weekdays", () => {
    expect(calendarForYear(1970n).months[0]?.firstWeekday).toBe(4);
    expect(calendarForYear(2000n).months[0]?.firstWeekday).toBe(6);
    expect(calendarForYear(2024n).months[0]?.firstWeekday).toBe(1);
  });

  it("repeats its shape every 400 years in either direction", () => {
    const shape = (year: bigint) =>
      calendarForYear(year).months.map(({ length, firstWeekday }) => ({
        length,
        firstWeekday,
      }));
    expect(shape(2240n)).toEqual(shape(2640n));
    expect(shape(-160n)).toEqual(shape(240n));
  });

  it("formats and windows signed years", () => {
    expect(formatYear(-12n)).toBe("−12");
    expect(formatYear(0n)).toBe("0");
    expect(yearsAround(0n, 9)).toEqual([
      -4n,
      -3n,
      -2n,
      -1n,
      0n,
      1n,
      2n,
      3n,
      4n,
    ]);
  });
});
