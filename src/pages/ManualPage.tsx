/**
 * ManualPage — full in-app user manual for TaskFlow.
 * Renders as a styled page inside the app and includes:
 *   • "Download PDF"  — browser print dialog (uses @media print CSS)
 *   • "Download Word" — fetches /taskflow-manual.docx (static public asset)
 */
import { FileText, Download, Printer, ChevronRight, Shield, Zap, Users, BarChart2, Calendar, Search, Settings, Clock, Activity, Map, Layers, Globe } from 'lucide-react';

const SECTIONS = [
  { id: 'intro',       title: '1. Introduction to TaskFlow',          icon: Zap },
  { id: 'start',       title: '2. Getting Started & Login',           icon: FileText },
  { id: 'roles',       title: '3. User Roles & Permissions',          icon: Shield },
  { id: 'dashboard',   title: '4. Dashboard',                         icon: BarChart2 },
  { id: 'tasks',       title: '5. Task Management',                   icon: Layers },
  { id: 'projects',    title: '6. Projects & Sprints',                icon: Layers },
  { id: 'calendar',    title: '7. Calendar',                          icon: Calendar },
  { id: 'analytics',   title: '8. Analytics',                         icon: BarChart2 },
  { id: 'mytasks',     title: '9. My Tasks',                          icon: FileText },
  { id: 'today',       title: '10. Today View',                       icon: Clock },
  { id: 'workload',    title: '11. Workload & Time Tracking',         icon: Clock },
  { id: 'roadmap',     title: '12. Roadmap',                          icon: Map },
  { id: 'activity',    title: '13. Activity Feed',                    icon: Activity },
  { id: 'search',      title: '14. Search',                           icon: Search },
  { id: 'workspaces',  title: '15. Workspaces',                       icon: Globe },
  { id: 'settings',    title: '16. Settings & Team Management',       icon: Settings },
  { id: 'collab',      title: '17. Real-time Collaboration',          icon: Users },
  { id: 'security',    title: '18. Security & Privacy',               icon: Shield },
  { id: 'shortcuts',   title: '19. Keyboard Shortcuts & Tips',        icon: Zap },
];

const ROLES_TABLE = [
  ['View all tasks and projects',  '✓', '✓', '✓'],
  ['Create new tasks',             '✓', '✓', '✗'],
  ['Edit own tasks',               '✓', '✓', '✗'],
  ['Edit any task',                '✓', '✗', '✗'],
  ['Delete tasks',                 '✓', '✗', '✗'],
  ['Create projects',              '✓', '✓', '✗'],
  ['Delete projects',              '✓', '✗', '✗'],
  ['Add team members',             '✓', '✗', '✗'],
  ['Export data',                  '✓', '✓', '✗'],
  ['Clear all data',               '✓', '✗', '✗'],
  ['Manage tags',                  '✓', '✗', '✗'],
];

const SHORTCUTS_TABLE = [
  ['N',               'Create a new task'],
  ['Cmd / Ctrl + K',  'Open Command Palette / Search'],
  ['Escape',          'Close modal or panel'],
  ['Enter',           'Submit form / confirm action'],
  ['Drag & Drop',     'Move tasks between Kanban columns'],
];

export default function ManualPage() {
  const handlePrint = () => window.print();

  const handleDownloadWord = () => {
    const a = document.createElement('a');
    a.href = '/taskflow-manual.docx';
    a.download = 'TaskFlow-User-Manual.docx';
    a.click();
  };

  return (
    <>
      {/* ── Print stylesheet injected inline ─────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; color: #111 !important; }
          .no-print { display: none !important; }
          .manual-sidebar { display: none !important; }
          .manual-content { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          .manual-section { page-break-inside: avoid; break-inside: avoid; }
          h1, h2, h3 { color: #1E40AF !important; }
          .manual-cover { page-break-after: always; }
          table { border-collapse: collapse !important; }
          td, th { border: 1px solid #ccc !important; padding: 6px 10px !important; color: #111 !important; background: white !important; }
          th { background: #1E40AF !important; color: white !important; }
          .badge-green { color: #15803d !important; }
          .badge-red   { color: #dc2626 !important; }
          a { color: #1E40AF !important; }
          .card-step { border: 1px solid #ccc !important; background: white !important; }
          .tip-box  { border-left: 4px solid #3B82F6 !important; background: #EFF6FF !important; color: #1E40AF !important; }
        }
      `}</style>

      <div className="flex min-h-screen">

        {/* ── Sidebar TOC ─────────────────────────────────────────────────── */}
        <aside className="manual-sidebar no-print hidden xl:block w-64 shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-[#1C3054] bg-[#080E20] py-6 px-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Contents</p>
          <nav className="space-y-0.5">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-[#1C3054] transition-colors"
              >
                <ChevronRight className="w-3 h-3 shrink-0 text-slate-600" />
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div className="manual-content flex-1 max-w-4xl mx-auto px-6 py-8 pb-24">

          {/* Cover */}
          <div className="manual-cover manual-section mb-16 text-center py-12 border border-[#1C3054] rounded-2xl bg-gradient-to-br from-[#0C1526] to-[#080E20]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">TaskFlow</h1>
            <p className="text-xl text-blue-300 font-semibold mb-1">User Manual</p>
            <p className="text-sm text-slate-500 mb-6">Complete Guide to Task Management, Collaboration & Productivity</p>
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 mb-8">
              <span>Version 1.0</span>
              <span>•</span>
              <span>April 2026</span>
              <span>•</span>
              <a href="https://taskflow-app-weld.vercel.app" className="text-blue-400 hover:underline">taskflow-app-weld.vercel.app</a>
            </div>

            {/* Download buttons */}
            <div className="no-print flex items-center justify-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1C3054] hover:bg-[#243d6b] text-slate-200 text-sm font-medium rounded-xl border border-[#2a4a7f] transition-colors"
              >
                <Printer className="w-4 h-4" /> Save as PDF
              </button>
              <button
                onClick={handleDownloadWord}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
              >
                <Download className="w-4 h-4" /> Download Word (.docx)
              </button>
            </div>
          </div>

          {/* ── Section 1 — Introduction ──────────────────────────────────── */}
          <Section id="intro" title="1. Introduction to TaskFlow" icon={Zap}>
            <P>
              TaskFlow is a production-grade, full-featured task and project management application
              designed for teams of all sizes. Built on React 18 + TypeScript with a beautiful dark
              navy interface, TaskFlow combines powerful task tracking, real-time collaboration, and
              deep analytics in a single, fast web application accessible from any device.
            </P>

            <H3>What Makes TaskFlow Unique</H3>
            <ul className="space-y-2 ml-4 mt-2">
              {[
                ['Dark-first design', 'A polished navy/blue palette engineered for long working sessions — no eye strain.'],
                ['Dual-mode architecture', 'Works fully offline with localStorage and scales seamlessly to Convex cloud storage.'],
                ['Real-time collaboration', 'Socket.io presence — see teammates online and receive their changes instantly without refresh.'],
                ['Role-based access control', 'Admin / Member / Viewer permissions enforced on both the client and server.'],
                ['Production-grade security', 'httpOnly session cookies, bcrypt password hashing, Content Security Policy, server-side rate limiting.'],
                ['Progressive Web App (PWA)', 'Install TaskFlow on desktop and mobile — works like a native app.'],
                ['14 fully featured pages', 'Dashboard, Kanban, Projects, Calendar, Analytics, Roadmap, Workload, Time, Activity and more.'],
                ['133+ automated E2E tests', 'Playwright test suite guarantees every feature works correctly before every deploy.'],
              ].map(([bold, rest]) => (
                <li key={bold} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-blue-400 mt-0.5">›</span>
                  <span><strong className="text-white">{bold}</strong> — {rest}</span>
                </li>
              ))}
            </ul>

            <TipBox>
              TaskFlow is live at{' '}
              <a href="https://taskflow-app-weld.vercel.app" className="text-blue-400 underline">
                https://taskflow-app-weld.vercel.app
              </a>
              . No installation required — open it in any modern browser.
            </TipBox>
          </Section>

          {/* ── Section 2 — Getting Started ───────────────────────────────── */}
          <Section id="start" title="2. Getting Started & Login" icon={FileText}>
            <P>Access TaskFlow by navigating to <strong className="text-white">https://taskflow-app-weld.vercel.app</strong> in any modern browser (Chrome, Firefox, Edge, Safari).</P>

            <H3>Demo Accounts</H3>
            <div className="grid sm:grid-cols-3 gap-3 my-4">
              {[
                { role: 'Admin', email: 'alex@taskflow.io', password: 'Admin1234!', colour: 'bg-red-500/20 border-red-500/30 text-red-300' },
                { role: 'Member', email: 'sarah@taskflow.io', password: 'Member1234!', colour: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
                { role: 'Viewer', email: 'marcus@taskflow.io', password: 'Viewer1234!', colour: 'bg-slate-500/20 border-slate-500/30 text-slate-300' },
              ].map(acc => (
                <div key={acc.role} className={`card-step rounded-xl border p-4 ${acc.colour.split(' ').slice(0,2).join(' ')} bg-[#06091A]`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${acc.colour} mb-2 inline-block`}>{acc.role}</span>
                  <p className="text-xs text-slate-300 font-mono mt-1">{acc.email}</p>
                  <p className="text-xs text-slate-500 font-mono">{acc.password}</p>
                </div>
              ))}
            </div>

            <H3>Logging In</H3>
            <StepList steps={[
              'Navigate to the app URL above.',
              'Enter your email address and password.',
              'Click Sign In. You will be redirected to your Dashboard.',
              'On first login the app is pre-loaded with sample tasks and projects.',
            ]} />

            <H3>Password Requirements</H3>
            <BulletList items={[
              'Minimum 8 characters',
              'At least one uppercase letter (A–Z)',
              'At least one number (0–9)',
              'Maximum 128 characters',
            ]} />

            <H3>Logging Out</H3>
            <P>Click the sign-out arrow icon (→) at the bottom-left of the sidebar next to your name, or click your avatar in the top-right corner.</P>
          </Section>

          {/* ── Section 3 — Roles ─────────────────────────────────────────── */}
          <Section id="roles" title="3. User Roles & Permissions" icon={Shield}>
            <P>TaskFlow has three roles. Each is enforced both in the UI and on the server — a Member cannot perform Admin actions even by calling the API directly.</P>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="text-left px-4 py-2.5 rounded-tl-lg font-semibold">Action</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Admin</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Member</th>
                    <th className="text-center px-4 py-2.5 rounded-tr-lg font-semibold">Viewer</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES_TABLE.map(([action, a, m, v], i) => (
                    <tr key={action} className={i % 2 === 0 ? 'bg-[#06091A]' : 'bg-[#080E20]'}>
                      <td className="px-4 py-2 text-slate-300">{action}</td>
                      {[a, m, v].map((val, j) => (
                        <td key={j} className="px-4 py-2 text-center">
                          <span className={val === '✓' ? 'badge-green text-green-400 font-bold' : 'badge-red text-red-500 font-bold'}>{val}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Section 4 — Dashboard ─────────────────────────────────────── */}
          <Section id="dashboard" title="4. Dashboard" icon={BarChart2}>
            <P>The Dashboard is the home screen and provides an at-a-glance overview of your team's work.</P>
            <BulletList items={[
              'Stat cards: Total Tasks, Completed, In Progress, Overdue — with trend arrows',
              'Task completion donut chart showing percentage complete',
              'Tasks by Priority bar chart (Critical / High / Medium / Low)',
              'Recent Activity feed — last 10 actions across the workspace',
              'Active tasks list with colour-coded priority and status badges',
              'Project progress bars showing completion percentage per project',
            ]} />
            <TipBox>The Dashboard updates in real-time — no refresh needed when teammates make changes.</TipBox>
          </Section>

          {/* ── Section 5 — Task Management ───────────────────────────────── */}
          <Section id="tasks" title="5. Task Management" icon={Layers}>
            <H3>Creating a Task</H3>
            <StepList steps={[
              'Click the "+ New Task" button in the top-right header, or press N anywhere.',
              'Fill in the Title (required) and any other details.',
              'Set Priority, Status, Assignee, Due Date, and Project.',
              'Click "Create Task" — it appears immediately on the board.',
            ]} />

            <H3>Task Properties</H3>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {[
                ['Title', 'Short, descriptive name for the task (required)'],
                ['Description', 'Detailed notes, links, and context'],
                ['Priority', 'Critical (red) · High (orange) · Medium (yellow) · Low (grey)'],
                ['Status', 'To Do → In Progress → In Review → Done'],
                ['Assignee', 'Any team member from the dropdown'],
                ['Due Date', 'Target completion date — overdue tasks shown in red'],
                ['Labels / Tags', 'Custom colour-coded tags for cross-project filtering'],
                ['Estimated Hours', 'Time budget for the task'],
                ['Logged Hours', 'Actual time spent (log from Task Detail panel)'],
                ['Subtasks', 'Break work into smaller checkable steps'],
                ['Comments', 'Discussion thread with timestamps and avatars'],
                ['Attachments', 'Files linked to the task'],
                ['Recurrence', 'None · Daily · Weekly · Monthly — auto-spawns on completion'],
              ].map(([prop, desc]) => (
                <div key={prop} className="card-step bg-[#06091A] border border-[#1C3054] rounded-lg px-3 py-2">
                  <p className="text-xs font-bold text-blue-300 mb-0.5">{prop}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              ))}
            </div>

            <H3>Kanban Board</H3>
            <P>Tasks are displayed in columns by status (To Do, In Progress, In Review, Done). Drag and drop any task card to a new column to update its status instantly. Each card shows the title, priority badge, due date, assignee avatar, and tag chips.</P>

            <H3>Task Detail Panel</H3>
            <P>Click any task card to open the full Task Detail slide-in panel from the right. Here you can:</P>
            <BulletList items={[
              'Edit all task fields inline without leaving the board',
              'Add and tick off subtasks with checkboxes',
              'Start/stop the built-in time tracker or enter hours manually',
              'Add comments and read the full discussion thread',
              'Attach or download files',
              'Pin the task to keep it at the top of the board',
              'View the complete change history for the task',
            ]} />
          </Section>

          {/* ── Section 6 — Projects ──────────────────────────────────────── */}
          <Section id="projects" title="6. Projects & Sprints" icon={Layers}>
            <P>Projects group related tasks and give your team a shared space to plan, track, and complete work together.</P>
            <H3>Creating a Project</H3>
            <StepList steps={[
              'Navigate to All Projects in the sidebar.',
              'Click "New Project" (top-right).',
              'Enter the project name, choose a colour, and add an optional description.',
              'Click Create — the project page opens immediately.',
            ]} />
            <H3>Project Page Features</H3>
            <BulletList items={[
              'Kanban board scoped to this project\'s tasks',
              'Sprint management: create sprints with start/end dates, assign tasks',
              'Project stats: total task count and completion percentage',
              'Share button: generates a public read-only link for stakeholders and clients',
            ]} />
          </Section>

          {/* ── Section 7 — Calendar ──────────────────────────────────────── */}
          <Section id="calendar" title="7. Calendar" icon={Calendar}>
            <P>The Calendar page provides a month-grid view of all tasks that have a due date.</P>
            <BulletList items={[
              'Tasks appear as colour-coded pills on their due date',
              'Pill colours reflect task priority (red = Critical, orange = High, etc.)',
              'Click any date cell to see all tasks due that day',
              'Click a task pill to open its Task Detail panel',
              'Navigate between months with the ← → arrows at the top',
            ]} />
          </Section>

          {/* ── Section 8 — Analytics ─────────────────────────────────────── */}
          <Section id="analytics" title="8. Analytics" icon={BarChart2}>
            <P>The Analytics page turns your task data into actionable insights with interactive charts.</P>
            <BulletList items={[
              'Tasks by Status — bar chart showing distribution across To Do, In Progress, In Review, Done',
              'Tasks by Priority — bar chart showing Critical / High / Medium / Low split',
              'Tasks per Project — compare workload across all projects',
              'Completion Trend — line chart showing tasks completed per day/week over time',
              'Team Workload — bar chart of task counts per team member',
            ]} />
            <TipBox>All charts update automatically as tasks are created, updated, or completed — no manual refresh needed.</TipBox>
          </Section>

          {/* ── Section 9 — My Tasks ──────────────────────────────────────── */}
          <Section id="mytasks" title="9. My Tasks" icon={FileText}>
            <P>My Tasks shows only the tasks assigned to <em>you</em>, giving you a focused personal work view.</P>
            <BulletList items={[
              'Toggle between Kanban board and List view using the view switcher',
              'Filter by: Status, Priority, Project, Due Date, Tags',
              'Search tasks by title or description',
              'Sort by: Due Date, Priority, or Created Date',
              'Drag and drop on the Kanban board to update status',
            ]} />
          </Section>

          {/* ── Section 10 — Today ────────────────────────────────────────── */}
          <Section id="today" title="10. Today View" icon={Clock}>
            <P>The Today view gives you a focused list of everything that needs your attention right now.</P>
            <BulletList items={[
              'Shows all tasks due today, plus any overdue tasks from previous days',
              'Quick-complete checkboxes — tick a task to mark it Done instantly',
              'Tasks ordered by priority — Critical tasks appear first',
              'Clicking any task opens the full Task Detail panel for editing',
            ]} />
          </Section>

          {/* ── Section 11 — Workload ─────────────────────────────────────── */}
          <Section id="workload" title="11. Workload & Time Tracking" icon={Clock}>
            <H3>Workload Page</H3>
            <P>See your whole team's task distribution to spot who is overloaded and who has capacity.</P>
            <BulletList items={[
              'Bar chart of open task counts per team member',
              'Breakdown by priority per person',
              'Click a teammate\'s bar to see their tasks',
            ]} />
            <H3>Time Tracking</H3>
            <P>The Time page shows your personal time logs across all tasks.</P>
            <BulletList items={[
              'Log time from the Task Detail panel — enter hours manually or use the start/stop timer',
              'Compare estimated vs actual hours per task',
              'Time entries listed chronologically with task names and dates',
            ]} />
          </Section>

          {/* ── Section 12 — Roadmap ──────────────────────────────────────── */}
          <Section id="roadmap" title="12. Roadmap" icon={Map}>
            <P>The Roadmap page gives you a visual timeline of all projects and their key milestones, helping you plan and communicate delivery schedules.</P>
            <BulletList items={[
              'Timeline view showing project bars across a date range',
              'Milestones marked with diamond icons',
              'Drag project bars to adjust start and end dates',
              'See overlapping projects and potential scheduling conflicts at a glance',
            ]} />
          </Section>

          {/* ── Section 13 — Activity ─────────────────────────────────────── */}
          <Section id="activity" title="13. Activity Feed" icon={Activity}>
            <P>The Activity Feed is a complete, timestamped audit trail of everything that happens in your workspace.</P>
            <BulletList items={[
              'Every action is logged: task created, edited, moved, commented, completed, deleted',
              'Shows the user who performed the action and when',
              'Filter by user or date range',
              'Useful for retrospectives, accountability, and onboarding new members',
            ]} />
          </Section>

          {/* ── Section 14 — Search ───────────────────────────────────────── */}
          <Section id="search" title="14. Search" icon={Search}>
            <P>Global search lets you find anything in TaskFlow instantly.</P>
            <StepList steps={[
              'Press Cmd+K (Mac) or Ctrl+K (Windows/Linux), or click the search bar in the header.',
              'Type any keyword — tasks, projects, comments, and descriptions are all searched.',
              'Results are grouped by type (Tasks, Projects).',
              'Click any result to navigate directly to it.',
            ]} />
          </Section>

          {/* ── Section 15 — Workspaces ───────────────────────────────────── */}
          <Section id="workspaces" title="15. Workspaces" icon={Globe}>
            <P>Workspaces let you separate different teams, clients, or contexts within the same TaskFlow account.</P>
            <H3>Creating a Workspace</H3>
            <StepList steps={[
              'Navigate to Workspaces in the left sidebar.',
              'Type a workspace name in the input field.',
              'Click Create — you are automatically set as the Owner.',
            ]} />
            <H3>Inviting Members</H3>
            <StepList steps={[
              'Open the workspace card.',
              'Type the email address of the user you want to invite.',
              'Click Invite — the user must already have a TaskFlow account.',
            ]} />
            <H3>Member Roles in a Workspace</H3>
            <BulletList items={[
              'Owner — full control, can delete the workspace',
              'Admin — can invite and remove members',
              'Member — standard access to workspace tasks and projects',
            ]} />
          </Section>

          {/* ── Section 16 — Settings ─────────────────────────────────────── */}
          <Section id="settings" title="16. Settings & Team Management" icon={Settings}>
            <H3>Profile Tab</H3>
            <BulletList items={[
              'Update your display name and email',
              'Choose your avatar colour from the colour picker',
              'Changes are saved immediately',
            ]} />
            <H3>Team Members Tab (Admin only)</H3>
            <P>View all team members with their roles and avatar colours. To add a new member:</P>
            <StepList steps={[
              'Click "Add Member" in the Team Members section.',
              'Enter Full Name, Email Address, Password, and Confirm Password.',
              'Select a Role (Admin / Member / Viewer) and Avatar Colour.',
              'Click "Add Member" — credentials are stored securely server-side.',
              'The new member can log in immediately from any device.',
            ]} />
            <H3>Notifications Tab</H3>
            <BulletList items={[
              'Toggle email notifications for task assignments',
              'Toggle due-date reminder emails (sent 24 hours before)',
            ]} />
            <H3>Data Management (Admin only)</H3>
            <BulletList items={[
              'Export all data — downloads a JSON file with all tasks and projects',
              'Clear all data — permanently deletes everything (requires confirmation)',
            ]} />
          </Section>

          {/* ── Section 17 — Collaboration ────────────────────────────────── */}
          <Section id="collab" title="17. Real-time Collaboration" icon={Users}>
            <P>TaskFlow uses Socket.io to deliver a live, collaborative experience for your whole team.</P>
            <BulletList items={[
              'Live presence: see a green dot next to teammates who are currently online',
              '"Live" status badge appears in the header when connected to the collaboration server',
              'Changes made by any teammate (new tasks, edits, comments) appear on your screen instantly',
              'No page refresh required — the board updates automatically',
              'If the connection drops, TaskFlow shows "Reconnecting…" and auto-reconnects',
            ]} />
            <TipBox>Real-time collaboration requires the Socket.io server to be running. On the Vercel deployment this feature shows "Reconnecting…" — it is fully active in the self-hosted version.</TipBox>
          </Section>

          {/* ── Section 18 — Security ─────────────────────────────────────── */}
          <Section id="security" title="18. Security & Privacy" icon={Shield}>
            <P>TaskFlow is built with production-grade security controls at every layer.</P>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {[
                ['httpOnly Session Cookies', 'Your login token is stored in a secure cookie that JavaScript cannot read — protects against XSS token theft.'],
                ['bcrypt Password Hashing', 'All passwords are hashed with bcrypt at cost 12 (~250ms per hash). 125 million times harder to brute-force than SHA-256.'],
                ['Server-side Rate Limiting', '5 failed login attempts trigger a 60-second lockout. Returns 429 Too Many Requests — cannot be bypassed by refreshing.'],
                ['Content Security Policy', 'CSP headers block script injection, clickjacking, and MIME-type attacks on every response.'],
                ['RBAC (Role-Based Access)', 'Admin / Member / Viewer permissions enforced server-side — UI hiding alone is not security.'],
                ['HSTS', 'HTTP Strict Transport Security ensures all connections are HTTPS-only, protecting against downgrade attacks.'],
              ].map(([title, desc]) => (
                <div key={title} className="card-step bg-[#06091A] border border-[#1C3054] rounded-lg px-3 py-2.5">
                  <p className="text-xs font-bold text-green-400 mb-0.5 flex items-center gap-1"><Shield className="w-3 h-3" />{title}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Section 19 — Shortcuts ────────────────────────────────────── */}
          <Section id="shortcuts" title="19. Keyboard Shortcuts & Tips" icon={Zap}>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="text-left px-4 py-2.5 rounded-tl-lg font-semibold">Shortcut</th>
                    <th className="text-left px-4 py-2.5 rounded-tr-lg font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUTS_TABLE.map(([key, action], i) => (
                    <tr key={key} className={i % 2 === 0 ? 'bg-[#06091A]' : 'bg-[#080E20]'}>
                      <td className="px-4 py-2.5">
                        <kbd className="px-2 py-0.5 text-xs font-mono bg-[#1C3054] border border-[#2a4a7f] rounded text-blue-300">{key}</kbd>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <H3 className="mt-6">Pro Tips</H3>
            <BulletList items={[
              'Pin critical tasks so they always appear at the top of the Kanban board — click the pin icon in Task Detail.',
              'Use the Command Palette (Cmd+K) to jump to any page instantly without touching the mouse.',
              'Set up recurring tasks for standup prep, weekly reviews, sprint planning, and other repeating work.',
              'Use Tags to filter across projects — create a "bug" tag and find all bugs across every project instantly.',
              'Export your data regularly from Settings as a JSON backup before any major changes.',
              'The Today view is your daily command centre — start every morning here for a focused work session.',
            ]} />
          </Section>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-[#1C3054] text-center">
            <p className="text-xs text-slate-600">TaskFlow User Manual — Version 1.0 — April 2026</p>
            <p className="text-xs text-slate-700 mt-1">
              <a href="https://taskflow-app-weld.vercel.app" className="hover:text-blue-400 transition-colors">https://taskflow-app-weld.vercel.app</a>
            </p>
          </div>

        </div>{/* end manual-content */}
      </div>
    </>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) {
  return (
    <section id={id} className="manual-section mb-12 scroll-mt-6">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1C3054]">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function H3({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-sm font-bold text-blue-300 mt-4 mb-2 ${className}`}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-300 leading-relaxed">{children}</p>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 ml-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-300">
          <span className="text-blue-500 mt-0.5 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-1.5 ml-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 text-sm text-slate-300">
          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="tip-box border-l-4 border-blue-500 bg-blue-500/5 rounded-r-xl px-4 py-3 mt-3">
      <p className="text-sm text-blue-300 leading-relaxed"><strong className="text-blue-200">💡 Tip: </strong>{children}</p>
    </div>
  );
}
