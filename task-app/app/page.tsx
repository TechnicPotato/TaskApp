import { TaskList } from "./_components/task-list";
import { Suspense } from "react";

export default function Home() {
  return (
    <main>
      <h1>Tasks</h1>
      <Suspense fallback={<p>Loading tasks...</p>}>
        <TaskList />
      </Suspense>
    </main>
  );
}
