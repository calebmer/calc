import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_getCurrentPriorityLevel as getCurrentPriorityLevel,
} from 'scheduler';
import {Calc, callListeners} from './Calc';
import {currentFormulaDependencies} from './Formula';
import {objectIs} from './objectIs';

export class Cell<T> extends Calc<T> {
  _version: number;
  _value: T;

  constructor(value: T) {
    super();
    this._version = 0;
    this._value = value;
  }

  set(newValue: T): void {
    if (currentFormulaDependencies !== null) {
      throw new Error('Can not call `cell.set()` inside of a formula.');
    }

    if (objectIs(this._value, newValue) === true) {
      return;
    }

    this._version++;
    this._value = newValue;

    const priorityLevel = getCurrentPriorityLevel();
    scheduleCallback(priorityLevel, () => {
      callListeners(this);
    });
  }

  getWithoutListening(): T {
    return this._value;
  }

  calc(): T {
    if (currentFormulaDependencies === null) {
      throw new Error('Can only call `calc()` inside of a formula.');
    }

    currentFormulaDependencies.set(this, this._version);

    return this._value;
  }

  _getLatestVersion(): number {
    return this._version;
  }
}
