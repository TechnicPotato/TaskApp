import { connection } from "next/server";
import type { Task } from "@/lib/tasks/types";
import { taskStore } from "@/lib/tasks/store";

export async function TaskList() {
  await connection();
  const tasks = await taskStore.list();
  if (tasks.length === 0) {
    return <p>No tasks for now.</p>;
  }
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          {task.title}
          {task.dueDate && <span> due {task.dueDate}</span>}
          {task.done ? "✓" : ""}
        </li>
      ))}
    </ul>
  );
}
