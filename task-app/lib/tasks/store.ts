import type { TaskStore } from "./types";
import { createInMemoryTaskStore } from "./in-memory-task-store";

const globalForTaskStore = globalThis as unknown as {
  taskStore?: TaskStore;
};

export const taskStore = (globalForTaskStore.taskStore ??=
  createInMemoryTaskStore());
