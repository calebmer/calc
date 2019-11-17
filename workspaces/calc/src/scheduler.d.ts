declare module 'scheduler' {
  export type unstable_PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

  export const unstable_ImmediatePriority: 1;
  export const unstable_UserBlockingPriority: 2;
  export const unstable_NormalPriority: 3;
  export const unstable_LowPriority: 4;
  export const unstable_IdlePriority: 5;

  export function unstable_runWithPriority<T>(
    priorityLevel: unstable_PriorityLevel,
    eventHandler: () => T,
  ): T;

  export type unstable_Task = {
    id: number;
    callback: () => void;
    priorityLevel: unstable_PriorityLevel;
  };

  export function unstable_scheduleCallback(
    priorityLevel: unstable_PriorityLevel,
    callback: () => void,
  ): unstable_Task;

  export function unstable_cancelCallback(task: unstable_Task): void;

  export function unstable_getCurrentPriorityLevel(): unstable_PriorityLevel;
}

declare module 'scheduler/unstable_mock' {
  export * from 'scheduler';

  export function unstable_flushAll(): void;
}
