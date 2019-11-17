import {Calc} from './Calc';
import {objectIs} from './objectIs';

export class Formula<T> extends Calc<T> {
  /**
   * Is the current formula value valid? If false then we will always
   * recalculate the value. The formula will be in an invalid state when:
   *
   * - We initialize for the first time and have never calculated the value.
   * - We are listening to changes in our dependencies and will invalidate when
   *   a change occurs.
   *
   * While our formula is invalid we will never call listeners.
   *
   * If we never have listeners we will never enter an invalid state since we
   * are not subscribed to our own dependencies. That means just because our
   * formula is in a valid state does not mean our value is up-to-date.
   *
   * If the formula value is in a valid state then this property will be an
   * integer. The integer represents which transaction we validated the formula
   * value in. If we try to calculate the same formula twice in the same formula
   * transaction we can reuse work since calculations are guaranteed to be
   * immutable in a formula transaction.
   */
  _valid: number | false = false;

  /**
   * What is the current version of our formula value? Notably, current does not
   * mean latest. For every dependency we will store the current version of that
   * dependency when we evaluated.
   *
   * The version will not change if we recalculate and the value is the exact
   * same as determined by `Object.is`.
   */
  _version: number = 0;

  /**
   * Did the calculation return normally or did it throw? When we return the
   * value we will use this to decide whether or not to throw.
   */
  _completion: FormulaCompletion = FormulaCompletion.Normal;

  /**
   * The current value calculated by our formula. May be stale if dependencies
   * changed and we were not notified. We throw this value instead of returning
   * if `_completion` is set to `FormulaCompletion.Abrupt`.
   *
   * When the formula is invalid (`this._valid === false`) we set this to `null`
   * since we know the value is stale. That way the old value may be
   * garbage collected.
   */
  _value: unknown = null;

  /**
   * What are the dependencies of our formula? For every dependency we remember
   * the version we used when calculating. That way when we are deciding whether
   * we need to recalculate we can compare the latest version to the one that
   * we used.
   */
  _dependencies: Map<Calc<unknown>, number> | null = null;

  /**
   * The user provided formula function which actually performs the calculation.
   */
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    super();
    this._calculate = calculate;
  }

  calc(): T {
    if (currentFormulaDependencies === null) {
      throw new Error('Can only call `calc()` inside of a formula.');
    }

    const version = this._getLatestVersion();
    currentFormulaDependencies.set(this, version);

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

    // Force a calculation if we know this formula is invalid. Either:
    //
    // 1. We haven’t evaluated the calculation yet.
    // 2. A dependent invalidated us.
    let recalculate = this._valid === false;

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
      const same =
        objectIs(this._value, value) && this._completion === completion;
      if (!same) {
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
    const didListen = shouldListen(this);
    super._addDependent(dependent);
    updateDependencyListeners(this, didListen);
  }

  _removeDependent(dependent: Calc<unknown>): void {
    const didListen = shouldListen(this);
    super._removeDependent(dependent);
    updateDependencyListeners(this, didListen);
  }

  addListener(listener: () => void): void {
    const didListen = shouldListen(this);
    super.addListener(listener);
    updateDependencyListeners(this, didListen);
  }

  removeListener(listener: () => void): void {
    const didListen = shouldListen(this);
    super.removeListener(listener);
    updateDependencyListeners(this, didListen);
  }

  /**
   * If our formula is in a valid state we will call all our listeners and
   * invalidate the formula. We won’t call our listeners again until the formula
   * is recalculated even if our dependencies keep changing.
   *
   * We currently keep listening to our dependencies even after invalidating and
   * ignore the updates. We keep listening so that when we do finally
   * recalculate we only need to add/remove listeners for the diff of changed
   * dependencies (which may be none). Imagine the following situation:
   *
   * - We have 10 dependencies.
   * - A dependency updates so `_callListeners()` is called.
   * - We recalculate and keep the same 10 dependencies.
   *
   * If we removed our 10 listeners in `_callListeners()` then we would have to
   * add all 10 listeners back when we recalculate. By not removing listeners we
   * won’t need to do anything after recalculating.
   */
  _callListeners(): void {
    if (this._valid !== false) {
      this._valid = false;
      this._value = null; // Allow the value to be garbage collected.
      super._callListeners();
    }
  }
}

const enum FormulaCompletion {
  Normal = 'normal',
  Abrupt = 'abrupt',
}

/**
 * When evaluating a formula we capture its dependencies in this set. Every time
 * we start evaluating a formula we create a new set. Formula dependencies are
 * local to a single formula evaluation!
 */
export let currentFormulaDependencies: Map<Calc<unknown>, number> | null = null;

/**
 * When we evaluate a formula we record which transaction it was evaluated in.
 * The next time we go to evaluate that formula if we are in the same
 * transaction then we know for certain the formula hasn’t changed.
 *
 * The formula transaction represents some scope where all calculations are
 * guaranteed to be immutable.
 */
let currentFormulaTransaction: number | null = null;

let nextFormulaTransaction = 1;

function shouldListen(formula: Formula<unknown>): boolean {
  return formula._dependents !== null || formula._listeners !== null;
}

function updateDependencyListeners(
  formula: Formula<unknown>,
  didListen: boolean,
): void {
  const willListen = shouldListen(formula);

  if (willListen === true && didListen === false) {
    if (formula._dependencies !== null) {
      formula._dependencies.forEach((_version, dependency) => {
        dependency._addDependent(formula);
      });
    }
  } else if (willListen === false && didListen === true) {
    if (formula._dependencies !== null) {
      formula._dependencies.forEach((_version, dependency) => {
        dependency._removeDependent(formula);
      });
    }
  }
}
