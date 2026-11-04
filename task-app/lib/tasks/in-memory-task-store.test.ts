import { createInMemoryTaskStore } from "./in-memory-task-store";
import { describeTaskStoreContract } from "./task-store-contract";

describeTaskStoreContract(async () => createInMemoryTaskStore());
