/**
 * TaskFlow User Manual Generator
 * Generates a comprehensive DOCX user manual using the docx npm package.
 * Output: public/taskflow-manual.docx
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, Footer, Header, PageNumber,
} = require('docx');

// ─── Colour palette ───────────────────────────────────────────────────────────
const BLUE_DARK   = '1E40AF';   // heading blue
const BLUE_HEADER = '1E3A8A';   // table header row
const BLUE_LIGHT  = 'DBEAFE';   // alternating row tint
const WHITE       = 'FFFFFF';
const GREY_LINE   = 'CBD5E1';

// ─── DXA / sizing constants ────────────────────────────────────────────────────
// US Letter: 12240 x 15840 DXA  |  1 inch = 1440 DXA
// Margins: 1 inch all sides  →  content width = 12240 − 2×1440 = 9360
const CONTENT_WIDTH = 9360;

// ─── Cell border helper ────────────────────────────────────────────────────────
function cellBorder(color = GREY_LINE) {
  const b = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: b, bottom: b, left: b, right: b };
}

// ─── Paragraph helpers ─────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, bold: true, color: BLUE_DARK, size: 36, font: 'Calibri' })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Calibri' })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, italics: true, size: 24, font: 'Calibri' })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 276, lineRule: 'auto' },
    children: [new TextRun({ text, size: 22, font: 'Calibri', ...opts })],
  });
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun('')] })
  );
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Bullet / numbered list helpers ───────────────────────────────────────────
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 40, after: 40, line: 276, lineRule: 'auto' },
    children: [new TextRun({ text, size: 22, font: 'Calibri' })],
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    spacing: { before: 40, after: 40, line: 276, lineRule: 'auto' },
    children: [new TextRun({ text, size: 22, font: 'Calibri' })],
  });
}

// ─── Table helpers ─────────────────────────────────────────────────────────────
function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorder(BLUE_DARK),
    shading: { fill: BLUE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: 'Calibri' })],
    })],
  });
}

function dataCell(text, width, shade = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorder(),
    shading: { fill: shade ? BLUE_LIGHT : WHITE, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, font: 'Calibri' })],
    })],
  });
}

// ─── Roles & Permissions table ────────────────────────────────────────────────
function buildPermissionsTable() {
  const colW = [4000, 1786, 1786, 1788]; // sums to 9360
  const rows = [
    ['Action', 'Admin', 'Member', 'Viewer'],
    ['View all tasks and projects', '\u2713', '\u2713', '\u2713'],
    ['Create new tasks', '\u2713', '\u2713', '\u2717'],
    ['Edit own tasks', '\u2713', '\u2713', '\u2717'],
    ['Edit any task', '\u2713', '\u2717', '\u2717'],
    ['Delete tasks', '\u2713', '\u2717', '\u2717'],
    ['Create projects', '\u2713', '\u2713', '\u2717'],
    ['Delete projects', '\u2713', '\u2717', '\u2717'],
    ['Add team members', '\u2713', '\u2717', '\u2717'],
    ['Export data', '\u2713', '\u2713', '\u2717'],
    ['Clear all data', '\u2713', '\u2717', '\u2717'],
    ['Manage tags', '\u2713', '\u2717', '\u2717'],
  ];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: rows.map((row, ri) => new TableRow({
      tableHeader: ri === 0,
      children: row.map((cell, ci) => {
        if (ri === 0) return headerCell(cell, colW[ci]);
        return dataCell(cell, colW[ci], ri % 2 === 0);
      }),
    })),
  });
}

// ─── Keyboard shortcuts table ─────────────────────────────────────────────────
function buildShortcutsTable() {
  const colW = [2800, 6560];
  const rows = [
    ['Shortcut', 'Action'],
    ['N', 'New Task'],
    ['Cmd / Ctrl + K', 'Open Command Palette / Search'],
    ['Escape', 'Close modal or panel'],
    ['Enter', 'Submit form / confirm'],
    ['Drag & Drop', 'Move tasks between Kanban columns'],
  ];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: rows.map((row, ri) => new TableRow({
      tableHeader: ri === 0,
      children: row.map((cell, ci) => {
        if (ri === 0) return headerCell(cell, colW[ci]);
        return dataCell(cell, colW[ci], ri % 2 === 0);
      }),
    })),
  });
}

// ─── Cover page ───────────────────────────────────────────────────────────────
function buildCoverPage() {
  return [
    ...spacer(8),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      children: [new TextRun({ text: 'TaskFlow', bold: true, size: 96, color: BLUE_DARK, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [new TextRun({ text: 'User Manual', bold: true, size: 64, color: BLUE_DARK, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: 'Complete Guide to Task Management, Collaboration & Productivity', size: 28, italics: true, color: '475569', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: 'Version 1.0  |  April 2026', size: 24, color: '64748B', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: 'https://taskflow-app-weld.vercel.app', size: 24, color: BLUE_DARK, font: 'Calibri' })],
    }),
    pageBreak(),
  ];
}

// ─── Table of Contents page ───────────────────────────────────────────────────
function buildTOC() {
  const items = [
    '1.   Introduction to TaskFlow',
    '2.   Getting Started & Login',
    '3.   User Roles & Permissions',
    '4.   Dashboard',
    '5.   Task Management',
    '6.   Projects & Sprints',
    '7.   Calendar',
    '8.   Analytics',
    '9.   My Tasks',
    '10.  Today View',
    '11.  Workload & Time Tracking',
    '12.  Roadmap',
    '13.  Activity Feed',
    '14.  Search',
    '15.  Workspaces',
    '16.  Settings & Team Management',
    '17.  Real-time Collaboration',
    '18.  Security & Privacy',
    '19.  Keyboard Shortcuts & Tips',
  ];

  return [
    h1('Table of Contents'),
    ...items.map(item =>
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: item, size: 22, font: 'Calibri' })],
      })
    ),
    pageBreak(),
  ];
}

// ─── Section 1 — Introduction ──────────────────────────────────────────────────
function buildSection1() {
  return [
    h1('1.  Introduction to TaskFlow'),
    body(
      'TaskFlow is a production-grade, full-featured task and project management application ' +
      'designed for teams of all sizes. Built on React 18 + TypeScript with a beautiful dark ' +
      'navy interface, TaskFlow combines powerful task tracking, real-time collaboration, and ' +
      'deep analytics in a single, fast SPA (Single Page Application).'
    ),
    ...spacer(1),
    h2('What Makes TaskFlow Unique'),
    bullet('Dark-first design with a polished navy/blue palette — built for long working sessions'),
    bullet('Dual-mode architecture: works fully offline (localStorage) and scales to Convex cloud'),
    bullet('Real-time collaboration via Socket.io — see teammates\' live presence and changes instantly'),
    bullet('Role-based access control (Admin / Member / Viewer) enforced both client and server side'),
    bullet('Production security: httpOnly session cookies, bcrypt password hashing, CSP headers, server-side rate limiting'),
    bullet('Progressive Web App (PWA) — installable on desktop and mobile'),
    bullet('14 fully tested pages covering every aspect of project management'),
    bullet('133+ automated Playwright E2E tests guaranteeing reliability'),
    ...spacer(1),
    h2('Login Credentials'),
    bullet('Admin:   alex@taskflow.io  /  Admin1234!'),
    bullet('Member:  sarah@taskflow.io  /  Member1234!'),
    bullet('Viewer:  marcus@taskflow.io  /  Viewer1234!'),
    pageBreak(),
  ];
}

// ─── Section 2 — Getting Started ──────────────────────────────────────────────
function buildSection2() {
  return [
    h1('2.  Getting Started & Login'),
    numbered('Navigate to https://taskflow-app-weld.vercel.app'),
    numbered('Enter your email and password, then click Sign In'),
    numbered('On first login the app is pre-seeded with sample tasks and projects'),
    numbered('New members can be added by an admin via Settings → Add Member'),
    ...spacer(1),
    h2('Password Requirements'),
    bullet('Minimum 8 characters'),
    bullet('At least 1 uppercase letter'),
    bullet('At least 1 number'),
    pageBreak(),
  ];
}

// ─── Section 3 — Roles ────────────────────────────────────────────────────────
function buildSection3() {
  return [
    h1('3.  User Roles & Permissions'),
    body('TaskFlow enforces three distinct roles. The table below summarises which actions each role may perform.'),
    ...spacer(1),
    buildPermissionsTable(),
    pageBreak(),
  ];
}

// ─── Section 4 — Dashboard ────────────────────────────────────────────────────
function buildSection4() {
  return [
    h1('4.  Dashboard'),
    body(
      'The Dashboard is the home screen, providing an at-a-glance overview of your team\'s ' +
      'work. It loads automatically after login and refreshes in real-time as data changes.'
    ),
    ...spacer(1),
    h2('Dashboard Components'),
    bullet('Stat cards: Total Tasks, Completed, In Progress, Overdue'),
    bullet('Task completion donut chart'),
    bullet('Tasks by Priority bar chart'),
    bullet('Recent Activity feed showing the latest team actions'),
    bullet('Active tasks list with status and priority badges'),
    bullet('Project progress bars showing completion percentage per project'),
    pageBreak(),
  ];
}

// ─── Section 5 — Task Management ──────────────────────────────────────────────
function buildSection5() {
  return [
    h1('5.  Task Management'),
    body('Task management is the core of TaskFlow. This section covers every aspect of creating, editing, and organising tasks.'),

    ...spacer(1),
    h2('Creating a Task'),
    numbered('Click the "+ New Task" button in the top-right header, OR press N anywhere in the app'),
    numbered('Fill in the required and optional fields (see Task Properties below)'),
    numbered('Click "Create Task" to save'),

    ...spacer(1),
    h2('Task Properties'),
    h3('Title'),
    body('Short, descriptive name for the task (required).'),
    h3('Description'),
    body('Rich text notes, links, and details explaining the work required.'),
    h3('Priority'),
    bullet('Critical — shown in red: highest urgency, must be addressed immediately'),
    bullet('High — shown in orange: important, address this sprint'),
    bullet('Medium — shown in yellow: normal priority work'),
    bullet('Low — shown in grey: nice to have, address when capacity allows'),
    h3('Status'),
    bullet('To Do → In Progress → In Review → Done'),
    body('Move tasks through this workflow as work progresses.'),
    h3('Assignee'),
    body('Any team member in your workspace. Assignees receive notifications when the task is updated.'),
    h3('Due Date'),
    body('Target completion date. Overdue tasks are highlighted in red throughout the app.'),
    h3('Labels / Tags'),
    body('Custom colour-coded tags for cross-project filtering (e.g. "bug", "feature", "urgent").'),
    h3('Estimated Hours'),
    body('Time budget for the task. Used in Workload and Analytics views.'),
    h3('Logged Hours'),
    body('Actual time spent. Log time from the Task Detail panel using the timer or manual entry.'),
    h3('Subtasks'),
    body('Break complex work into smaller, checkable steps within the same task.'),
    h3('Comments'),
    body('Discussion thread attached to the task. Each comment shows author and timestamp.'),
    h3('Attachments'),
    body('Files linked to the task. Download or remove from the Task Detail panel.'),
    h3('Recurrence'),
    body('None / Daily / Weekly / Monthly — TaskFlow automatically recreates the task on the selected cadence.'),

    ...spacer(1),
    h2('Kanban Board'),
    body(
      'Both My Tasks and individual Project pages display tasks as a Kanban board with columns ' +
      'for each status. You can drag and drop task cards between columns to update their status instantly.'
    ),
    bullet('Each card shows: title, priority badge, due date, assignee avatar, and tag chips'),
    bullet('Overdue tasks display their due date in red'),
    bullet('Click any card to open the full Task Detail panel'),

    ...spacer(1),
    h2('Task Detail Panel'),
    body(
      'Clicking a task card opens a right-side slide-in panel. All fields are editable inline — ' +
      'no separate edit form is required.'
    ),
    bullet('Edit all task fields inline — changes save automatically'),
    bullet('Add and complete subtasks with checkboxes'),
    bullet('Log time using the start/stop timer or manual entry'),
    bullet('Add comments with threaded replies'),
    bullet('Download or remove attachments'),
    bullet('View the full activity history of the task'),
    bullet('Pin important tasks to always appear at the top of the board'),
    pageBreak(),
  ];
}

// ─── Section 6 — Projects & Sprints ───────────────────────────────────────────
function buildSection6() {
  return [
    h1('6.  Projects & Sprints'),
    body('Projects group related tasks together, giving teams a focused view of a single initiative.'),
    ...spacer(1),
    h2('Creating a Project'),
    numbered('Navigate to All Projects'),
    numbered('Click the "New Project" button'),
    numbered('Enter a project name, choose a colour, and add an optional description'),
    numbered('Click Create'),
    ...spacer(1),
    h2('Project Page'),
    bullet('Project Kanban board — tasks organised by status'),
    bullet('Sprint management — create sprints with start/end dates and assign tasks to them'),
    bullet('Project stats — total task count and completion percentage'),
    bullet('Share button — generates a public read-only link for external stakeholders'),
    pageBreak(),
  ];
}

// ─── Section 7 — Calendar ────────────────────────────────────────────────────
function buildSection7() {
  return [
    h1('7.  Calendar'),
    body('The Calendar provides a month-grid view of all tasks that have a due date assigned.'),
    ...spacer(1),
    bullet('Colour-coded task pills by priority appear on each day'),
    bullet('Click any date to see a list of tasks due on that day'),
    bullet('Click a task pill to open the Task Detail panel'),
    bullet('Navigate between months using the previous/next arrows'),
    pageBreak(),
  ];
}

// ─── Section 8 — Analytics ───────────────────────────────────────────────────
function buildSection8() {
  return [
    h1('8.  Analytics'),
    body('The Analytics page provides data-driven insights into team performance and workload distribution.'),
    ...spacer(1),
    h2('Available Charts'),
    bullet('Tasks by Status (bar chart)'),
    bullet('Tasks by Priority (bar chart)'),
    bullet('Tasks per Project (bar chart)'),
    bullet('Completion Trend (line chart — tasks completed over time)'),
    bullet('Team Workload (tasks per assignee)'),
    ...spacer(1),
    body('All charts are interactive and update in real-time as task data changes.'),
    pageBreak(),
  ];
}

// ─── Section 9 — My Tasks ────────────────────────────────────────────────────
function buildSection9() {
  return [
    h1('9.  My Tasks'),
    body('My Tasks shows only the tasks assigned to the currently logged-in user — your personal work queue.'),
    ...spacer(1),
    h2('View Modes'),
    bullet('Kanban board — drag and drop between status columns'),
    bullet('List view — compact rows for quick scanning'),
    ...spacer(1),
    h2('Filters & Search'),
    bullet('Filter by: Status, Priority, Project, Due Date, Tags'),
    bullet('Full-text search by task title or description'),
    bullet('Sort by: Due Date, Priority, Created Date'),
    pageBreak(),
  ];
}

// ─── Section 10 — Today View ─────────────────────────────────────────────────
function buildSection10() {
  return [
    h1('10.  Today View'),
    body('The Today View provides a focused daily work list by surfacing tasks due today and any overdue tasks.'),
    ...spacer(1),
    bullet('Quick-complete checkboxes — mark a task done without opening the detail panel'),
    bullet('Tasks are ordered by priority for maximum focus'),
    bullet('Overdue tasks appear at the top with a red indicator'),
    pageBreak(),
  ];
}

// ─── Section 11 — Workload & Time Tracking ───────────────────────────────────
function buildSection11() {
  return [
    h1('11.  Workload & Time Tracking'),
    h2('Workload'),
    body('The Workload page gives managers a bird\'s-eye view of task distribution across the team.'),
    bullet('See each team member\'s total assigned tasks and capacity'),
    bullet('Quickly identify over-loaded or under-utilised team members'),
    bullet('Redistribute tasks by reassigning directly from this view'),
    ...spacer(1),
    h2('Time Tracking'),
    body('The Time page shows personal and team time logs.'),
    bullet('Estimated hours vs actual logged hours per task'),
    bullet('Log time directly from the Task Detail panel using the start/stop timer'),
    bullet('Manual time entry: click "Log Time" and enter hours and optional notes'),
    pageBreak(),
  ];
}

// ─── Section 12 — Roadmap ────────────────────────────────────────────────────
function buildSection12() {
  return [
    h1('12.  Roadmap'),
    body('The Roadmap provides a visual Gantt-style timeline of your projects and key milestones.'),
    ...spacer(1),
    bullet('Drag project bars to adjust start and end dates'),
    bullet('See project dependencies at a glance'),
    bullet('Identify scheduling conflicts before they become blockers'),
    bullet('Export the roadmap view for stakeholder presentations'),
    pageBreak(),
  ];
}

// ─── Section 13 — Activity Feed ──────────────────────────────────────────────
function buildSection13() {
  return [
    h1('13.  Activity Feed'),
    body('The Activity Feed is a complete audit trail of all actions performed in the workspace.'),
    ...spacer(1),
    bullet('Events logged: task created, updated, commented, status changed, completed, deleted'),
    bullet('Filter activity by team member or date range'),
    bullet('Useful for team retrospectives, accountability, and onboarding'),
    bullet('Click any event to jump to the related task'),
    pageBreak(),
  ];
}

// ─── Section 14 — Search ─────────────────────────────────────────────────────
function buildSection14() {
  return [
    h1('14.  Search'),
    body('Global search lets you find any content in TaskFlow instantly.'),
    ...spacer(1),
    bullet('Open with Cmd / Ctrl + K or click the search bar in the header'),
    bullet('Searches task titles, descriptions, comments, and project names'),
    bullet('Results are grouped by type: Tasks and Projects'),
    bullet('Click any result to navigate directly to that item'),
    pageBreak(),
  ];
}

// ─── Section 15 — Workspaces ─────────────────────────────────────────────────
function buildSection15() {
  return [
    h1('15.  Workspaces'),
    body('Workspaces allow you to separate different teams, clients, or contexts within a single TaskFlow account.'),
    ...spacer(1),
    h2('Creating a Workspace'),
    numbered('Click Workspaces in the sidebar'),
    numbered('Enter a workspace name'),
    numbered('Click Create'),
    ...spacer(1),
    h2('Managing Members'),
    bullet('Invite members by email (they must have a TaskFlow account)'),
    bullet('Member roles within a workspace: Owner, Admin, Member'),
    bullet('Switch between workspaces using the workspace switcher in the sidebar'),
    pageBreak(),
  ];
}

// ─── Section 16 — Settings & Team Management ─────────────────────────────────
function buildSection16() {
  return [
    h1('16.  Settings & Team Management'),
    h2('Profile Tab'),
    bullet('Update your display name, email address, and avatar colour'),
    ...spacer(1),
    h2('Team Members Tab (Admin Only)'),
    bullet('View all team members with their assigned roles'),
    bullet('Add Member: click "Add Member", fill in name, email, password, role, and avatar colour'),
    bullet('New members can log in immediately from any device using their credentials'),
    ...spacer(1),
    h2('Notifications Tab'),
    bullet('Toggle email notifications for task assignments'),
    bullet('Toggle email notifications for due-date reminders'),
    ...spacer(1),
    h2('Data Management (Admin Only)'),
    bullet('Export all tasks and projects as a JSON file for backup or migration'),
    bullet('Clear all data — permanently deletes all tasks and projects (requires confirmation)'),
    pageBreak(),
  ];
}

// ─── Section 17 — Real-time Collaboration ────────────────────────────────────
function buildSection17() {
  return [
    h1('17.  Real-time Collaboration'),
    body(
      'TaskFlow uses Socket.io to provide live, multi-user collaboration without requiring any ' +
      'page refreshes.'
    ),
    ...spacer(1),
    bullet('Live presence indicator: green dot next to each teammate who is currently online'),
    bullet('"Live" status badge in the header when Socket.io is connected and receiving updates'),
    bullet('Task updates, new tasks, and comments made by teammates appear instantly in your view'),
    bullet('Kanban column changes made by one user are reflected immediately for all users'),
    pageBreak(),
  ];
}

// ─── Section 18 — Security & Privacy ─────────────────────────────────────────
function buildSection18() {
  return [
    h1('18.  Security & Privacy'),
    body('TaskFlow is built with security-first principles throughout the stack.'),
    ...spacer(1),
    bullet('Sessions use httpOnly, Secure, SameSite=Strict cookies — session tokens are never accessible to JavaScript'),
    bullet('Passwords hashed with bcrypt (cost factor 12) — plain-text passwords are never stored'),
    bullet('Server-side rate limiting: 5 failed login attempts trigger a 60-second lockout'),
    bullet('Content Security Policy (CSP) headers prevent XSS injection attacks'),
    bullet('Role-based access control enforced both on the client and on the server'),
    bullet('HTTPS enforced with HSTS header (max-age = 2 years)'),
    bullet('All task IDs generated with crypto.randomUUID() — not predictable Math.random()'),
    bullet('No dangerouslySetInnerHTML anywhere — all user-supplied data is rendered as safe text'),
    pageBreak(),
  ];
}

// ─── Section 19 — Keyboard Shortcuts & Tips ──────────────────────────────────
function buildSection19() {
  return [
    h1('19.  Keyboard Shortcuts & Tips'),
    h2('Keyboard Shortcuts'),
    buildShortcutsTable(),
    ...spacer(1),
    h2('Pro Tips'),
    bullet('Pin critical tasks so they always appear at the top of the board'),
    bullet('Use the Command Palette (Cmd/Ctrl + K) to jump to any page instantly'),
    bullet('Set up recurring tasks for standup prep, weekly reviews, and other repeating work'),
    bullet('Use tags to enable cross-project filtering (e.g. "bug", "feature", "urgent")'),
    bullet('Export your data regularly as a backup via Settings → Export'),
    bullet('Use the Today View each morning for a focused, priority-ordered daily plan'),
    bullet('The Workload page helps managers spot over-loaded teammates before deadlines slip'),
  ];
}

// ─── Document assembly ────────────────────────────────────────────────────────
function buildDocument() {
  const children = [
    ...buildCoverPage(),
    ...buildTOC(),
    ...buildSection1(),
    ...buildSection2(),
    ...buildSection3(),
    ...buildSection4(),
    ...buildSection5(),
    ...buildSection6(),
    ...buildSection7(),
    ...buildSection8(),
    ...buildSection9(),
    ...buildSection10(),
    ...buildSection11(),
    ...buildSection12(),
    ...buildSection13(),
    ...buildSection14(),
    ...buildSection15(),
    ...buildSection16(),
    ...buildSection17(),
    ...buildSection18(),
    ...buildSection19(),
  ];

  return new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: '\u25E6',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
          ],
        },
        {
          reference: 'numbers',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 36, bold: true, color: BLUE_DARK, font: 'Calibri' },
          paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: 'Calibri' },
          paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, italics: true, font: 'Calibri' },
          paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'TaskFlow User Manual  |  Page ', size: 18, color: '64748B', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '64748B', font: 'Calibri' }),
                  new TextRun({ text: ' of ', size: 18, color: '64748B', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '64748B', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
const outputPath = path.resolve(__dirname, '..', 'public', 'taskflow-manual.docx');

console.log('Building TaskFlow User Manual...');
const doc = buildDocument();

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(`Done. Output: ${outputPath}`);
  console.log(`File size: ${sizeKB} KB (${buffer.length.toLocaleString()} bytes)`);
}).catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
