// @ts-ignore Node.js style require in test is fine.
jest.mock('scheduler', () => require('scheduler/unstable_mock'));

import {unstable_flushAll as flushAll} from 'scheduler/unstable_mock';
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

test('set schedules a callback to set the value of a basic live value', () => {
  const value = new Value(1);

  expect(value.getWithoutListening()).toEqual(1);
  value.set(2);
  expect(value.getWithoutListening()).toEqual(1);
  flushAll();
  expect(value.getWithoutListening()).toEqual(2);
});

test('set immediately will immediately set the value of a basic live value', () => {
  const value = new Value(1);

  expect(value.getWithoutListening()).toEqual(1);
  value.setImmediately(2);
  expect(value.getWithoutListening()).toEqual(2);
});

test('a listener will be called when the live value updates', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
  value.set(3);
  expect(listener).toHaveBeenCalledTimes(1);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
  value.setImmediately(4);
  expect(listener).toHaveBeenCalledTimes(3);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(3);
});

test('a listener can be removed', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value.setImmediately(2);
  expect(listener).toHaveBeenCalledTimes(1);
  value.removeListener(listener);
  value.setImmediately(3);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called if added before the scheduled update', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.set(2);
  value.addListener(listener);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener can be removed after an update but before the scheduled update', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  value.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  value.set(3);
  value.removeListener(listener);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(0);
});

test('two updates will call the listener twice', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value.set(2);
  value.set(3);
  expect(listener).toHaveBeenCalledTimes(0);
  flushAll();
  expect(listener).toHaveBeenCalledTimes(2);
});

test('two immediate updates will call the listener twice', () => {
  const value = new Value(1);
  const listener = jest.fn(() => {});

  value.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value.setImmediately(2);
  value.setImmediately(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('set can not be synchronously observed', () => {
  const value = new Value(1);

  expect(value.getWithoutListening()).toEqual(1);
  value.set(2);
  expect(value.getWithoutListening()).toEqual(1);
  value.set(3);
  expect(value.getWithoutListening()).toEqual(1);
  flushAll();
  expect(value.getWithoutListening()).toEqual(3);
});

test('set immediately can be synchronously observed', () => {
  const value = new Value(1);

  expect(value.getWithoutListening()).toEqual(1);
  value.setImmediately(2);
  expect(value.getWithoutListening()).toEqual(2);
  value.setImmediately(3);
  expect(value.getWithoutListening()).toEqual(3);
});
