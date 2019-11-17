import * as SchedulerMock from 'scheduler/unstable_mock';
jest.mock('scheduler', () => SchedulerMock);

import {Formula} from './Formula';
import {Cell} from './Cell';
import {unstable_flushAll as flushAll} from 'scheduler/unstable_mock';

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

test('a listener will never be called when dependencies update until the formula is evaluated', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula = new Formula(() => cell1.calc() + cell2.calc());
  const listener = jest.fn(() => {});

  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  cell1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
  cell2.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
});

test('a listener will not be called when a dependency of an invalid formula updates', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula = new Formula(() => cell1.calc() + cell2.calc());
  const listener = jest.fn(() => {});

  formula.getWithoutListening();
  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  cell1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  cell2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called when a dependency updates', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula = new Formula(() => cell1.calc() + cell2.calc());
  const listener = jest.fn(() => {});

  formula.getWithoutListening();
  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  cell1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  formula.getWithoutListening();
  cell2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will never be called when a dependency of a dependency updates until the formula is evaluated', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula1 = new Formula(() => cell1.calc() + cell2.calc());
  const formula2 = new Formula(() => formula1.calc());
  const listener = jest.fn(() => {});

  formula2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  cell1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
  cell2.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
});

test('a listener will not be called when a dependency of a dependency of an invalid formula updates', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula1 = new Formula(() => cell1.calc() + cell2.calc());
  const formula2 = new Formula(() => formula1.calc());
  const listener = jest.fn(() => {});

  formula2.getWithoutListening();
  formula2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  cell1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  cell2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called when a dependency of a dependency updates', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula1 = new Formula(() => cell1.calc() + cell2.calc());
  const formula2 = new Formula(() => formula1.calc());
  const listener = jest.fn(() => {});

  formula2.getWithoutListening();
  formula2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  cell1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  formula2.getWithoutListening();
  cell2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when a removed dependency updates and the formula is invalid', () => {
  const cell1 = new Cell(true);
  const cell2 = new Cell(1);
  const formula = new Formula(() => (cell1.calc() ? cell2.calc() : 0));
  const listener = jest.fn(() => {});

  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  formula.getWithoutListening();
  cell2.set(2);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  formula.getWithoutListening();
  cell1.set(false);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
  cell2.set(3);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when a removed dependency updates', () => {
  const cell1 = new Cell(true);
  const cell2 = new Cell(1);
  const formula = new Formula(() => (cell1.calc() ? cell2.calc() : 0));
  const listener = jest.fn(() => {});

  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  formula.getWithoutListening();
  cell2.set(2);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  formula.getWithoutListening();
  cell1.set(false);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
  formula.getWithoutListening();
  cell2.set(3);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when a removed dependency updates after a recalculation', () => {
  const cell1 = new Cell(true);
  const cell2 = new Cell(1);
  const formula = new Formula(() => (cell1.calc() ? cell2.calc() : 0));
  const listener = jest.fn(() => {});

  formula.getWithoutListening();
  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  cell2.set(2);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  cell1.set(false);
  expect(formula.getWithoutListening()).toEqual(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
  cell2.set(3);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when an added dependency updates and the formula is invalid', () => {
  const cell1 = new Cell(false);
  const cell2 = new Cell(1);
  const formula = new Formula(() => (cell1.calc() ? cell2.calc() : 0));
  const listener = jest.fn(() => {});

  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  formula.getWithoutListening();
  cell2.set(2);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
  formula.getWithoutListening();
  cell1.set(true);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  cell2.set(3);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called when an added dependency updates', () => {
  const cell1 = new Cell(false);
  const cell2 = new Cell(1);
  const formula = new Formula(() => (cell1.calc() ? cell2.calc() : 0));
  const listener = jest.fn(() => {});

  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  formula.getWithoutListening();
  cell2.set(2);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
  formula.getWithoutListening();
  cell1.set(true);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  formula.getWithoutListening();
  cell2.set(3);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will be called when an added dependency updates after a recalculation', () => {
  const cell1 = new Cell(false);
  const cell2 = new Cell(1);
  const formula = new Formula(() => (cell1.calc() ? cell2.calc() : 0));
  const listener = jest.fn(() => {});

  formula.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  formula.getWithoutListening();
  cell2.set(2);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
  cell1.set(true);
  expect(formula.getWithoutListening()).toEqual(2);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  formula.getWithoutListening();
  cell2.set(3);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('updates can be synchronously observed', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula = new Formula(() => cell1.calc() + cell2.calc());

  expect(formula.getWithoutListening()).toEqual(2);
  cell1.set(2);
  expect(formula.getWithoutListening()).toEqual(3);
  cell2.set(3);
  expect(formula.getWithoutListening()).toEqual(5);
});

test('updates can be asynchronously observed', () => {
  const cell1 = new Cell(1);
  const cell2 = new Cell(1);
  const formula = new Formula(() => cell1.calc() + cell2.calc());

  expect(formula.getWithoutListening()).toEqual(2);
  cell1.set(2);
  flushAll();
  expect(formula.getWithoutListening()).toEqual(3);
  cell2.set(3);
  flushAll();
  expect(formula.getWithoutListening()).toEqual(5);
});

test('won’t recalculate when dependencies change if there are no listeners', () => {
  const cell = new Cell(1);
  const calculate = jest.fn(() => cell.calc() + 1);
  const formula = new Formula(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  cell.set(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  flushAll();
  expect(calculate).toHaveBeenCalledTimes(1);
  cell.set(3);
  expect(calculate).toHaveBeenCalledTimes(1);
  flushAll();
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(formula.getWithoutListening()).toEqual(4);
  expect(calculate).toHaveBeenCalledTimes(2);
});

test('won’t recalculate when dependencies change', () => {
  const cell = new Cell(1);
  const calculate = jest.fn(() => cell.calc() + 1);
  const formula = new Formula(calculate);

  formula.addListener(() => {});
  expect(calculate).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  cell.set(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  flushAll();
  expect(calculate).toHaveBeenCalledTimes(1);
  cell.set(3);
  expect(calculate).toHaveBeenCalledTimes(1);
  flushAll();
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(formula.getWithoutListening()).toEqual(4);
  expect(calculate).toHaveBeenCalledTimes(2);
});

test('won’t recalculate a dependency that has been removed', () => {
  const cell1 = new Cell(true);
  const cell2 = new Cell(1);
  const calculate1 = jest.fn(() => cell2.calc() + 1);
  const formula1 = new Formula(calculate1);
  const calculate2 = jest.fn(() => (cell1.calc() ? formula1.calc() + 1 : 0));
  const formula2 = new Formula(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  cell2.set(2);
  cell1.set(false);
  flushAll();
  expect(formula2.getWithoutListening()).toEqual(0);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(2);
});

test('won’t recalculate a dependency that has been removed when there are listeners', () => {
  const cell1 = new Cell(true);
  const cell2 = new Cell(1);
  const calculate1 = jest.fn(() => cell2.calc() + 1);
  const formula1 = new Formula(calculate1);
  const calculate2 = jest.fn(() => (cell1.calc() ? formula1.calc() + 1 : 0));
  const formula2 = new Formula(calculate2);

  formula2.addListener(() => {});
  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(formula2.getWithoutListening()).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  cell2.set(2);
  cell1.set(false);
  flushAll();
  expect(formula2.getWithoutListening()).toEqual(0);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(2);
});

test('won’t call the listener twice if a dependency is reused', () => {
  const cell = new Cell(1);
  const formula1 = new Formula(() => cell.calc() * 1);
  const formula2 = new Formula(() => cell.calc() + formula1.calc());
  const listener = jest.fn(() => {});

  formula2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  formula2.getWithoutListening();
  cell.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
});

// NOTE: This tests internal implementation details! Normally we don’t like
// implementation detail tests, but this test validates an important performance
// property which is not visible to the user.
test('we don’t remove dependents until after we invalidate', () => {
  const cell1 = new Cell(true);
  const cell2 = new Cell(1);
  const formula = new Formula(() => (cell1.calc() ? cell2.calc() : 0));

  const addDependent = jest.fn(cell2._addDependent.bind(cell2));
  cell2._addDependent = addDependent;
  const removeDependent = jest.fn(cell2._removeDependent.bind(cell2));
  cell2._removeDependent = removeDependent;

  const listener = () => {};

  expect(formula.getWithoutListening()).toEqual(1);
  expect(addDependent).toHaveBeenCalledTimes(0);
  expect(removeDependent).toHaveBeenCalledTimes(0);
  formula.addListener(listener);
  expect(addDependent).toHaveBeenCalledTimes(1);
  expect(removeDependent).toHaveBeenCalledTimes(0);
  cell1.set(false);
  expect(addDependent).toHaveBeenCalledTimes(1);
  expect(removeDependent).toHaveBeenCalledTimes(0);
  flushAll();
  expect(addDependent).toHaveBeenCalledTimes(1);
  expect(removeDependent).toHaveBeenCalledTimes(0);
  expect(formula.getWithoutListening()).toEqual(0);
  expect(addDependent).toHaveBeenCalledTimes(1);
  expect(removeDependent).toHaveBeenCalledTimes(1);
});
