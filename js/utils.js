const ABC = "qazwsxedcrfvtgbyhnujmikolp";
export const cmp = (a, b) => ABC.indexOf(a) - ABC.indexOf(b);
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
