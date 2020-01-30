import React, {useState, useEffect, useContext, useMemo} from 'react';
import invariant from './invariant';
import {scheduleMicrotask} from './schedule';
import Cell from './Cell';

export default function useCell<T>(cell: Cell<T>): T {
  const stabilizer = useContext(CellStabilizerContext);

  const [value, setValue] = useState(() => {
    return stabilizer.readWithoutListening(cell);
  });

  useEffect(() => {
    stabilizer.addListener(cell, setValue);
    return () => {
      stabilizer.removeListener(cell, setValue);
    };
  }, [cell]);

  return value;
}

export function CellStabilizer({children}: {children?: React.ReactNode}) {
  const stabilizer: CellStabilizerContext = useMemo(() => {
    type CellManager<T> = {
      value: T;
      updaters: Set<(value: T) => void>;
      listener: (() => void) | null;
    };

    const managers = new Map<Cell<unknown>, CellManager<unknown>>();

    function readWithoutListening<T>(cell: Cell<T>): T {
      let manager = managers.get(cell);

      if (manager === undefined) {
        manager = {
          value: cell.readWithoutListening(),
          updaters: new Set(),
          listener: null,
        };
        managers.set(cell, manager);
      }

      return manager.value as T;
    }

    function getExistingManager<T>(cell: Cell<T>): CellManager<T> {
      const manager = managers.get(cell) as CellManager<T> | undefined;
      invariant(manager);
      return manager;
    }

    function addListener<T>(cell: Cell<T>, update: (value: T) => void) {
      const manager = getExistingManager(cell);

      manager.updaters.add(update);

      const value = cell.readWithoutListening();
      if (!is(manager.value, value)) {
        manager.value = value;
        manager.updaters.forEach(update => update(value));
      }

      if (manager.listener === null) {
        function listener() {
          manager.value = value;
          manager.updaters.forEach(update => update(value));
        }

        manager.listener = listener;
        cell.addListener(listener);
      }
    }

    function removeListener<T>(cell: Cell<T>, update: (value: T) => void) {}

    return {
      readWithoutListening,
      addListener,
      removeListener,
    };
  }, []);

  return (
    <CellStabilizerContext.Provider value={stabilizer}>
      {children}
    </CellStabilizerContext.Provider>
  );
}

type CellStabilizerContext = {
  readWithoutListening<T>(cell: Cell<T>): T;
  addListener<T>(cell: Cell<T>, setValue: (value: T) => void): void;
  removeListener<T>(cell: Cell<T>, setValue: (value: T) => void): void;
};

const CellStabilizerContext = React.createContext<CellStabilizerContext>(
  createGlobalCellStabilizer(),
);

function createGlobalCellStabilizer(): CellStabilizerContext {
  let hasWarned = false;
  const values = new Map<Cell<unknown>, unknown>();

  function listener() {
    if (hasWarned === false) {
      hasWarned = true;
      console.warn(
        'Cell updated but no `<CellStabilizer>` context was provided. ' +
          'That means cells will stay the same forever.',
      );
    }
  }

  return {
    readWithoutListening<T>(cell: Cell<T>): T {
      if (values.has(cell)) {
        return values.get(cell) as T;
      } else {
        const value = cell.readWithoutListening();
        values.set(cell, value);
        return value;
      }
    },
    addListener(cell) {
      cell.addListener(listener);
    },
    removeListener(cell) {
      cell.removeListener(listener);
    },
  };
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
function is(x: unknown, y: unknown) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / (y as any);
  } else {
    return x !== x && y !== y;
  }
}
