import { setTaskDoneInputSchema } from "@/lib/tasks/schemas";
import { taskStore } from "@/lib/tasks/store";

type TaskRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: TaskRouteContext) {
  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const result = setTaskDoneInputSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      {
        error: "Invalid task update.",
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const task = await taskStore.setDone(id, result.data.done);
  if (task === null) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  return Response.json(task);
}

export async function DELETE(_request: Request, { params }: TaskRouteContext) {
  const { id } = await params;
  const deleted = await taskStore.delete(id);

  if (!deleted) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
