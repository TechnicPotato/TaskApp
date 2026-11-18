import { z } from "zod";

// Label for tasks with no category. It's not a real category, so no category may use this name.
export const UNCATEGORISED_LABEL = "Uncategorised";

// The form used to compare names, so "Work", " work " and "WORK" count as the same.
// Keep this the only place that decides how names are compared: both stores use it.
export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Category name is required.")
  .max(50, "Category name must be 50 characters or fewer.")
  .refine((name) => !name.includes("/"), "Forward slashes (/) are not allowed.")
  .refine(
    (name) =>
      normalizeCategoryName(name) !==
      normalizeCategoryName(UNCATEGORISED_LABEL),
    `"${UNCATEGORISED_LABEL}" is reserved for tasks without a category.`,
  );

export const createCategoryInputSchema = z.object({
  name: categoryNameSchema,
});

// The category's ID comes from the URL, so only the new name is in the body.
export const renameCategoryInputSchema = z.object({
  name: categoryNameSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type RenameCategoryInput = z.infer<typeof renameCategoryInputSchema>;
