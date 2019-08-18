interface Dependency {
  _version: number;
}

type DependencySet = Map<Dependency, number>;

type Transaction = {
  dependencyTracker: DependencySet | null;
};

let currentTransaction: Transaction | null = null;

export function withTransaction<T>(action: () => T): T {
  let lastTransaction = currentTransaction;
  currentTransaction = {
    dependencyTracker: null,
  };
  try {
    return action();
  } finally {
    currentTransaction = lastTransaction;
  }
}

function withoutTransaction(): void {
  if (currentTransaction !== null) {
    throw new Error('Must not be within a transaction.');
  }
}

function getTransaction(): Transaction {
  if (currentTransaction === null) {
    // TODO: Better error message.
    throw new Error('Must be within a transaction.');
  }
  return currentTransaction;
}

function trackDependency(
  transaction: Transaction,
  dependency: Dependency,
): void {
  const {dependencyTracker} = transaction;
  if (dependencyTracker !== null) {
    dependencyTracker.set(dependency, dependency._version);
  }
}

export class Value<T> implements Dependency {
  _version = 0;
  _value: T;

  constructor(value: T) {
    this._value = value;
  }

  get(): T {
    const transaction = getTransaction();
    trackDependency(transaction, this);
    return this._value;
  }

  set(value: T): void {
    withoutTransaction();

    // TODO: Schedule this for later?
    if (!objectIs(value, this._value)) {
      this._version++;
      this._value = value;
    }
  }
}

const enum CalculationState {
  Empty = 0,
  Normal = 1,
  Abrupt = 2,
}

export class Calculation<T> implements Dependency {
  _version = 0;
  _state = CalculationState.Empty;
  _value: unknown = null;
  _dependencies: DependencySet | null = null;
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    this._calculate = calculate;
  }

  get(): T {
    const transaction = getTransaction();

    let recalculate = false;

    if (this._state !== CalculationState.Empty && this._dependencies !== null) {
      const iter = this._dependencies[Symbol.iterator]();
      let step = iter.next();
      while (step.done === false) {
        const entry = step.value;
        const dependency = entry[0];
        const lastVersion = entry[1];
        if (dependency._version > lastVersion) {
          recalculate = true;
          break;
        }
        step = iter.next();
      }
    }

    if (this._state === CalculationState.Empty || recalculate === true) {
      const lastDependencyTracker = transaction.dependencyTracker;
      transaction.dependencyTracker = new Map();

      let state: CalculationState;
      let value: unknown;
      try {
        value = this._calculate();
        state = CalculationState.Normal;
      } catch (error) {
        value = error;
        state = CalculationState.Abrupt;
      }

      if (!(state === this._state && objectIs(value, this._value) === true)) {
        this._version++;
        this._state = state;
        this._value = value;
      }

      const dependencies = transaction.dependencyTracker;
      transaction.dependencyTracker = lastDependencyTracker;

      this._dependencies = dependencies;
    }

    // We must track the dependency _after_ recalculating in case the
    // version changed.
    trackDependency(transaction, this);

    if (this._state === CalculationState.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }
}

/**
 * Implementation of [Object.is][1] so that consumers don’t have to ship
 * a polyfill.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
const objectIs =
  Object.is ||
  ((x: any, y: any) => {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y;
    } else {
      return x !== x && y !== y;
    }
  });
