import type { Task } from "@/lib/tasks/types";
import { TaskCheckbox } from "./task-checkbox";

type TaskItemProps = {
  task: Task;
};

export function TaskItem({ task }: TaskItemProps) {
  return (
    <li className="flex gap-2">
      <TaskCheckbox id={task.id} done={task.done} title={task.title} />
      <span className={task.done ? "line-through text-gray-500" : undefined}>
        {task.title}
      </span>
      <span className="text-gray-500">{task.category}</span>
      {task.dueDate && <span>due {task.dueDate}</span>}
    </li>
  );
}
