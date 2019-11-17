import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_getCurrentPriorityLevel as getCurrentPriorityLevel,
} from 'scheduler';
import {Calc} from './Calc';
import {currentFormulaDependencies} from './Formula';
import {objectIs} from './objectIs';

export class Cell<T> extends Calc<T> {
  _version: number = 0;
  _value: T;

  constructor(value: T) {
    super();
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
      this._callListeners();
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
