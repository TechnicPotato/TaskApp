import { Firestore } from "@google-cloud/firestore";
import { afterAll, describe } from "vitest";
import { randomUUID } from "node:crypto";
import { describeCategoryStoreContract } from "./category-store-contract";
import { createFirestoreCategoryStore } from "./firestore-category-store";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const firestore = new Firestore({ projectId: "demo-taskapp" });

describe.skipIf(!emulatorHost)("Firestore category store", () => {
  afterAll(async () => {
    await firestore.terminate();
  });
  describeCategoryStoreContract(async () =>
    createFirestoreCategoryStore(firestore, `category-test-${randomUUID()}-`),
  );
});
