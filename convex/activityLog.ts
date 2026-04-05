import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByTask = query({
  args: { taskId: v.id("tasks"), limit: v.optional(v.number()) },
  handler: async (ctx, { taskId, limit = 50 }) => {
    await requireAuth(ctx);
    const entries = await ctx.db
      .query("activityLog")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .order("desc")
      .take(limit);
    return Promise.all(
      entries.map(async (e) => ({
        ...e,
        user: await ctx.db.get(e.userId),
      }))
    );
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    await requireAuth(ctx);
    const entries = await ctx.db.query("activityLog").order("desc").take(limit);
    return Promise.all(
      entries.map(async (e) => ({
        ...e,
        user: await ctx.db.get(e.userId),
        task: await ctx.db.get(e.taskId),
      }))
    );
  },
});

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
