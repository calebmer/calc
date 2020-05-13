import Subscription from './Subscription';
import Computation from './Computation';

function mockExternal<T>(value: T) {
  const listeners = new Set<() => void>();

  return {
    get: jest.fn(() => value),

    addListener: jest.fn((listener: () => void) => {
      listeners.add(listener);
    }),

    removeListener: jest.fn((listener: () => void) => {
      listeners.delete(listener);
    }),

    set: (newValue: T) => {
      value = newValue;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

test('mock external will call the listener even if the value didn’t change', () => {
  const external = mockExternal(1);
  const listener = jest.fn(() => {});
  external.addListener(listener);

  expect(listener).toHaveBeenCalledTimes(0);
  external.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
  external.set(2);
  expect(listener).toHaveBeenCalledTimes(2);
  external.set(2);
  expect(listener).toHaveBeenCalledTimes(3);
  external.set(3);
  expect(listener).toHaveBeenCalledTimes(4);
});

test('`live()` will throw outside a computation', () => {
  const subscription = new Subscription(mockExternal(1));

  expect(() => subscription.live()).toThrow();
});

test('`live()` will work inside a computation', () => {
  const subscription = new Subscription(mockExternal(1));
  const computation = new Computation(() => subscription.live());

  expect(computation.getWithoutListening()).toEqual(1);
});

test('will get the latest external value', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  expect(subscription.getWithoutListening()).toEqual(1);
  external.set(2);
  expect(subscription.getWithoutListening()).toEqual(2);
  external.set(3);
  expect(subscription.getWithoutListening()).toEqual(3);
});

test('will get the external value on every request without a listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(subscription.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(subscription.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(2);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(subscription.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(3);
  expect(subscription.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(4);
  external.set(3);
  expect(external.get).toHaveBeenCalledTimes(4);
  expect(subscription.getWithoutListening()).toEqual(3);
  expect(external.get).toHaveBeenCalledTimes(5);
  external.set(4);
  expect(external.get).toHaveBeenCalledTimes(5);
});

test('will only get the external value after an invalidation if there is a listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  subscription.addListener(() => {});

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(subscription.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(subscription.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(subscription.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(subscription.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  external.set(3);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(subscription.getWithoutListening()).toEqual(3);
  expect(external.get).toHaveBeenCalledTimes(3);
  external.set(4);
  expect(external.get).toHaveBeenCalledTimes(3);
});

test('will get the external value on every request without a listener through a computation', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(() => subscription.live());

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(2);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(3);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(4);
  external.set(3);
  expect(external.get).toHaveBeenCalledTimes(4);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(external.get).toHaveBeenCalledTimes(5);
  external.set(4);
  expect(external.get).toHaveBeenCalledTimes(5);
});

test('will only get the external value after an invalidation if there is a listener through a computation', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(() => subscription.live());

  computation.addListener(() => {});

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  external.set(3);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(external.get).toHaveBeenCalledTimes(3);
  external.set(4);
  expect(external.get).toHaveBeenCalledTimes(3);
});

test('will only get the external value after an invalidation if there is a listener through a computation but listener is on the subscription', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(() => subscription.live());

  subscription.addListener(() => {});

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  external.set(3);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(3);
  expect(external.get).toHaveBeenCalledTimes(3);
  external.set(4);
  expect(external.get).toHaveBeenCalledTimes(3);
});

test('will get the external value once per transaction on every request without a listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(
    () => subscription.live() + subscription.live(),
  );

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(external.get).toHaveBeenCalledTimes(3);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(external.get).toHaveBeenCalledTimes(4);
  external.set(3);
  expect(external.get).toHaveBeenCalledTimes(4);
  expect(computation.getWithoutListening()).toEqual(6);
  expect(external.get).toHaveBeenCalledTimes(5);
  external.set(4);
  expect(external.get).toHaveBeenCalledTimes(5);
});

test('will only get the external value once per transaction after an invalidation if there is a listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(
    () => subscription.live() + subscription.live(),
  );

  computation.addListener(() => {});

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(4);
  expect(external.get).toHaveBeenCalledTimes(2);
  external.set(3);
  expect(external.get).toHaveBeenCalledTimes(2);
  expect(computation.getWithoutListening()).toEqual(6);
  expect(external.get).toHaveBeenCalledTimes(3);
  external.set(4);
  expect(external.get).toHaveBeenCalledTimes(3);
});

test('will add a listener when the subscription gets a listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  expect(external.addListener).toHaveBeenCalledTimes(0);
  subscription.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
});

test('will not double add a listener when the subscription gets multiple listeners', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  expect(external.addListener).toHaveBeenCalledTimes(0);
  subscription.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
  subscription.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
  subscription.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
});

test('will remove a listener when the subscription removes its listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  const listener = () => {};

  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.addListener(listener);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.removeListener(listener);
  expect(external.removeListener).toHaveBeenCalledTimes(1);
});

test('will remove a listener only when all subscription listeners are gone', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  const listener1 = () => {};
  const listener2 = () => {};
  const listener3 = () => {};

  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.addListener(listener1);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.addListener(listener2);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.addListener(listener3);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.removeListener(listener1);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.removeListener(listener2);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  subscription.removeListener(listener3);
  expect(external.removeListener).toHaveBeenCalledTimes(1);
});

test('will add a listener when a dependent gets a listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(() => subscription.live());

  computation.getWithoutListening();

  expect(external.addListener).toHaveBeenCalledTimes(0);
  computation.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
});

test('will not double add a listener when a dependent gets multiple listeners', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(() => subscription.live());

  computation.getWithoutListening();

  expect(external.addListener).toHaveBeenCalledTimes(0);
  computation.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
  computation.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
  computation.addListener(() => {});
  expect(external.addListener).toHaveBeenCalledTimes(1);
});

test('will remove a listener when a dependent removes its listener', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(() => subscription.live());

  computation.getWithoutListening();

  const listener = () => {};

  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.addListener(listener);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.removeListener(listener);
  expect(external.removeListener).toHaveBeenCalledTimes(1);
});

test('will remove a listener only when all dependent listeners are gone', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);
  const computation = new Computation(() => subscription.live());

  computation.getWithoutListening();

  const listener1 = () => {};
  const listener2 = () => {};
  const listener3 = () => {};

  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.addListener(listener1);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.addListener(listener2);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.addListener(listener3);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.removeListener(listener1);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.removeListener(listener2);
  expect(external.removeListener).toHaveBeenCalledTimes(0);
  computation.removeListener(listener3);
  expect(external.removeListener).toHaveBeenCalledTimes(1);
});

test('will call listeners when the value changes', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  const listener1 = jest.fn(() => {});
  const listener2 = jest.fn(() => {});

  subscription.addListener(listener1);
  subscription.addListener(listener2);

  expect(listener1).toHaveBeenCalledTimes(0);
  expect(listener2).toHaveBeenCalledTimes(0);
  expect(subscription.getWithoutListening()).toEqual(1);
  expect(listener1).toHaveBeenCalledTimes(0);
  expect(listener2).toHaveBeenCalledTimes(0);
  external.set(2);
  expect(listener1).toHaveBeenCalledTimes(1);
  expect(listener2).toHaveBeenCalledTimes(1);
  expect(subscription.getWithoutListening()).toEqual(2);
  expect(listener1).toHaveBeenCalledTimes(1);
  expect(listener2).toHaveBeenCalledTimes(1);
  external.set(3);
  expect(listener1).toHaveBeenCalledTimes(2);
  expect(listener2).toHaveBeenCalledTimes(2);
  external.set(4);
  expect(listener1).toHaveBeenCalledTimes(2);
  expect(listener2).toHaveBeenCalledTimes(2);
  external.set(5);
  expect(listener1).toHaveBeenCalledTimes(2);
  expect(listener2).toHaveBeenCalledTimes(2);
  expect(subscription.getWithoutListening()).toEqual(5);
  expect(listener1).toHaveBeenCalledTimes(2);
  expect(listener2).toHaveBeenCalledTimes(2);
});

test('adding a listener should invalidate the subscription value', () => {
  const external = mockExternal(1);
  const subscription = new Subscription(external);

  expect(external.get).toHaveBeenCalledTimes(0);
  expect(subscription.getWithoutListening()).toEqual(1);
  expect(external.get).toHaveBeenCalledTimes(1);
  external.set(2);
  expect(external.get).toHaveBeenCalledTimes(1);
  subscription.addListener(() => {});
  expect(external.get).toHaveBeenCalledTimes(1);
  expect(subscription.getWithoutListening()).toEqual(2);
  expect(external.get).toHaveBeenCalledTimes(2);
});
