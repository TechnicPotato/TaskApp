import { parseJsonBody } from "@/lib/http";
import { createTaskInputSchema } from "@/lib/tasks/schemas";
import { taskStore } from "@/lib/tasks/store";

export async function GET() {
  const tasks = await taskStore.list();
  return Response.json(tasks);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(
    request,
    createTaskInputSchema,
    "Invalid task input.",
  );
  if (!parsed.success) return parsed.response;

  const task = await taskStore.create(parsed.data);

  return Response.json(task, { status: 201 });
}
