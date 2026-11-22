import "server-only";
import {
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from "@google-cloud/firestore";
import { z } from "zod";
import type { Category, CategoryStore } from "./types";
import { normalizeCategoryName } from "./schemas";
import { isAlreadyExistsError, isValidDocumentId } from "../firestore";

// Part of the stored data format, must not change.
const RESERVATION_KEY_PREFIX = "name:";

function createReservationKey(name: string): string {
  return `${RESERVATION_KEY_PREFIX}${normalizeCategoryName(name)}`;
}

const categoryDocumentSchema = z.object({
  name: z.string(),
});

type CategoryDocument = z.infer<typeof categoryDocumentSchema>;

type ReservationDocument = {
  categoryId: string;
};

const categoryConverter: FirestoreDataConverter<Category, CategoryDocument> = {
  toFirestore(category: Category): CategoryDocument {
    return { name: category.name };
  },

  fromFirestore(snapshot: QueryDocumentSnapshot): Category {
    const result = categoryDocumentSchema.safeParse(snapshot.data());
    if (!result.success) {
      throw new Error(
        `Invalid category document ${snapshot.id}:\n${z.prettifyError(result.error)}`,
        { cause: result.error },
      );
    }
    return { id: snapshot.id, name: result.data.name };
  },
};

export function createFirestoreCategoryStore(
  firestore: Firestore,
  // Lets each test use its own pair of collections.
  collectionPrefix = "",
): CategoryStore {
  const categories = firestore
    .collection(`${collectionPrefix}categories`)
    .withConverter(categoryConverter);
  const categoryNames = firestore.collection(
    `${collectionPrefix}categoryNames`,
  );

  // The reservation document for a name. Equal names (ignoring case) share one.
  function reservationRef(name: string) {
    return categoryNames.doc(createReservationKey(name));
  }

  return {
    async create(input) {
      const ref = categories.doc();
      const newCategory: Category = {
        id: ref.id,
        name: input.name,
      };
      const batch = firestore.batch();
      batch.create(ref, newCategory);
      batch.create(reservationRef(input.name), {
        categoryId: ref.id,
      } satisfies ReservationDocument);
      try {
        await batch.commit();
        return { success: true, category: newCategory };
      } catch (error) {
        if (isAlreadyExistsError(error)) {
          return { success: false, reason: "name-taken" };
        }
        throw error;
      }
    },

    async delete(id) {
      if (!isValidDocumentId(id)) {
        return false;
      }
      const ref = categories.doc(id);
      return firestore.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const category = snapshot.data();
        if (category === undefined) {
          return false;
        }
        tx.delete(ref);
        tx.delete(reservationRef(category.name));
        return true;
      });
    },

    async get(id) {
      if (!isValidDocumentId(id)) {
        return null;
      }
      const snapshot = await categories.doc(id).get();
      return snapshot.data() ?? null;
    },

    async list() {
      const snapshot = await categories.get();
      return snapshot.docs
        .map((doc) => doc.data())
        .sort((a, b) =>
          a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
        );
    },

    async rename(id, name) {
      if (!isValidDocumentId(id)) {
        return { success: false, reason: "not-found" };
      }
      const ref = categories.doc(id);
      return firestore.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const category = snapshot.data();
        if (category === undefined) {
          return { success: false, reason: "not-found" };
        }
        const oldName = category.name;
        if (createReservationKey(oldName) === createReservationKey(name)) {
          tx.update(ref, { name });
          return { success: true, category: { id, name } };
        }
        const reservationSnapshot = await tx.get(reservationRef(name));
        if (reservationSnapshot.exists) {
          return { success: false, reason: "name-taken" };
        }

        tx.update(ref, { name });
        tx.delete(reservationRef(oldName));
        tx.create(reservationRef(name), {
          categoryId: id,
        } satisfies ReservationDocument);
        return { success: true, category: { id, name } };
      });
    },
  };
}
