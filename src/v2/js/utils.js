const ABC = "qazwsxedcrfvtgbyhnujmikolp";
const ABC_INDEX = Array.from(ABC).reduce((acc, char) => {
  acc[char] = ABC.indexOf(char);
  return acc;
}, {});
export const abccmp = (a, b) => ABC_INDEX[a] - ABC_INDEX[b];
export const intcmp = (a, b) => b - a;
export const euclidian = (dx, dy) => Math.sqrt((dx * dx) + (dy * dy));
export const scale = (f, dx, dy) => {
  return [f * dx, f * dy];
};
export const normalize = (dx, dy, f = 1) => {
  const d = Math.max(euclidian(dx, dy), 0.001);
  return scale(f / d, dx, dy);
};
export const count = (arr, fxn) =>
  arr.reduce((acc, val) => fxn(val) ? acc + 1 : acc, 0);
export const toDictOn = (key) => (acc, val) => {
  acc[val[key]] = val;
  return acc;
};
export const taxicab = (dx, dy) => Math.abs(dx) + Math.abs(dy);
export const rand = (lo, hi) => lo + Math.random() * (hi - lo);
export const range = (n) => Array(n).fill(0).map((_, i) => i);
export const getAt = (arr, i) => arr[i % arr.length];
export const round = (n) => Math.round(n * 2) * 0.5;
