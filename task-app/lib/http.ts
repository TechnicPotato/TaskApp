import type { z } from "zod";

type ParseResult<T> =
  { success: true; data: T } | { success: false; response: Response };

export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  errorMessage: string,
): Promise<ParseResult<z.output<T>>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: Response.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: Response.json(
        {
          error: errorMessage,
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: result.data };
}
