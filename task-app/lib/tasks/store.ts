import type { Task, CreateTaskInput } from "./types";
import { randomUUID } from "crypto";

export function createInMemoryTaskStore(): Map<string, Task> {
  const storage: Map<string, Task> = new Map<string, Task>();
  return storage;
}

export function createTask(inputDetails: CreateTaskInput): Task {
  const newTask: Task = {
    id: randomUUID(),
    title: inputDetails.title,
    done: false,
    category: inputDetails.category,
    dueDate: inputDetails.dueDate,
    createdAt: new Date().toISOString(),
  };
  return newTask;
}

export type TaskStore = {
  createTask(input: CreateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;
  listTasks(): Promise<Task[]>;
  updateTaskStatus(id: string): Promise<Task | null>;
};
