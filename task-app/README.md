# task-app

The Next.js app for TaskApp. See the [root README](../README.md) for the project overview, architecture and roadmap.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

## Scripts

| Script                            | What it does                                 |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Start the development server                 |
| `npm run build` / `npm start`     | Production build and server                  |
| `npm run lint`                    | ESLint                                       |
| `npm run typecheck`               | Generate Next.js route types, then run `tsc` |
| `npm run format` / `format:check` | Prettier: fix or check formatting            |
| `npm test` / `test:run`           | Vitest in watch mode / once                  |

## Configuration

| Variable                  | Values                            | Purpose                                                                                      |
| ------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `TASK_STORE`              | `memory` (default) or `firestore` | Where tasks are stored                                                                       |
| `GOOGLE_CLOUD_PROJECT`    | a project ID                      | Needed locally when `TASK_STORE=firestore`; on Cloud Run the client detects it automatically |
| `FIRESTORE_EMULATOR_HOST` | e.g. `127.0.0.1:8080`             | Points the Firestore client at the local emulator (enables the Firestore store tests)        |

## Code layout

```
app/              Pages, components and API routes
lib/tasks/        Task model, schemas, stores and their contract tests
lib/categories/   Category model, schemas, stores and their contract tests
lib/http.ts       Shared request parsing for API routes
```
