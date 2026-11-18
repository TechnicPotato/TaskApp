import { describeCategoryStoreContract } from "./category-store-contract";
import { createInMemoryCategoryStore } from "./in-memory-category-store";

describeCategoryStoreContract(async () => createInMemoryCategoryStore());
