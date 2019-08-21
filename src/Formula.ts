import {Calc} from './Calc';

export class Formula<T> implements Calc<T> {
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    this._calculate = calculate;
  }

  calc(): T {
    return this._calculate();
  }
}
