import "server-only";
import {
  type Firestore,
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  GrpcStatus,
} from "@google-cloud/firestore";
import type { Task, TaskStore } from "./types";
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
    // Firestore doesn't enforce a schema, so validate on read.
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

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === GrpcStatus.NOT_FOUND
  );
}

// Validates against Firestore's document ID rules.
function isValidDocumentId(id: string): boolean {
  return (
    id !== "" && // not empty
    !id.includes("/") && // "/" separates path segments
    id !== "." &&
    id !== ".." && // reserved by Firestore
    !/^__.*__$/.test(id) && // __double-underscore__ IDs are reserved
    Buffer.byteLength(id, "utf8") <= 1500 // the size limit is in bytes, not characters
  );
}

export function createFirestoreTaskStore(
  firestore: Firestore,
  collectionName = "tasks",
): TaskStore {
  const tasks = firestore
    .collection(collectionName)
    .withConverter(taskConverter);
  return {
    async create(inputDetails) {
      const ref = tasks.doc();
      const newTask: Task = {
        id: ref.id,
        title: inputDetails.title,
        done: false,
        category: inputDetails.category,
        dueDate: inputDetails.dueDate,
        createdAt: new Date().toISOString(),
      };
      await ref.create(newTask);
      return newTask;
    },

    async list() {
      const snapshot = await tasks.orderBy("createdAt", "asc").get();
      return snapshot.docs.map((doc) => doc.data());
    },

    async setDone(id, done) {
      if (!isValidDocumentId(id)) {
        return null;
      }
      const ref = tasks.doc(id);
      try {
        await ref.update({ done });
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      }
      const snapshot = await ref.get();
      return snapshot.data() ?? null;
    },

    async delete(id) {
      if (!isValidDocumentId(id)) {
        return false;
      }
      const ref = tasks.doc(id);
      try {
        await ref.delete({ exists: true });
        return true;
      } catch (error) {
        if (isNotFoundError(error)) {
          return false;
        }
        throw error;
      }
    },
  };
}
