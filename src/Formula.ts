import {Calc} from './Calc';
import {objectIs} from './objectIs';

export class Formula<T> implements Calc<T> {
  _version: number;
  _completion: FormulaCompletion;
  _value: unknown;
  _dependencies: FormulaDependencies | null;
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    this._version = 0;
    this._completion = FormulaCompletion.Normal;
    this._value = null;
    this._dependencies = null;
    this._calculate = calculate;
  }

  getWithoutListening(): T {
    this._getLatestVersion();

    if (this._completion === FormulaCompletion.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }

  calc(): T {
    const dependencies = getFormulaDependencies();
    const version = this._getLatestVersion();
    dependencies.set(this, version);

    if (this._completion === FormulaCompletion.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }

  _getLatestVersion(): number {
    let recalculate = this._dependencies === null;

    // Recursively check all of our dependencies to make sure we are using the
    // latest version. If we are not using the latest version of a dependency
    // then we’ll need to recalculate.
    if (recalculate === false) {
      const iterator = this._dependencies![Symbol.iterator]();
      let step = iterator.next();

      while (step.done === false) {
        const entry = step.value;
        if (entry[0]._getLatestVersion() > entry[1]) {
          recalculate = true;
          break;
        }
        step = iterator.next();
      }
    }

    // To recalculate a formula we capture a new set of formula dependencies.
    // The formula calculation may throw so we handle that as a valid completion
    // for the formula.
    //
    // We only increment the version if we got a value that is different from
    // the old one.
    if (recalculate === true) {
      let lastDependencies = currentFormulaDependencies;
      currentFormulaDependencies = new Map();

      let completion: FormulaCompletion;
      let value: unknown;
      try {
        value = this._calculate();
        completion = FormulaCompletion.Normal;
      } catch (error) {
        value = error;
        completion = FormulaCompletion.Abrupt;
      }

      const dependencies = currentFormulaDependencies;
      currentFormulaDependencies = lastDependencies;

      if (
        !objectIs(this._value, value) ||
        this._completion !== completion ||
        this._dependencies === null
      ) {
        this._version++;
        this._completion = completion;
        this._value = value;
        this._dependencies = dependencies;
      }
    }

    return this._version;
  }
}

const enum FormulaCompletion {
  Normal = 0,
  Abrupt = 1,
}

export type FormulaDependencies = Map<Calc<unknown>, number>;

let currentFormulaDependencies: FormulaDependencies | null = null;

export function getFormulaDependencies(): FormulaDependencies {
  if (currentFormulaDependencies === null) {
    throw new Error('Can only call `calc()` inside of a formula.');
  }
  return currentFormulaDependencies;
}
