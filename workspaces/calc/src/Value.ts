// TODO(calebmer): Maybe `Live.Value` should implement the only notify on change
// since last read too?

import {
  unstable_getCurrentPriorityLevel as getCurrentPriorityLevel,
  unstable_scheduleCallback as scheduleCallback,
} from 'scheduler';
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

  /**
   * Setting a live value occurs asynchronously by default. This allows us to do
   * cooperative scheduling. If a more important update comes in after you
   * update a live value we can run that update first and then come back to your
   * live value update.
   *
   * When you call `liveValue.set()` we schedule a callback at your current
   * priority (using the React `scheduler` package).
   *
   * If you really really need a synchronous update then use `setImmediately()`.
   */
  set(newValue: T): void {
    if (currentComputationDependencies !== null) {
      throw new Error(
        'Can not call `value.set()` inside of a reactive context',
      );
    }
    scheduleCallback(getCurrentPriorityLevel(), () => {
      this.setImmediately(newValue);
    });
  }

  setImmediately(newValue: T): void {
    if (currentComputationDependencies !== null) {
      throw new Error(
        'Can not call `value.setImmediately()` inside of a reactive context',
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
