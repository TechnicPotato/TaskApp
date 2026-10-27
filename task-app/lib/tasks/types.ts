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

export type CreateTaskInput = Pick<Task, "title" | "category" | "dueDate">;
