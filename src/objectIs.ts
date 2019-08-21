/**
 * Implementation of [Object.is][1] so that consumers don’t have to ship
 * a polyfill.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
export const objectIs =
  Object.is ||
  ((x: any, y: any) => {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y;
    } else {
      return x !== x && y !== y;
    }
  });
