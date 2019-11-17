export abstract class Calc<T> {
  /**
   * Some of the dependents of this calculation. A dependent only registers
   * itself if it has a listener. Therefore for all dependents the following is
   * true `_listeners !== null`.
   *
   * This set should never be empty. Instead of an empty set this property will
   * be null.
   */
  _dependents: Set<Calc<unknown>> | null;

  /**
   * All of the direct user-code listeners of this calculation.
   *
   * This set should never be empty. Instead of an empty set this property will
   * be null.
   */
  _listeners: Set<() => void> | null;

  constructor() {
    this._dependents = null;
    this._listeners = null;
  }

  abstract calc(): T;

  abstract getWithoutListening(): T;

  abstract _getLatestVersion(): number;

  _addDependent(dependent: Calc<unknown>): void {
    if (this._dependents === null) {
      this._dependents = new Set();
    }
    this._dependents.add(dependent);
  }

  _removeDependent(dependent: Calc<unknown>): void {
    if (this._dependents !== null) {
      this._dependents.delete(dependent);
      if (this._dependents.size === 0) {
        this._dependents = null;
      }
    }
  }

  addListener(listener: () => void): void {
    if (this._listeners === null) {
      this._listeners = new Set();
    }
    this._listeners.add(listener);
  }

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
          setTimeout(() => {
            throw error;
          }, 0);
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
