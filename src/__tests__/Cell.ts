import {Cell} from '../Cell';
import {Formula} from '../Formula';

test('`calc()` will throw outside a formula', () => {
  const cell = new Cell(1);

  expect(() => cell.calc()).toThrow();
});

test('`set()` will throw inside a formula', () => {
  const cell = new Cell(1);
  const formula = new Formula(() => cell.set(2));

  expect(() => formula.calc()).toThrow();
});

test('get the value of a basic cell', () => {
  const cell = new Cell(1);

  expect(cell.getWithoutListening()).toEqual(1);
});

test('set the value of a basic cell', () => {
  const cell = new Cell(1);

  expect(cell.getWithoutListening()).toEqual(1);
  cell.set(2);
  expect(cell.getWithoutListening()).toEqual(2);
});
