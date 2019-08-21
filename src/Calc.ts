export interface Calc<T> {
  getWithoutListening(): T;
  calc(): T;
  _getLatestVersion(): number;
}
