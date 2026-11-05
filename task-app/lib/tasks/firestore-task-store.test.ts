import { Firestore } from "@google-cloud/firestore";
import { afterAll, describe } from "vitest";
import { describeTaskStoreContract } from "./task-store-contract";
import { createFirestoreTaskStore } from "./firestore-task-store";
import { randomUUID } from "node:crypto";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const firestore = new Firestore({ projectId: "demo-taskapp" });

describe.skipIf(!emulatorHost)("Firestore task store", () => {
  afterAll(async () => {
    await firestore.terminate();
  });
  describeTaskStoreContract(async () =>
    createFirestoreTaskStore(firestore, `task-test-${randomUUID()}`),
  );
});
