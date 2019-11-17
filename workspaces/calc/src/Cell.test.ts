import {Cell} from './Cell';
import {Formula} from './Formula';

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

test('a listener will be called when the cell updates', () => {
  const cell = new Cell(1);
  const listener = jest.fn(() => {});

  cell.addListener(listener);
  cell.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  cell.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener can be removed', () => {
  const cell = new Cell(1);
  const listener = jest.fn(() => {});

  cell.addListener(listener);
  cell.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  cell.removeListener(listener);
  cell.set(3);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called if added after a cell update but before the scheduled update', () => {
  const cell = new Cell(1);
  const listener = jest.fn(() => {});

  cell.set(2);
  cell.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
});

test('a listener can be removed after an update but before the scheduled update', () => {
  const cell = new Cell(1);
  const listener = jest.fn(() => {});

  cell.addListener(listener);
  cell.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  cell.set(3);
  cell.removeListener(listener);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('two synchronous updates will call the listener twice', () => {
  const cell = new Cell(1);
  const listener = jest.fn(() => {});

  cell.addListener(listener);
  cell.set(2);
  cell.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('two asynchronous updates will only call the listener twice', () => {
  const cell = new Cell(1);
  const listener = jest.fn(() => {});

  cell.addListener(listener);
  cell.set(2);
  cell.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('set can be synchronously observed', () => {
  const cell = new Cell(1);

  expect(cell.getWithoutListening()).toEqual(1);
  cell.set(2);
  expect(cell.getWithoutListening()).toEqual(2);
  cell.set(3);
  expect(cell.getWithoutListening()).toEqual(3);
});
