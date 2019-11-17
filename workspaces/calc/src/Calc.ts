/**
 * Some reactive value which may change over time. You may listen for changes
 * in the value. There are a few notable subclasses:
 *
 * - `Cell`: A cell is a reactive value with no dependencies that you may
 *   change. While a `Calc` is immutable a `Cell` allows you to introduce
 *   mutability into the system.
 * - `Formula`: Some reactive value which is computed from other `Calc`
 *   dependencies. The formula value will change when one of its
 *   `Calc` dependencies changes.
 */
export abstract class Calc<T> {
  /**
   * Some of the dependents of this calculation. A dependent only registers
   * itself if it has a listener. Therefore for all dependents the following is
   * true `_listeners !== null`.
   *
   * This set should never be empty. Instead of an empty set this property will
   * be null.
   */
  _dependents: Set<Calc<unknown>> | null = null;

  /**
   * All of the direct user-code listeners of this calculation.
   *
   * This set should never be empty. Instead of an empty set this property will
   * be null.
   */
  _listeners: Set<() => void> | null = null;

  /**
   * Calculates the current value and records it as a dependency. Since we
   * record this `Calc` as a dependency we will listen to changes.
   *
   * NOTE: You may not call this function outside of a reactive context! The
   * function will throw outside of a reactive context since it can’t register
   * itself as a dependency.
   */
  abstract calc(): T;

  /**
   * Gets the current value of our `Calc` without listening to changes! Use this
   * if you only need the current value for some one-off process. Otherwise use
   * `calc()` which will record that you depend on this value and will listen
   * to changes.
   */
  abstract getWithoutListening(): T;

  /**
   * Gets the latest version for our `Calc`. If the value in the `Calc` is stale
   * (maybe dependencies have changed) this will recalculate the value.
   */
  abstract _getLatestVersion(): number;

  /**
   * Adds a dependent `Calc`. That way when this value updates we can notify
   * all the `Calc`s that depend on us.
   *
   * A dependent only registers itself if it has a listener. Therefore for all
   * dependents the following is true `_listeners !== null`.
   */
  _addDependent(dependent: Calc<unknown>): void {
    if (this._dependents === null) {
      this._dependents = new Set();
    }
    this._dependents.add(dependent);
  }

  /**
   * Removes a dependent `Calc`.
   */
  _removeDependent(dependent: Calc<unknown>): void {
    if (this._dependents !== null) {
      this._dependents.delete(dependent);
      if (this._dependents.size === 0) {
        this._dependents = null;
      }
    }
  }

  /**
   * Adds a user supplied listener function which may be called whenever a
   * `Calc`’s value changes.
   *
   * The listener will be called whenever the latest value you requested is
   * invalidated. If we’ve already notified you about an invalid value the
   * listener may not be called again. Use `getWithoutListening()` when your
   * listener is called to make sure you have the latest value.
   *
   * Listeners will be called synchronously when the value changes. We depend
   * on you or your framework to schedule work for later instead of
   * synchronously blocking the thread.
   *
   * If the listener throws we will throw an unhandled exception in a different
   * event loop context.
   */
  addListener(listener: () => void): void {
    if (this._listeners === null) {
      this._listeners = new Set();
    }
    this._listeners.add(listener);
  }

  /**
   * Removes a user supplied listener.
   */
  removeListener(listener: () => void): void {
    if (this._listeners !== null) {
      this._listeners.delete(listener);
      if (this._listeners.size === 0) {
        this._listeners = null;
      }
    }
  }

  /**
   * Calls all of our calculation listeners and all the listeners of our
   * dependent calculations.
   *
   * This also serves as an invalidation signal. If this function is called on
   * your calculation you know that you must recalculate it.
   *
   * NOTE: If the same dependent appears twice in our dependency tree we must
   * only call its listeners once!! Currently we depend on each dependent to
   * implement this logic.
   */
  _callListeners(): void {
    if (this._listeners !== null) {
      this._listeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          scheduleUncaughtException(error);
        }
      });
    }
    if (this._dependents !== null) {
      this._dependents.forEach(dependent => {
        dependent._callListeners();
      });
    }
  }
}

/**
 * Schedule an error to be thrown as soon as possible as an uncaught exception
 * in an empty event loop context.
 *
 * Useful when user code throws an error that you want to report but you don’t
 * want to abort the currently running process.
 */
function scheduleUncaughtException(error: unknown) {
  // Use `setTimeout()` so that the exception isn’t an unhandled promise
  // rejection. Technically using a promise microtask would throw the
  // error faster.
  setTimeout(() => {
    throw error;
  }, 0);
}
