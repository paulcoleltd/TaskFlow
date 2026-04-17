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

## Phase 5 — Convex Backend Migration [IN PROGRESS]

### Convex Server (Done)
- [x] `convex/schema.ts` — full DB schema (tasks, projects, users, sprints, comments, attachments, activityLog, presence, tags, templates)
- [x] `convex/auth.ts` — @convex-dev/auth Password provider + createOrUpdateUser callback
- [x] `convex/http.ts` — HTTP router (auth routes)
- [x] `convex/seed.ts` — idempotent seed mutation
- [x] `convex/tasks.ts` — listByProject, listByAssignee, listBySprint, listAll, get, create, update, updateStatus, remove, duplicate
- [x] `convex/projects.ts` — list, get, create, update, remove (cascade)
- [x] `convex/users.ts` — current, list, get, updateProfile
- [x] `convex/sprints.ts` — listByProject, get, create, update, start, complete, remove
- [x] `convex/comments.ts` — listByTask, add, remove
- [x] `convex/presence.ts` — listRoom, heartbeat, leave
- [x] `convex/activityLog.ts` — listByTask, listAll
- [x] `convex/tags.ts` — list, create, remove
- [x] `convex/templates.ts` — listByUser, create, remove
- [x] `convex/attachments.ts` — listByTask, generateUploadUrl, saveAttachment, remove
- [x] `main.tsx` — wrapped with ConvexAuthProvider
- [x] `auth.config.ts` — providers config
- [x] `.env.example` — VITE_CONVEX_URL, CONVEX_DEPLOYMENT, CONVEX_AUTH_ADAPTER_SECRET

### Convex Client Migration (Done — requires `npx convex dev` to activate)
- [x] Client hooks: `useConvexTasks`, `useConvexProjects`, `useConvexUsers` written
- [x] `LoginPage` updated to use `useAuthActions` from @convex-dev/auth/react
- [x] `ProtectedRoute` updated to use `useConvexAuth` (isLoading + isAuthenticated)
- [x] `App.tsx` updated — removed authStore, uses useConvexAuth
- [x] All 19 files updated: useAuthStore → useCurrentUser from Convex
- [x] All `currentUser.id` → `currentUser._id` (Convex document ID pattern)
- [x] `logout()` → `signOut()` in Sidebar, Header, Settings
- [x] `useCollaboration.ts` uses `isAuthenticated` from Convex instead of token
- [x] TypeScript: 0 errors (excluding expected _generated/ which needs `npx convex dev`)

### Client Write Paths (Done)
- [x] `src/lib/convexUtils.ts` — convexToTask, convexToProject, convexToSprint shape converters
- [x] `src/hooks/useConvexSync.ts` — real-time Convex → Zustand bridge (replaces localStorage seeding)
- [x] `src/hooks/usePresenceHeartbeat.ts` — Convex presence heartbeat (20s interval, auto-leave on unmount)
- [x] `src/hooks/useRoomPresence.ts` — subscribe to live room presence, filtered to others
- [x] `App.tsx` — wired useConvexSync + global presence heartbeat
- [x] `ProjectPage.tsx` — wired per-project presence heartbeat (`project:<id>`)
- [x] `TaskDetail.tsx` — wired per-task presence heartbeat + patchTask dual-write helper
- [x] `TaskModal.tsx` — create/update dual-write (Zustand + Convex mutation)
- [x] `TaskBoard.tsx` — drag-drop status change + quick-add dual-write to Convex
- [x] `ProjectModal.tsx` — project create dual-write to Convex
- [x] TypeScript: 0 errors (excluding expected _generated/ missing-module)

### Remaining — After `npx convex dev`
- [ ] Run `npx convex dev` → creates `.env.local` + `convex/_generated/`
- [ ] Run `npx convex run seed:runSeed` to populate demo data in Convex DB
- [ ] Verify end-to-end: login → seed data loads → create task → persists in Convex DB
- [ ] File attachments UI — migrate from base64/localStorage to Convex file storage

### Phase 5 — Future
- [ ] Push notifications (Web Push API)
- [ ] Mobile app (React Native / Expo)
- [ ] E2E tests for real-time collaboration (multi-browser Playwright)

---

## Phase 6 — Push Notifications ✅

- [x] `public/sw.js` — Service Worker: handles `push` events, `notificationclick`, `activate`
- [x] `server/src/push.ts` — VAPID key setup, `sendPushToUser()` helper using `web-push`
- [x] `server/src/state.ts` — `pushSubscriptions` map (userId → PushSubscription)
- [x] `server/src/index.ts` — `GET /api/push/vapid-key`, `POST /api/push/subscribe`, `DELETE /api/push/subscribe`
- [x] `server/src/eventHandlers.ts` — push trigger on task:create (assignee ≠ creator) and comment:add
- [x] `src/lib/pushSubscription.ts` — client-side subscribe/unsubscribe helpers, VAPID key fetch
- [x] `src/hooks/useNotifications.ts` — added `usePushNotifications` hook
- [x] `src/pages/SettingsPage.tsx` — NotificationsPanel now shows due-date alerts + push notifications rows
- [x] TypeScript: 0 errors (client + server)

---

## Phase 6b — Multi-Browser E2E + Mobile App ✅

- [x] `e2e/global-setup.ts` — updated to create both `auth-state.json` (admin) and `member-auth-state.json` (member Sarah) in parallel
- [x] `e2e/09-realtime-collab.spec.ts` — 8 multi-browser Playwright tests:
  - Admin and member both show "Live" connection status
  - PresenceBar syncs between browsers (admin sees SC, member sees AJ)
  - PresenceBar hides when second user disconnects
  - Task created by admin appears in member board without refresh
  - Task status change by admin reflects in member board
  - Both users on same project see each other in ViewerPile
  - ViewerPile hides when second user leaves the project
  - Comment propagation between browsers
- [x] `mobile/` — React Native / Expo mobile app scaffold:
  - `App.tsx` — SafeAreaProvider + StatusBar + RootNavigator
  - `src/constants/theme.ts` — Design tokens (matches web app exactly)
  - `src/constants/api.ts` — Server URL config (EXPO_PUBLIC_SERVER_URL)
  - `src/types/index.ts` — Domain types (Task, Project, User)
  - `src/lib/socket.ts` — Socket.io singleton
  - `src/lib/sampleData.ts` — Seed data (mirrors web app)
  - `src/lib/utils.ts` — formatDate, getInitials, statusColor, priorityColor
  - `src/store/authStore.ts` — Zustand + AsyncStorage auth (login via :3002)
  - `src/store/taskStore.ts` — Zustand + AsyncStorage task CRUD + _applyRemote*
  - `src/store/projectStore.ts` — Zustand + AsyncStorage project CRUD + _applyRemote*
  - `src/store/collaborationStore.ts` — ephemeral presence state
  - `src/components/StatusBadge.tsx` — colour-coded status chip
  - `src/components/PriorityBadge.tsx` — colour-coded priority chip
  - `src/components/ConnectionStatus.tsx` — Live / Reconnecting chip
  - `src/components/TaskCard.tsx` — task list item with badges + due date
  - `src/components/ProjectCard.tsx` — project card with progress bar
  - `src/screens/LoginScreen.tsx` — email/password form + demo account shortcuts
  - `src/screens/DashboardScreen.tsx` — stats grid + active projects + my tasks
  - `src/screens/TasksScreen.tsx` — task list with search + status filter
  - `src/screens/TaskDetailScreen.tsx` — status/priority change + delete
  - `src/screens/ProjectsScreen.tsx` — project grid with status filter
  - `src/screens/SettingsScreen.tsx` — profile + connection status + logout
  - `src/navigation/RootNavigator.tsx` — stack + bottom tab navigator + Socket.io wiring
  - `src/navigation/types.ts` — navigation param list types

---

## Phase 7 — PWA + Performance ✅

- [x] `public/manifest.json` — PWA manifest: name, icons, shortcuts (My Tasks, Dashboard, Projects), display: standalone, dark theme colors
- [x] `index.html` — PWA meta tags: manifest link, theme-color, apple-mobile-web-app-*, viewport-fit=cover
- [x] `public/sw.js` — upgraded to full app-shell caching: cache-first for static assets, network-first for HTML, offline shell fallback, old-cache pruning on activate; push code preserved intact
- [x] `src/main.tsx` — SW registered on startup for all users; push flow reuses existing registration
- [x] `src/hooks/useInstallPrompt.ts` — captures `beforeinstallprompt`, persists dismiss, detects standalone mode
- [x] `src/components/ui/InstallBanner.tsx` — dark navy install CTA banner, slides up from bottom
- [x] `src/App.tsx` — wired install prompt + `<InstallBanner>`
- [x] `vite.config.ts` — `manualChunks` splits 9 vendor libraries into named chunks for stable caching
- [x] `src/lib/pushSubscription.ts` — fixed TS 5.9 `Uint8Array` type error
- [x] Build: 0 errors, 9 vendor chunks, built in 3.93 s
