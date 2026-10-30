import { createTaskInputSchema } from "@/lib/tasks/schemas";
import { taskStore } from "@/lib/tasks/store";

export async function GET() {
  const tasks = await taskStore.list();
  return Response.json(tasks);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const result = createTaskInputSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      {
        error: "Invalid task input.",
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const task = await taskStore.create(result.data);

  return Response.json(task, { status: 201 });
}
