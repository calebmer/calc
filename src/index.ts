let dependencyTracker: Set<Dependency> | null = null;

function trackDependency(dependency: Dependency): void {
  if (dependencyTracker === null) {
    throw new Error('TODO: Message');
  }
  dependencyTracker.add(dependency);
}

class Dependency {
  readonly _listeners = new Set<() => void>();

  _addListener(listener: () => void): void {
    this._listeners.add(listener);
  }

  _removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }
}

class Value<T> extends Dependency {
  _value: T;

  constructor(value: T) {
    super();
    this._value = value;
  }

  get() {
    trackDependency(this);
    return this._value;
  }
}

const enum CalculationState {
  Invalid,
  Calculating,
  Normal,
  Abrupt,
}

class Calculation<T> extends Dependency {
  readonly _calculate: () => T;
  _state = CalculationState.Invalid;
  _value: unknown = null;
  _dependencies: Set<Dependency> | null = null;

  constructor(calculate: () => T) {
    super();
    this._calculate = calculate;
    this._invalidate = this._invalidate.bind(this);
  }

  get(): T {
    trackDependency(this);

    if (this._state === CalculationState.Invalid) {
      let lastDependencyTracker = dependencyTracker;
      dependencyTracker = new Set();

      this._state = CalculationState.Calculating;
      try {
        this._value = this._calculate();
        this._state = CalculationState.Normal;
      } catch (value) {
        this._value = value;
        this._state = CalculationState.Abrupt;
      }

      const dependencies = dependencyTracker;
      dependencyTracker = lastDependencyTracker;

      const lastDependencies = this._dependencies;
      this._dependencies = dependencies;

      if (this._listeners.size !== 0) {
        dependencies.forEach(dependency => {
          if (lastDependencies !== null) {
            if (lastDependencies.delete(dependency)) {
              return;
            }
          }
          dependency._addListener(this._invalidate);
        });

        if (lastDependencies !== null) {
          lastDependencies.forEach(lastDependency => {
            lastDependency._removeListener(this._invalidate);
          });
        }
      }
    }

    if (this._state === CalculationState.Calculating) {
      throw new Error('TODO: Recursion');
    }

    if (this._state === CalculationState.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }

  _addListener(listener: () => void): void {
    this._listeners.add(listener);

    if (this._listeners.size === 1 && this._dependencies !== null) {
      this._dependencies.forEach(dependency => {
        dependency._addListener(this._invalidate);
      });
    }
  }

  _removeListener(listener: () => void): void {
    this._listeners.delete(listener);

    if (this._listeners.size === 0 && this._dependencies !== null) {
      this._dependencies.forEach(dependency => {
        dependency._removeListener(this._invalidate);
      });
    }
  }

  _invalidate(): void {
    if (this._state !== CalculationState.Invalid) {
      this._state = CalculationState.Invalid;
      this._value = null;
      if (this._listeners.size === 0) {
        this._dependencies = null;
      } else {
        this._listeners.forEach(callListener);
      }
    }
  }
}

function callListener(listener: () => void): void {
  try {
    listener();
  } catch (error) {
    setTimeout(() => {
      throw error;
    }, 0);
  }
}
