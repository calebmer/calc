interface Dependency {
  _version: number;
}

type DependencySet = Map<Dependency, number>;

let dependencyTracker: DependencySet | null = null;

export class Value<T> implements Dependency {
  _version = 0;
  _value: T;

  constructor(value: T) {
    this._value = value;
  }

  get(): T {
    // TODO: Throw an error if `dependencyTracker` is null.
    if (dependencyTracker !== null) {
      dependencyTracker.set(this, this._version);
    }
    return this._value;
  }

  set(value: T): void {
    // TODO: Throw if `dependencyTracker` is not null.
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
    // TODO: Throw an error if `dependencyTracker` is null.

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
      const lastDependencyTracker = dependencyTracker;
      dependencyTracker = new Map();

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

      const dependencies = dependencyTracker;
      dependencyTracker = lastDependencyTracker;

      this._dependencies = dependencies;
    }

    // We must track the dependency _after_ recalculating in case the
    // version changed.
    if (dependencyTracker !== null) {
      dependencyTracker.set(this, this._version);
    }

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
