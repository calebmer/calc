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

export class Calculation<T> {
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    this._calculate = calculate;
  }

  get(): T {
    return this._calculate();
  }
}
