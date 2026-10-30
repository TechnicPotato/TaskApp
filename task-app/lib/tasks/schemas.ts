import { z } from "zod";

export const createTaskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "200 character maximum for Title"),
  category: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(200, "200 character maximum for Category"),
  dueDate: z.iso.date().nullable(),
});

export const setTaskDoneInputSchema = z.object({
  done: z.boolean(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
