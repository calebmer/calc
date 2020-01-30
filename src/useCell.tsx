import React, {useState, useEffect, useContext, useMemo} from 'react';
import {unstable_wrapCallback as wrapCallback} from 'scheduler';
import Cell from './Cell';
import {scheduleMicrotask} from './schedule';

export default function useCell<T>(cell: Cell<T>): T {
  const stabilizer = useContext(CellStabilizerContext);

  const value = stabilizer.read(cell);

  useEffect(() => {
    stabilizer.listen(cell);
    return () => {
      stabilizer.unlisten(cell);
    };
  }, [cell]);

  return value;
}

export function CellStabilizer({children}: {children?: React.ReactNode}) {
  const [values, setValues] = useState(initializeMap);

  const stabilizer: CellStabilizerContext = useMemo(() => {
    const referenceCounts = new Map<Cell<unknown>, number>();
    let hasScheduledUpdate = false;

    function read<T>(cell: Cell<T>): T {
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

    function listen(cell: Cell<unknown>) {
      const referenceCount = referenceCounts.get(cell);

      if (referenceCount === undefined) {
        cell.addListener(listener);
        referenceCounts.set(cell, 1);
      } else {
        referenceCounts.set(cell, referenceCount + 1);
      }
    }

    function unlisten(cell: Cell<unknown>) {
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
      read,
      listen,
      unlisten,
    };
  }, [values]);

  return (
    <CellStabilizerContext.Provider value={stabilizer}>
      {children}
    </CellStabilizerContext.Provider>
  );
}

type CellStabilizerContext = {
  read<T>(cell: Cell<T>): T;
  listen<T>(cell: Cell<T>): void;
  unlisten(cell: Cell<unknown>): void;
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
    read<T>(cell: Cell<T>): T {
      if (values.has(cell)) {
        return values.get(cell) as T;
      } else {
        const value = cell.readWithoutListening();
        values.set(cell, value);
        return value;
      }
    },
    listen(cell) {
      cell.addListener(listener);
    },
    unlisten(cell) {
      cell.removeListener(listener);
    },
  };
}

function initializeMap(): Map<Cell<unknown>, unknown> {
  return new Map();
}
