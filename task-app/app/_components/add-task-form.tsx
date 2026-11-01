"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

type ApiErrorBody = {
  error: string;
  issues?: { path: string; message: string }[];
};

function getFormString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function AddTaskForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = getFormString(formData, "title");
    const category = getFormString(formData, "category");
    const dueDateValue = getFormString(formData, "dueDate");
    const dueDate = dueDateValue === "" ? null : dueDateValue;
    const payload = {
      title,
      category,
      dueDate,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        form.reset();
        router.refresh();
        return;
      }

      const body: ApiErrorBody = await response.json();
      if (body.issues) {
        setFieldErrors(
          Object.fromEntries(
            body.issues.map((issue) => [issue.path, issue.message]),
          ),
        );
      } else {
        setFormError(body.error);
      }
    } catch (error) {
      console.error(error);
      setFormError(
        "Couldn't save the task. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="flex flex-col gap-1" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1">
        Title:
        <input type="text" name="title" />
        {fieldErrors.title && (
          <span className="text-sm text-red-600">{fieldErrors.title}</span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        Category:
        <input type="text" name="category" />
        {fieldErrors.category && (
          <span className="text-sm text-red-600">{fieldErrors.category}</span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        Due Date:
        <input type="date" name="dueDate" />
        {fieldErrors.dueDate && (
          <span className="text-sm text-red-600">{fieldErrors.dueDate}</span>
        )}
      </label>
      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}
      <button
        className="rounded border px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed
"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Adding Task..." : "Add Task"}
      </button>
    </form>
  );
}
