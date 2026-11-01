import { connection } from "next/server";
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
        <li key={task.id} className="flex gap-2">
          <span>{task.title}</span>
          <span className="text-gray-500">{task.category}</span>
          {task.dueDate && <span> due {task.dueDate}</span>}
          {task.done ? " ✓" : ""}
        </li>
      ))}
    </ul>
  );
}
