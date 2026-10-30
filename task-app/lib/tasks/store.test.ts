import { describe, expect, it } from "vitest";
import { createInMemoryTaskStore } from "./store";
import type { CreateTaskInput } from "./schemas";

function makeInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: "Test task",
    category: "personal",
    dueDate: null,
    ...overrides,
  };
}

describe("TaskStore.create", () => {
  it("creates and stores a task", async () => {
    const store = createInMemoryTaskStore();

    const task = await store.create(makeInput({ dueDate: "2026-11-01" }));

    expect(task).toMatchObject({
      title: "Test task",
      done: false,
      category: "personal",
      dueDate: "2026-11-01",
    });
    expect(task.id).toEqual(expect.any(String));
    expect(task.createdAt).toEqual(expect.any(String));
    expect(await store.list()).toEqual([task]);
  });

  it("returns a copy so callers cannot mutate the stored task", async () => {
    const store = createInMemoryTaskStore();
    const createdTask = await store.create(makeInput());

    createdTask.title = "Changed outside the store";

    const [storedTask] = await store.list();
    expect(storedTask.title).toBe("Test task");
  });

  it("assigns a unique ID to each created task", async () => {
    const store = createInMemoryTaskStore();

    const firstTask = await store.create(makeInput({ title: "First task" }));
    const secondTask = await store.create(
      makeInput({ title: "Second task", category: "work" }),
    );

    expect(firstTask.id).not.toBe(secondTask.id);
    expect(await store.list()).toHaveLength(2);
  });

  it("sets createdAt to a valid ISO timestamp", async () => {
    const store = createInMemoryTaskStore();

    const task = await store.create(makeInput());

    expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
  });
});

describe("TaskStore.list", () => {
  it("returns an empty array when the store is empty", async () => {
    const store = createInMemoryTaskStore();

    expect(await store.list()).toEqual([]);
  });

  it("returns the tasks in the store", async () => {
    const store = createInMemoryTaskStore();
    const task = await store.create(makeInput());

    expect(await store.list()).toEqual([task]);
  });

  it("returns shallow copies so callers cannot mutate stored tasks", async () => {
    const store = createInMemoryTaskStore();
    const task = await store.create(makeInput({ title: "Original title" }));

    const [listedTask] = await store.list();
    expect(listedTask).toEqual(task);
    expect(listedTask).not.toBe(task);

    listedTask.title = "Changed outside the store";

    const [storedTask] = await store.list();
    expect(storedTask.title).toBe("Original title");
  });
});

describe("TaskStore.toggleStatus", () => {
  it("toggles a task's done status", async () => {
    const store = createInMemoryTaskStore();
    const task = await store.create(makeInput());

    const completedTask = await store.toggleStatus(task.id);
    expect(completedTask?.done).toBe(true);
    expect(await store.list()).toEqual([{ ...task, done: true }]);

    if (completedTask === null) {
      throw new Error("Expected the task to be found");
    }
    completedTask.done = false;
    expect(await store.list()).toEqual([{ ...task, done: true }]);

    const reopenedTask = await store.toggleStatus(task.id);
    expect(reopenedTask?.done).toBe(false);
    expect(await store.list()).toEqual([task]);
  });

  it("returns null when the task does not exist", async () => {
    const store = createInMemoryTaskStore();

    expect(await store.toggleStatus("missing-id")).toBeNull();
  });
});

describe("TaskStore.delete", () => {
  it("deletes an existing task", async () => {
    const store = createInMemoryTaskStore();
    const task = await store.create(makeInput());

    expect(await store.delete(task.id)).toBe(true);
    expect(await store.list()).toEqual([]);
  });

  it("only removes the task with the matching ID", async () => {
    const store = createInMemoryTaskStore();
    const firstTask = await store.create(makeInput({ title: "First task" }));
    const secondTask = await store.create(
      makeInput({ title: "Second task", category: "work" }),
    );

    expect(await store.delete(firstTask.id)).toBe(true);
    expect(await store.list()).toEqual([secondTask]);
  });

  it("returns false when the task does not exist", async () => {
    const store = createInMemoryTaskStore();

    expect(await store.delete("missing-id")).toBe(false);
  });
});
