import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.db.query("tags").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), colour: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db.insert("tags", args);
  },
});

export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
  },
});

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
