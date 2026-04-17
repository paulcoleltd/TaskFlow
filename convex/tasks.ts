import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Queries ──────────────────────────────────────────────────────────────────

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});

export const listByAssignee = query({
  args: { assigneeId: v.id("users") },
  handler: async (ctx, { assigneeId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", assigneeId))
      .collect();
  },
});

export const listBySprint = query({
  args: { sprintId: v.id("sprints") },
  handler: async (ctx, { sprintId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query("tasks")
      .withIndex("by_sprint", (q) => q.eq("sprintId", sprintId))
      .collect();
  },
});

/** All tasks — used by analytics, search, dashboard */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.db.query("tasks").collect();
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return ctx.db.get(id);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    projectId: v.id("projects"),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    tags: v.array(v.string()),
    subtasks: v.array(v.object({ id: v.string(), title: v.string(), completed: v.boolean() })),
    estimatedHours: v.optional(v.number()),
    sprintId: v.optional(v.id("sprints")),
    recurrence: v.optional(
      v.union(v.literal("none"), v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    // Determine order: place at end of its status column
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", args.status)
      )
      .collect();
    const order = existing.length + 1;

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      attachmentCount: 0,
      loggedHours: 0,
      order,
      pinned: false,
    });

    await ctx.db.insert("activityLog", {
      taskId,
      userId: userId as any,
      verb: "created",
    });

    return taskId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("todo"),
        v.literal("in-progress"),
        v.literal("review"),
        v.literal("done"),
        v.literal("blocked")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    subtasks: v.optional(
      v.array(v.object({ id: v.string(), title: v.string(), completed: v.boolean() }))
    ),
    estimatedHours: v.optional(v.number()),
    loggedHours: v.optional(v.number()),
    pinned: v.optional(v.boolean()),
    sprintId: v.optional(v.id("sprints")),
    recurrence: v.optional(
      v.union(v.literal("none"), v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
    blockedBy: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Task not found");
    await requireProjectAccess(ctx, existing.projectId, userId);

    await ctx.db.patch(id, patch);

    if (patch.status && patch.status !== existing.status) {
      await ctx.db.insert("activityLog", {
        taskId: id,
        userId: userId as any,
        verb: "status_changed",
        meta: { from: existing.status, to: patch.status },
      });
    }
    if (patch.priority && patch.priority !== existing.priority) {
      await ctx.db.insert("activityLog", {
        taskId: id,
        userId: userId as any,
        verb: "priority_changed",
        meta: { from: existing.priority, to: patch.priority },
      });
    }
    if (patch.assigneeId && patch.assigneeId !== existing.assigneeId) {
      await ctx.db.insert("activityLog", {
        taskId: id,
        userId: userId as any,
        verb: "assigned",
        meta: { to: patch.assigneeId },
      });
      // Send assignment email (fire-and-forget; fails silently if RESEND_API_KEY unset)
      const assignee = await ctx.db.get(patch.assigneeId);
      if (assignee && (assignee as any).email && (assignee as any).emailNotifications !== false) {
        const siteUrl = process.env.SITE_URL ?? "http://localhost:5174";
        await ctx.scheduler.runAfter(0, internal.emails.sendEmail, {
          to: (assignee as any).email,
          subject: `You've been assigned: "${htmlEncode(existing.title)}"`,
          // htmlEncode prevents email body injection (CWE-80 / MITRE T1566.002)
          html: `<p>Hi ${htmlEncode((assignee as any).name ?? "")},</p><p>You have been assigned the task <strong>${htmlEncode(existing.title)}</strong>.</p><p><a href="${siteUrl}/my-tasks">View your tasks →</a></p>`,
        });
      }
    }
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("todo"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, status, order }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Task not found");
    await requireProjectAccess(ctx, existing.projectId, userId);

    await ctx.db.patch(id, { status, ...(order !== undefined ? { order } : {}) });

    if (status !== existing.status) {
      await ctx.db.insert("activityLog", {
        taskId: id,
        userId: userId as any,
        verb: "status_changed",
        meta: { from: existing.status, to: status },
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Task not found");
    await requireProjectAccess(ctx, existing.projectId, userId);
    // Clean up related records
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();
    for (const a of attachments) await ctx.db.delete(a._id);

    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();
    for (const l of logs) await ctx.db.delete(l._id);

    await ctx.db.delete(id);
  },
});

export const duplicate = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const source = await ctx.db.get(id);
    if (!source) throw new Error("Task not found");
    await requireProjectAccess(ctx, source.projectId, userId);

    const { _id, _creationTime, ...fields } = source;
    const newId = await ctx.db.insert("tasks", {
      ...fields,
      title: `${fields.title} (copy)`,
      status: "todo",
      loggedHours: 0,
      pinned: false,
    });

    await ctx.db.insert("activityLog", {
      taskId: newId,
      userId: userId as any,
      verb: "duplicated",
      meta: { sourceId: id },
    });

    return newId;
  },
});

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// ── Authorisation helpers ─────────────────────────────────────────────────────

/**
 * Throw unless userId is the project owner or an explicit project member.
 * OWASP A01 / MITRE T1565.001 — prevents cross-user data manipulation.
 */
async function requireProjectAccess(ctx: any, projectId: any, userId: string): Promise<void> {
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Project not found");
  const memberIds: string[] = (project.memberIds ?? []).map(String);
  if (String(project.ownerId) !== userId && !memberIds.includes(userId)) {
    throw new Error("Forbidden: you are not a member of this project");
  }
}

/**
 * Escape HTML special characters to prevent email body injection.
 * CWE-80 / MITRE T1566.002.
 */
function htmlEncode(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Internal: tasks due on a given date (for email reminders) ─────────────────

export const tasksDueTomorrow = internalQuery({
  args: { dateStr: v.string() },
  handler: async (ctx, { dateStr }): Promise<Array<{
    id: string;
    title: string;
    assigneeEmail: string | null;
    assigneeName: string;
    emailNotifications: boolean;
  }>> => {
    const allTasks = await ctx.db.query("tasks").collect();
    const dueTasks = allTasks.filter(t =>
      t.dueDate?.slice(0, 10) === dateStr && t.assigneeId
    );

    const results = [];
    for (const task of dueTasks) {
      if (!task.assigneeId) continue;
      const user = await ctx.db.get(task.assigneeId);
      if (!user) continue;
      results.push({
        id: task._id,
        title: task.title,
        assigneeEmail: (user as any).email ?? null,
        assigneeName: (user as any).name ?? "User",
        // undefined means opt-in by default
        emailNotifications: (user as any).emailNotifications !== false,
      });
    }
    return results;
  },
});

// ── Internal: spawn a recurring task ─────────────────────────────────────────

export const spawnRecurringTask = internalMutation({
  args: { sourceTaskId: v.id("tasks") },
  handler: async (ctx, { sourceTaskId }): Promise<void> => {
    const source = await ctx.db.get(sourceTaskId);
    if (!source || !source.recurrence || source.recurrence === "none") return;

    // Advance due date by recurrence interval
    let newDueDate: string | undefined;
    if (source.dueDate) {
      const d = new Date(source.dueDate);
      if (source.recurrence === "daily")   d.setDate(d.getDate() + 1);
      if (source.recurrence === "weekly")  d.setDate(d.getDate() + 7);
      if (source.recurrence === "monthly") d.setMonth(d.getMonth() + 1);
      newDueDate = d.toISOString();
    }

    const { _id, _creationTime, ...fields } = source;
    await ctx.db.insert("tasks", {
      ...fields,
      status: "todo",
      loggedHours: 0,
      pinned: false,
      dueDate: newDueDate,
      subtasks: fields.subtasks.map(s => ({ ...s, completed: false })),
    });
  },
});

// ── Internal: process all completed recurring tasks (called by cron) ──────────

export const processRecurringTasks = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const doneTasks: Array<{ _id: string; recurrence?: string }> =
      await ctx.runQuery(internal.tasks.listDoneRecurring, {});

    for (const task of doneTasks) {
      await ctx.runMutation(internal.tasks.spawnRecurringTask, {
        sourceTaskId: task._id as any,
      });
    }
  },
});

export const listDoneRecurring = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("tasks")
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "done"),
          q.neq(q.field("recurrence"), undefined),
          q.neq(q.field("recurrence"), "none"),
        )
      )
      .collect();
  },
});
