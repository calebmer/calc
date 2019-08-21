import {Calc} from './Calc';
import {objectIs} from './objectIs';

export class Formula<T> implements Calc<T> {
  _valid: number;
  _version: number;
  _completion: FormulaCompletion;
  _value: unknown;
  _dependencies: FormulaDependencies | null;
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    this._valid = 0;
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
    // Start a new formula transaction if one hasn’t been started yet...
    let lastFormulaTransaction = currentFormulaTransaction;
    if (currentFormulaTransaction === null) {
      currentFormulaTransaction = nextFormulaTransaction++;
    }

    // If we previously validated this formula in the current transaction then
    // we don’t need to do it again.
    if (this._valid === currentFormulaTransaction) {
      return this._version;
    }

    // Force a calculation if we haven’t run one before...
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

      // NOTE: We assume that this function never throws which means we can
      // restore our environment variables outside of a `finally` clause.
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

    // We know that our formula is valid in this transaction.
    this._valid = currentFormulaTransaction;

    // Restore the old formula transaction if we ended up creating one for
    // this call.
    //
    // NOTE: We assume that this function never throws which means we can
    // restore our environment variables outside of a `finally` clause.
    currentFormulaTransaction = lastFormulaTransaction;

    return this._version;
  }
}

const enum FormulaCompletion {
  Normal = 0,
  Abrupt = 1,
}

let nextFormulaTransaction = 1;

let currentFormulaTransaction: number | null = null;

export type FormulaDependencies = Map<Calc<unknown>, number>;

let currentFormulaDependencies: FormulaDependencies | null = null;

export function getFormulaDependencies(): FormulaDependencies {
  if (currentFormulaDependencies === null) {
    throw new Error('Can only call `calc()` inside of a formula.');
  }
  return currentFormulaDependencies;
}
