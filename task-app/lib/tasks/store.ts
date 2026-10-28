import type { Task, CreateTaskInput } from "./types";

export function createInMemoryTaskStore(): Map<string, Task> {
  const storage: Map<string, Task> = new Map<string, Task>();
  return storage;
}
