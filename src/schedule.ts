import {unstable_wrapCallback as wrapCallback} from 'scheduler';

// TODO: document
export function scheduleException(error: unknown) {
  setTimeout(() => {
    throw error;
  }, 0);
}

const microtaskPromise = Promise.resolve();

// TODO: document
export function scheduleMicrotask(callback: () => void) {
  microtaskPromise.then(wrapCallback(callback)).catch(scheduleException);
}
