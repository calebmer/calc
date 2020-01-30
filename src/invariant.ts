export default function invariant(condition: unknown): asserts condition {
  if (!condition) {
    throw new Error('Invariant violation.');
  }
}
