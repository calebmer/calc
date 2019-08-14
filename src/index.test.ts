import {Value, Calculation} from './index';

test('can manually change a basic value', () => {
  const value = new Value(1);

  expect(value.get()).toEqual(1);
  value.set(2);
  expect(value.get()).toEqual(2);
});

test('will get the result of a calculation', () => {
  const calculation1 = new Calculation(() => 1);
  const calculation2 = new Calculation(() => 2);

  expect(calculation1.get()).toEqual(1);
  expect(calculation2.get()).toEqual(2);
});

test('will get the result of a throwing calculation', () => {
  const error = new Error('test');
  const calculation = new Calculation(() => {
    throw error;
  });

  expect(() => calculation.get()).toThrow(error);
});

test('will get the result of a calculation multiple times', () => {
  const calculation = new Calculation(() => 42);

  expect(calculation.get()).toEqual(42);
  expect(calculation.get()).toEqual(42);
  expect(calculation.get()).toEqual(42);
});

test('will get the result of a throwing calculation multiple times', () => {
  const error = new Error('test');
  const calculation = new Calculation(() => {
    throw error;
  });

  expect(() => calculation.get()).toThrow(error);
  expect(() => calculation.get()).toThrow(error);
  expect(() => calculation.get()).toThrow(error);
});

test('will only run a calculation once', () => {
  const calculate = jest.fn(() => 42);
  const calculation = new Calculation(calculate);

  expect(calculation.get()).toEqual(42);
  expect(calculation.get()).toEqual(42);
  expect(calculation.get()).toEqual(42);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will only run a throwing calculation once', () => {
  const error = new Error('test');
  const calculate = jest.fn(() => {
    throw error;
  });
  const calculation = new Calculation(calculate);

  expect(() => calculation.get()).toThrow(error);
  expect(() => calculation.get()).toThrow(error);
  expect(() => calculation.get()).toThrow(error);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will run a calculation lazily', () => {
  const calculate = jest.fn(() => 42);
  const calculation = new Calculation(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(calculation.get()).toEqual(42);
  expect(calculate).toHaveBeenCalledTimes(1);
});

test('will recalculate if a value changes when there are no listeners', () => {
  const value1 = new Value(1);
  const value2 = new Value(1);
  const calculate = jest.fn(() => value1.get() + value2.get());
  const calculation = new Calculation(calculate);

  expect(calculate).toHaveBeenCalledTimes(0);
  expect(calculation.get()).toEqual(2);
  expect(calculation.get()).toEqual(2);
  expect(calculation.get()).toEqual(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  value1.set(2);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(calculation.get()).toEqual(3);
  expect(calculation.get()).toEqual(3);
  expect(calculation.get()).toEqual(3);
  expect(calculate).toHaveBeenCalledTimes(2);
  value2.set(2);
  expect(calculate).toHaveBeenCalledTimes(2);
  expect(calculation.get()).toEqual(4);
  expect(calculation.get()).toEqual(4);
  expect(calculation.get()).toEqual(4);
  expect(calculate).toHaveBeenCalledTimes(3);
});
