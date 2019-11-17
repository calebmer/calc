import {Calc} from './Calc';
import {objectIs} from './objectIs';

export class Formula<T> extends Calc<T> {
  _valid: number;
  _version: number;
  _completion: FormulaCompletion;
  _value: unknown;
  _dependencies: FormulaDependencies | null;
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    super();
    this._valid = 0;
    this._version = 0;
    this._completion = FormulaCompletion.Normal;
    this._value = null;
    this._dependencies = null;
    this._calculate = calculate;
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

  getWithoutListening(): T {
    this._getLatestVersion();

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
      let lastFormulaDependencies = currentFormulaDependencies;
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

      // Did the value change? If so we need to increment the version.
      if (
        !objectIs(this._value, value) ||
        this._completion !== completion ||
        this._dependencies === null
      ) {
        this._version++;
        this._completion = completion;
        this._value = value;
      }

      // NOTE: We assume that this function never throws which means we can
      // restore our environment variables outside of a `finally` clause.
      const dependencies = currentFormulaDependencies;
      currentFormulaDependencies = lastFormulaDependencies;

      const lastDependencies = this._dependencies;
      this._dependencies = dependencies;

      // If we need to listen to our dependencies for changes:
      //
      // - Add ourselves as a dependent to new dependencies.
      // - Remove ourselves as a dependent from old dependencies.
      if (shouldListen(this)) {
        if (lastDependencies === null) {
          dependencies.forEach((_version, dependency) => {
            dependency._addDependent(this);
          });
        } else {
          dependencies.forEach((_version, dependency) => {
            if (lastDependencies.delete(dependency) === false) {
              dependency._addDependent(this);
            }
          });
          lastDependencies.forEach((_version, lastDependency) => {
            lastDependency._removeDependent(this);
          });
        }
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

  _addDependent(dependent: Calc<unknown>): void {
    const wasListening = shouldListen(this);
    super._addDependent(dependent);
    updateDependencyListeners(this, wasListening);
  }

  _removeDependent(dependent: Calc<unknown>): void {
    const wasListening = shouldListen(this);
    super._removeDependent(dependent);
    updateDependencyListeners(this, wasListening);
  }

  addListener(listener: () => void): void {
    const wasListening = shouldListen(this);
    super.addListener(listener);
    updateDependencyListeners(this, wasListening);
  }

  removeListener(listener: () => void): void {
    const wasListening = shouldListen(this);
    super.removeListener(listener);
    updateDependencyListeners(this, wasListening);
  }
}

const enum FormulaCompletion {
  Normal = 'normal',
  Abrupt = 'abrupt',
}

let nextFormulaTransaction = 1;

let currentFormulaTransaction: number | null = null;

export type FormulaDependencies = Map<Calc<unknown>, number>;

export let currentFormulaDependencies: FormulaDependencies | null = null;

export function getFormulaDependencies(): FormulaDependencies {
  if (currentFormulaDependencies === null) {
    throw new Error('Can only call `calc()` inside of a formula.');
  }
  return currentFormulaDependencies;
}

function shouldListen(formula: Formula<unknown>): boolean {
  return formula._dependents !== null || formula._listeners !== null;
}

function updateDependencyListeners(
  formula: Formula<unknown>,
  wasListening: boolean,
): void {
  const willListen = shouldListen(formula);

  if (willListen === true && wasListening === false) {
    if (formula._dependencies === null) {
      formula._getLatestVersion();
    }
    formula._dependencies!.forEach((_version, dependency) => {
      dependency._addDependent(formula);
    });
  } else if (willListen === false && wasListening === true) {
    if (formula._dependencies === null) {
      formula._getLatestVersion();
    }
    formula._dependencies!.forEach((_version, dependency) => {
      dependency._removeDependent(formula);
    });
  }
}
