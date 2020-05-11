/**
 * Schedule an error to be thrown as soon as possible as an uncaught exception
 * in an empty event loop context.
 *
 * Useful when user code throws an error that you want to report but you don’t
 * want to abort the currently running process.
 */
export function scheduleException(error: unknown) {
  // Use `setTimeout()` so that the exception isn’t an unhandled promise
  // rejection. Technically using a promise microtask would throw the
  // error faster.
  setTimeout(() => {
    throw error;
  }, 0);
}
