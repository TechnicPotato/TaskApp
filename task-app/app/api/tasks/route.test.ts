import { afterEach, describe, expect, it } from "vitest";
import { taskStore } from "@/lib/tasks/store";
import { GET, POST } from "./route";

const createdTaskIds: string[] = [];

async function createTestTask() {
  const task = await taskStore.create({
    title: "Collection route test task",
    category: "personal",
    dueDate: null,
  });
  createdTaskIds.push(task.id);
  return task;
}

// String format to allow for malformed JSON to be tested.
function makePostRequest(body: Record<string, unknown> | string) {
  return new Request("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(async () => {
  await Promise.all(createdTaskIds.splice(0).map((id) => taskStore.delete(id)));
});

describe("GET /api/tasks", () => {
  it("returns the tasks as JSON", async () => {
    const task = await createTestTask();

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toContainEqual(task);
  });
});

describe("POST /api/tasks", () => {
  it("defaults dueDate to null when missing", async () => {
    const request = makePostRequest({
      title: "Plan the week",
      category: " personal ",
    });

    const response = await POST(request);
    const task = await response.json();
    createdTaskIds.push(task.id);

    expect(response.status).toBe(201);
    expect(task).toMatchObject({
      title: "Plan the week",
      category: "personal",
      done: false,
      dueDate: null,
    });
  });

  it("creates a task with trimmed title from valid input", async () => {
    const request = makePostRequest({
      title: "  Plan the week  ",
      category: " personal ",
      dueDate: "2026-11-01",
    });

    const response = await POST(request);
    const task = await response.json();
    createdTaskIds.push(task.id);

    expect(response.status).toBe(201);
    expect(task).toMatchObject({
      title: "Plan the week",
      category: "personal",
      done: false,
      dueDate: "2026-11-01",
    });
  });

  it.each([
    {
      description: "blank title",
      payload: { title: "  ", category: "personal", dueDate: null },
      expectedIssue: { path: "title", message: "Title is required." },
    },
    {
      description: "blank category",
      payload: { title: "Test task", category: "  ", dueDate: null },
      expectedIssue: { path: "category", message: "Category is required." },
    },
    {
      description: "title over 200 characters",
      payload: { title: "t".repeat(201), category: "personal", dueDate: null },
      expectedIssue: {
        path: "title",
        message: "Title must be 200 characters or fewer.",
      },
    },
    {
      description: "category over 200 characters",
      payload: { title: "Test task", category: "c".repeat(201), dueDate: null },
      expectedIssue: {
        path: "category",
        message: "Category must be 200 characters or fewer.",
      },
    },
    {
      description: "impossible date",
      payload: { title: "Test task", category: "c", dueDate: "2026-02-30" },
      expectedIssue: {
        path: "dueDate",
        message: "Due date must be a real date in YYYY-MM-DD format.",
      },
    },
    {
      description: "bad date format",
      payload: { title: "Test task", category: "c", dueDate: "01/11/2026" },
      expectedIssue: {
        path: "dueDate",
        message: "Due date must be a real date in YYYY-MM-DD format.",
      },
    },
  ])("returns 400 for $description", async ({ payload, expectedIssue }) => {
    const tasksBefore = await taskStore.list();

    const response = await POST(makePostRequest(payload));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.issues).toContainEqual(expectedIssue);
    expect(await taskStore.list()).toEqual(tasksBefore);
  });

  it.each([
    { description: "an unclosed object", body: '{"title": "Test task"' },
    { description: "plain text", body: "not json" },
    { description: "an empty body", body: "" },
  ])("returns 400 when the body is $description", async ({ body }) => {
    const tasksBefore = await taskStore.list();

    const response = await POST(makePostRequest(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Request body must be valid JSON.",
    });
    expect(await taskStore.list()).toEqual(tasksBefore);
  });
});
