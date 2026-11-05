import {
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from "@google-cloud/firestore";
import type { Task } from "./types";
import { z } from "zod";

const taskDocumentSchema = z.object({
  title: z.string(),
  done: z.boolean(),
  category: z.string(),
  dueDate: z.string().nullable(),
  createdAt: z.instanceof(Timestamp),
});

type TaskDocument = z.infer<typeof taskDocumentSchema>;

const taskConverter: FirestoreDataConverter<Task, TaskDocument> = {
  toFirestore(task: Task): TaskDocument {
    return {
      title: task.title,
      done: task.done,
      category: task.category,
      dueDate: task.dueDate,
      createdAt: Timestamp.fromDate(new Date(task.createdAt)),
    };
  },

  fromFirestore(snapshot: QueryDocumentSnapshot): Task {
    // Firestore doesn't enforce a schema, so validation done here.
    const result = taskDocumentSchema.safeParse(snapshot.data());
    if (!result.success) {
      throw new Error(
        `Invalid task document ${snapshot.id}:\n${z.prettifyError(result.error)}`,
        { cause: result.error },
      );
    }
    return {
      ...result.data,
      id: snapshot.id,
      createdAt: result.data.createdAt.toDate().toISOString(),
    };
  },
};
