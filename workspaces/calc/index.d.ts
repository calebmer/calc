// NOTE: Despite using TypeScript, we hand-write the types for our public API
// since we can define much cleaner API boundaries and separate internal from
// external documentation.

// TODO(calebmer): Public documentation.

export default abstract class Live<T> {
  static Value: typeof Value;
  static Computation: typeof Computation;
  static Subscription: typeof Subscription;

  live(): T;

  getWithoutListening(): T;

  addListener(listener: () => void): void;

  removeListener(listener: () => void): void;
}

declare class Value<T> extends Live<T> {
  constructor(value: T);

  set(value: T): void;

  setImmediately(value: T): void;
}

declare class Computation<T> extends Live<T> {
  constructor(compute: () => T);
}

declare class Subscription<T> extends Live<T> {
  constructor(subscription: {
    get: () => T;
    addListener: (listener: () => void) => void;
    removeListener: (listener: () => void) => void;
  });
}
