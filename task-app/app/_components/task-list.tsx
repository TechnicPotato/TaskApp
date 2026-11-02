import { connection } from "next/server";
import { taskStore } from "@/lib/tasks/store";
import { TaskItem } from "./task-item";

export async function TaskList() {
  await connection();
  const tasks = await taskStore.list();
  if (tasks.length === 0) {
    return <p>No tasks for now.</p>;
  }
  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
