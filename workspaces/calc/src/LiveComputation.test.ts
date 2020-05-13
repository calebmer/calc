import {LiveComputation} from './LiveComputation';
import {LiveValue} from './LiveValue';

test('`live()` will throw outside a computation', () => {
  const computation = new LiveComputation(() => 1);

  expect(() => computation.live()).toThrow();
});

test('`live()` will throw outside a computation before computing', () => {
  const compute = jest.fn(() => 1);
  const computation = new LiveComputation(compute);

  expect(compute).toBeCalledTimes(0);
  expect(() => computation.live()).toThrow();
  expect(compute).toBeCalledTimes(0);
});

test('get the result of a computation', () => {
  const computation1 = new LiveComputation(() => 1);
  const computation2 = new LiveComputation(() => 2);

  expect(computation1.getWithoutListening()).toEqual(1);
  expect(computation2.getWithoutListening()).toEqual(2);
});

test('get the result of a throwing computation', () => {
  const error = new Error('test');
  const computation = new LiveComputation(() => {
    throw error;
  });

  expect(() => computation.getWithoutListening()).toThrow(error);
});

test('get the result of a computation multiple times', () => {
  const computation = new LiveComputation(() => 42);

  expect(computation.getWithoutListening()).toEqual(42);
  expect(computation.getWithoutListening()).toEqual(42);
  expect(computation.getWithoutListening()).toEqual(42);
});

test('get the result of a throwing computation multiple times', () => {
  const error = new Error('test');
  const computation = new LiveComputation(() => {
    throw error;
  });

  expect(() => computation.getWithoutListening()).toThrow(error);
  expect(() => computation.getWithoutListening()).toThrow(error);
  expect(() => computation.getWithoutListening()).toThrow(error);
});

test('will run a computation lazily', () => {
  const compute = jest.fn(() => 42);
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(42);
  expect(compute).toHaveBeenCalledTimes(1);
});

test('will only run a computation once', () => {
  const compute = jest.fn(() => 42);
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(42);
  expect(computation.getWithoutListening()).toEqual(42);
  expect(computation.getWithoutListening()).toEqual(42);
  expect(compute).toHaveBeenCalledTimes(1);
});

test('will only run a throwing computation once', () => {
  const error = new Error('test');
  const compute = jest.fn(() => {
    throw error;
  });
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(() => computation.getWithoutListening()).toThrow(error);
  expect(() => computation.getWithoutListening()).toThrow(error);
  expect(() => computation.getWithoutListening()).toThrow(error);
  expect(compute).toHaveBeenCalledTimes(1);
});

test('will recompute if a value changes when there are no listeners', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const compute = jest.fn(() => value1.live() + value2.live());
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(compute).toHaveBeenCalledTimes(1);
  value1.set(2);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(compute).toHaveBeenCalledTimes(2);
  value2.set(2);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(compute).toHaveBeenCalledTimes(3);
});

test('skips updates for integer values that are the same', () => {
  const value = new LiveValue(1);
  const compute = jest.fn(() => value.live());
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(compute).toHaveBeenCalledTimes(1);
  value.set(2);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(compute).toHaveBeenCalledTimes(2);
  value.set(2);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(compute).toHaveBeenCalledTimes(2);
  value.set(3);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(compute).toHaveBeenCalledTimes(3);
});

test('skips updates for objects values that are the same', () => {
  const object1 = {};
  const object2 = {};
  const object3 = {};
  const value = new LiveValue(object1);
  const compute = jest.fn(() => value.live());
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toBe(object1);
  expect(compute).toHaveBeenCalledTimes(1);
  value.set(object2);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toBe(object2);
  expect(compute).toHaveBeenCalledTimes(2);
  value.set(object2);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toBe(object2);
  expect(compute).toHaveBeenCalledTimes(2);
  value.set(object3);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toBe(object3);
  expect(compute).toHaveBeenCalledTimes(3);
});

test('skips updates for NaN values that are the same', () => {
  const value = new LiveValue(1);
  const compute = jest.fn(() => value.live());
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(compute).toHaveBeenCalledTimes(1);
  value.set(NaN);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(NaN);
  expect(compute).toHaveBeenCalledTimes(2);
  value.set(NaN);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(NaN);
  expect(compute).toHaveBeenCalledTimes(2);
  value.set(3);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(compute).toHaveBeenCalledTimes(3);
});

test('will update when a sub-computation changes', () => {
  const value = new LiveValue(1);
  const compute1 = jest.fn(() => value.live());
  const computation1 = new LiveComputation(compute1);
  const compute2 = jest.fn(() => computation1.live());
  const computation2 = new LiveComputation(compute2);

  expect(compute1).toHaveBeenCalledTimes(0);
  expect(compute2).toHaveBeenCalledTimes(0);
  expect(computation2.getWithoutListening()).toEqual(1);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  value.set(2);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  expect(computation2.getWithoutListening()).toEqual(2);
  expect(compute1).toHaveBeenCalledTimes(2);
  expect(compute2).toHaveBeenCalledTimes(2);
});

test('skips updates for computations that are the same when the root is recomputed', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(2);
  const compute1 = jest.fn(() => value1.live() + value2.live());
  const computation1 = new LiveComputation(compute1);
  const compute2 = jest.fn(() => computation1.live());
  const computation2 = new LiveComputation(compute2);

  expect(compute1).toHaveBeenCalledTimes(0);
  expect(compute2).toHaveBeenCalledTimes(0);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  value1.set(2);
  value2.set(1);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(2);
  expect(compute2).toHaveBeenCalledTimes(1);
});

test('skips update for computations that throw and are the same when the root is recomputed', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(2);
  const compute1 = jest.fn(() => {
    throw value1.live() + value2.live();
  });
  const computation1 = new LiveComputation(compute1);
  const compute2 = jest.fn(() => {
    try {
      computation1.live();
      throw new Error('Expected an error to be thrown!');
    } catch (error) {
      return error;
    }
  });
  const computation2 = new LiveComputation(compute2);

  expect(compute1).toHaveBeenCalledTimes(0);
  expect(compute2).toHaveBeenCalledTimes(0);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  value1.set(2);
  value2.set(1);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(2);
  expect(compute2).toHaveBeenCalledTimes(1);
});

test('skips update for computations that are the same when the sub-computation is recomputed first', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(2);
  const compute1 = jest.fn(() => value1.live() + value2.live());
  const computation1 = new LiveComputation(compute1);
  const compute2 = jest.fn(() => computation1.live());
  const computation2 = new LiveComputation(compute2);

  expect(compute1).toHaveBeenCalledTimes(0);
  expect(compute2).toHaveBeenCalledTimes(0);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  value1.set(2);
  value2.set(1);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  expect(computation1.getWithoutListening()).toEqual(3);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(2);
  expect(compute2).toHaveBeenCalledTimes(1);
});

test('skips update for computations that throw and are the same when the sub-computation is recomputed first', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(2);
  const compute1 = jest.fn(() => {
    throw value1.live() + value2.live();
  });
  const computation1 = new LiveComputation(compute1);
  const compute2 = jest.fn(() => {
    try {
      computation1.live();
      throw new Error('Expected an error to be thrown!');
    } catch (error) {
      return error;
    }
  });
  const computation2 = new LiveComputation(compute2);

  expect(compute1).toHaveBeenCalledTimes(0);
  expect(compute2).toHaveBeenCalledTimes(0);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  value1.set(2);
  value2.set(1);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  expect(() => computation1.getWithoutListening()).toThrow();
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(2);
  expect(compute2).toHaveBeenCalledTimes(1);
});

test('only recursively calls `_getLatestVersion()` once per transaction', () => {
  const value1 = new LiveValue(1);
  const computation1 = new LiveComputation(() => value1.live());
  computation1._getLatestVersion = jest.fn(computation1._getLatestVersion);
  const computation2 = new LiveComputation(() => computation1.live());
  const computation3 = new LiveComputation(
    () =>
      computation2.live() +
      computation2.live() +
      computation2.live() +
      computation2.live() +
      computation2.live(),
  );

  expect(computation1._getLatestVersion).toHaveBeenCalledTimes(0);
  expect(computation3.getWithoutListening()).toEqual(5);
  expect(computation1._getLatestVersion).toHaveBeenCalledTimes(1);
});

test('a listener will never be called when dependencies update until the computation is evaluated', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() => value1.live() + value2.live());
  const listener = jest.fn(() => {});

  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
});

test('a listener will not be called when a dependency of an invalid computation updates', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() => value1.live() + value2.live());
  const listener = jest.fn(() => {});

  computation.getWithoutListening();
  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value1.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called when a dependency updates', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() => value1.live() + value2.live());
  const listener = jest.fn(() => {});

  computation.getWithoutListening();
  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value1.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  computation.getWithoutListening();
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will never be called when a dependency of a dependency updates until the computation is evaluated', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation1 = new LiveComputation(() => value1.live() + value2.live());
  const computation2 = new LiveComputation(() => computation1.live());
  const listener = jest.fn(() => {});

  computation2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value1.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
});

test('a listener will not be called when a dependency of a dependency of an invalid computation updates', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation1 = new LiveComputation(() => value1.live() + value2.live());
  const computation2 = new LiveComputation(() => computation1.live());
  const listener = jest.fn(() => {});

  computation2.getWithoutListening();
  computation2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value1.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called when a dependency of a dependency updates', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation1 = new LiveComputation(() => value1.live() + value2.live());
  const computation2 = new LiveComputation(() => computation1.live());
  const listener = jest.fn(() => {});

  computation2.getWithoutListening();
  computation2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value1.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  computation2.getWithoutListening();
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when a removed dependency updates and the computation is invalid', () => {
  const value1 = new LiveValue(true);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() =>
    value1.live() ? value2.live() : 0,
  );
  const listener = jest.fn(() => {});

  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  computation.getWithoutListening();
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  computation.getWithoutListening();
  value1.set(false);
  expect(listener).toHaveBeenCalledTimes(2);
  value2.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when a removed dependency updates', () => {
  const value1 = new LiveValue(true);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() =>
    value1.live() ? value2.live() : 0,
  );
  const listener = jest.fn(() => {});

  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  computation.getWithoutListening();
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  computation.getWithoutListening();
  value1.set(false);
  expect(listener).toHaveBeenCalledTimes(2);
  computation.getWithoutListening();
  value2.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when a removed dependency updates after a recomputation', () => {
  const value1 = new LiveValue(true);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() =>
    value1.live() ? value2.live() : 0,
  );
  const listener = jest.fn(() => {});

  computation.getWithoutListening();
  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(2);
  value1.set(false);
  expect(computation.getWithoutListening()).toEqual(0);
  expect(listener).toHaveBeenCalledTimes(2);
  value2.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will not be called when an added dependency updates and the computation is invalid', () => {
  const value1 = new LiveValue(false);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() =>
    value1.live() ? value2.live() : 0,
  );
  const listener = jest.fn(() => {});

  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  computation.getWithoutListening();
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  computation.getWithoutListening();
  value1.set(true);
  expect(listener).toHaveBeenCalledTimes(1);
  value2.set(3);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('a listener will be called when an added dependency updates', () => {
  const value1 = new LiveValue(false);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() =>
    value1.live() ? value2.live() : 0,
  );
  const listener = jest.fn(() => {});

  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  computation.getWithoutListening();
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  computation.getWithoutListening();
  value1.set(true);
  expect(listener).toHaveBeenCalledTimes(1);
  computation.getWithoutListening();
  value2.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('a listener will be called when an added dependency updates after a recomputation', () => {
  const value1 = new LiveValue(false);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() =>
    value1.live() ? value2.live() : 0,
  );
  const listener = jest.fn(() => {});

  computation.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  computation.getWithoutListening();
  value2.set(2);
  expect(listener).toHaveBeenCalledTimes(0);
  value1.set(true);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(listener).toHaveBeenCalledTimes(1);
  computation.getWithoutListening();
  value2.set(3);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('updates can be synchronously observed', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() => value1.live() + value2.live());

  expect(computation.getWithoutListening()).toEqual(2);
  value1.set(2);
  expect(computation.getWithoutListening()).toEqual(3);
  value2.set(3);
  expect(computation.getWithoutListening()).toEqual(5);
});

test('updates can be asynchronously observed', () => {
  const value1 = new LiveValue(1);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() => value1.live() + value2.live());

  expect(computation.getWithoutListening()).toEqual(2);
  value1.set(2);
  expect(computation.getWithoutListening()).toEqual(3);
  value2.set(3);
  expect(computation.getWithoutListening()).toEqual(5);
});

test('won’t recompute when dependencies change if there are no listeners', () => {
  const value = new LiveValue(1);
  const compute = jest.fn(() => value.live() + 1);
  const computation = new LiveComputation(compute);

  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(compute).toHaveBeenCalledTimes(1);
  value.set(2);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(compute).toHaveBeenCalledTimes(1);
  value.set(3);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(compute).toHaveBeenCalledTimes(2);
});

test('won’t recompute when dependencies change', () => {
  const value = new LiveValue(1);
  const compute = jest.fn(() => value.live() + 1);
  const computation = new LiveComputation(compute);

  computation.addListener(() => {});
  expect(compute).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(compute).toHaveBeenCalledTimes(1);
  value.set(2);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(compute).toHaveBeenCalledTimes(1);
  value.set(3);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(compute).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(compute).toHaveBeenCalledTimes(2);
});

test('won’t recompute a dependency that has been removed', () => {
  const value1 = new LiveValue(true);
  const value2 = new LiveValue(1);
  const compute1 = jest.fn(() => value2.live() + 1);
  const computation1 = new LiveComputation(compute1);
  const compute2 = jest.fn(() => (value1.live() ? computation1.live() + 1 : 0));
  const computation2 = new LiveComputation(compute2);

  expect(compute1).toHaveBeenCalledTimes(0);
  expect(compute2).toHaveBeenCalledTimes(0);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  value2.set(2);
  value1.set(false);
  expect(computation2.getWithoutListening()).toEqual(0);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(2);
});

test('won’t recompute a dependency that has been removed when there are listeners', () => {
  const value1 = new LiveValue(true);
  const value2 = new LiveValue(1);
  const compute1 = jest.fn(() => value2.live() + 1);
  const computation1 = new LiveComputation(compute1);
  const compute2 = jest.fn(() => (value1.live() ? computation1.live() + 1 : 0));
  const computation2 = new LiveComputation(compute2);

  computation2.addListener(() => {});
  expect(compute1).toHaveBeenCalledTimes(0);
  expect(compute2).toHaveBeenCalledTimes(0);
  expect(computation2.getWithoutListening()).toEqual(3);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(1);
  value2.set(2);
  value1.set(false);
  expect(computation2.getWithoutListening()).toEqual(0);
  expect(compute1).toHaveBeenCalledTimes(1);
  expect(compute2).toHaveBeenCalledTimes(2);
});

test('won’t call the listener twice if a dependency is reused', () => {
  const value = new LiveValue(1);
  const computation1 = new LiveComputation(() => value.live() * 1);
  const computation2 = new LiveComputation(
    () => value.live() + computation1.live(),
  );
  const listener = jest.fn(() => {});

  computation2.addListener(listener);
  expect(listener).toHaveBeenCalledTimes(0);
  computation2.getWithoutListening();
  value.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
});

// NOTE: This tests internal implementation details! Normally we don’t like
// implementation detail tests, but this test validates an important performance
// property which is not visible to the user.
test('we don’t remove dependents until after we invalidate', () => {
  const value1 = new LiveValue(true);
  const value2 = new LiveValue(1);
  const computation = new LiveComputation(() =>
    value1.live() ? value2.live() : 0,
  );

  const addDependent = jest.fn(value2._addDependent.bind(value2));
  value2._addDependent = addDependent;
  const removeDependent = jest.fn(value2._removeDependent.bind(value2));
  value2._removeDependent = removeDependent;

  const listener = () => {};

  expect(computation.getWithoutListening()).toEqual(1);
  expect(addDependent).toHaveBeenCalledTimes(0);
  expect(removeDependent).toHaveBeenCalledTimes(0);
  computation.addListener(listener);
  expect(addDependent).toHaveBeenCalledTimes(1);
  expect(removeDependent).toHaveBeenCalledTimes(0);
  value1.set(false);
  expect(addDependent).toHaveBeenCalledTimes(1);
  expect(removeDependent).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(0);
  expect(addDependent).toHaveBeenCalledTimes(1);
  expect(removeDependent).toHaveBeenCalledTimes(1);
});
