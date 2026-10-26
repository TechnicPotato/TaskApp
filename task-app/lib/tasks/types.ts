export type Task = {
  id: string;
  title: string;
  done: boolean;
  category: string;
  // Calender date, "YYYY-MM-DD"
  dueDate: string | null;
  // UTC ISO string.
  createdAt: string;
};

export type CreateTaskInput = Pick<Task, "title" | "category" | "dueDate">;
