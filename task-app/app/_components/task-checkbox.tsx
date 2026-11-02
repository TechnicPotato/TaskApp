"use client";

import type { Task } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

type TaskCheckboxProps = Pick<Task, "id" | "done" | "title">;

export function TaskCheckbox({ id, done, title }: TaskCheckboxProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState<boolean>(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextDone = event.currentTarget.checked;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });

      if (response.ok) {
        router.refresh();
        return;
      }
      if (response.status === 404) {
        router.refresh();
        return;
      }
      console.error(`Failed to update task: ${response.status}`);
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={done}
      aria-label={`Mark ${title} as done`}
      onChange={handleChange}
      disabled={isSaving}
    />
  );
}
