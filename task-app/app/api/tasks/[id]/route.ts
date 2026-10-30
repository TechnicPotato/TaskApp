import { parseJsonBody } from "@/lib/http";
import { setTaskDoneInputSchema } from "@/lib/tasks/schemas";
import { taskStore } from "@/lib/tasks/store";

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/tasks/[id]">,
) {
  const { id } = await params;
  const parsed = await parseJsonBody(
    request,
    setTaskDoneInputSchema,
    "Invalid task update.",
  );
  if (!parsed.success) return parsed.response;

  const task = await taskStore.setDone(id, parsed.data.done);
  if (task === null) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  return Response.json(task);
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/tasks/[id]">,
) {
  const { id } = await params;
  const deleted = await taskStore.delete(id);

  if (!deleted) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
