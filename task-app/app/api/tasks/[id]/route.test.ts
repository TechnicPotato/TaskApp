import { afterEach, describe, expect, it } from "vitest";
import { taskStore } from "@/lib/tasks/store";
import { DELETE, PATCH } from "./route";

const createdTaskIds: string[] = [];

async function createTestTask() {
  const task = await taskStore.create({
    title: "Route test task",
    category: "personal",
    dueDate: null,
  });
  createdTaskIds.push(task.id);
  return task;
}

function makePatchRequest(id: string, body: string) {
  return new Request(`http://localhost/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/tasks/${id}`, {
    method: "DELETE",
  });
}

function makeRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterEach(async () => {
  await Promise.all(createdTaskIds.splice(0).map((id) => taskStore.delete(id)));
});

describe("PATCH /api/tasks/[id]", () => {
  it("sets the requested completion value", async () => {
    const task = await createTestTask();

    const completedResponse = await PATCH(
      makePatchRequest(task.id, JSON.stringify({ done: true })),
      makeRouteContext(task.id),
    );
    expect(completedResponse.status).toBe(200);
    expect(await completedResponse.json()).toMatchObject({
      id: task.id,
      done: true,
    });

    const reopenedResponse = await PATCH(
      makePatchRequest(task.id, JSON.stringify({ done: false })),
      makeRouteContext(task.id),
    );
    expect(reopenedResponse.status).toBe(200);
    expect(await reopenedResponse.json()).toMatchObject({
      id: task.id,
      done: false,
    });
  });

  it("is safe to retry with the same completion value", async () => {
    const task = await createTestTask();
    const body = JSON.stringify({ done: true });

    const firstResponse = await PATCH(
      makePatchRequest(task.id, body),
      makeRouteContext(task.id),
    );
    const retryResponse = await PATCH(
      makePatchRequest(task.id, body),
      makeRouteContext(task.id),
    );

    expect(firstResponse.status).toBe(200);
    expect(retryResponse.status).toBe(200);
    expect(await retryResponse.json()).toMatchObject({
      id: task.id,
      done: true,
    });
  });

  it("returns 400 when done is not a boolean", async () => {
    const task = await createTestTask();

    const response = await PATCH(
      makePatchRequest(task.id, JSON.stringify({ done: "yes" })),
      makeRouteContext(task.id),
    );

    expect(response.status).toBe(400);
    expect(await taskStore.list()).toContainEqual(task);
  });

  it("returns 404 when the task does not exist", async () => {
    const tasksBefore = await taskStore.list();

    const response = await PATCH(
      makePatchRequest("missing-id", JSON.stringify({ done: true })),
      makeRouteContext("missing-id"),
    );

    expect(response.status).toBe(404);
    expect(await taskStore.list()).toEqual(tasksBefore);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  it("deletes the task and returns 204", async () => {
    const task = await createTestTask();

    const response = await DELETE(
      makeDeleteRequest(task.id),
      makeRouteContext(task.id),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(await taskStore.list()).not.toContainEqual(task);
  });

  it("returns 404 when the task does not exist", async () => {
    const tasksBefore = await taskStore.list();

    const response = await DELETE(
      makeDeleteRequest("missing-id"),
      makeRouteContext("missing-id"),
    );

    expect(response.status).toBe(404);
    expect(await taskStore.list()).toEqual(tasksBefore);
  });
});
