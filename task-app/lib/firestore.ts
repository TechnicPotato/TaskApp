import { GrpcStatus } from "@google-cloud/firestore";

// Validates against Firestore's document ID rules.
export function isValidDocumentId(id: string): boolean {
  return (
    id !== "" && // not empty
    !id.includes("/") && // "/" separates path segments
    id !== "." &&
    id !== ".." && // reserved by Firestore
    !/^__.*__$/.test(id) && // __double-underscore__ IDs are reserved
    Buffer.byteLength(id, "utf8") <= 1500 // the size limit is in bytes, not characters
  );
}

export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === GrpcStatus.NOT_FOUND
  );
}

export function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === GrpcStatus.ALREADY_EXISTS
  );
}
