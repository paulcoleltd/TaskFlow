import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.db.query("projects").collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return ctx.db.get(id);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    colour: v.string(),
    icon: v.string(),
    memberIds: v.array(v.id("users")),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("completed")),
    dueDate: v.optional(v.string()),
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          dueDate: v.string(),
          completed: v.boolean(),
          description: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return ctx.db.insert("projects", {
      ...args,
      ownerId: userId as any,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    colour: v.optional(v.string()),
    icon: v.optional(v.string()),
    memberIds: v.optional(v.array(v.id("users"))),
    status: v.optional(
      v.union(v.literal("active"), v.literal("archived"), v.literal("completed"))
    ),
    dueDate: v.optional(v.string()),
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          dueDate: v.string(),
          completed: v.boolean(),
          description: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Project not found");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    // Delete all tasks in the project (cascade)
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const t of tasks) await ctx.db.delete(t._id);

    // Delete sprints
    const sprints = await ctx.db
      .query("sprints")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const s of sprints) await ctx.db.delete(s._id);

    await ctx.db.delete(id);
  },
});

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
