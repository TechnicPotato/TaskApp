import "server-only";
import type { TaskStore } from "./types";
import { createInMemoryTaskStore } from "./in-memory-task-store";
import { createFirestoreTaskStore } from "./firestore-task-store";
import { Firestore } from "@google-cloud/firestore";

const globalForTaskStore = globalThis as unknown as {
  taskStore?: TaskStore;
};

function createTaskStore(): TaskStore {
  const taskStoreType = process.env.TASK_STORE;
  switch (taskStoreType) {
    case "memory":
    case undefined:
      console.info("Using task store: memory");
      return createInMemoryTaskStore();
    case "firestore":
      console.info("Using task store: firestore");
      return createFirestoreTaskStore(new Firestore());
    default:
      throw new Error(
        `Invalid TASK_STORE value "${taskStoreType}": expected "memory" or "firestore"`,
      );
  }
}

export const taskStore = (globalForTaskStore.taskStore ??= createTaskStore());
