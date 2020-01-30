import React, {useState, useEffect, useContext, useMemo} from 'react';
import {unstable_wrapCallback as wrapCallback} from 'scheduler';
import Cell from './Cell';
import {scheduleMicrotask} from './schedule';

export default function useCell<T>(cell: Cell<T>): T {
  const stabilizer = useContext(CellStabilizerContext);

  const value = stabilizer.readWithoutListening(cell);

  useEffect(() => {
    // TODO: Update in effect.

    stabilizer.addListener(cell);
    return () => {
      stabilizer.removeListener(cell);
    };
  }, [cell]);

  return value;
}

export function CellStabilizer({children}: {children?: React.ReactNode}) {
  const [values, setValues] = useState(() => {
    return new Map<Cell<unknown>, unknown>();
  });

  const stabilizer: CellStabilizerContext = useMemo(() => {
    const referenceCounts = new Map<Cell<unknown>, number>();
    let hasScheduledUpdate = false;

    function readWithoutListening<T>(cell: Cell<T>): T {
      if (values.has(cell)) {
        return values.get(cell) as T;
      } else {
        const value = cell.readWithoutListening();
        values.set(cell, value);
        return value;
      }
    }

    function listener() {
      if (hasScheduledUpdate === false) {
        hasScheduledUpdate = true;
        scheduleMicrotask(
          wrapCallback(() => {
            hasScheduledUpdate = false;
            setValues(new Map());
          }),
        );
      }
    }

    function addListener(cell: Cell<unknown>) {
      const referenceCount = referenceCounts.get(cell);

      if (referenceCount === undefined) {
        cell.addListener(listener);
        referenceCounts.set(cell, 1);
      } else {
        referenceCounts.set(cell, referenceCount + 1);
      }
    }

    function removeListener(cell: Cell<unknown>) {
      const referenceCount = referenceCounts.get(cell);

      if (referenceCount !== undefined) {
        if (referenceCount === 1) {
          cell.removeListener(listener);
          referenceCounts.delete(cell);
        } else {
          referenceCounts.set(cell, referenceCount - 1);
        }
      }
    }

    return {
      readWithoutListening,
      addListener,
      removeListener,
    };
  }, [values]);

  return (
    <CellStabilizerContext.Provider value={stabilizer}>
      {children}
    </CellStabilizerContext.Provider>
  );
}

type CellStabilizerContext = {
  readWithoutListening<T>(cell: Cell<T>): T;
  addListener<T>(cell: Cell<T>): void;
  removeListener(cell: Cell<unknown>): void;
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
