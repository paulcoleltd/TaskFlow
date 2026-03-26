# TaskFlow — Project Instructions

**App:** TaskFlow Task Management Web App
**Location:** `C:\Users\Dell\Task Management Web App`
**Purpose:** Production-grade task/project management SPA with dark navy UI
**Status:** Phase 1 complete — full feature set built, 78/78 E2E tests passing

---

## Stack

| Concern | Tool |
|---------|------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 8 |
| Styling | Tailwind CSS v3 (custom dark palette) |
| State | Zustand + `persist` middleware (localStorage) |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 (BrowserRouter) |
| Charts | Recharts |
| Dates | date-fns |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| Testing | Playwright (E2E, 78 tests) |

---

## Design Tokens (never change without updating this file)

| Token | Value |
|-------|-------|
| Background | `#0B1437` |
| Card bg | `#111C44` |
| Card hover | `#1B254B` |
| Border | `#1F3461` |
| Blue accent | `#3B82F6` |
| Text primary | `#E2E8F0` |
| Text muted | `#64748B` / `#94A3B8` |

---

## File Structure

```
src/
  App.tsx              — Root: BrowserRouter + routes + global overlays
  main.tsx             — React DOM render
  index.css            — Tailwind directives + dark body/root styles
  types/index.ts       — All domain types (Task, Project, User, etc.)
  lib/
    utils.ts           — generateId (crypto.randomUUID), formatDate, cn, etc.
    sampleData.ts      — SEED_TASKS, SEED_PROJECTS, SEED_USERS, CURRENT_USER_ID
    constants.ts       — STATUS_OPTIONS, PRIORITY_OPTIONS, PROJECT_COLOURS
  store/
    taskStore.ts       — Zustand task CRUD (persisted as 'taskflow-tasks')
    projectStore.ts    — Zustand project CRUD (persisted as 'taskflow-projects')
    uiStore.ts         — UI state: modals, selectedTask, sidebar, viewMode
  pages/
    DashboardPage.tsx  — Stats, charts, active tasks, project progress
    MyTasksPage.tsx    — Kanban board + list view, search/filter, drag-and-drop
    AllProjectsPage.tsx — Project grid with filter tabs
    ProjectPage.tsx    — Single project detail + task board
    CalendarPage.tsx   — Month grid with task pills
    AnalyticsPage.tsx  — Charts: by status, priority, project, timeline
    SettingsPage.tsx   — Profile, appearance, data export/clear, team members
  components/
    layout/
      AppShell.tsx     — Sidebar + Header + Outlet
      Sidebar.tsx      — Collapsible nav, project list
      Header.tsx       — Page title, New Task button, search
      MobileNav.tsx    — Bottom nav for mobile
    ui/                — Input, Select, Textarea, Button, Modal, Avatar, Badge...
    tasks/
      TaskBoard.tsx    — Kanban columns with drag-and-drop
      TaskCard.tsx     — Individual task card
      TaskDetail.tsx   — Right-panel slide-in detail view
      TaskModal.tsx    — Create/edit task form
    projects/
      ProjectModal.tsx — Create project form
e2e/                   — Playwright test specs (01-06)
  results/dashboard.html — Custom test results dashboard
playwright.config.ts   — Port 5175, HTML + JSON reporters
```

---

## Seeding Strategy

- First-launch detection: `if (tasks.length === 0) seedTasks(SEED_TASKS)` in `App.tsx`
- Zustand `persist` keeps data in localStorage between refreshes
- Seed IDs are fixed strings (`task-1`, `proj-1`, `user-1`) for E2E test stability
- New tasks use `crypto.randomUUID()` for collision-resistant IDs

---

## Running Locally

```bash
cd "C:\Users\Dell\Task Management Web App"
npm run dev          # starts on port 5174 (or 5175 if occupied)
npm run build        # TypeScript check + Vite build
npm run test:e2e     # Playwright E2E tests (requires dev server running)
npm run test:e2e:headed  # same but with browser window
```

---

## E2E Test Coverage (78 tests, all passing)

| Suite | Tests |
|-------|-------|
| 01-navigation | 12 |
| 02-dashboard | 11 |
| 03-tasks | 14 |
| 04-projects | 13 |
| 05-calendar | 9 |
| 06-analytics-settings | 10 + 9 |

---

## Security Decisions

| Decision | Why |
|----------|-----|
| `crypto.randomUUID()` for IDs | `Math.random()` is not cryptographically secure (MITRE T1565) |
| Zod `max()` on all text fields | Prevents unbounded input abuse and localStorage bloat |
| CSP headers in `vite.config.ts` | Mitigates XSS (T1059.007), clickjacking (T1566), MIME sniffing |
| `X-Frame-Options: DENY` | Prevents embedding in malicious iframes |
| `URL.revokeObjectURL` after download | Prevents memory leak from blob URL accumulation |
| No `dangerouslySetInnerHTML` anywhere | All user data rendered as text — no stored XSS path |
| Overdue tasks computed via `useMemo` | Removed direct `useTaskStore.getState()` call during render (non-reactive) |

---

## Workflow Rules

- **Plan before building:** write plan to `tasks/todo.md`
- **Verify before done:** always run `npm run build` before marking complete
- **E2E tests must pass:** after any UI change, run `npm run test:e2e` and confirm 78/78
- **No hardcoded secrets:** this is a local-first SPA; no API keys needed

---

## Skills to Apply (in order)

1. `~/.claude/skills/mitre-attack-reasoning-skill/` — security assessment (always)
2. `~/.claude/skills/secure-operator.md` — flag risky actions
3. `~/.claude/skills/frontend-engineer.md` — for UI work
4. `~/.claude/skills/debugging-specialist.md` — for bug reports

---

## Known Constraints

- Preview tool is locked to port 3001 (SparkleClean) — TaskFlow verification done via `curl` + Playwright
- This is a client-side SPA — no backend, no API, no auth. All data is localStorage only.
- `CURRENT_USER_ID = 'user-1'` is hardcoded — multi-user auth is out of scope for Phase 1
