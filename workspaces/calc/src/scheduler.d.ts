declare module 'scheduler/unstable_mock' {
  export * from 'scheduler';

  export function unstable_flushAll(): void;
}
