import type { CreateTaskInput } from "./schemas";

export type Task = {
  id: string;
  title: string;
  done: boolean;
  category: string;
  // Calendar date, "YYYY-MM-DD"
  dueDate: string | null;
  // UTC ISO string.
  createdAt: string;
};

export type TaskStore = {
  create(input: CreateTaskInput): Promise<Task>;
  delete(id: string): Promise<boolean>;
  list(): Promise<Task[]>;
  setDone(id: string, done: boolean): Promise<Task | null>;
};
