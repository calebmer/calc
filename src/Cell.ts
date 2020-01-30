import {scheduleException} from './schedule';

// TODO: Document.

// NOTE: For naming we use `read`/`write` instead of `get`/`set` since
// `read`/`write` evokes a stronger sense of “oh this is a side effect” than
// `get`/`set`. Particularly `get` which we normally think of as a harmless
// operation. Then we further hammer that home by calling our read method
// `readWithoutListening` to emphasize the fact that you are observing a
// snapshot in time.

export default class Cell<T> {
  private _value: T;
  private _listeners = new Set<() => void>();

  constructor(value: T) {
    this._value = value;
  }

  public readWithoutListening() {
    return this._value;
  }

  public write(value: T) {
    this._value = value;
    this._listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        scheduleException(error);
      }
    });
  }

  public addListener(listener: () => void) {
    this._listeners.add(listener);
  }

  public removeListener(listener: () => void) {
    this._listeners.delete(listener);
  }
}
