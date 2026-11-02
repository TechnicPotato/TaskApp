import type { Task } from "@/lib/tasks/types";

type TaskItemProps = {
  task: Task;
};

export function TaskItem({ task }: TaskItemProps) {
  return (
    <li className="flex gap-2">
      <span>{task.title}</span>
      <span className="text-gray-500">{task.category}</span>
      {task.dueDate && <span>due {task.dueDate}</span>}
      {task.done && <span>✓</span>}
    </li>
  );
}
