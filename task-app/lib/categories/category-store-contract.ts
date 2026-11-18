import { describe, it, expect } from "vitest";
import type { CategoryStore, Category } from "./types";

async function createOrFail(
  store: CategoryStore,
  name: string,
): Promise<Category> {
  const output = await store.create({ name });

  if (!output.success) {
    throw new Error(`Create "${name}" failed: ${output.reason}`);
  }
  return output.category;
}

export function describeCategoryStoreContract(
  createStore: () => Promise<CategoryStore>,
) {
  // Tests run under the assumption that createStore() returns an empty store.
  describe("CategoryStore.create", () => {
    it("creates and returns a category", async () => {
      const store = await createStore();
      expect(await store.list()).toEqual([]);

      const result = await store.create({ name: "Bills" });

      expect(result).toEqual({
        success: true,
        category: {
          id: expect.any(String),
          name: "Bills",
        },
      });

      if (!result.success) throw new Error("expected create to succeed");
      expect(await store.list()).toEqual([result.category]);
    });

    it("assigns a unique ID to each category", async () => {
      const store = await createStore();

      const a = await createOrFail(store, "Bills");
      const b = await createOrFail(store, "Gaming");

      expect(a.id).not.toBe(b.id);
      expect(await store.list()).toHaveLength(2);
    });

    it("keeps the name as typed rather than its normalized form", async () => {
      const store = await createStore();

      const category = await createOrFail(store, "Side Projects");

      expect(category.name).toBe("Side Projects");
      expect(await store.get(category.id)).toEqual(category);
    });

    it("rejects a name that is already taken, ignoring case", async () => {
      const store = await createStore();
      await createOrFail(store, "Work");

      const result = await store.create({ name: "wORK" });

      expect(result).toEqual({ success: false, reason: "name-taken" });
      expect(await store.list()).toHaveLength(1);
    });

    it("lets exactly one of two concurrent creates of the same name succeed", async () => {
      const store = await createStore();
      const [first, second] = await Promise.all([
        store.create({ name: "Chores" }),
        store.create({ name: "Chores" }),
      ]);

      expect([first.success, second.success].filter(Boolean)).toHaveLength(1);
      const rejected = [first, second].find((result) => !result.success);
      expect(rejected).toEqual({ success: false, reason: "name-taken" });
      expect(await store.list()).toHaveLength(1);
    });

    it("returns a copy so callers cannot mutate the stored category", async () => {
      const store = await createStore();
      const category = await createOrFail(store, "Bills");

      category.name = "Changed outside the store";

      expect(await store.get(category.id)).toEqual({
        id: category.id,
        name: "Bills",
      });
    });
  });

  describe("CategoryStore.list", () => {
    it("returns an empty array when there are no categories", async () => {
      const store = await createStore();

      expect(await store.list()).toEqual([]);
    });

    it("sorts categories by name, ignoring case", async () => {
      const store = await createStore();
      await createOrFail(store, "banana");
      await createOrFail(store, "Cherry");
      await createOrFail(store, "apple");

      const names = (await store.list()).map((category) => category.name);

      expect(names).toEqual(["apple", "banana", "Cherry"]);
    });
  });

  describe("CategoryStore.get", () => {
    it("returns the category with the given ID", async () => {
      const store = await createStore();
      const bills = await createOrFail(store, "Bills");
      await createOrFail(store, "Gaming");

      expect(await store.get(bills.id)).toEqual(bills);
    });

    it("returns null for an unknown ID", async () => {
      const store = await createStore();

      expect(await store.get("missing-id")).toBeNull();
    });
  });

  describe("CategoryStore.rename", () => {
    it("renames the category and keeps its ID", async () => {
      const store = await createStore();
      const category = await createOrFail(store, "Bills");

      const result = await store.rename(category.id, "Utilities");

      expect(result).toEqual({
        success: true,
        category: { id: category.id, name: "Utilities" },
      });
      expect(await store.get(category.id)).toEqual({
        id: category.id,
        name: "Utilities",
      });
    });

    it("returns not-found for an unknown ID", async () => {
      const store = await createStore();

      const result = await store.rename("missing-id", "Utilities");

      expect(result).toEqual({ success: false, reason: "not-found" });
    });

    it("rejects a name another category has, ignoring case, and changes nothing", async () => {
      const store = await createStore();
      const bills = await createOrFail(store, "Bills");
      await createOrFail(store, "Work");

      const result = await store.rename(bills.id, "work");

      expect(result).toEqual({ success: false, reason: "name-taken" });
      expect(await store.get(bills.id)).toEqual(bills);
    });

    it("allows changing only the capitalization of its own name", async () => {
      const store = await createStore();
      const category = await createOrFail(store, "work");

      const result = await store.rename(category.id, "Work");

      expect(result).toEqual({
        success: true,
        category: { id: category.id, name: "Work" },
      });
    });

    it("frees the old name so it can be used again", async () => {
      const store = await createStore();
      const category = await createOrFail(store, "Bills");
      await store.rename(category.id, "Utilities");

      const result = await store.create({ name: "Bills" });

      expect(result.success).toBe(true);
    });
  });

  describe("CategoryStore.delete", () => {
    it("deletes the category and returns true", async () => {
      const store = await createStore();
      const bills = await createOrFail(store, "Bills");
      const gaming = await createOrFail(store, "Gaming");

      expect(await store.delete(bills.id)).toBe(true);

      expect(await store.get(bills.id)).toBeNull();
      expect(await store.list()).toEqual([gaming]);
    });

    it("returns false for an unknown ID", async () => {
      const store = await createStore();

      expect(await store.delete("missing-id")).toBe(false);
    });

    it("frees the name so it can be used again", async () => {
      const store = await createStore();
      const category = await createOrFail(store, "Bills");
      await store.delete(category.id);

      const result = await store.create({ name: "Bills" });

      expect(result.success).toBe(true);
    });
  });
}
