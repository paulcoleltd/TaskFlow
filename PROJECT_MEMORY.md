# TaskFlow — Project Memory File

> **Purpose:** This file is the single source of truth for resuming development.
> Every session that makes a change, fixes a bug, or learns a lesson MUST update this file.
>
> **SESSION START RULE:** Always read the `.claude` memory file first — it records exactly where development stopped. Then read this file for full detail. Continue from that exact point. Never restart from scratch.

---

## Phase Overview (Quick Reference)

| Phase | Name | Status |
|-------|------|--------|
| 1 | Core SPA | ✅ Complete |
| 2 | Real-Time Collaboration (Socket.io) | ✅ Complete |
| 3 | Auth + Feature Expansion | ✅ Complete |
| 4 | Test Coverage (125/125 E2E) | ✅ Complete |
| 5 | Convex Backend Migration | 🔄 ~90% done |
| 6 | Push Notifications + Mobile App + Multi-browser E2E | 📋 Planned |

**4 phases fully complete. 1 in progress. 1 planned.**
Phase 5 is blocked only on `npx convex dev` (requires interactive browser login by the user).

---

## Project Identity

| Field | Value |
|-------|-------|
| App name | TaskFlow |
| Type | Production-grade Task Management SPA |
| Local path | `C:\Users\Dell\Task Management Web App` |
| Git repo | `https://github.com/paulcoleltd/TaskFlow.git` |
| Branch | `Pauls-Branch` (main working branch) |
| Git user | `paul` |
| Dev server | `http://localhost:5175` (locked — `strictPort: true`) |
| Status | Phase 5 in progress — Phases 1–4 complete |

---

## Stack

| Concern | Tool |
|---------|------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite (port locked to 5175) |
| Styling | Tailwind CSS v3 — dark navy custom theme |
| State | Zustand + `persist` middleware (localStorage) |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 (BrowserRouter) |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| Real-time | Socket.io (server on port 3002) |
| Backend | Convex (cloud, optional — local mode works without it) |
| Auth | @convex-dev/auth (Convex mode) / local demo accounts (local mode) |
| Testing | Playwright E2E |

---

## How to Run

```bash
cd "C:\Users\Dell\Task Management Web App"

# Local mode (no backend needed) — always works
npm run dev
# → http://localhost:5175

# Full stack (with Socket.io collaboration server)
npm run dev:all
# → Vite on :5175 + Socket.io on :3002

# E2E tests (dev server must be running first)
npm run test:e2e

# TypeScript check
npx tsc --noEmit

# Production build
npm run build
```

---

## Demo Login Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | `alex@taskflow.io` | `Admin1234!` | Full — create, edit, delete |
| Member | `sarah@taskflow.io` | `Member1234!` | Create & edit own tasks |
| Viewer | `marcus@taskflow.io` | `Viewer1234!` | Read-only |

These are hardcoded in `src/pages/LoginPage.tsx` (`LOCAL_ACCOUNTS`) and work without any backend.

---

## Architecture: Dual-Mode (CRITICAL — read this)

The app runs in two modes determined by a single env variable:

```
VITE_CONVEX_URL set   → CONVEX_MODE (cloud backend, real auth)
VITE_CONVEX_URL unset → LOCAL_MODE  (localStorage, demo accounts)
```

The constant `const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL` appears at the top of every dual-mode file and is evaluated at module load time (not inside a render). This is what makes it safe to use with React hooks rules.

### Dual-mode files (all have both `_*Active` and `_*Noop`/`_*Local` implementations)

| File | Pattern |
|------|---------|
| `src/main.tsx` | Conditionally mounts with/without `ConvexAuthProvider` |
| `src/components/auth/ProtectedRoute.tsx` | `ConvexProtectedRoute` vs `LocalProtectedRoute` |
| `src/pages/LoginPage.tsx` | Convex `signIn` vs local `useAuthStore.setState` |
| `src/hooks/useConvexUser.ts` | All user hooks dual-mode + `useIsAuthenticated` + `useConvexAuth` |
| `src/hooks/useConvexTasks.ts` | Write mutations are `noop` in local mode |
| `src/hooks/useConvexProjects.ts` | Write mutations are `noop` in local mode |
| `src/hooks/useConvexSync.ts` | No-op in local mode |
| `src/hooks/usePresenceHeartbeat.ts` | No-op in local mode |
| `src/hooks/useRoomPresence.ts` | Returns `[]` in local mode |
| `src/App.tsx` | Seeds SEED_TASKS/SEED_PROJECTS in local mode, restores session from localStorage |

### Key dual-mode exports in `useConvexUser.ts`

```ts
useCurrentUser()       // → Convex query OR authStore user (with _id alias)
useAllUsers()          // → Convex query OR SEED_USERS
useUpdateProfile()     // → Convex mutation OR noop
useConvexAuth()        // → useAuthActions() OR { signIn: noop, signOut: logout }
useIsAuthenticated()   // → useConvexAuth().isAuthenticated OR authStore.isAuthenticated
```

---

## What Has Been Built (Phase by Phase)

### Phase 1 — Core SPA ✅
- Full SPA scaffold: React 18, TypeScript, Vite, Tailwind dark theme
- Pages: Dashboard, My Tasks (Kanban + list), All Projects, Project Detail, Calendar, Analytics, Settings
- Zustand stores: taskStore, projectStore, uiStore (all persisted to localStorage)
- 30 seed tasks, 4 projects, 3 users
- Full UI component library (Button, Input, Modal, Badge, Avatar, etc.)
- Native HTML5 drag-and-drop Kanban board
- E2E tests: 78 tests, all passing

### Phase 2 — Real-Time Collaboration ✅
- Socket.io server in `server/src/` on port 3002
- In-memory state, Zod validation, RBAC, rate limiting (30 events/10s)
- Client: socket singleton, collaborationStore, useCollaboration hook
- UI: ConnectionStatus chip, PresenceBar, ViewerPile
- Echo-prevention via `_applyRemote*` store actions

### Phase 3 — Feature Expansion ✅
- Auth: LoginPage, authStore, ProtectedRoute, demo accounts, rate limit (5 attempts → 60s lockout)
- Sprint management, tag management, task templates
- New pages: Today, Activity, Search, Time, Roadmap, Workload
- CommandPalette, FocusMode, ErrorBoundary, ShortcutsModal
- Keyboard shortcuts (n, /, ?, Esc, j/k, e, p, f, d, t)
- Nebula Pro dark navy theme applied across all 44 themed files

### Phase 4 — Test Coverage ✅
- **125/125 E2E tests passing** (Playwright)
- 07-auth.spec.ts (12 tests), 08-new-pages.spec.ts (35 tests)
- Flaky test fixes: `expect.timeout: 15000`, `waitForSelector('h1')`, 30s goTo timeouts

### Phase 5 — Convex Backend Migration 🔄 (in progress)
- All Convex server files written: tasks, projects, users, sprints, comments, presence, activityLog, tags, templates, attachments
- Schema: `convex/schema.ts`
- Auth: `convex/auth.ts`, `auth.config.ts`
- Client hooks all written and dual-mode
- Stub files created so TypeScript builds without `npx convex dev`:
  - `convex/_generated/api.ts` — Proxy stub
  - `convex/_generated/dataModel.ts` — `Id<T>` type stub

---

## Phase 5 — What Remains

| Task | How |
|------|-----|
| Activate Convex cloud | Run `npx convex dev` (interactive browser login) |
| Seed cloud DB | Run `npx convex run seed:runSeed` after activation |
| Verify end-to-end | Login → data from Convex → create task → persists |
| File attachments | Migrate from base64/localStorage → Convex file storage (`convex/attachments.ts` is ready) |

**To activate Convex:** Open a terminal, run `npx convex dev` — it opens a browser login. After login it auto-generates `convex/_generated/` and creates `.env.local` with `VITE_CONVEX_URL`. The real generated files replace the stubs automatically.

---

## Phase 6 — Planned (Not Started)

1. **Push Notifications** — Web Push API, task assignment + comment alerts
2. **Mobile App** — React Native / Expo
3. **Multi-browser E2E** — Playwright tests verifying real-time sync across two browser windows

---

## File Structure Reference

```
C:\Users\Dell\Task Management Web App\
  src/
    App.tsx                    — Root: routes + global overlays + local-mode seeding
    main.tsx                   — Conditional ConvexAuthProvider mount
    index.css                  — Tailwind + dark body styles
    types/index.ts             — All domain types
    lib/
      utils.ts                 — generateId, formatDate, cn, now
      sampleData.ts            — SEED_TASKS, SEED_PROJECTS, SEED_USERS, CURRENT_USER_ID
      constants.ts             — STATUS_OPTIONS, PRIORITY_OPTIONS, PROJECT_COLOURS
      socket.ts                — Socket.io singleton
      convexUtils.ts           — convexToTask, convexToProject shape converters
      permissions.ts           — canCreateTask, canEditTask RBAC helpers
    store/
      taskStore.ts             — Task CRUD + _applyRemote* (persisted)
      projectStore.ts          — Project CRUD + _applyRemote* (persisted)
      uiStore.ts               — Modal state, selectedTask, sidebar, theme, timer
      authStore.ts             — currentUser, isAuthenticated, token (local mode)
      collaborationStore.ts    — connected, onlineUsers, projectViewers, taskViewers (ephemeral)
      sprintStore.ts           — Sprint CRUD
      tagStore.ts              — Tag CRUD
      templateStore.ts         — Template CRUD
    hooks/
      useConvexUser.ts         — useCurrentUser, useAllUsers, useConvexAuth, useIsAuthenticated
      useConvexTasks.ts        — useCreateTask, useUpdateTask, etc. (dual-mode)
      useConvexProjects.ts     — useCreateProject, etc. (dual-mode)
      useConvexSync.ts         — Convex → Zustand bridge (no-op in local mode)
      usePresenceHeartbeat.ts  — 20s heartbeat to Convex (no-op in local mode)
      useRoomPresence.ts       — Live room presence list ([] in local mode)
      useCollaboration.ts      — Socket.io lifecycle + write-through emit helpers
      useKeyboardShortcuts.ts  — Global keyboard handler
    pages/
      LoginPage.tsx            — Dual-mode login
      DashboardPage.tsx        — Stats, charts, active tasks, overdue banner
      MyTasksPage.tsx          — Kanban + list, search/filter, drag-and-drop
      AllProjectsPage.tsx      — Project grid with filter tabs
      ProjectPage.tsx          — Single project: task board + sprints + presence
      CalendarPage.tsx         — Month grid with task pills
      AnalyticsPage.tsx        — 4 metric cards + 4 Recharts charts
      SettingsPage.tsx         — Profile, theme, export, team members
      WorkloadPage.tsx         — Per-member workload scores
      TodayPage.tsx            — Daily focus + standup generator
      ActivityPage.tsx         — Full activity feed
      SearchPage.tsx           — Full-text search across all data
      TimePage.tsx             — Time tracking + charts
      RoadmapPage.tsx          — Gantt-style project timeline
    components/
      auth/ProtectedRoute.tsx  — Dual-mode route guard
      layout/
        AppShell.tsx           — Sidebar + Header + Outlet
        Sidebar.tsx            — Collapsible nav, project list, sign out
        Header.tsx             — Page title, New Task, search, connection status
        MobileNav.tsx          — Bottom nav (mobile)
        CommandPalette.tsx     — ⌘K global command palette
      tasks/
        TaskBoard.tsx          — Kanban columns with drag-and-drop
        TaskCard.tsx           — Individual task card
        TaskDetail.tsx         — Right-panel slide-in
        TaskModal.tsx          — Create/edit form
        FocusMode.tsx          — Full-screen single task focus
      projects/
        ProjectModal.tsx       — Create project form
      ui/                      — Reusable primitives (Button, Input, Modal, Badge, etc.)
  convex/                      — Convex backend (requires npx convex dev to activate)
    schema.ts                  — Full DB schema
    auth.ts                    — Password auth + createOrUpdateUser
    tasks.ts, projects.ts, users.ts, sprints.ts, comments.ts
    presence.ts, activityLog.ts, tags.ts, templates.ts, attachments.ts
    seed.ts                    — Idempotent demo data seeder
    _generated/
      api.ts                   — STUB (replaced by npx convex dev)
      dataModel.ts             — STUB (replaced by npx convex dev)
  server/                      — Socket.io collaboration server (port 3002)
  e2e/                         — Playwright specs (01–08)
  tasks/todo.md                — Detailed phase checklist
  vite.config.ts               — Port 5175 locked, CSP headers, Socket.io proxy
  playwright.config.ts         — Port 5175, 15s timeout, HTML + JSON reporters
  auth.config.ts               — Convex auth providers
  .env.example                 — VITE_CONVEX_URL, CONVEX_DEPLOYMENT, CONVEX_AUTH_ADAPTER_SECRET
```

---

## Design Tokens (never change without updating here)

| Token | Value |
|-------|-------|
| Background | `#0B1437` |
| Card bg | `#111C44` (`.card-nebula`) |
| Card hover | `#1B254B` |
| Border | `#1F3461` |
| Blue accent | `#3B82F6` / `#4B8CF7` |
| Text primary | `#E2E8F0` |
| Text muted | `#64748B` / `#94A3B8` |
| Gradient bg | `.bg-gradient-navy` |
| Gradient accent | `.bg-gradient-accent` |

---

## Lessons Learned (Mistakes Corrected — Never Repeat)

### L1 — Never call `useConvexAuth` from `convex/react` directly in components
**Problem:** `useCollaboration.ts` and `useKeyboardShortcuts.ts` called `useConvexAuth()` from `convex/react` directly. In local mode (no `ConvexAuthProvider` in the tree), this throws: *"Could not find ConvexProviderWithAuth as an ancestor component."*

**Fix:** Use `useIsAuthenticated()` from `src/hooks/useConvexUser.ts` instead. This hook is dual-mode — it calls `convex/react`'s `useConvexAuth` in Convex mode, and reads `authStore` in local mode.

**Rule:** Any component or hook that needs `isAuthenticated` must import from `useConvexUser.ts`, never from `convex/react` directly, unless it is already inside a `_*Active` function that only runs in `CONVEX_MODE`.

---

### L2 — Never instantiate `ConvexReactClient` without checking `VITE_CONVEX_URL` first
**Problem:** `main.tsx` was calling `new ConvexReactClient(undefined)` when `VITE_CONVEX_URL` was not set. This crashed the entire app before React could render anything — blank white page with no error shown.

**Fix:** Wrap the Convex client creation in `if (convexUrl)` — only mount `ConvexAuthProvider` when the URL is actually set. Otherwise, render `<App />` directly.

**Rule:** The Convex provider is optional infrastructure. The app must be fully functional without it.

---

### L3 — Module-level constants are the correct pattern for dual-mode hooks
**Problem:** Attempts to use `require()` or runtime conditional imports inside hooks caused Vite ESM build errors.

**Fix:** Declare `const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL` at the top of each file. Define both implementations as separate named functions. Export the correct one:
```ts
export const useCreateTask = CONVEX_MODE ? _useCreateTaskConvex : _useNoopMutation;
```
This is evaluated once at module load, never inside a render — React hooks rules are fully satisfied.

---

### L4 — TypeScript builds fail without `convex/_generated/` — use stubs
**Problem:** The real `convex/_generated/api.ts` and `dataModel.ts` are only created by `npx convex dev`. Without them, the entire TypeScript compilation fails, blocking local development.

**Fix:** Created stub files:
- `convex/_generated/api.ts` — Proxy object that returns strings for any property access
- `convex/_generated/dataModel.ts` — `export type Id<T extends string> = string & { __tableName: T }`

These let the app compile and run locally. Running `npx convex dev` replaces them with real generated files.

**Rule:** Never delete these stubs. They are required for local-mode builds. `npx convex dev` will overwrite them with real files when activated.

---

### L5 — Port must be explicitly locked in vite.config.ts
**Problem:** Vite auto-increments the port if the preferred port is busy. When port 5174 was occupied, the app silently moved to 5175, breaking Playwright tests (configured for a fixed port) and causing confusion.

**Fix:** Added `port: 5175` and `strictPort: true` to the `server` config in `vite.config.ts`. The app now fails with a clear error if 5175 is unavailable rather than silently changing ports.

**Rule:** Always use `strictPort: true` in production-grade projects. Playwright config (`playwright.config.ts`) and the Vite config must agree on the port.

---

### L6 — Playwright tests need `waitForSelector('h1')` not just `waitForURL()`
**Problem:** After SPA navigation, Playwright would call `waitForURL()` and then immediately query elements — but React lazy-loaded pages hadn't rendered yet. Tests would fail with "element not found."

**Fix:** Added `await page.waitForSelector('h1')` after every navigation and set `expect.timeout: 15000` globally in `playwright.config.ts`. For slow pages, also used `await page.goto(url, { waitUntil: 'networkidle' })`.

**Rule:** Always wait for a stable DOM landmark (not just the URL) after SPA navigation in tests.

---

### L7 — `useAuthStore.setState` must be called directly for local login
**Problem:** In local mode, calling `useAuthStore.getState().login(user)` after form submit did not trigger React re-renders in the `ProtectedRoute` because the action was called outside the React update cycle.

**Fix:** Call `useAuthStore.setState({ currentUser: user, token: 'local', isAuthenticated: true })` directly from the form submit handler. This triggers Zustand's subscriber system correctly.

---

## Security Baseline (from MITRE ATT&CK assessment)

| Control | Implementation |
|---------|---------------|
| ID generation | `crypto.randomUUID()` — no `Math.random()` (T1565) |
| Input validation | Zod `max()` on all text fields |
| XSS prevention | No `dangerouslySetInnerHTML` anywhere |
| Clickjacking | `X-Frame-Options: DENY` in CSP headers |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Credential enum | Login error is identical for wrong email + wrong password |
| Brute force | 5 attempts → 60s client-side lockout |
| Blob leak | `URL.revokeObjectURL()` called after every download |

---

## Git Commit History (key milestones)

```
bb1a91c  chore: lock dev server to port 5175
1e7fde9  fix: dual-mode architecture — app renders correctly without Convex backend
e3206bd  feat: Phase 5 — Convex backend migration (server + client)
15fe185  feat: Nebula Pro premium theme redesign — 44 files re-themed
ed13515  feat: security hardening, real-time collaboration, and 8 new pages
b60e3df  feat: TaskFlow — production-grade task management SPA
```

---

## Session Resume Checklist

When resuming a session, do this in order:

1. Read this file (`PROJECT_MEMORY.md`)
2. Read `tasks/todo.md` for the detailed phase checklist
3. Run `npx tsc --noEmit` to confirm the build is still clean
4. Run `npm run dev` and verify `http://localhost:5175` loads the login page
5. Login as `alex@taskflow.io` / `Admin1234!` and confirm dashboard renders
6. Then proceed with the next task

---

*Last updated: 2026-04-05 — Fixed dual-mode architecture, locked port 5175, committed and pushed.*
