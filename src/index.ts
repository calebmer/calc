export class Value<T> {
  _value: T;

  constructor(value: T) {
    this._value = value;
  }

  get(): T {
    return this._value;
  }

  set(value: T): void {
    // TODO: Schedule this for later?
    this._value = value;
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

  constructor(calculate: () => T) {
    this._calculate = calculate;
  }

  get(): T {
    if (this._state === CalculationState.Empty) {
      try {
        this._value = this._calculate();
        this._state = CalculationState.Normal;
      } catch (value) {
        this._value = value;
        this._state = CalculationState.Abrupt;
      }
    }

    if (this._state === CalculationState.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }
}
