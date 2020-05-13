import Value from './Value';
import Computation from './Computation';

test('`live()` will throw outside a computation', () => {
  const value = new Value(1);

  expect(() => value.live()).toThrow();
});

test('`set()` will throw inside a computation', () => {
  const value = new Value(1);
  const computation = new Computation(() => value.set(2));

  expect(() => computation.live()).toThrow();
});

test('get the value of a basic live value', () => {
  const value = new Value(1);

  expect(value.getWithoutListening()).toEqual(1);
});

test('set the value of a basic live value', () => {
  const value = new Value(1);

  expect(value.getWithoutListening()).toEqual(1);
  value.set(2);
  expect(value.getWithoutListening()).toEqual(2);
});

test('a listener will be called when the live value updates', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  value.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  value.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener can be removed', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  value.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  value.removeListener(listener);
  value.set(3);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called if added after a live update but before the scheduled update', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.set(2);
  value.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
});

test('a listener can be removed after an update but before the scheduled update', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  value.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  value.set(3);
  value.removeListener(listener);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('two synchronous updates will call the listener twice', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  value.set(2);
  value.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('two asynchronous updates will only call the listener twice', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  value.set(2);
  value.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('set can be synchronously observed', () => {
  const value = new Value(1);

  expect(value.getWithoutListening()).toEqual(1);
  value.set(2);
  expect(value.getWithoutListening()).toEqual(2);
  value.set(3);
  expect(value.getWithoutListening()).toEqual(3);
});
