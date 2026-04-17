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
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Project not found");
    // Owner OR any project member may update project metadata
    const memberIds: string[] = (existing.memberIds ?? []).map(String);
    if (String(existing.ownerId) !== userId && !memberIds.includes(userId)) {
      throw new Error("Forbidden: you are not a member of this project");
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Project not found");
    // Only the project owner may delete the project entirely
    if (String(existing.ownerId) !== userId) {
      throw new Error("Forbidden: only the project owner can delete a project");
    }
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

// ── Public sharing ────────────────────────────────────────────────────────────

export const getByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const project = await ctx.db
      .query("projects")
      .filter(q => q.and(q.eq(q.field("shareToken"), token), q.eq(q.field("isPublic"), true)))
      .unique();
    if (!project) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", q => q.eq("projectId", project._id))
      .collect();

    return { project, tasks };
  },
});

export const enableSharing = mutation({
  args: {
    id:      v.id("projects"),
    enabled: v.boolean(),
  },
  handler: async (ctx, { id, enabled }): Promise<string | null> => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Project not found");
    // Only the project owner may toggle public sharing
    if (String(existing.ownerId) !== userId) {
      throw new Error("Forbidden: only the project owner can change sharing settings");
    }
    if (!enabled) {
      await ctx.db.patch(id, { isPublic: false });
      return null;
    }
    // Reuse existing token or generate a new one
    const token = (existing as any).shareToken ?? crypto.randomUUID().replace(/-/g, "");
    await ctx.db.patch(id, { isPublic: true, shareToken: token });
    return token;
  },
});

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
