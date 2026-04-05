import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
    await requireAuth(ctx);
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
