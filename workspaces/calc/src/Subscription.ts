import Live from './Live';
import {
  currentComputationTransaction,
  currentComputationDependencies,
  setCurrentComputationDependencies,
} from './Computation';
import objectIs from './helpers/objectIs';

/**
 * Subscribes to a reactive value outside of our system. Allows for integrating
 * with event systems like the DOM event system or the Backbone event system.
 *
 * This class is designed so that in theory you could
 * `new Live.Subscription(live)`. Where `live` is an arbitrary `Live` value. You
 * can’t actually do this since to get the value from `Live` you call
 * `getWithoutListening()`. (The name is uglier to discourage use.)
 *
 * You could use a `Live.Value` and `set()` whenever the value changes, but
 * using a `Live.Subscription` has two advantages:
 *
 * - We don’t subscribe unless someone is actually consuming this subscription.
 *   Either someone added a listener or a computation (which is listened to)
 *   depends on this subscription.
 *
 * - We lazily call `get()`. We only call it when someone asks us for the
 *   value. That way if `get()` is expensive we only call it when we need it.
 *
 * If the value silently changes without the listener being called then we don’t
 * guarantee that the subscription will show the new value.
 */
export default class Subscription<T> extends Live<T> {
  /**
   * Is the current subscription value valid? This works like
   * `Computation._valid`. If this is a number then we know the value is valid
   * in that computation transaction. If this is `true` then we know the value
   * is valid but we validated it outside a computation transaction. If this is
   * `false` then we know the value is invalid for sure.
   *
   * Just because the value is valid doesn’t mean it is up-to-date! If the value
   * is valid but we haven’t attached our subscription listener then the
   * value may have silently changed.
   *
   * If we’ve attached our subscription listener then we know a valid value is
   * also up-to-date. We don’t support silent updates when our subscription
   * listener is attached.
   */
  _valid: number | boolean = false;

  /**
   * A monotonically increasing version number for our subscription value.
   *
   * The version will not change if we recompute and the value is the exact
   * same as determined by `Object.is`.
   */
  _version: number = 0;

  /**
   * Did the subscription return normally or did it throw? When we return the
   * value we will use this to decide whether or not to throw.
   */
  _completion: Completion = Completion.Normal;

  /**
   * The current subscription value.
   *
   * When the computation is invalid (`this._valid === false`) we set this to
   * `null` since we know the value is stale. That way the old value may be
   * garbage collected.
   */
  _value: unknown = null;

  /**
   * The user provided computation function which actually produces a value.
   */
  readonly _compute: () => T;

  /**
   * The user provided function to attach a listener to the event source.
   */
  readonly _addSubscriptionListener: (listener: () => void) => void;

  /**
   * The user provided function to detach a listener to the event source.
   */
  readonly _removeSubscriptionListener: (listener: () => void) => void;

  /**
   * The function we call when our user’s subscription fires. It invalidates our
   * value and calls our listeners.
   *
   * Implemented as a property instead of a method so that `this` is
   * auto-binded. That way the reference is the same and we can pass this to
   * add/remove subscription listener.
   */
  readonly _subscriptionListener = () => {
    if (this._valid !== false) {
      this._valid = false;
      this._value = null; // Allow the value to be garbage collected.
      super._callListeners();
    }
  };

  constructor({
    get,
    addListener,
    removeListener,
  }: {
    get: () => T;
    addListener: (listener: () => void) => void;
    removeListener: (listener: () => void) => void;
  }) {
    super();
    this._compute = get;
    this._addSubscriptionListener = addListener;
    this._removeSubscriptionListener = removeListener;
  }

  live(): T {
    if (currentComputationDependencies === null) {
      throw new Error('Can only call `live()` inside of a reactive context');
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
    // If we previously validated this computation in the current transaction
    // then we don’t need to do it again.
    if (this._valid === currentComputationTransaction) {
      return this._version;
    }

    // Recompute the value if it might be stale. If we are not listening to our
    // subscription then it might be stale whenever we call this function! If
    // we are listening then we can depend on `this._valid` being up-to-date.
    if (this._valid === false || shouldListen(this) === false) {
      // We don’t want users to accidentally call `live()` in the subscription
      // computation. So set our computation dependencies to null as a
      // precaution. Now if a user tries to call `live()` an error will
      // be thrown.
      const lastComputationDependencies = currentComputationDependencies;
      setCurrentComputationDependencies(null);

      // Actually recompute! Mathematically speaking the result of a JavaScript
      // function is either a value or an exception, so handle both cases.
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
      setCurrentComputationDependencies(lastComputationDependencies);
    }

    // We know that our value is valid now. If we aren’t in a computation
    // transaction then set to true instead of the transaction number.
    this._valid = currentComputationTransaction ?? true;

    return this._version;
  }

  _addDependent(dependent: Live<unknown>): void {
    const wasListening = shouldListen(this);
    super._addDependent(dependent);
    updateSubscriptionListener(this, wasListening);
  }

  _removeDependent(dependent: Live<unknown>): void {
    const wasListening = shouldListen(this);
    super._removeDependent(dependent);
    updateSubscriptionListener(this, wasListening);
  }

  addListener(listener: () => void): void {
    const wasListening = shouldListen(this);
    super.addListener(listener);
    updateSubscriptionListener(this, wasListening);
  }

  removeListener(listener: () => void): void {
    const wasListening = shouldListen(this);
    super.removeListener(listener);
    updateSubscriptionListener(this, wasListening);
  }

  // Called recursively in `Live` for dependents. Subscriptions should not have
  // any dependencies and so shouldn’t be a dependent of any `Live`.
  _callListeners() {
    throw new Error('`Live.Subscription` should not depend on anything');
  }
}

const enum Completion {
  Normal = 'normal',
  Abrupt = 'abrupt',
}

function shouldListen(subscription: Subscription<unknown>): boolean {
  return subscription._dependents !== null || subscription._listeners !== null;
}

function updateSubscriptionListener(
  subscription: Subscription<unknown>,
  wasListening: boolean,
): void {
  const willListen = shouldListen(subscription);

  if (willListen === true && wasListening === false) {
    // We need to invalidate the subscription value when adding a listener since
    // there may have been a silent update since the time we last read the
    // subscription value.
    //
    // If the subscription was validated in the current transaction then it’s ok
    // to leave it as valid.
    if (subscription._valid !== currentComputationTransaction) {
      subscription._valid = false;
      subscription._value = null; // Allow the value to be garbage collected.
    }
    subscription._addSubscriptionListener(subscription._subscriptionListener);
  } else if (willListen === false && wasListening === true) {
    subscription._removeSubscriptionListener(
      subscription._subscriptionListener,
    );
  }
}
