import Live from './Live';
import {currentComputationDependencies} from './Computation';
import {objectIs} from './helpers/objectIs';

export default class Value<T> extends Live<T> {
  _version: number = 0;
  _value: T;

  constructor(value: T) {
    super();
    this._value = value;
  }

  set(newValue: T): void {
    if (currentComputationDependencies !== null) {
      throw new Error(
        'Can not call `value.set()` inside of a reactive context.',
      );
    }

    if (objectIs(this._value, newValue) === true) {
      return;
    }

    this._version++;
    this._value = newValue;

    this._callListeners();
  }

  getWithoutListening(): T {
    return this._value;
  }

  live(): T {
    if (currentComputationDependencies === null) {
      throw new Error('Can only call `live()` inside of a reactive context.');
    }

    currentComputationDependencies.set(this, this._version);

    return this._value;
  }

  _getLatestVersion(): number {
    return this._version;
  }
}
