import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    description: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    subtasks: v.array(v.string()),
    tags: v.array(v.string()),
    estimatedHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return ctx.db.insert("templates", { ...args, userId: userId as any });
  },
});

export const remove = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const t = await ctx.db.get(id);
    if (!t) throw new Error("Template not found");
    if (t.userId !== userId) throw new Error("Not your template");
    await ctx.db.delete(id);
  },
});

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
