import {Calc} from './Calc';
import {currentFormulaDependencies, getFormulaDependencies} from './Formula';
import {objectIs} from './objectIs';

export class Cell<T> implements Calc<T> {
  _version: number;
  _value: T;

  constructor(value: T) {
    this._version = 0;
    this._value = value;
  }

  set(newValue: T): void {
    if (currentFormulaDependencies !== null) {
      throw new Error('Can not call `cell.set()` inside of a formula.');
    }
    if (!objectIs(this._value, newValue)) {
      this._version++;
      this._value = newValue;
    }
  }

  getWithoutListening(): T {
    return this._value;
  }

  calc(): T {
    getFormulaDependencies().set(this, this._version);
    return this._value;
  }

  _getLatestVersion(): number {
    return this._version;
  }
}
