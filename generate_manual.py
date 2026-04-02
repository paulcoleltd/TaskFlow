"""
TaskFlow User Manual — PDF Generator
Produces: TaskFlow_User_Manual.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as canvaslib
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
import os

# ── Brand colours ──────────────────────────────────────────────────────────────
NAVY        = HexColor('#0B1437')
NAVY_LIGHT  = HexColor('#111C44')
NAVY_MID    = HexColor('#1B254B')
BORDER      = HexColor('#1F3461')
BLUE        = HexColor('#3B82F6')
BLUE_LIGHT  = HexColor('#60A5FA')
GREEN       = HexColor('#10B981')
PURPLE      = HexColor('#8B5CF6')
ORANGE      = HexColor('#F59E0B')
RED         = HexColor('#EF4444')
SLATE_200   = HexColor('#E2E8F0')
SLATE_400   = HexColor('#94A3B8')
SLATE_500   = HexColor('#64748B')
WHITE       = HexColor('#FFFFFF')

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

# ── Styles ─────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def s(name, **kw):
    return ParagraphStyle(name, **kw)

styles = {
    'cover_title': s('cover_title',
        fontName='Helvetica-Bold', fontSize=36, textColor=WHITE,
        alignment=TA_CENTER, spaceAfter=6),
    'cover_sub': s('cover_sub',
        fontName='Helvetica', fontSize=16, textColor=BLUE_LIGHT,
        alignment=TA_CENTER, spaceAfter=4),
    'cover_version': s('cover_version',
        fontName='Helvetica', fontSize=11, textColor=SLATE_400,
        alignment=TA_CENTER, spaceAfter=2),
    'h1': s('h1',
        fontName='Helvetica-Bold', fontSize=20, textColor=BLUE_LIGHT,
        spaceBefore=18, spaceAfter=8, borderPad=0),
    'h2': s('h2',
        fontName='Helvetica-Bold', fontSize=14, textColor=WHITE,
        spaceBefore=14, spaceAfter=6),
    'h3': s('h3',
        fontName='Helvetica-Bold', fontSize=11, textColor=SLATE_200,
        spaceBefore=10, spaceAfter=4),
    'body': s('body',
        fontName='Helvetica', fontSize=10, textColor=SLATE_200,
        leading=16, spaceAfter=6, alignment=TA_JUSTIFY),
    'bullet': s('bullet',
        fontName='Helvetica', fontSize=10, textColor=SLATE_200,
        leading=15, spaceAfter=3, leftIndent=14, bulletIndent=0,
        bulletFontName='Helvetica', bulletFontSize=10),
    'note': s('note',
        fontName='Helvetica-Oblique', fontSize=9, textColor=SLATE_400,
        leading=14, spaceAfter=4, leftIndent=10),
    'code': s('code',
        fontName='Courier', fontSize=9, textColor=GREEN,
        leading=13, spaceAfter=4, leftIndent=10, backColor=NAVY_MID),
    'toc_h1': s('toc_h1',
        fontName='Helvetica-Bold', fontSize=11, textColor=BLUE_LIGHT,
        leading=16, spaceAfter=2),
    'toc_h2': s('toc_h2',
        fontName='Helvetica', fontSize=10, textColor=SLATE_200,
        leading=15, spaceAfter=1, leftIndent=12),
    'table_header': s('table_header',
        fontName='Helvetica-Bold', fontSize=9, textColor=WHITE,
        alignment=TA_CENTER),
    'table_cell': s('table_cell',
        fontName='Helvetica', fontSize=9, textColor=SLATE_200,
        leading=13),
    'badge_admin': s('badge_admin',
        fontName='Helvetica-Bold', fontSize=9, textColor=WHITE,
        alignment=TA_CENTER),
    'section_label': s('section_label',
        fontName='Helvetica-Bold', fontSize=9, textColor=BLUE_LIGHT,
        spaceAfter=2, spaceBefore=10),
}

# ── Helpers ────────────────────────────────────────────────────────────────────
def HR():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER,
                      spaceAfter=8, spaceBefore=4)

def B(text): return f'<b>{text}</b>'
def BL(text): return f'<font color="#60A5FA"><b>{text}</b></font>'
def G(text):  return f'<font color="#10B981">{text}</font>'
def O(text):  return f'<font color="#F59E0B">{text}</font>'
def R(text):  return f'<font color="#EF4444">{text}</font>'
def P(text):  return f'<font color="#8B5CF6">{text}</font>'

def h1(text): return Paragraph(text, styles['h1'])
def h2(text): return Paragraph(text, styles['h2'])
def h3(text): return Paragraph(text, styles['h3'])
def p(text):  return Paragraph(text, styles['body'])
def note(text): return Paragraph(f'<i>{text}</i>', styles['note'])
def SP(n=6):  return Spacer(1, n)

def bullet(items, symbol='•'):
    return [Paragraph(f'{symbol}  {item}', styles['bullet']) for item in items]

def info_box(title, body_items, color=BLUE):
    """Coloured info box with title and bullet list."""
    title_para = Paragraph(f'<b>{title}</b>', ParagraphStyle('ib_title',
        fontName='Helvetica-Bold', fontSize=10, textColor=WHITE))
    rows = [[title_para]]
    for item in body_items:
        rows.append([Paragraph(f'<font color="#E2E8F0">{item}</font>',
                                ParagraphStyle('ib_cell', fontName='Helvetica',
                                fontSize=9, textColor=SLATE_200, leading=14))])
    t = Table(rows, colWidths=[PAGE_W - 2*MARGIN])
    t.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (0,0), color),
        ('BACKGROUND',  (0,1), (-1,-1), NAVY_MID),
        ('TOPPADDING',  (0,0), (-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING',(0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [4]),
        ('BOX',         (0,0), (-1,-1), 0.5, color),
    ]))
    return t

def data_table(headers, rows, col_widths=None):
    data = [[Paragraph(h, styles['table_header']) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), styles['table_cell']) for c in row])
    if col_widths is None:
        col_widths = [(PAGE_W - 2*MARGIN) / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0),  BORDER),
        ('BACKGROUND',   (0,1), (-1,-1), NAVY_LIGHT),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [NAVY_LIGHT, NAVY_MID]),
        ('TEXTCOLOR',    (0,0), (-1,-1), SLATE_200),
        ('GRID',         (0,0), (-1,-1), 0.3, BORDER),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

# ── Cover page callback ─────────────────────────────────────────────────────────
def cover_page(canvas, doc):
    canvas.saveState()
    # Full-page dark background
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Top accent bar
    canvas.setFillColor(BLUE)
    canvas.rect(0, PAGE_H - 8*mm, PAGE_W, 8*mm, fill=1, stroke=0)

    # Bottom accent bar
    canvas.setFillColor(BORDER)
    canvas.rect(0, 0, PAGE_W, 6*mm, fill=1, stroke=0)

    # Logo circle
    cx, cy = PAGE_W/2, PAGE_H * 0.72
    canvas.setFillColor(BLUE)
    canvas.circle(cx, cy, 28*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont('Helvetica-Bold', 26)
    canvas.drawCentredString(cx, cy - 5, 'TF')

    # Title
    canvas.setFillColor(WHITE)
    canvas.setFont('Helvetica-Bold', 38)
    canvas.drawCentredString(PAGE_W/2, PAGE_H * 0.55, 'TaskFlow')

    canvas.setFillColor(BLUE_LIGHT)
    canvas.setFont('Helvetica', 17)
    canvas.drawCentredString(PAGE_W/2, PAGE_H * 0.50, 'Complete User Manual')

    # Divider
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.8)
    canvas.line(MARGIN*2, PAGE_H * 0.47, PAGE_W - MARGIN*2, PAGE_H * 0.47)

    # Sub info
    canvas.setFillColor(SLATE_400)
    canvas.setFont('Helvetica', 11)
    canvas.drawCentredString(PAGE_W/2, PAGE_H * 0.43,
        'Task Management · Real-Time Collaboration · Role-Based Access')

    canvas.setFont('Helvetica', 10)
    canvas.drawCentredString(PAGE_W/2, PAGE_H * 0.38, 'Version 2.0  |  2026')

    # Feature pills row
    pill_labels = ['Dashboard', 'Kanban', 'Analytics', 'Roadmap', 'Search']
    pill_w = 28*mm
    total_w = len(pill_labels) * pill_w + (len(pill_labels)-1) * 4*mm
    start_x = (PAGE_W - total_w) / 2
    py = PAGE_H * 0.30
    for i, lbl in enumerate(pill_labels):
        px = start_x + i * (pill_w + 4*mm)
        canvas.setFillColor(NAVY_MID)
        canvas.roundRect(px, py - 4*mm, pill_w, 9*mm, 3*mm, fill=1, stroke=0)
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.5)
        canvas.roundRect(px, py - 4*mm, pill_w, 9*mm, 3*mm, fill=0, stroke=1)
        canvas.setFillColor(BLUE_LIGHT)
        canvas.setFont('Helvetica', 8)
        canvas.drawCentredString(px + pill_w/2, py - 0.5*mm, lbl)

    canvas.restoreState()

def normal_page(canvas, doc):
    canvas.saveState()
    # Background
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Header bar
    canvas.setFillColor(NAVY_LIGHT)
    canvas.rect(0, PAGE_H - 14*mm, PAGE_W, 14*mm, fill=1, stroke=0)
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(0, PAGE_H - 14*mm, PAGE_W, PAGE_H - 14*mm)
    # Header text
    canvas.setFillColor(BLUE_LIGHT)
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawString(MARGIN, PAGE_H - 9*mm, 'TaskFlow')
    canvas.setFillColor(SLATE_400)
    canvas.setFont('Helvetica', 9)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 9*mm, 'User Manual')
    # Footer
    canvas.setFillColor(NAVY_LIGHT)
    canvas.rect(0, 0, PAGE_W, 10*mm, fill=1, stroke=0)
    canvas.setStrokeColor(BORDER)
    canvas.line(0, 10*mm, PAGE_W, 10*mm)
    canvas.setFillColor(SLATE_500)
    canvas.setFont('Helvetica', 8)
    canvas.drawCentredString(PAGE_W/2, 3.5*mm, f'Page {doc.page}')
    canvas.drawString(MARGIN, 3.5*mm, 'TaskFlow — Task Management')
    canvas.drawRightString(PAGE_W - MARGIN, 3.5*mm, 'Confidential')
    canvas.restoreState()

# ── Build document ──────────────────────────────────────────────────────────────
OUT = r'C:\Users\Dell\Task Management Web App\TaskFlow_User_Manual.pdf'

doc = BaseDocTemplate(
    OUT,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=18*mm, bottomMargin=16*mm,
    title='TaskFlow User Manual',
    author='TaskFlow',
    subject='Complete User Manual',
)

cover_frame  = Frame(0, 0, PAGE_W, PAGE_H, id='cover')
normal_frame = Frame(MARGIN, 14*mm, PAGE_W - 2*MARGIN, PAGE_H - 28*mm, id='normal')

doc.addPageTemplates([
    PageTemplate(id='Cover',  frames=cover_frame,  onPage=cover_page),
    PageTemplate(id='Normal', frames=normal_frame, onPage=normal_page),
])

story = []

# ═══════════════════════════════════════════════════════════════════
# COVER (blank — drawn by cover_page callback)
# ═══════════════════════════════════════════════════════════════════
from reportlab.platypus import NextPageTemplate
story.append(NextPageTemplate('Normal'))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('Table of Contents'))
story.append(HR())

toc_entries = [
    ('1.', 'Getting Started', '3'),
    ('',   'System Requirements', '3'),
    ('',   'Launching the App', '3'),
    ('',   'Login & Demo Accounts', '3'),
    ('2.', 'Dashboard', '4'),
    ('3.', 'My Tasks', '5'),
    ('',   'Board View (Kanban)', '5'),
    ('',   'List View', '5'),
    ('',   'Table View', '5'),
    ('',   'Creating & Editing Tasks', '6'),
    ('4.', 'All Projects', '7'),
    ('',   'Creating a Project', '7'),
    ('',   'Project Detail Page', '7'),
    ('5.', 'Today Page', '8'),
    ('6.', 'Search', '9'),
    ('7.', 'Workload', '10'),
    ('8.', 'Activity Feed', '11'),
    ('9.', 'Time Tracking', '11'),
    ('10.','Roadmap', '12'),
    ('11.','Analytics', '13'),
    ('12.','Calendar', '14'),
    ('13.','Settings', '15'),
    ('14.','Real-Time Collaboration', '16'),
    ('15.','Role-Based Permissions', '17'),
    ('16.','Keyboard Shortcuts', '18'),
    ('17.','Security & Authentication', '19'),
]

toc_data = []
for num, title, pg in toc_entries:
    if num:
        label = Paragraph(f'<b><font color="#60A5FA">{num}</font>  {title}</b>',
                          styles['toc_h1'])
    else:
        label = Paragraph(f'<font color="#94A3B8">    {title}</font>',
                          styles['toc_h2'])
    page_p = Paragraph(f'<font color="#64748B">{pg}</font>',
                       ParagraphStyle('pg', fontName='Helvetica', fontSize=9,
                                      textColor=SLATE_500, alignment=TA_CENTER))
    toc_data.append([label, page_p])

toc_table = Table(toc_data, colWidths=[PAGE_W - 2*MARGIN - 14*mm, 14*mm])
toc_table.setStyle(TableStyle([
    ('VALIGN',      (0,0),(-1,-1), 'MIDDLE'),
    ('TOPPADDING',  (0,0),(-1,-1), 3),
    ('BOTTOMPADDING',(0,0),(-1,-1),3),
    ('LINEBELOW',   (0,0),(-1,-2), 0.2, BORDER),
]))
story.append(toc_table)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 1. GETTING STARTED
# ═══════════════════════════════════════════════════════════════════
story.append(h1('1.  Getting Started'))
story.append(HR())

story.append(h2('System Requirements'))
story += bullet([
    'Modern web browser: Chrome 110+, Firefox 115+, Edge 110+, or Safari 16+',
    'Node.js 18+ (for running the development server locally)',
    'Internet connection not required — runs fully locally',
    'Screen resolution: 1024×768 minimum (1280×900 recommended)',
])
story.append(SP())

story.append(h2('Launching the App'))
story.append(p('Open a terminal in the project root and run both servers:'))

story.append(Paragraph('Backend server (authentication + real-time):', styles['section_label']))
story.append(Paragraph('cd server &amp;&amp; npx tsx src/index.ts', styles['code']))
story.append(SP(4))
story.append(Paragraph('Frontend development server:', styles['section_label']))
story.append(Paragraph('npx vite --port 5175', styles['code']))
story.append(SP(4))
story.append(p(f'Open your browser and navigate to: {BL("http://localhost:5175")}'))
story.append(SP())

story.append(h2('Login &amp; Demo Accounts'))
story.append(p('Three built-in demo accounts cover every permission level. '
               'Use the <b>Fill demo credentials</b> buttons on the login page '
               'for one-click access.'))
story.append(SP(4))

login_data = [
    ['Role', 'Email', 'Password', 'Access Level'],
    ['Admin',  'alex@taskflow.io',   'Admin1234!',  'Full — create, edit, delete everything'],
    ['Member', 'sarah@taskflow.io',  'Member1234!', 'Create & edit tasks and projects'],
    ['Viewer', 'marcus@taskflow.io', 'Viewer1234!', 'Read-only — view only'],
]
story.append(data_table(login_data[0], login_data[1:],
    col_widths=[22*mm, 52*mm, 30*mm, PAGE_W - 2*MARGIN - 22*mm - 52*mm - 30*mm]))
story.append(SP(6))
story.append(note('Passwords are validated server-side. After 5 failed attempts the account '
                  'is locked for 60 seconds (brute-force protection).'))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 2. DASHBOARD
# ═══════════════════════════════════════════════════════════════════
story.append(h1('2.  Dashboard'))
story.append(HR())
story.append(p('The Dashboard is your command centre — it loads automatically after login '
               'and gives an instant overview of team activity and your personal workload.'))
story.append(SP())

story.append(h2('Stat Cards (top row)'))
story += bullet([
    f'{B("Total Tasks")} — all tasks across every project in the workspace',
    f'{B("In Progress")} — tasks currently assigned to active work',
    f'{B("Completed")} — tasks marked Done',
    f'{B("Overdue")} — tasks whose due date has passed and are not yet Done',
])
story.append(SP())

story.append(h2('Charts'))
story += bullet([
    f'{B("Tasks This Week")} — bar chart showing daily task completions for the current week',
    f'{B("By Status")} — doughnut chart breaking down tasks by status across the workspace',
])
story.append(SP())

story.append(h2('My Active Tasks'))
story.append(p('A personalised list of tasks assigned to you that are not yet Done. '
               'Click any row to open the full Task Detail panel.'))
story.append(SP())

story.append(h2('Projects Overview'))
story.append(p('Cards for each active project showing name, progress bar (% tasks Done), '
               'member count, and total task count. Click a card to go directly to that project.'))
story.append(SP())

story.append(info_box('Quick Tip',
    ['Press Cmd/Ctrl + K at any time to open the Command Palette and jump to any page instantly.',
     'Click the notification bell (top-right) to see overdue and due-today task alerts.'],
    color=BLUE))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 3. MY TASKS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('3.  My Tasks'))
story.append(HR())
story.append(p('My Tasks shows every task assigned to you across all projects. '
               'Switch between three views using the toggle buttons in the top-right of the page.'))
story.append(SP())

story.append(h2('Board View (Kanban)'))
story.append(p('Tasks are arranged in columns by status. Drag a card from one column to another '
               'to update its status instantly. Columns available:'))
story += bullet(['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'])
story.append(SP())

story.append(h2('List View'))
story.append(p('A compact vertical list grouped by project. Each row shows priority badge, '
               'status badge, assignee avatar, due date, and tag chips. '
               'Supports inline status change by clicking the status badge.'))
story.append(SP())

story.append(h2('Table View'))
story.append(p('A spreadsheet-style view with sortable columns: Title, Status, Priority, '
               'Project, Assignee, Due Date, Tags, and Logged Hours. '
               'Click any column header to sort. Click a row to open Task Detail.'))
story.append(SP())

story.append(h2('Filtering &amp; Searching'))
story += bullet([
    'Use the <b>search bar</b> to filter tasks by title keyword in real time',
    'The <b>status filter</b> pills (All / To Do / In Progress / Done / Blocked) narrow results instantly',
    'The <b>priority filter</b> dropdown filters by Critical / High / Medium / Low',
    'Click <b>Filters</b> to expand advanced filters: assignee, due date range, sprint, tags',
])
story.append(SP())

story.append(h2('Creating a New Task'))
story += bullet([
    'Click the <b>New Task</b> button in the header, or press <b>N</b> anywhere in the app',
    'Fill in: Title (required), Description (Markdown supported), Status, Priority',
    'Optionally assign to a team member, set a due date, attach tags, or link to a sprint',
    'Click <b>Create Task</b> — the task is saved and broadcast to all connected users',
])
story.append(SP())

story.append(h2('Editing a Task'))
story += bullet([
    'Click any task card or row to open the <b>Task Detail panel</b> (slides in from the right)',
    'Edit any field inline — changes auto-save and sync in real time',
    'Use the <b>Log Time</b> button to record hours worked',
    'Add <b>comments</b> (supports @mentions and Markdown)',
    'Start a <b>Focus Mode</b> or <b>Pomodoro timer</b> from within the detail panel',
    'Admins and Members can delete a task using the trash icon in the panel header',
])
story.append(SP())

story.append(info_box('Task Priority Levels',
    [f'{R("Critical")} — must be resolved immediately',
     f'{O("High")} — important, address soon',
     f'{B("Medium")} — normal priority',
     f'Low — can be deferred'],
    color=PURPLE))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 4. ALL PROJECTS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('4.  All Projects'))
story.append(HR())
story.append(p('The All Projects page lists every project in the workspace. '
               'Use the filter tabs to switch between Active, Completed, and All.'))
story.append(SP())

story.append(h2('Creating a Project'))
story += bullet([
    'Click <b>New Project</b> (Admin or Member role required)',
    'Enter a project name, optional description, and select a colour',
    'Click <b>Create Project</b> — the project is available immediately to all users',
])
story.append(SP())

story.append(h2('Project Cards'))
story.append(p('Each card displays: project name and colour, task counts, '
               'team member avatars, progress bar (Done / total), and creation date. '
               'Click a card to enter the Project Detail page.'))
story.append(SP())

story.append(h2('Project Detail Page'))
story.append(p('Inside a project you will find:'))
story += bullet([
    f'{B("Stats Grid")} — Total tasks, Done, In Progress, Overdue counts',
    f'{B("Task Board")} — full Kanban board scoped to this project; drag-and-drop supported',
    f'{B("Add Task")} — creates a task pre-assigned to this project',
    f'{B("Back to All Projects")} — breadcrumb navigation at the top',
    f'{B("Sprint Management")} — create and manage sprints within the project',
])
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 5. TODAY PAGE
# ═══════════════════════════════════════════════════════════════════
story.append(h1('5.  Today Page'))
story.append(HR())
story.append(p('The Today page is your personalised daily planning view. '
               'Navigate to it via the sidebar or press the keyboard shortcut.'))
story.append(SP())

story.append(h2('Greeting &amp; Date Header'))
story.append(p('Displays a context-aware greeting (Good morning / afternoon / evening) '
               'with your first name, the current date, and a summary line '
               '(e.g. "3 tasks due today").'))
story.append(SP())

story.append(h2("Today's Focus"))
story += bullet([
    'Pin up to <b>3 tasks</b> as your focus for the day by clicking the star icon on any task',
    'Focused tasks appear at the top with a progress bar showing how many are Done',
    'Click a focused task to open its full detail panel',
    'Use the <b>+</b> button to add more candidates from your active tasks',
])
story.append(SP())

story.append(h2('Task Sections'))
story += bullet([
    f'{B("Due Today")} — tasks whose due date is today and are not yet Done',
    f'{B("Overdue")} — tasks past their due date; shown with a red indicator',
    f'{B("In Progress")} — tasks you have started but not yet completed',
    f'{B("Blocked")} — tasks with Blocked status assigned to you',
    f'{B("Completed Yesterday")} — tasks you finished yesterday for context',
])
story.append(SP())

story.append(h2('Standup Report'))
story.append(p('Expand the <b>Standup Report</b> section to generate a ready-to-paste '
               'daily standup in Markdown format, including:'))
story += bullet([
    'Done Yesterday — tasks you completed',
    'Today — tasks due or in progress',
    'Blockers — any tasks with Blocked status',
    'Click <b>Copy to Clipboard</b> to paste directly into Slack or your standup tool',
])
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 6. SEARCH
# ═══════════════════════════════════════════════════════════════════
story.append(h1('6.  Search'))
story.append(HR())
story.append(p('The Search page provides full-text search across all workspace content. '
               'Open it via the sidebar, or press <b>Cmd/Ctrl + K</b> to use the '
               'Command Palette quick-search from anywhere in the app.'))
story.append(SP())

story.append(h2('What Is Searched'))
story += bullet([
    'Task titles and descriptions',
    'Task comments',
    'Project names and descriptions',
])
story.append(SP())

story.append(h2('Scope Filter Pills'))
story.append(p('Narrow results to a specific content type using the pills below the search bar:'))
story += bullet([
    f'{B("Everything")} — searches all content types simultaneously',
    f'{B("Tasks")} — returns only matching tasks',
    f'{B("Projects")} — returns only matching projects',
])
story.append(SP())

story.append(h2('Advanced Filters (Tasks)'))
story += bullet([
    'Expand the <b>Filters</b> panel to filter results by status, priority, assignee, or due date',
    'Matched keywords are highlighted in yellow within results',
    'Press <b>Escape</b> to clear the search field instantly',
])
story.append(SP())

story.append(h2('Result Cards'))
story.append(p('Each result shows: highlighted title, description excerpt, '
               'status badge, priority badge, assignee avatar, project name, '
               'and relative due date. Click any result to open its detail panel.'))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 7. WORKLOAD
# ═══════════════════════════════════════════════════════════════════
story.append(h1('7.  Workload'))
story.append(HR())
story.append(p('The Workload page gives team leads and admins a visual overview '
               'of how work is distributed across the team.'))
story.append(SP())

story.append(h2('Summary Metric Cards'))
story += bullet([
    f'{B("Total Active Tasks")} — all non-Done tasks across the workspace',
    f'{B("Overloaded Members")} — members with more than 5 active tasks',
    f'{B("Average Load")} — average active task count per team member',
    f'{B("Capacity Used")} — workspace-level capacity utilisation percentage',
])
story.append(SP())

story.append(h2('Per-Member Cards'))
story.append(p('Each team member has an individual card showing:'))
story += bullet([
    'Avatar, name, and role badge',
    'Active task count with a colour-coded load bar',
    f'Load level badge: {G("Light")} / {O("Moderate")} / {R("Heavy")} / {R("Overloaded")}',
    'Breakdown of tasks by status (To Do, In Progress, Blocked)',
    'Click <b>View Tasks</b> to jump to a filtered view of that member\'s tasks',
])
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 8. ACTIVITY FEED
# ═══════════════════════════════════════════════════════════════════
story.append(h1('8.  Activity Feed'))
story.append(HR())
story.append(p('The Activity Feed is an audit trail of everything that happens in the workspace — '
               'useful for tracking changes, catching up after absence, and accountability.'))
story.append(SP())

story.append(h2('Event Types'))
story += bullet([
    f'{G("created")} — a new task or project was created',
    f'{B("updated")} — a task field was changed (status, priority, assignee, etc.)',
    f'{O("commented")} — a comment was added to a task',
    f'{P("assigned")} — a task was assigned to a team member',
    f'{R("deleted")} — a task or project was removed',
    f'{O("completed")} — a task was marked as Done',
])
story.append(SP())

story.append(h2('Filtering'))
story.append(p('Use the <b>verb filter pills</b> at the top to show only specific event types. '
               'Events are sorted newest-first. Each entry shows: actor avatar, '
               'action description, timestamp, and a link to the affected item.'))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 9. TIME TRACKING
# ═══════════════════════════════════════════════════════════════════
story.append(h1('9.  Time Tracking'))
story.append(HR())
story.append(p('Time Tracking gives you a summary of hours logged across your tasks '
               'for any time period. Hours are logged from within the Task Detail panel.'))
story.append(SP())

story.append(h2('How to Log Time'))
story += bullet([
    'Open a task via the detail panel',
    'Click <b>Log Time</b> and enter hours manually, OR',
    'Use the <b>Timer</b> button in the header — starts a live stopwatch tied to the task',
    'Click <b>Stop Timer</b> to automatically add the elapsed time to the task',
    'For focused work, use <b>Pomodoro Mode</b> (25-minute countdown timer)',
])
story.append(SP())

story.append(h2('Time Tracking Dashboard'))
story += bullet([
    f'{B("Date range filters")} — Last 7 days / 30 days / 90 days / 6 months / All time',
    'Total hours logged in the selected range',
    'Per-project breakdown bar chart',
    'Per-task breakdown table with task name, project, and hours logged',
])
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 10. ROADMAP
# ═══════════════════════════════════════════════════════════════════
story.append(h1('10.  Roadmap'))
story.append(HR())
story.append(p('The Roadmap page shows all projects on a horizontal timeline, '
               'making it easy to see overlaps, gaps, and long-term planning.'))
story.append(SP())

story.append(h2('Timeline View'))
story += bullet([
    'Each project occupies a row in the sidebar; its duration bar spans start → end date',
    'Bars are colour-coded by project colour',
    'Month column headers run horizontally across the top',
    'Use the <b>Previous</b> / <b>Next</b> month navigation buttons to scroll the timeline',
    'Hover over a project bar to see name, date range, and task count tooltip',
])
story.append(SP())

story.append(h2('Reading the Timeline'))
story += bullet([
    'A bar that starts mid-column indicates the project begins partway through that month',
    'Overlapping bars indicate concurrent projects — useful for resource planning',
    'Projects without a set end date appear as open-ended bars',
])
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 11. ANALYTICS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('11.  Analytics'))
story.append(HR())
story.append(p('The Analytics page provides deep quantitative insight into workspace productivity '
               'using interactive charts powered by Recharts.'))
story.append(SP())

story.append(h2('Date Range Filter'))
story.append(p('All charts respond to the date range selector at the top of the page:'))
story += bullet(['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 6 months', 'All time'])
story.append(SP())

story.append(h2('Metric Cards'))
story += bullet([
    f'{B("Total Tasks")} — workspace task count in the selected range',
    f'{B("Overdue")} — count of tasks past due date and not Done',
    f'{B("Completion Rate")} — percentage of tasks that are Done',
    f'{B("Completed")} — absolute count of Done tasks',
    f'{B("Avg Velocity")} — average tasks completed per week over the last 8 weeks',
])
story.append(SP())

story.append(h2('Charts Available'))
analytics_charts = [
    ['Chart', 'Type', 'What it shows'],
    ['Completed Per Week', 'Bar chart', 'Tasks finished per calendar week (last 8 weeks)'],
    ['Status Distribution', 'Pie chart', 'Proportion of tasks in each status'],
    ['Priority Breakdown', 'Pie chart', 'Task split by Critical / High / Medium / Low'],
    ['Completion Trend', 'Line chart', 'Cumulative completed tasks over the selected range'],
    ['Team Productivity', 'Grouped bar', 'Assigned vs completed vs in-progress per team member'],
    ['Project Breakdown', 'Bar chart', 'Total tasks created per project'],
    ['Tag Usage', 'Bar chart', 'Most-used tags across all tasks'],
    ['Due Date Adherence', 'Pie chart', 'On-time vs late task completions'],
    ['Sprint Velocity', 'Line chart', 'Velocity (story points) across completed sprints'],
]
story.append(data_table(analytics_charts[0], analytics_charts[1:],
    col_widths=[42*mm, 30*mm, PAGE_W - 2*MARGIN - 42*mm - 30*mm]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 12. CALENDAR
# ═══════════════════════════════════════════════════════════════════
story.append(h1('12.  Calendar'))
story.append(HR())
story.append(p('The Calendar page displays all tasks with due dates on a monthly grid, '
               'giving a visual schedule of upcoming deadlines.'))
story.append(SP())

story.append(h2('Navigation'))
story += bullet([
    'Use the <b>Previous</b> / <b>Next</b> arrow buttons to move between months',
    'Click <b>Today</b> to return to the current month instantly',
    'The current day is highlighted with a blue ring',
])
story.append(SP())

story.append(h2('Calendar Grid'))
story += bullet([
    'Each cell represents a day; task chips appear on their due dates',
    'Task chips are colour-coded by <b>priority</b>: red = Critical, orange = High, blue = Medium, grey = Low',
    'Click a task chip to open its full Task Detail panel',
    'Days with overdue tasks are shown with a red badge count in the top-right corner of the cell',
])
story.append(SP())

story.append(h2('Adding Tasks from Calendar'))
story.append(p('Click any day cell to open the New Task modal with that date pre-filled '
               'as the due date — useful for scheduling tasks directly from the calendar.'))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 13. SETTINGS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('13.  Settings'))
story.append(HR())
story.append(p('The Settings page lets you personalise your profile, appearance, '
               'team, and data preferences.'))
story.append(SP())

story.append(h2('Profile Section'))
story += bullet([
    'Displays your current name, email address, and role badge',
    'Shows your assigned colour (used for avatars throughout the app)',
])
story.append(SP())

story.append(h2('Appearance'))
story += bullet([
    f'{B("Dark Mode")} (default) — deep navy colour scheme optimised for long work sessions',
    f'{B("Light Mode")} — switches the entire app to a bright white theme',
    'Toggle is saved to localStorage and persists across sessions',
])
story.append(SP())

story.append(h2('Notifications'))
story += bullet([
    'Enable / disable browser push notifications for task due dates and assignments',
    'Click <b>Enable Notifications</b> to grant browser permission',
    'Once enabled, TaskFlow sends alerts for overdue tasks and tasks due today',
])
story.append(SP())

story.append(h2('Team Members'))
story.append(p('View all workspace members with their name, email, role, and avatar colour. '
               'The <b>You</b> badge highlights your own account.'))
story.append(SP())

story.append(h2('Data Management'))
story += bullet([
    f'{B("Export Data")} — downloads a JSON backup of all tasks, projects, tags, and sprints',
    f'{B("Clear All Data")} — resets the workspace to a blank state (Admin only — irreversible)',
])
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 14. REAL-TIME COLLABORATION
# ═══════════════════════════════════════════════════════════════════
story.append(h1('14.  Real-Time Collaboration'))
story.append(HR())
story.append(p('TaskFlow includes a Socket.io-powered collaboration layer. '
               'Multiple users can work simultaneously and see each other\'s changes live.'))
story.append(SP())

story.append(h2('Presence Bar'))
story.append(p('When multiple users are online, their avatars appear in the '
               '<b>Presence Bar</b> at the top of the header. '
               'Hover an avatar to see the user\'s name and role.'))
story.append(SP())

story.append(h2('Connection Status Indicator'))
story.append(p('A small dot in the header shows your connection state:'))
story += bullet([
    f'{G("Green")} — connected and synced',
    f'{O("Yellow")} — connecting or reconnecting',
    f'{R("Red")} — disconnected (changes will not sync until reconnected)',
])
story.append(SP())

story.append(h2('Live Sync Events'))
story.append(p('These actions are broadcast instantly to all connected users:'))
story += bullet([
    'Task created, updated, or deleted',
    'Task status changed (including drag-and-drop on Kanban)',
    'Comment added to a task',
    'Project created or updated',
])
story.append(SP())

story.append(h2('Snapshot Sync'))
story.append(p('When you first connect (or reconnect after a network interruption), '
               'the server sends a full snapshot of all current tasks and projects, '
               'ensuring your view is always up to date without a page refresh.'))
story.append(SP())

story.append(info_box('Collaboration Note',
    ['Real-time features require the backend server (port 3002) to be running.',
     'If the Connection Status shows red, restart the server with: cd server && npx tsx src/index.ts'],
    color=GREEN))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 15. ROLE-BASED PERMISSIONS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('15.  Role-Based Permissions'))
story.append(HR())
story.append(p('TaskFlow enforces three permission levels. Roles are set server-side '
               'and cannot be changed by the client.'))
story.append(SP())

perm_data = [
    ['Action', 'Admin', 'Member', 'Viewer'],
    ['View tasks & projects',         'Yes', 'Yes', 'Yes'],
    ['Create tasks',                   'Yes', 'Yes', 'No'],
    ['Edit own tasks',                 'Yes', 'Yes', 'No'],
    ['Edit any task',                  'Yes', 'No',  'No'],
    ['Delete any task',                'Yes', 'No',  'No'],
    ['Create projects',                'Yes', 'Yes', 'No'],
    ['Edit / delete projects',         'Yes', 'No',  'No'],
    ['Add comments',                   'Yes', 'Yes', 'No'],
    ['Export workspace data',          'Yes', 'Yes', 'No'],
    ['Clear all data',                 'Yes', 'No',  'No'],
    ['Real-time broadcast (mutate)',   'Yes', 'Yes', 'No'],
]

# Build with colour coding
perm_table_data = [[Paragraph(h, styles['table_header']) for h in perm_data[0]]]
for row in perm_data[1:]:
    cells = [Paragraph(row[0], styles['table_cell'])]
    for val in row[1:]:
        color = GREEN if val == 'Yes' else RED
        cells.append(Paragraph(
            f'<font color="{color.hexval() if hasattr(color,"hexval") else "#10B981" if val=="Yes" else "#EF4444"}"><b>{val}</b></font>',
            ParagraphStyle('perm_val', fontName='Helvetica-Bold', fontSize=9,
                          alignment=TA_CENTER, textColor=WHITE)
        ))
    perm_table_data.append(cells)

col_w = PAGE_W - 2*MARGIN
pt = Table(perm_table_data,
           colWidths=[col_w*0.48, col_w*0.17, col_w*0.17, col_w*0.18],
           repeatRows=1)
pt.setStyle(TableStyle([
    ('BACKGROUND',    (0,0),  (-1,0),  BORDER),
    ('ROWBACKGROUNDS',(0,1),  (-1,-1), [NAVY_LIGHT, NAVY_MID]),
    ('GRID',          (0,0),  (-1,-1), 0.3, BORDER),
    ('TOPPADDING',    (0,0),  (-1,-1), 5),
    ('BOTTOMPADDING', (0,0),  (-1,-1), 5),
    ('LEFTPADDING',   (0,0),  (-1,-1), 8),
    ('RIGHTPADDING',  (0,0),  (-1,-1), 8),
    ('VALIGN',        (0,0),  (-1,-1), 'MIDDLE'),
    ('ALIGN',         (1,0),  (-1,-1), 'CENTER'),
]))
story.append(pt)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 16. KEYBOARD SHORTCUTS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('16.  Keyboard Shortcuts'))
story.append(HR())
story.append(p('TaskFlow is designed for power users. Press <b>?</b> anywhere '
               'in the app (when not in a text field) to open the Shortcuts Modal.'))
story.append(SP())

shortcuts = [
    ['Shortcut', 'Action'],
    ['N',                   'Open New Task modal'],
    ['P',                   'Open New Project modal'],
    ['Cmd/Ctrl + K',        'Open Command Palette'],
    ['?',                   'Open Keyboard Shortcuts reference modal'],
    ['Escape',              'Close any open modal, panel, or palette'],
    ['Cmd/Ctrl + Enter',    'Submit / save the currently open form'],
    ['/',                   'Focus the header search input'],
    ['G then D',            'Go to Dashboard'],
    ['G then T',            'Go to Today page'],
    ['G then M',            'Go to My Tasks'],
    ['G then P',            'Go to All Projects'],
    ['G then A',            'Go to Analytics'],
    ['G then S',            'Go to Settings'],
]
story.append(data_table(shortcuts[0], shortcuts[1:],
    col_widths=[50*mm, PAGE_W - 2*MARGIN - 50*mm]))
story.append(SP(10))

story.append(info_box('Command Palette',
    ['Press Cmd/Ctrl + K to open the Command Palette — a fuzzy-search launcher.',
     'Type any page name, action, or task title to jump instantly.',
     'Results include: navigation links, quick-create actions, and recent tasks.'],
    color=PURPLE))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# 17. SECURITY & AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════
story.append(h1('17.  Security &amp; Authentication'))
story.append(HR())
story.append(p('TaskFlow uses a layered security architecture suitable for team environments. '
               'All security controls are enforced server-side.'))
story.append(SP())

story.append(h2('Token-Based Authentication'))
story += bullet([
    'On login, the server validates credentials and issues an <b>HMAC-SHA256 signed token</b>',
    'Tokens expire after <b>8 hours</b> — you will be prompted to log in again',
    'The token is stored in <b>localStorage</b> and sent with every WebSocket connection',
    'The server verifies the token cryptographically before accepting any connection',
    'Passwords are <b>never</b> stored in the client bundle or transmitted in plain text',
])
story.append(SP())

story.append(h2('Brute-Force Protection'))
story += bullet([
    'After <b>5 failed login attempts</b>, the account is locked for 60 seconds',
    'The lockout is per-email and resets on a successful login',
    'Server-side rate limiting is applied independently of the client-side guard',
])
story.append(SP())

story.append(h2('WebSocket Security'))
story += bullet([
    'Every Socket.io connection is authenticated via token in the handshake',
    'Unauthenticated connections are rejected before any data is exchanged',
    'User identity is extracted from the verified token — clients cannot spoof roles',
    'All mutating socket events are validated and audit-logged server-side',
])
story.append(SP())

story.append(h2('Content Security Policy'))
story += bullet([
    'Production builds enforce a strict CSP — <b>inline scripts are blocked</b>',
    'Development mode allows unsafe-inline for HMR (hot module replacement) only',
    'XSS protection: all user-supplied strings are HTML-entity-encoded before rendering',
])
story.append(SP())

story.append(h2('Best Practices for Admins'))
story += bullet([
    'Change the default <b>TOKEN_SECRET</b> in <code>server/src/index.ts</code> before production deployment',
    'Use HTTPS in production — tokens are sensitive and must not travel over plain HTTP',
    'Run <b>Export Data</b> regularly from Settings as a backup',
    'Only grant Admin role to trusted team members — Admin can delete all data',
])
story.append(SP(10))

# Final page: Quick Reference Card
story.append(HR())
story.append(h2('Quick Reference — Common Tasks'))
story.append(SP(4))

qr_data = [
    ['I want to…', 'Go to…', 'Shortcut'],
    ['Create a new task',        'Anywhere',         'N'],
    ['See my work for today',    'Today page',        'G T'],
    ['Find a specific task',     'Search page',       'Cmd+K'],
    ['Check team capacity',      'Workload page',     '—'],
    ['See what changed',         'Activity Feed',     '—'],
    ['View project timeline',    'Roadmap page',      '—'],
    ['Analyse productivity',     'Analytics page',    'G A'],
    ['Log time on a task',       'Task Detail panel', '—'],
    ['Export workspace data',    'Settings page',     '—'],
    ['Open any page quickly',    'Command Palette',   'Cmd+K'],
]
story.append(data_table(qr_data[0], qr_data[1:],
    col_widths=[60*mm, 55*mm, PAGE_W - 2*MARGIN - 60*mm - 55*mm]))

story.append(SP(14))
story.append(p(f'For support or feedback, visit the project repository on GitHub: '
               f'{BL("github.com/paulcoleltd/TaskFlow")}'))

# ── Build ──────────────────────────────────────────────────────────────────────
doc.build(story)
print(f"PDF created: {OUT}")
