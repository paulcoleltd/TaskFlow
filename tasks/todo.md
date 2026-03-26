# TaskFlow — Task Tracker

## Status Key
- `[x]` Done
- `[ ]` Pending
- `[~]` In Progress

---

## Phase 1 — Complete

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

## Phase 2 — Future

- [ ] Backend API (Node.js / Next.js)
- [ ] Database persistence (PostgreSQL / Prisma)
- [ ] Authentication (multi-user)
- [ ] Real-time collaboration (WebSockets)
- [ ] File attachments
- [ ] Notifications
- [ ] Mobile app (React Native)
