import {Calc} from './Calc';

export class Cell<T> implements Calc<T> {
  _value: T;

  constructor(value: T) {
    this._value = value;
  }

  calc(): T {
    return this._value;
  }
}
