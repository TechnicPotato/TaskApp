import { taskStore } from "@/lib/tasks/store";

type ToggleRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: ToggleRouteContext) {
  const { id } = await params;
  const task = await taskStore.toggleStatus(id);

  if (task === null) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  return Response.json(task);
}
