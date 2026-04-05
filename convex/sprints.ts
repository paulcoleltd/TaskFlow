import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query("sprints")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("sprints") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    goal: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db.insert("sprints", { ...args, status: "planning" });
  },
});

export const update = mutation({
  args: {
    id: v.id("sprints"),
    name: v.optional(v.string()),
    goal: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    retrospective: v.optional(v.string()),
    velocity: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, patch);
  },
});

export const start = mutation({
  args: { id: v.id("sprints") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, { status: "active" });
  },
});

export const complete = mutation({
  args: { id: v.id("sprints"), retrospective: v.optional(v.string()), velocity: v.optional(v.number()) },
  handler: async (ctx, { id, retrospective, velocity }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, {
      status: "completed",
      ...(retrospective !== undefined ? { retrospective } : {}),
      ...(velocity !== undefined ? { velocity } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("sprints") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    // Unassign tasks from this sprint
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprint", (q) => q.eq("sprintId", id))
      .collect();
    for (const t of tasks) await ctx.db.patch(t._id, { sprintId: undefined });
    await ctx.db.delete(id);
  },
});

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
