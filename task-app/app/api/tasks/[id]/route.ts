import { taskStore } from "@/lib/tasks/store";

type TaskRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: TaskRouteContext) {
  const { id } = await params;
  const deleted = await taskStore.delete(id);

  if (!deleted) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
