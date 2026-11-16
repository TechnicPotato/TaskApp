# 1. Category model

- **Status:** Accepted
- **Date:** 2026-11-16
- **Phase:** 3 (Categories)

## Context

In v1, a task's category is free text: `category: string` on each task, typed into a text box. Phase 3 adds category management (create, rename, delete), grouping and filtering. Phase 4 will add Google sign-in, so each user will have their own tasks and categories.

Free text causes problems as soon as categories matter:

- "Work", "work" and "Wrok" become three separate groups.
- A category exists only while some task uses it, so you can't create one in advance.
- Renaming a category means rewriting every task that has that name.

## Decisions

### 1. A category is its own entity, and tasks refer to it by ID

Categories live in their own Firestore collection. Each one has at least an `id`, a `name` and a `createdAt`. A task stores `categoryId` instead of a name.

**Why:**
- Each task has at most one category, and categories are the main way the list is grouped. Things you group by are normally first-class objects; Todoist's projects and Microsoft To Do's lists work this way.
- Users pick a category from a list instead of typing one, so near-duplicates can't happen.
- Renaming is one write to one document. Tasks show the new name automatically.
- Empty categories can exist.
- New features (colour, sort order, archiving) become new fields on the category.

### 2. Category names are unique per user, ignoring case

"Work" and "work" are the same name for the same user. Two different users can each have "Work".

- The name is stored as the user typed it ("Work") and displayed that way.
- Comparisons use a **normalised** form: leading and trailing spaces trimmed, then lower-cased.
- Until sign-in exists (Phase 4) there is only one implicit user, so the names are effectively unique across the whole app.

**Why:** names that differ only in case are almost always the same category typed twice. Uniqueness is per user because users' categories are private to them and must not collide.

### 3. Uniqueness is enforced by a name reservation document

Each category is stored as two documents:

| Document | ID | Purpose |
| --- | --- | --- |
| `categories/{id}` | Random, never changes | The category itself (`name`, `createdAt`, later `userId`). Tasks refer to this ID. |
| `categoryNames/{key}` | The normalised name (from Phase 4: user ID plus normalised name) | Reserves the name. Holds the `categoryId` it belongs to. |

Every write that touches a name uses **one transaction** that changes both documents:

- **Create:** `create()` the reservation, then create the category. If the name is taken, `create()` fails and the whole transaction is cancelled.
- **Rename:** `create()` the new reservation, delete the old one, and update the category's `name`. Tasks are not touched.
- **Delete:** delete the category and its reservation together.

**Why:** Firestore allows only one document per ID, and `create()` fails if the ID already exists. That makes the database itself reject a duplicate in a single atomic step, even when two requests arrive at the same moment. Keeping the category's own ID random and separate from its name means renaming stays a cheap write that never touches tasks (decision 1).

**Rules this depends on:**
- All category writes go through `CategoryStore`. Nothing else may change a category's name or a reservation, or the two documents could get out of sync.
- Name normalisation lives in **one shared function**, so the same input always produces the same reservation ID.
- The normalised name must be a valid Firestore document ID. For example, it can't contain `/`. Either reject such names during validation or encode the key.

### 4. Deleting a category moves its tasks to "Uncategorised"

Deleting a category sets `categoryId` to `null` on every task in it. This happens in the **same transaction** that deletes the category and its name reservation. Tasks are never deleted along with a category.

**Why:** the user's intent is "I don't need this label any more", not "throw away my work". Blocking the delete makes the user move every task by hand first, and archiving keeps categories the user wanted gone. One transaction means there's never a moment when the category is gone but tasks still point to it.

**Stopping new dangling references:** a task could be created or moved into the category while it's being deleted. To prevent this, any task write that sets a `categoryId` **reads that category document inside its own transaction** and fails if the category doesn't exist. Both transactions then touch the same category document, so Firestore runs them one after the other instead of interleaving them: either the task is written first and the delete moves it to Uncategorised, or the delete happens first and the task write fails with "category not found".

**Fallback:** when showing tasks, a `categoryId` that matches no category is shown as Uncategorised. This should never happen, but it means bad data degrades to a sensible display instead of an error.

#### Large categories

Firestore no longer has a fixed cap on the number of writes in one transaction (the old limit of 500 was removed in March 2023). A transaction is still limited to a **10 MiB request** and **270 seconds**, and a very large one is slow and likely to conflict with other writes. A personal task list won't come near these limits, so v1 updates all tasks in a single transaction.

If a category ever held too many tasks for one transaction, deletion would become a **multi-step process** that can be safely interrupted and restarted:

1. Mark the category `deleting: true`. From then on it's hidden from the picker, and task writes reject it (they already read the category document, per decision 4).
2. Move its tasks to Uncategorised in chunks (for example 200 per transaction), repeating until no task refers to it.
3. Delete the category and its name reservation in a final transaction.

Every step is **idempotent**: running it again does no harm. A delete that fails half-way can be finished by running it again. Until it finishes, the half-deleted category is hidden and blocked, and the display fallback above covers any task not yet moved. This is not built in v1; it's recorded so the path is clear if it's ever needed.

### 5. A task may have no category

`categoryId` is optional (`null`). Decision 4 requires this, and it also lets a task be created without choosing a category.

"Uncategorised" is **not a real category document**. It's how the UI labels tasks with a `null` category, and it's shown as its own group.

**Why:** a real "Uncategorised" document would need special rules: it couldn't be renamed or deleted, it would have to exist for every user, and it would take up the name. Representing "no category" as `null` needs none of that.

**Rule:** the name "Uncategorised" (after normalisation) is rejected when creating or renaming a category, so a user can't create a real category that looks the same as the built-in group.

## Consequences

- A new `CategoryStore` (interface, in-memory version, Firestore version and contract tests), following the existing `TaskStore` pattern.
- New API routes for categories.
- Showing tasks also means loading the categories and matching each task's `categoryId` to a name. Firestore has no joins; this is done in memory and is cheap at this scale.
- Every category write is a Firestore **transaction** over two documents. This is slightly slower than a single write, which doesn't matter for an action as rare as editing a category.
- The in-memory store must enforce the same rule (normalised names unique per user), so the shared contract tests cover it for both stores. A contract test should send two creates of the same name at once and check that exactly one succeeds.
- Deleting a category is a transaction over the category, its reservation and all its tasks. Task writes that set a `categoryId` become transactions too, because they must read the category (decision 4).
- The task schema changes from `category: string` to `categoryId: string | null`. Grouping must include an "Uncategorised" group for `null`.
- Contract tests should cover: deleting a category moves its tasks to `null`; creating a task in a deleted category fails; the name "Uncategorised" is rejected.
- Tasks already stored with a `category` string need a **migration** (a one-off script) or a data reset.
- Phase 4: categories get a `userId` field like tasks, and every category query is filtered by user.

## Alternatives considered

- **Keep the category as a field on the task.** Simplest, with no second collection. Rejected: it allows near-duplicates, can't represent empty categories, and makes renaming a write to every matching task. This model suits **tags** (several per task, made up as you go, never managed) better than categories.
- **Names unique but case-sensitive.** Rejected: "Work" and "work" would be two categories, which users almost never intend.
- **Names unique across all users.** Rejected: one user's "Work" would block every other user's.
- **Uniqueness: check with a query, then create, inside a transaction.** Rejected: when no category matches, the query returns no documents, so it's hard to be sure the transaction stops a second request that creates the same name at the same time. Uniqueness should not depend on subtle locking behaviour.
- **Uniqueness: use the normalised name as the category's own ID.** Safe against duplicates, because `create()` fails on an existing ID. Rejected because IDs can't change: renaming would mean creating a new category, deleting the old one, and rewriting every task that refers to it, which undoes the benefit of decision 1.
- **On delete: block it while tasks use the category.** The simplest safe option, with no multi-document write. Rejected: it pushes the work onto the user, who must move every task first. It would also still need the same protection against a task being added between the check and the delete.
- **On delete: archive instead.** Nothing is lost, and it can be undone. Rejected for v1: the user asked to delete it, so archived categories would build up unseen, and it raises the question of whether an archived name stays reserved. It could be added later as a separate "archive" action.
- **On delete: also delete the tasks (cascade).** Rejected: it destroys the user's tasks as a side effect of tidying up labels.
- **A real "Uncategorised" category document.** Rejected: see decision 5.

## Notes

- **Name reservation document.** A second document whose only job is to say "this name is taken". Because its ID is the normalised name, the database can hold only one, and that is what stops duplicates. The category keeps its own permanent ID, so renaming moves the reservation instead of the category.
- **Transactions that touch the same document.** If two transactions read or write the same document, Firestore doesn't let them interleave: one finishes first, and the other waits or retries and sees the new state. Decision 4 relies on this. Because "add a task to Work" and "delete Work" both touch the `Work` category document, they can't overlap.
- **Dangling references.** Firestore has no foreign keys, so nothing in the database stops a task pointing to a deleted category. Decision 4 prevents this in the app, and the display fallback handles it if it ever happens.
- **Idempotent steps.** The multi-step delete for large categories works because running any step twice has the same effect as running it once. A failed delete can simply be started again.
