import {Formula} from '../Formula';
import {Cell} from '../Cell';

test('`calc()` will throw outside a formula', () => {
  const formula = new Formula(() => 1);

  expect(() => formula.calc()).toThrow();
});

test('`calc()` will throw outside a formula before calculating', () => {
  const calculate = jest.fn(() => 1);
  const formula = new Formula(calculate);

  expect(calculate).toBeCalledTimes(0);
  expect(() => formula.calc()).toThrow();
  expect(calculate).toBeCalledTimes(0);
});

test('get the result of a formula', () => {
  const formula1 = new Formula(() => 1);
  const formula2 = new Formula(() => 2);

  expect(formula1.getWithoutListening()).toEqual(1);
  expect(formula2.getWithoutListening()).toEqual(2);
});

test('get the result of a throwing formula', () => {
  const error = new Error('test');
  const formula = new Formula(() => {
    throw error;
  });

  expect(() => formula.getWithoutListening()).toThrow(error);
});

test('get the result of a formula multiple times', () => {
  const formula = new Formula(() => 42);

  expect(formula.getWithoutListening()).toEqual(42);
  expect(formula.getWithoutListening()).toEqual(42);
  expect(formula.getWithoutListening()).toEqual(42);
});

test('get the result of a throwing formula multiple times', () => {
  const error = new Error('test');
  const formula = new Formula(() => {
    throw error;
  });

  expect(() => formula.getWithoutListening()).toThrow(error);
  expect(() => formula.getWithoutListening()).toThrow(error);
  expect(() => formula.getWithoutListening()).toThrow(error);
});

test('will run a formula lazily', () => {
  const calculate = jest.fn(() => 42);
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(42);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will only run a formula once', () => {
  const calculate = jest.fn(() => 42);
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(42);
  expect(formula.getWithoutListening()).toEqual(42);
  expect(formula.getWithoutListening()).toEqual(42);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will only run a throwing formula once', () => {
  const error = new Error('test');
  const calculate = jest.fn(() => {
    throw error;
  });
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(() => formula.getWithoutListening()).toThrow(error);
  expect(() => formula.getWithoutListening()).toThrow(error);
  expect(() => formula.getWithoutListening()).toThrow(error);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will recalculate if a cell changes when there are no listeners', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const calculate = jest.fn(() => cell1.calc() + cell2.calc());
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(2);
  expect(formula.getWithoutListening()).toEqual(2);
  expect(formula.getWithoutListening()).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  cell1.set(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(formula.getWithoutListening()).toEqual(3);
  expect(formula.getWithoutListening()).toEqual(3);
  expect(formula.getWithoutListening()).toEqual(3);
  expect(calculate).toHaveBeenCalledTimes(2);
  cell2.set(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(formula.getWithoutListening()).toEqual(4);
  expect(formula.getWithoutListening()).toEqual(4);
  expect(formula.getWithoutListening()).toEqual(4);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('skips updates for integer values that are the same', () => {
  const cell = new Cell(1);
  const calculate = jest.fn(() => cell.calc());
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(1);
  expect(calculate).toHaveBeenCalledTimes(1);
  cell.set(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(formula.getWithoutListening()).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  cell.set(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(formula.getWithoutListening()).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  cell.set(3);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(formula.getWithoutListening()).toEqual(3);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('skips updates for objects values that are the same', () => {
  const object1 = {};
  const object2 = {};
  const object3 = {};
  const cell = new Cell(object1);
  const calculate = jest.fn(() => cell.calc());
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toBe(object1);
  expect(calculate).toHaveBeenCalledTimes(1);
  cell.set(object2);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(formula.getWithoutListening()).toBe(object2);
  expect(calculate).toHaveBeenCalledTimes(2);
  cell.set(object2);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(formula.getWithoutListening()).toBe(object2);
  expect(calculate).toHaveBeenCalledTimes(2);
  cell.set(object3);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(formula.getWithoutListening()).toBe(object3);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('skips updates for NaN values that are the same', () => {
  const cell = new Cell(1);
  const calculate = jest.fn(() => cell.calc());
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(1);
  expect(calculate).toHaveBeenCalledTimes(1);
  cell.set(NaN);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(formula.getWithoutListening()).toEqual(NaN);
  expect(calculate).toHaveBeenCalledTimes(2);
  cell.set(NaN);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(formula.getWithoutListening()).toEqual(NaN);
  expect(calculate).toHaveBeenCalledTimes(2);
  cell.set(3);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(formula.getWithoutListening()).toEqual(3);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('will update when a sub-calculation changes', () => {
  const cell = new Cell(1);
  const calculate1 = jest.fn(() => cell.calc());
  const formula1 = new Formula(calculate1);
  const calculate2 = jest.fn(() => formula1.calc());
  const formula2 = new Formula(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(formula2.getWithoutListening()).toEqual(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  cell.set(2);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(formula2.getWithoutListening()).toEqual(2);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(2);
});

test('skips updates for calculations that are the same when the root is recalculated', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(2);
  const calculate1 = jest.fn(() => cell1.calc() + cell2.calc());
  const formula1 = new Formula(calculate1);
  const calculate2 = jest.fn(() => formula1.calc());
  const formula2 = new Formula(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  cell1.set(2);
  cell2.set(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(1);
});

test('skips update for calculations that throw and are the same when the root is recalculated', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(2);
  const calculate1 = jest.fn(() => {
    throw cell1.calc() + cell2.calc();
  });
  const formula1 = new Formula(calculate1);
  const calculate2 = jest.fn(() => {
    try {
      formula1.calc();
      throw new Error('Expected an error to be thrown!');
    } catch (error) {
      return error;
    }
  });
  const formula2 = new Formula(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  cell1.set(2);
  cell2.set(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(1);
});

test('skips update for calculations that are the same when the sub-calculation is recalculated first', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(2);
  const calculate1 = jest.fn(() => cell1.calc() + cell2.calc());
  const formula1 = new Formula(calculate1);
  const calculate2 = jest.fn(() => formula1.calc());
  const formula2 = new Formula(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  cell1.set(2);
  cell2.set(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(formula1.getWithoutListening()).toEqual(3);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(1);
});

test('skips update for calculations that throw and are the same when the sub-calculation is recalculated first', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(2);
  const calculate1 = jest.fn(() => {
    throw cell1.calc() + cell2.calc();
  });
  const formula1 = new Formula(calculate1);
  const calculate2 = jest.fn(() => {
    try {
      formula1.calc();
      throw new Error('Expected an error to be thrown!');
    } catch (error) {
      return error;
    }
  });
  const formula2 = new Formula(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  cell1.set(2);
  cell2.set(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(() => formula1.getWithoutListening()).toThrow();
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(1);
});

test('only recursively calls `_getLatestVersion()` once per transaction', () => {
  const cell1 = new Cell(1);
  const formula1 = new Formula(() => cell1.calc());
  formula1._getLatestVersion = jest.fn(formula1._getLatestVersion);
  const formula2 = new Formula(() => formula1.calc());
  const formula3 = new Formula(
    () =>
      formula2.calc() +
      formula2.calc() +
      formula2.calc() +
      formula2.calc() +
      formula2.calc(),
  );

  expect(formula1._getLatestVersion).toHaveBeenCalledTimes(0);
  expect(formula3.getWithoutListening()).toEqual(5);
  expect(formula1._getLatestVersion).toHaveBeenCalledTimes(1);
});
