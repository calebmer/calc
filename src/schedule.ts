// TODO: document
export function scheduleException(error: unknown) {
  setTimeout(() => {
    throw error;
  }, 0);
}
