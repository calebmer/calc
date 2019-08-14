interface Dependency {
  _version: number;
}

type DependencySet = Map<Dependency, number>;

let dependencyTracker: DependencySet | null = null;

function trackDependency(dependency: Dependency): void {
  if (dependencyTracker === null) {
    // TODO: Throw an error
    return;
  }
  dependencyTracker.set(dependency, dependency._version);
}

export class Value<T> implements Dependency {
  _version = 0;
  _value: T;

  constructor(value: T) {
    this._value = value;
  }

  get(): T {
    trackDependency(this);
    return this._value;
  }

  set(value: T): void {
    // TODO: Schedule this for later?
    if (!objectIs(value, this._value)) {
      this._version++;
      this._value = value;
    }
  }
}

const enum CalculationState {
  Empty,
  Normal,
  Abrupt,
}

export class Calculation<T> {
  readonly _calculate: () => T;
  _state = CalculationState.Empty;
  _value: unknown = null;
  _dependencies: DependencySet | null = null;

  constructor(calculate: () => T) {
    this._calculate = calculate;
  }

  get(): T {
    let recalculate = false;

    if (this._state !== CalculationState.Empty && this._dependencies !== null) {
      const iter = this._dependencies[Symbol.iterator]();
      let step = iter.next();
      while (!step.done) {
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

      try {
        this._value = this._calculate();
        this._state = CalculationState.Normal;
      } catch (value) {
        this._value = value;
        this._state = CalculationState.Abrupt;
      }

      const dependencies = dependencyTracker;
      dependencyTracker = lastDependencyTracker;

      this._dependencies = dependencies;
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
function objectIs(x: unknown, y: unknown) {
  if (x === y) {
    return x !== 0 || 1 / (x as any) === 1 / (y as any);
  } else {
    return x !== x && y !== y;
  }
}
