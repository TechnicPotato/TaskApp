import type { CreateCategoryInput } from "./schemas";

export type CategoryWriteResult<Reason extends string> =
  { success: true; category: Category } | { success: false; reason: Reason };

export type Category = {
  id: string;
  name: string;
};

export type CategoryStore = {
  create(
    input: CreateCategoryInput,
  ): Promise<CategoryWriteResult<"name-taken">>;
  delete(id: string): Promise<boolean>;
  get(id: string): Promise<Category | null>;
  // Order defined by name alphabetically ignoring case
  list(): Promise<Category[]>;
  rename(
    id: string,
    name: string,
  ): Promise<CategoryWriteResult<"name-taken" | "not-found">>;
};
