export const rand = (min, max) => Math.floor(Math.random() * (max - min)) + min;

export const sample = (xs) => xs[rand(0, xs.length - 1)];
