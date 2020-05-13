import Live from './Live';
import {currentComputationDependencies} from './Computation';
import objectIs from './helpers/objectIs';

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
        'Can not call `value.set()` inside of a reactive context',
      );
    }

    if (objectIs(this._value, newValue) === true) {
      return;
    }

    this._version++;
    this._value = newValue;

    super._callListeners();
  }

  getWithoutListening(): T {
    return this._value;
  }

  live(): T {
    if (currentComputationDependencies === null) {
      throw new Error('Can only call `live()` inside of a reactive context');
    }

    currentComputationDependencies.set(this, this._version);

    return this._value;
  }

  _getLatestVersion(): number {
    return this._version;
  }

  // Called recursively in `Live` for dependents. Live values should not have
  // any dependencies and so shouldn’t be a dependent of any `Live`.
  _callListeners() {
    throw new Error('`Live.Value` should not depend on anything');
  }
}
