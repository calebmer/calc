import {Value, Calculation, withTransaction} from './index';

const tx = withTransaction;

test('value get will throw outside a transaction', () => {
  const value = new Value(1);
  expect(() => value.get()).toThrow('Must be within');
});

test('value set will throw inside a transaction', () => {
  const value = new Value(1);
  expect(() => tx(() => value.set(2))).toThrow('Must not be within');
});

test('calculation get will throw outside a transaction', () => {
  const calculation = new Calculation(() => 1);
  expect(() => calculation.get()).toThrow('Must be within');
});

test('calculation get will throw outside a transaction before calculating', () => {
  const calculate = jest.fn(() => 1);
  const calculation = new Calculation(calculate);
  expect(calculate).toBeCalledTimes(0);
  expect(() => calculation.get()).toThrow('Must be within');
  expect(calculate).toBeCalledTimes(0);
});

test('can manually change a basic value', () => {
  const value = new Value(1);

  expect(tx(() => value.get())).toEqual(1);
  value.set(2);
  expect(tx(() => value.get())).toEqual(2);
});

test('will get the result of a calculation', () => {
  const calculation1 = new Calculation(() => 1);
  const calculation2 = new Calculation(() => 2);

  expect(tx(() => calculation1.get())).toEqual(1);
  expect(tx(() => calculation2.get())).toEqual(2);
});

test('will get the result of a throwing calculation', () => {
  const error = new Error('test');
  const calculation = new Calculation(() => {
    throw error;
  });

  expect(() => tx(() => calculation.get())).toThrow(error);
});

test('will get the result of a calculation multiple times', () => {
  const calculation = new Calculation(() => 42);

  expect(tx(() => calculation.get())).toEqual(42);
  expect(tx(() => calculation.get())).toEqual(42);
  expect(tx(() => calculation.get())).toEqual(42);
});

test('will get the result of a throwing calculation multiple times', () => {
  const error = new Error('test');
  const calculation = new Calculation(() => {
    throw error;
  });

  expect(() => tx(() => calculation.get())).toThrow(error);
  expect(() => tx(() => calculation.get())).toThrow(error);
  expect(() => tx(() => calculation.get())).toThrow(error);
});

test('will only run a calculation once', () => {
  const calculate = jest.fn(() => 42);
  const calculation = new Calculation(calculate);

  expect(tx(() => calculation.get())).toEqual(42);
  expect(tx(() => calculation.get())).toEqual(42);
  expect(tx(() => calculation.get())).toEqual(42);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will only run a throwing calculation once', () => {
  const error = new Error('test');
  const calculate = jest.fn(() => {
    throw error;
  });
  const calculation = new Calculation(calculate);

  expect(() => tx(() => calculation.get())).toThrow(error);
  expect(() => tx(() => calculation.get())).toThrow(error);
  expect(() => tx(() => calculation.get())).toThrow(error);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will run a calculation lazily', () => {
  const calculate = jest.fn(() => 42);
  const calculation = new Calculation(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation.get())).toEqual(42);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will recalculate if a value changes when there are no listeners', () => {
  const value1 = new Value(1);
  const value2 = new Value(1);
  const calculate = jest.fn(() => value1.get() + value2.get());
  const calculation = new Calculation(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation.get())).toEqual(2);
  expect(tx(() => calculation.get())).toEqual(2);
  expect(tx(() => calculation.get())).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  value1.set(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(tx(() => calculation.get())).toEqual(3);
  expect(tx(() => calculation.get())).toEqual(3);
  expect(tx(() => calculation.get())).toEqual(3);
  expect(calculate).toHaveBeenCalledTimes(2);
  value2.set(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(tx(() => calculation.get())).toEqual(4);
  expect(tx(() => calculation.get())).toEqual(4);
  expect(tx(() => calculation.get())).toEqual(4);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('skips updates for integer values that are the same', () => {
  const value = new Value(1);
  const calculate = jest.fn(() => value.get());
  const calculation = new Calculation(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation.get())).toEqual(1);
  expect(calculate).toHaveBeenCalledTimes(1);
  value.set(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(tx(() => calculation.get())).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  value.set(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(tx(() => calculation.get())).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  value.set(3);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(tx(() => calculation.get())).toEqual(3);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('skips updates for objects values that are the same', () => {
  const object1 = {};
  const object2 = {};
  const object3 = {};
  const value = new Value(object1);
  const calculate = jest.fn(() => value.get());
  const calculation = new Calculation(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation.get())).toBe(object1);
  expect(calculate).toHaveBeenCalledTimes(1);
  value.set(object2);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(tx(() => calculation.get())).toBe(object2);
  expect(calculate).toHaveBeenCalledTimes(2);
  value.set(object2);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(tx(() => calculation.get())).toBe(object2);
  expect(calculate).toHaveBeenCalledTimes(2);
  value.set(object3);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(tx(() => calculation.get())).toBe(object3);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('skips updates for NaN values that are the same', () => {
  const value = new Value(1);
  const calculate = jest.fn(() => value.get());
  const calculation = new Calculation(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation.get())).toEqual(1);
  expect(calculate).toHaveBeenCalledTimes(1);
  value.set(NaN);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(tx(() => calculation.get())).toEqual(NaN);
  expect(calculate).toHaveBeenCalledTimes(2);
  value.set(NaN);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(tx(() => calculation.get())).toEqual(NaN);
  expect(calculate).toHaveBeenCalledTimes(2);
  value.set(3);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(tx(() => calculation.get())).toEqual(3);
  expect(calculate).toHaveBeenCalledTimes(3);
});

test('will update when a sub-calculation changes', () => {
  const value = new Value(1);
  const calculate1 = jest.fn(() => value.get());
  const calculation1 = new Calculation(calculate1);
  const calculate2 = jest.fn(() => calculation1.get());
  const calculation2 = new Calculation(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation2.get())).toEqual(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  value.set(2);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(tx(() => calculation2.get())).toEqual(2);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(2);
});

test('skips update for calculations that are the same', () => {
  const value1 = new Value(1);
  const value2 = new Value(2);
  const calculate1 = jest.fn(() => value1.get() + value2.get());
  const calculation1 = new Calculation(calculate1);
  const calculate2 = jest.fn(() => calculation1.get());
  const calculation2 = new Calculation(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation2.get())).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  value1.set(2);
  value2.set(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(tx(() => calculation2.get())).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(1);
});

test('skips update for calculations that throw and are the same', () => {
  const value1 = new Value(1);
  const value2 = new Value(2);
  const calculate1 = jest.fn(() => {
    throw value1.get() + value2.get();
  });
  const calculation1 = new Calculation(calculate1);
  const calculate2 = jest.fn(() => {
    try {
      calculation1.get();
      throw new Error('Expected an error to be thrown!');
    } catch (error) {
      return error;
    }
  });
  const calculation2 = new Calculation(calculate2);

  expect(calculate1).toHaveBeenCalledTimes(0);
  expect(calculate2).toHaveBeenCalledTimes(0);
  expect(tx(() => calculation2.get())).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  value1.set(2);
  value2.set(1);
  expect(calculate1).toHaveBeenCalledTimes(1);
  expect(calculate2).toHaveBeenCalledTimes(1);
  expect(tx(() => calculation2.get())).toEqual(3);
  expect(calculate1).toHaveBeenCalledTimes(2);
  expect(calculate2).toHaveBeenCalledTimes(1);
});
