type DependencySet = Map<
  Value<unknown> | Calculation<unknown>,
  ValueVersion | null
>;

type DependencySetEntry =
  | [Value<unknown>, ValueVersion]
  | [Calculation<unknown>, null];

type TransactionID = number;

type Transaction = {
  id: TransactionID;
  dependencies: DependencySet | null;
};

let nextTransactionID = 0;

let currentTransaction: Transaction | null = null;

export function withTransaction<T>(action: () => T): T {
  let lastTransaction = currentTransaction;
  currentTransaction = {
    id: nextTransactionID++,
    dependencies: null,
  };
  try {
    return action();
  } finally {
    currentTransaction = lastTransaction;
  }
}

function withoutTransaction(): void {
  if (currentTransaction !== null) {
    throw new Error('Must not be within a transaction.');
  }
}

function getTransaction(): Transaction {
  if (currentTransaction === null) {
    // TODO: Better error message.
    throw new Error('Must be within a transaction.');
  }
  return currentTransaction;
}

type ValueVersion = number;

export class Value<T> {
  _version: ValueVersion;
  _value: T;

  constructor(value: T) {
    this._version = 0;
    this._value = value;
  }

  get(): T {
    const {dependencies} = getTransaction();
    if (dependencies !== null) dependencies.set(this, this._version);

    return this._value;
  }

  set(value: T): void {
    withoutTransaction();

    // TODO: Schedule this for later?
    if (!objectIs(value, this._value)) {
      this._version++;
      this._value = value;
    }
  }
}

const enum CalculationReturn {
  Normal = 0,
  Abrupt = 1,
}

export class Calculation<T> {
  _valid: TransactionID | false;
  _return: CalculationReturn;
  _value: unknown;
  _dependencies: DependencySet | null;
  readonly _calculate: () => T;

  constructor(calculate: () => T) {
    this._valid = false;
    this._return = CalculationReturn.Normal;
    this._value = null;
    this._dependencies = null;
    this._calculate = calculate;
  }

  get(): T {
    const transaction = getTransaction();
    const lastDependencies = transaction.dependencies;
    if (lastDependencies !== null) lastDependencies.set(this, null);

    updateValidity(transaction, this);

    if (this._valid === false) {
      transaction.dependencies = new Map();

      try {
        this._value = this._calculate();
        this._return = CalculationReturn.Normal;
      } catch (error) {
        this._value = error;
        this._return = CalculationReturn.Abrupt;
      }

      const dependencies = transaction.dependencies;
      transaction.dependencies = lastDependencies;

      this._dependencies = dependencies;
      this._valid = transaction.id;
    }

    if (this._return === CalculationReturn.Normal) {
      return this._value as T;
    } else {
      throw this._value;
    }
  }
}

/**
 * Updates the validity of a calculation so that its validity _known_ in the
 * context of the current transaction.
 *
 * - If a calculation is known to be invalid then the `_valid` field will
 *   be `false`.
 * - If a calculation is known to be valid in a transaction then the `_valid`
 *   field will be set to the ID of the transaction this calculation is known to
 *   be valid in.
 *
 * Also recursively updates the validity of some calculation dependencies. If we
 * reach a dependency we know to be invalid then we stop updating our
 * dependencies. Notably, this means if a dependency of this calculation is
 * referenced again in this transaction then its validity will be known.
 *
 * Writes are not allowed to happen in a transaction which is why we can only
 * know if a given calculation is valid inside of a transaction. If we are not
 * in a transaction, then a write could happen at any time without us knowing. A
 * calculation only listens to updates from its dependencies when it itself is
 * being listened to which is why a calculation can be in a state of
 * unknown validity.
 */
function updateValidity(
  transaction: Transaction,
  calculation: Calculation<unknown>,
): void {
  // If we know the validity of our calculation we don’t need to do
  // anything else...
  if (calculation._valid === false) return;
  if (calculation._valid === transaction.id) return;

  const iterator = calculation._dependencies![Symbol.iterator]();
  let step = iterator.next();

  // Iterate through all of our dependencies to make sure they are still valid.
  // If we find a single invalid dependency we will stop iterating.
  while (step.done === false) {
    const entry = step.value as DependencySetEntry;

    if (entry[1] !== null) {
      if (entry[0]._version > entry[1]) {
        calculation._valid = false;
        return;
      }
    } else {
      updateValidity(transaction, entry[0]);
      if (entry[0]._valid === false) {
        calculation._valid = false;
        return;
      }
    }

    step = iterator.next();
  }

  // All our dependencies are valid so we know that this dependency must also
  // be valid.
  calculation._valid = transaction.id;
  return;
}

/**
 * Implementation of [Object.is][1] so that consumers don’t have to ship
 * a polyfill.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
const objectIs =
  Object.is ||
  ((x: any, y: any) => {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y;
    } else {
      return x !== x && y !== y;
    }
  });
