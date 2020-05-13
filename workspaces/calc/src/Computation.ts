import Live from './Live';
import {objectIs} from './helpers/objectIs';

export default class Computation<T> extends Live<T> {
  /**
   * Is the current computation value valid? If false then we will always
   * recompute the value. The computation will be in an invalid state when:
   *
   * - We initialize for the first time and have never computed the value.
   * - We are listening to changes in our dependencies and will invalidate when
   *   a change occurs.
   *
   * While our computation is invalid we will never call listeners.
   *
   * If we never have listeners we will never enter an invalid state since we
   * are not subscribed to our own dependencies. That means just because our
   * computation says it is in a valid state does not mean our value is
   * actually up-to-date.
   *
   * If the computation is in a valid state then this property will be an
   * integer. The integer represents which transaction we validated the
   * computation in. If we try to compute the same computation twice in the same
   * computation transaction we can reuse work since computations are guaranteed
   * to be immutable in a computation transaction.
   */
  _valid: number | false = false;

  /**
   * What is the current version of our computation? Notably, current does not
   * mean latest. For every dependency we will store the current version of that
   * dependency when we evaluated.
   *
   * The version will not change if we recompute and the value is the exact
   * same as determined by `Object.is`.
   */
  _version: number = 0;

  /**
   * Did the computation return normally or did it throw? When we return the
   * value we will use this to decide whether or not to throw.
   */
  _completion: Completion = Completion.Normal;

  /**
   * The current computed value. May be stale if dependencies changed and we
   * were not notified. We throw this value instead of returning if
   * `_completion` is set to `Completion.Abrupt`.
   *
   * When the computation is invalid (`this._valid === false`) we set this to
   * `null` since we know the value is stale. That way the old value may be
   * garbage collected.
   */
  _value: unknown = null;

  /**
   * What are the dependencies of our computation? For every dependency we
   * remember the version we used when computing. That way when we are
   * deciding whether we need to recompute we can compare the latest version to
   * the one that we used.
   */
  _dependencies: Map<Live<unknown>, number> | null = null;

  /**
   * The user provided computation function which actually produces a value.
   */
  readonly _compute: () => T;

  constructor(compute: () => T) {
    super();
    this._compute = compute;
  }

  live(): T {
    if (currentComputationDependencies === null) {
      throw new Error('Can only call `live()` inside of a reactive context.');
    }

    const version = this._getLatestVersion();
    currentComputationDependencies.set(this, version);

    if (this._completion === Completion.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }

  getWithoutListening(): T {
    this._getLatestVersion();

    if (this._completion === Completion.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }

  _getLatestVersion(): number {
    // Start a new computation transaction if one hasn’t been started yet...
    let lastComputationTransaction = currentComputationTransaction;
    if (currentComputationTransaction === null) {
      currentComputationTransaction = nextComputationTransaction++;
    }

    // If we previously validated this computation in the current transaction
    // then we don’t need to do it again.
    if (this._valid === currentComputationTransaction) {
      return this._version;
    }

    // Force a computation if we know we are in an invalid state. Either:
    //
    // 1. We haven’t evaluated the computation yet.
    // 2. A dependent invalidated us.
    let recompute = this._valid === false;

    // Recursively check all of our dependencies to make sure we are using the
    // latest version. If we are not using the latest version of a dependency
    // then we’ll need to recompute.
    //
    // This may recompute our dependencies.
    if (recompute === false) {
      const iterator = this._dependencies![Symbol.iterator]();
      let step = iterator.next();

      while (step.done === false) {
        const entry = step.value;
        if (entry[0]._getLatestVersion() > entry[1]) {
          recompute = true;
          break;
        }
        step = iterator.next();
      }
    }

    // To recompute we capture a new set of computation dependencies. The
    // computation may throw so we handle that as a valid completion
    // for the computation.
    //
    // We only increment the version if we got a value that is different from
    // the old one.
    if (recompute === true) {
      let lastComputationDependencies = currentComputationDependencies;
      currentComputationDependencies = new Map();

      let completion: Completion;
      let value: unknown;
      try {
        value = this._compute();
        completion = Completion.Normal;
      } catch (error) {
        value = error;
        completion = Completion.Abrupt;
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
      const dependencies = currentComputationDependencies;
      currentComputationDependencies = lastComputationDependencies;

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

    // We know that our computation is valid in this transaction.
    this._valid = currentComputationTransaction;

    // Restore back to `null` if we created a transaction for this computation.
    //
    // NOTE: We assume that this function never throws which means we can
    // restore our environment variables outside of a `finally` clause.
    currentComputationTransaction = lastComputationTransaction;

    return this._version;
  }

  _addDependent(dependent: Live<unknown>): void {
    const didListen = shouldListen(this);
    super._addDependent(dependent);
    updateDependencyListeners(this, didListen);
  }

  _removeDependent(dependent: Live<unknown>): void {
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
   * If our computation is in a valid state we will call all our listeners and
   * invalidate the computation. We won’t call our listeners again until the
   * computation is recomputed even if our dependencies keep changing.
   *
   * This choice for semantics is kind of subtle. We want computation values to
   * be lazily computed, so we don’t recompute when our listeners are called.
   * That way even if the dependencies of a computation change 50 times it won’t
   * be recomputed until it is actually needed. However, when we invalidate a
   * computation that may mean the dependencies need to change. Imagine the
   * following:
   *
   * ```
   * new Live.Computation(() => a.live() ? b.live() : c.live())
   * ```
   *
   * `a` starts as true and then changes to false. Since we recompute lazily we
   * don’t know that `b` is no longer a dependency and that `c` is instead the
   * new dependency. This is why we choose to never call our listeners again
   * after the first invalidation.
   *
   * As an optimization we currently keep listening to our dependencies even
   * after invalidating and ignore the updates. We keep listening so that when
   * we do finally recompute we only need to add/remove listeners for the diff
   * of changed dependencies (which may be none). Imagine the following
   * situation:
   *
   * - We have 10 dependencies.
   * - A dependency updates so `_callListeners()` is called.
   * - We recompute and keep the same 10 dependencies.
   *
   * If we removed our 10 listeners in `_callListeners()` then we would have to
   * add all 10 listeners back when we recompute. By not removing listeners we
   * won’t need to do anything after recomputing.
   */
  _callListeners(): void {
    if (this._valid !== false) {
      this._valid = false;
      this._value = null; // Allow the value to be garbage collected.
      super._callListeners();
    }
  }
}

const enum Completion {
  Normal = 'normal',
  Abrupt = 'abrupt',
}

/**
 * When evaluating a computation we capture its dependencies in this map. Every
 * time we start evaluating a computation we create a new map and we reset the
 * map after the computation’s end.
 */
export let currentComputationDependencies: Map<
  Live<unknown>,
  number
> | null = null;

/**
 * When we evaluate a computation we record which transaction it was evaluated
 * in. The next time we go to evaluate that computation if we are in the same
 * transaction then we know for certain the computation hasn’t changed.
 *
 * The computation transaction represents some scope where all computations are
 * guaranteed to be immutable.
 */
let currentComputationTransaction: number | null = null;

let nextComputationTransaction = 1;

function shouldListen(computation: Computation<unknown>): boolean {
  return computation._dependents !== null || computation._listeners !== null;
}

function updateDependencyListeners(
  computation: Computation<unknown>,
  didListen: boolean,
): void {
  const willListen = shouldListen(computation);

  if (willListen === true && didListen === false) {
    if (computation._dependencies !== null) {
      computation._dependencies.forEach((_version, dependency) => {
        dependency._addDependent(computation);
      });
    }
  } else if (willListen === false && didListen === true) {
    if (computation._dependencies !== null) {
      computation._dependencies.forEach((_version, dependency) => {
        dependency._removeDependent(computation);
      });
    }
  }
}
