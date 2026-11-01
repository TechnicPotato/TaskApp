import { TaskList } from "./_components/task-list";
import { AddTaskForm } from "./_components/add-task-form";
import { Suspense } from "react";

export default function Home() {
  return (
    <main>
      <h1>Tasks</h1>
      <AddTaskForm />
      <Suspense fallback={<p>Loading tasks...</p>}>
        <TaskList />
      </Suspense>
    </main>
  );
}
