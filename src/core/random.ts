export type Random = () => number;

const hash = (value: string): number => {
  let result = 0x811c9dc5;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
};

export const seededRandom = (seed: string): Random => {
  let state = hash(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const randomFor = (seed: string | null, scope: string): Random =>
  seed === null ? Math.random : seededRandom(`${seed}:${scope}`);

export const randomInteger = (
  random: Random,
  minimum: number,
  exclusiveMaximum: number,
): number => Math.floor(random() * (exclusiveMaximum - minimum)) + minimum;

export const choose = <Value>(
  random: Random,
  values: readonly Value[],
): Value => {
  const value = values[randomInteger(random, 0, values.length)];
  if (value === undefined)
    throw new Error("Cannot choose from an empty collection");
  return value;
};
