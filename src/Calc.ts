export interface Calc<T> {
  calc(): T;
  getWithoutListening(): T;
  _getLatestVersion(): number;
}
