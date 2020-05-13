import {scheduleException} from './helpers/scheduleException';

/**
 * Some reactive value which may change over time. You may listen for changes
 * in the value. There are a few notable subclasses:
 *
 * - `LiveValue`: A live value is a reactive value with no dependencies that
 *   you may directly change. While `Live` is immutable a `Live.Value` allows
 *   you to introduce mutability into the system.
 * - `LiveComputation`: Some reactive value which is computed from other `Live`
 *   dependencies. The computation will change when one of its `Live`
 *   dependencies change.
 */
export default abstract class Live<T> {
  /**
   * Some of the dependents of this live value. A dependent only registers
   * itself if it has a listener. Therefore for all dependents the following is
   * true `_listeners !== null`.
   *
   * This set should never be empty. Instead of an empty set this property will
   * be null. That’s a small performance optimization to avoid an allocation.
   */
  _dependents: Set<Live<unknown>> | null = null;

  /**
   * All of the direct user-code listeners of this live value.
   *
   * This set should never be empty. Instead of an empty set this property will
   * be null. That’s a small performance optimization to avoid an allocation.
   */
  _listeners: Set<() => void> | null = null;

  /**
   * Computes the current value and records it as a dependency. Since we
   * record this `Live` as a dependency we will listen to changes.
   *
   * NOTE: You may not call this function outside of a reactive context! The
   * function will throw outside of a reactive context since it can’t register
   * itself as a dependency.
   */
  abstract live(): T;

  /**
   * Gets the current value of our `Live` value without listening to changes.
   * Use this if you only need the current value for some one-off process.
   * Otherwise use `live()` which will record that you depend on this value and
   * will listen for changes.
   */
  abstract getWithoutListening(): T;

  /**
   * Gets the latest version for our `Live`. If the value in the `Live` is stale
   * (maybe dependencies have changed) this will recompute the value.
   */
  abstract _getLatestVersion(): number;

  /**
   * Adds a dependent `Live`. That way when this value updates we can notify
   * all the `Live`s that depend on us.
   *
   * A dependent only registers itself if it has a listener. Therefore for all
   * dependents the following is true `_listeners !== null`.
   */
  _addDependent(dependent: Live<unknown>): void {
    if (this._dependents === null) {
      this._dependents = new Set();
    }
    this._dependents.add(dependent);
  }

  /**
   * Removes a dependent `Live`.
   */
  _removeDependent(dependent: Live<unknown>): void {
    if (this._dependents !== null) {
      this._dependents.delete(dependent);
      if (this._dependents.size === 0) {
        this._dependents = null;
      }
    }
  }

  /**
   * Adds a user supplied listener function which may be called whenever a
   * `Live`’s value changes.
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
   * Calls all of our `Live` listeners and all the listeners of our
   * dependent `Live`s.
   *
   * This also serves as an invalidation signal. If this function is called on
   * your `Live` you know that you must recompute it.
   *
   * NOTE: If the same dependent appears twice in our dependency tree we must
   * only call its listeners once!! Currently we depend on each dependent to
   * implement this logic.
   */
  _callListeners(): void {
    if (this._listeners !== null) {
      this._listeners.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          scheduleException(error);
        }
      });
    }
    if (this._dependents !== null) {
      this._dependents.forEach((dependent) => {
        dependent._callListeners();
      });
    }
  }
}
