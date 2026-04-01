# TaskFlow — Task Tracker

## Status Key
- `[x]` Done
- `[ ]` Pending
- `[~]` In Progress

---

## Phase 1 — Core SPA ✅

- [x] Project scaffold (Vite + React 18 + TypeScript + Tailwind)
- [x] Design system: dark navy theme, custom Tailwind tokens
- [x] Core types: Task, Project, User, Status, Priority
- [x] Zustand stores: taskStore, projectStore, uiStore (with localStorage persist)
- [x] Sample data: 30 tasks, 4 projects, 3 users
- [x] Layout: AppShell, Sidebar (collapsible), Header, MobileNav
- [x] UI components: Input, Select, Textarea, Button, Modal, Avatar, Badge, ProgressBar, StatusBadge, PriorityBadge, EmptyState, Tooltip
- [x] Pages: Dashboard, My Tasks, All Projects, Project Detail, Calendar, Analytics, Settings
- [x] Task Board: native HTML5 drag-and-drop Kanban
- [x] Task Modal: create + edit with Zod validation
- [x] Project Modal: create with colour picker
- [x] Task Detail: slide-in right panel
- [x] Calendar: month grid with task pills
- [x] Analytics: 4 metric cards + 4 Recharts charts
- [x] Settings: profile, export JSON, clear data, team members
- [x] E2E tests: 78 tests across 6 Playwright suites (all passing)
- [x] Security hardening: CSP headers, crypto.randomUUID, Zod limits, localStorage validation
- [x] OWASP A01–A10 assessment completed
- [x] CLAUDE.md written
- [x] File structure audited and confirmed clean

---

## Phase 2 — Real-Time Collaboration ✅

- [x] Socket.io server (`server/src/`) — HTTP + WS on port 3001
- [x] Server: in-memory state (tasks, projects, presence, room viewers)
- [x] Server: Zod payload validation on all events
- [x] Server: RBAC (admin = full, member = create/edit, viewer = read-only)
- [x] Server: rate limiting (30 events / 10 s per socket, in-memory token bucket)
- [x] Server: all socket events (task:create/update/delete/move, comment:add, project:create/update/delete, sync:request, presence, rooms)
- [x] Client: `src/lib/socket.ts` — singleton socket.io-client
- [x] Client: `src/store/collaborationStore.ts` — ephemeral Zustand store (not persisted)
- [x] Client: `src/hooks/useCollaboration.ts` — full lifecycle + event wiring
- [x] Client: `src/lib/collabEmit.ts` — write-through emit helpers
- [x] UI: `ConnectionStatus.tsx` — "Live" / "Reconnecting…" chip in header
- [x] UI: `PresenceBar.tsx` — online user avatars with green presence rings
- [x] UI: `ViewerPile.tsx` — "N others viewing" on project and task pages
- [x] Stores: `_applyRemote*` actions in taskStore and projectStore (echo-prevention)
- [x] Config: Vite proxy `/socket.io → :3001` + `ws: true`
- [x] Config: `dev:all` script with `concurrently`
- [x] Integration: `useCollaboration()` in App.tsx, `<ConnectionStatus />` + `<PresenceBar />` in Header
- [x] Integration: `<ViewerPile />` in ProjectPage and TaskDetail

---

## Phase 3 — Auth + Feature Expansion ✅

- [x] Authentication: `LoginPage`, `authStore`, `ProtectedRoute`
- [x] Auth: demo accounts (Admin / Member / Viewer roles)
- [x] Auth: client-side rate limiting (5 attempts → 60 s lockout)
- [x] Auth: brute-force message uses same text for unknown email + wrong password (no enumeration)
- [x] Auth: `global-setup.ts` updated — Playwright logs in before test suites
- [x] Sprint management: `sprintStore`, sprint CRUD + start/complete, integrated in ProjectPage
- [x] Tag management: `tagStore` with seed tags, used in task filtering
- [x] Task templates: `templateStore` for reusable task blueprints
- [x] New pages: TodayPage (`/today`) — daily focus, overdue, in-progress, standup generator
- [x] New pages: ActivityPage (`/activity`) — full activity feed with verb filters
- [x] New pages: SearchPage (`/search`) — full-text search across tasks, descriptions, comments, projects
- [x] New pages: TimePage (`/time`) — time tracking with log/estimate, charts, range filter
- [x] New pages: RoadmapPage (`/roadmap`) — Gantt-style project timeline with milestones
- [x] New pages: WorkloadPage (`/workload`) — per-member workload score, team summary
- [x] New components: CommandPalette, FocusMode, ErrorBoundary, ShortcutsModal
- [x] Keyboard shortcuts: `useKeyboardShortcuts` hook
- [x] Notifications: `useNotifications` hook

---

## Phase 4 — Test Coverage ✅

- [x] E2E: `07-auth.spec.ts` — 12 auth flow tests (login, logout, RBAC, rate limit, demo buttons)
- [x] E2E: `08-new-pages.spec.ts` — 35 tests across Today, Search, Workload, Activity, Time, Roadmap
- [x] All 47 new tests passing (0 failures)
- [x] Flaky test hardening: global `expect.timeout: 15000` in playwright.config.ts (fixes React lazy-load races)
- [x] Navigation waits: `waitForSelector('h1')` + `waitForURL()` added to all SPA navigation tests
- [x] `beforeEach` timeouts hardened in `03-tasks.spec.ts` (30 s goto, 20 s selector)
- [x] Final result: **125/125 passing** (120 first-attempt + 5 flaky-on-retry, 0 hard failures)

---

## Phase 5 — Future

- [ ] Backend API (Node.js / Next.js) — replace localStorage with real persistence
- [ ] Database (PostgreSQL / Prisma)
- [ ] Real authentication (JWT, NextAuth.js v5)
- [ ] File attachments on tasks
- [ ] Push notifications (Web Push API)
- [ ] Mobile app (React Native / Expo)
- [ ] E2E tests for real-time collaboration (multi-browser Playwright)
