import type { CreateTaskInput } from "./schemas";
import type { Task } from "./types";
import { randomUUID } from "node:crypto";

export type TaskStore = {
  create(input: CreateTaskInput): Promise<Task>;
  delete(id: string): Promise<boolean>;
  list(): Promise<Task[]>;
  setDone(id: string, done: boolean): Promise<Task | null>;
};

export function createInMemoryTaskStore(): TaskStore {
  const storage: Map<string, Task> = new Map<string, Task>();

  const taskStore: TaskStore = {
    async create(inputDetails) {
      const newTask: Task = {
        id: randomUUID(),
        title: inputDetails.title,
        done: false,
        category: inputDetails.category,
        dueDate: inputDetails.dueDate,
        createdAt: new Date().toISOString(),
      };
      storage.set(newTask.id, newTask);
      return { ...newTask };
    },

    async delete(id) {
      return storage.delete(id);
    },

    async list() {
      return Array.from(storage.values(), (task) => ({ ...task }));
    },

    async setDone(id, done) {
      // Replaces rather than mutates, so caller doesn't hold a reference into storage.
      const task = storage.get(id);
      if (task === undefined) return null;

      const updated = { ...task, done };
      storage.set(id, updated);
      return { ...updated };
    },
  };
  return taskStore;
}

const globalForTaskStore = globalThis as unknown as {
  taskStore?: TaskStore;
};

export const taskStore = (globalForTaskStore.taskStore ??=
  createInMemoryTaskStore());
