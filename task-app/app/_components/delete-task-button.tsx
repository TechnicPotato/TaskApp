"use client";

import type { Task } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteTaskButtonProps = Pick<Task, "id" | "title">;

export function DeleteTaskButton({ id, title }: DeleteTaskButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  // Stays true until the refreshed list has rendered.
  const [isRefreshing, startTransition] = useTransition();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        startTransition(() => router.refresh());
        return;
      }
      if (response.status === 404) {
        startTransition(() => router.refresh());
        return;
      }
      console.error(`Failed to delete task: ${response.status}`);
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting || isRefreshing}
      aria-label={`Delete ${title}`}
      className="rounded border px-2 text-sm disabled:opacity-50"
    >
      Delete
    </button>
  );
}
