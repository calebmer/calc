// TODO: document
export function scheduleException(error: unknown) {
  setTimeout(() => {
    throw error;
  }, 0);
}

const microtaskPromise = Promise.resolve();

// TODO: document
export function scheduleMicrotask(action: () => void) {
  microtaskPromise.then(action).catch(scheduleException);
}
