# TaskFlow — Lessons Learned

Patterns to avoid repeating, updated after corrections.

---

## Testing

- **Playwright strict mode**: `getByText('X')` fails if text appears in both sidebar and main content. Use `page.locator('h3', { hasText: 'X' })` or `page.locator('main button', { hasText: 'X' })` to scope selectors.
- **getByLabel requires htmlFor/id linkage**: Label elements must have `htmlFor` matching the input `id`. Added auto-derived `id` from label text in Input, Select, and Textarea components.
- **Port conflicts**: Vite will auto-increment port if 5174 is occupied. `playwright.config.ts` targets 5175 with `reuseExistingServer: true` — this handles both cases.
- **Preview tool cross-origin**: The preview tool browser is bound to the project root's port. Cannot navigate cross-origin to a different port. Verify TaskFlow changes via `npx playwright screenshot` or `curl` instead.

## TypeScript / Zod

- **Zod + React Hook Form type mismatch**: `zodResolver(schema)` type inference breaks when `z.preprocess` is used. Fix: `resolver: zodResolver(schema) as any` and `onSubmit = (data: any)`.
- **LucideIcon type import**: Must use `import type { LucideIcon }` not `import { LucideIcon }` to avoid "is a type and must be imported using a type-only import" error.

## State Management

- **Non-reactive Zustand calls**: Never call `useTaskStore.getState()` directly inside a React component render path. Always use `useMemo` with the reactive `tasks` array from the hook.
- **Seeding strategy**: Use `tasks.length === 0` check in `useEffect` in App.tsx. Zustand persist re-hydrates before first render, so the check correctly detects a fresh install vs a returning user.

## Security

- **Math.random() for IDs**: Not cryptographically secure (CWE-338). Always use `crypto.randomUUID()`.
- **URL.revokeObjectURL**: Always call after triggering a download via a blob URL. Omitting it leaks memory.
- **localStorage integrity**: Zustand persisted state must be validated on rehydration via `onRehydrateStorage`. See `src/lib/storageValidation.ts`.

## File Tools

- **Write tool requires prior Read**: The Write tool will error if the file hasn't been read first in the current session. Always read before writing to existing files; use Write only for new files.
