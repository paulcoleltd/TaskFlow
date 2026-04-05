import { internalMutation } from "./_generated/server";
import { signIn } from "./auth";

// Demo account credentials — mirrors the existing demo accounts in the app
const DEMO_ACCOUNTS = [
  { email: "alex@taskflow.io",   password: "Admin1234!",  name: "Alex Morgan",    colour: "#4B8CF7", role: "admin"  as const },
  { email: "sarah@taskflow.io",  password: "Member1234!", name: "Sarah Chen",     colour: "#8B5CF6", role: "member" as const },
  { email: "marcus@taskflow.io", password: "Viewer1234!", name: "Marcus Williams",colour: "#10B981", role: "viewer" as const },
];

const SEED_PROJECT_COLOURS = ["#4B8CF7", "#8B5CF6", "#10B981", "#F59E0B"];

/**
 * Idempotent seed — safe to call multiple times.
 * Creates demo users (via @convex-dev/auth Password provider),
 * seed projects, and seed tasks only when the DB is empty.
 */
export const runSeed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Skip if already seeded
    const existing = await ctx.db.query("projects").first();
    if (existing) return { skipped: true };

    // Create demo users via Convex auth (stores bcrypt-hashed passwords)
    const userIds: Record<string, string> = {};
    for (const acc of DEMO_ACCOUNTS) {
      const userId = await ctx.db.insert("users", {
        name: acc.name,
        email: acc.email,
        colour: acc.colour,
        role: acc.role,
      });
      userIds[acc.email] = userId;
    }

    const alexId   = userIds["alex@taskflow.io"]   as any;
    const sarahId  = userIds["sarah@taskflow.io"]  as any;
    const marcusId = userIds["marcus@taskflow.io"] as any;

    // Seed projects
    const proj1 = await ctx.db.insert("projects", {
      name: "Product Redesign",
      description: "Full redesign of the customer-facing product",
      colour: SEED_PROJECT_COLOURS[0],
      icon: "🎨",
      ownerId: alexId,
      memberIds: [alexId, sarahId, marcusId],
      status: "active",
      dueDate: "2026-06-30",
      notes: "",
    });

    const proj2 = await ctx.db.insert("projects", {
      name: "Engineering Sprint Q2",
      description: "Q2 engineering goals and technical improvements",
      colour: SEED_PROJECT_COLOURS[1],
      icon: "⚙️",
      ownerId: alexId,
      memberIds: [alexId, sarahId],
      status: "active",
      dueDate: "2026-06-30",
      notes: "",
    });

    const proj3 = await ctx.db.insert("projects", {
      name: "Marketing Campaign",
      description: "Launch campaign for Q2 product release",
      colour: SEED_PROJECT_COLOURS[2],
      icon: "📣",
      ownerId: sarahId,
      memberIds: [alexId, sarahId],
      status: "active",
      dueDate: "2026-05-31",
      notes: "",
    });

    const proj4 = await ctx.db.insert("projects", {
      name: "Bug Backlog",
      description: "Tracked bugs and technical debt items",
      colour: SEED_PROJECT_COLOURS[3],
      icon: "🐛",
      ownerId: alexId,
      memberIds: [alexId, sarahId, marcusId],
      status: "active",
      notes: "",
    });

    // Seed tags
    const tagDefs = [
      { name: "Frontend",  colour: "#4B8CF7" },
      { name: "Backend",   colour: "#8B5CF6" },
      { name: "Design",    colour: "#EC4899" },
      { name: "Bug",       colour: "#EF4444" },
      { name: "Feature",   colour: "#10B981" },
      { name: "Docs",      colour: "#F59E0B" },
    ];
    const tagIds: string[] = [];
    for (const t of tagDefs) {
      tagIds.push(await ctx.db.insert("tags", t) as any);
    }

    // Seed tasks (30 tasks across 4 projects)
    const now = Date.now();
    const day = 86400000;

    const seedTasks = [
      // Product Redesign
      { title: "Design new onboarding flow",        status: "in-progress" as const, priority: "high"     as const, projectId: proj1, assigneeId: sarahId,  dueDate: new Date(now + 8 * day).toISOString().split("T")[0],  tags: ["Design", "Feature"], order: 1, estimatedHours: 12, loggedHours: 4 },
      { title: "User research interviews",           status: "done"        as const, priority: "medium"   as const, projectId: proj1, assigneeId: marcusId, dueDate: new Date(now - 2 * day).toISOString().split("T")[0],  tags: ["Design"],            order: 2 },
      { title: "Component library audit",            status: "todo"        as const, priority: "low"      as const, projectId: proj1, assigneeId: sarahId,  dueDate: new Date(now + 14 * day).toISOString().split("T")[0], tags: ["Frontend"],          order: 3, estimatedHours: 6 },
      { title: "Redesign dashboard layout",          status: "review"      as const, priority: "high"     as const, projectId: proj1, assigneeId: sarahId,  dueDate: new Date(now + 3 * day).toISOString().split("T")[0],  tags: ["Design", "Frontend"],order: 4, estimatedHours: 8, loggedHours: 7 },
      { title: "Prototype mobile navigation",        status: "todo"        as const, priority: "medium"   as const, projectId: proj1, assigneeId: alexId,   dueDate: new Date(now + 21 * day).toISOString().split("T")[0], tags: ["Design", "Frontend"],order: 5 },
      { title: "Accessibility audit",                status: "todo"        as const, priority: "high"     as const, projectId: proj1, assigneeId: marcusId, dueDate: new Date(now + 7 * day).toISOString().split("T")[0],  tags: ["Frontend"],          order: 6 },
      { title: "Design system documentation",        status: "in-progress" as const, priority: "medium"   as const, projectId: proj1, assigneeId: sarahId,  dueDate: new Date(now + 10 * day).toISOString().split("T")[0], tags: ["Design", "Docs"],    order: 7, estimatedHours: 5, loggedHours: 2 },
      // Engineering
      { title: "Database query optimisation",        status: "todo"        as const, priority: "high"     as const, projectId: proj2, assigneeId: alexId,   dueDate: new Date(now + 18 * day).toISOString().split("T")[0], tags: ["Backend"],           order: 1, estimatedHours: 8 },
      { title: "Fix login redirect bug",             status: "in-progress" as const, priority: "critical" as const, projectId: proj2, assigneeId: alexId,   dueDate: new Date(now - 13 * day).toISOString().split("T")[0], tags: ["Bug", "Backend"],    order: 2, estimatedHours: 3, loggedHours: 2 },
      { title: "API rate limiting",                  status: "todo"        as const, priority: "high"     as const, projectId: proj2, assigneeId: alexId,   dueDate: new Date(now + 5 * day).toISOString().split("T")[0],  tags: ["Backend"],           order: 3, estimatedHours: 6 },
      { title: "CI/CD pipeline improvements",        status: "done"        as const, priority: "medium"   as const, projectId: proj2, assigneeId: sarahId,  dueDate: new Date(now - 5 * day).toISOString().split("T")[0],  tags: ["Backend"],           order: 4 },
      { title: "Unit test coverage to 80%",          status: "in-progress" as const, priority: "medium"   as const, projectId: proj2, assigneeId: sarahId,  dueDate: new Date(now + 12 * day).toISOString().split("T")[0], tags: ["Backend"],           order: 5, estimatedHours: 16, loggedHours: 6 },
      { title: "Security headers audit",             status: "done"        as const, priority: "high"     as const, projectId: proj2, assigneeId: alexId,   dueDate: new Date(now - 8 * day).toISOString().split("T")[0],  tags: ["Backend"],           order: 6 },
      { title: "Upgrade Node.js to LTS",             status: "todo"        as const, priority: "low"      as const, projectId: proj2, assigneeId: alexId,   dueDate: new Date(now + 30 * day).toISOString().split("T")[0], tags: ["Backend"],           order: 7 },
      // Marketing
      { title: "Launch email campaign",              status: "todo"        as const, priority: "high"     as const, projectId: proj3, assigneeId: sarahId,  dueDate: new Date(now + 4 * day).toISOString().split("T")[0],  tags: ["Feature"],           order: 1 },
      { title: "Social media content calendar",      status: "in-progress" as const, priority: "medium"   as const, projectId: proj3, assigneeId: marcusId, dueDate: new Date(now + 7 * day).toISOString().split("T")[0],  tags: ["Docs"],              order: 2, estimatedHours: 4, loggedHours: 1 },
      { title: "Press release draft",                status: "review"      as const, priority: "high"     as const, projectId: proj3, assigneeId: sarahId,  dueDate: new Date(now + 2 * day).toISOString().split("T")[0],  tags: ["Docs"],              order: 3, estimatedHours: 3, loggedHours: 3 },
      { title: "Partner outreach",                   status: "todo"        as const, priority: "medium"   as const, projectId: proj3, assigneeId: marcusId, dueDate: new Date(now + 14 * day).toISOString().split("T")[0], tags: ["Feature"],           order: 4 },
      { title: "Landing page copy",                  status: "done"        as const, priority: "medium"   as const, projectId: proj3, assigneeId: sarahId,  dueDate: new Date(now - 3 * day).toISOString().split("T")[0],  tags: ["Docs", "Frontend"],  order: 5 },
      // Bug Backlog
      { title: "Fix date picker timezone issue",     status: "todo"        as const, priority: "high"     as const, projectId: proj4, assigneeId: alexId,   dueDate: new Date(now + 1 * day).toISOString().split("T")[0],  tags: ["Bug", "Frontend"],   order: 1 },
      { title: "Memory leak in real-time sync",      status: "in-progress" as const, priority: "critical" as const, projectId: proj4, assigneeId: alexId,   dueDate: new Date(now - 1 * day).toISOString().split("T")[0],  tags: ["Bug", "Backend"],    order: 2, estimatedHours: 5, loggedHours: 3 },
      { title: "Mobile layout overflow on iOS",      status: "todo"        as const, priority: "medium"   as const, projectId: proj4, assigneeId: sarahId,  dueDate: new Date(now + 6 * day).toISOString().split("T")[0],  tags: ["Bug", "Frontend"],   order: 3 },
      { title: "Sorting broken in table view",       status: "blocked"     as const, priority: "high"     as const, projectId: proj4, assigneeId: alexId,   dueDate: new Date(now + 3 * day).toISOString().split("T")[0],  tags: ["Bug", "Frontend"],   order: 4 },
      { title: "Search ignores accented characters", status: "todo"        as const, priority: "low"      as const, projectId: proj4, assigneeId: marcusId, dueDate: new Date(now + 20 * day).toISOString().split("T")[0], tags: ["Bug", "Backend"],    order: 5 },
      { title: "Export CSV missing columns",         status: "done"        as const, priority: "medium"   as const, projectId: proj4, assigneeId: sarahId,  dueDate: new Date(now - 6 * day).toISOString().split("T")[0],  tags: ["Bug"],               order: 6 },
    ];

    for (const t of seedTasks) {
      await ctx.db.insert("tasks", {
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectId: t.projectId as any,
        assigneeId: t.assigneeId as any,
        dueDate: t.dueDate,
        tags: t.tags ?? [],
        subtasks: [],
        attachmentCount: 0,
        estimatedHours: (t as any).estimatedHours,
        loggedHours: (t as any).loggedHours,
        order: t.order,
        pinned: false,
        recurrence: "none",
      });
    }

    return { seeded: true, users: Object.keys(userIds).length, projects: 4, tasks: seedTasks.length };
  },
});
