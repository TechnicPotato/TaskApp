import { normalizeCategoryName } from "./schemas";
import type { Category, CategoryStore } from "./types";
import { randomUUID } from "node:crypto";

export function createInMemoryCategoryStore(): CategoryStore {
  const storage: Map<string, Category> = new Map<string, Category>();

  // excludeID is used to prevent rename from matching its current name and rejecting
  function doesCategoryNameExist(name: string, excludeId?: string): boolean {
    const normalizedName = normalizeCategoryName(name);

    for (const category of storage.values()) {
      if (
        normalizeCategoryName(category.name) === normalizedName &&
        category.id !== excludeId
      ) {
        return true;
      }
    }

    return false;
  }

  const categoryStore: CategoryStore = {
    async create({ name }) {
      if (doesCategoryNameExist(name)) {
        return { success: false, reason: "name-taken" };
      }
      const newCategory: Category = {
        id: randomUUID(),
        name,
      };
      storage.set(newCategory.id, newCategory);
      return { success: true, category: { ...newCategory } };
    },

    async delete(id) {
      return storage.delete(id);
    },

    async get(id) {
      const category = storage.get(id);
      return category !== undefined ? { ...category } : null;
    },

    async list() {
      return Array.from(storage.values(), (category) => ({ ...category })).sort(
        (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
      );
    },

    async rename(id, name) {
      const category = storage.get(id);
      if (category === undefined) {
        return { success: false, reason: "not-found" };
      }
      if (doesCategoryNameExist(name, id)) {
        return { success: false, reason: "name-taken" };
      }
      const renamed = { ...category, name };
      storage.set(id, renamed);
      return { success: true, category: { ...renamed } };
    },
  };
  return categoryStore;
}
