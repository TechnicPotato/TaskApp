import { z } from "zod";

export const createTaskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  category: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(200, "Category must be 200 characters or fewer."),
  dueDate: z.iso
    .date("Due date must be a real date in YYYY-MM-DD format.")
    .nullable()
    .default(null),
});

export const setTaskDoneInputSchema = z.object({
  done: z.boolean(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
