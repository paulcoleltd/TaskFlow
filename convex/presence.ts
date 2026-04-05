import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const PRESENCE_TTL_MS = 30_000; // 30 seconds

export const listRoom = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    const entries = await ctx.db
      .query("presence")
      .withIndex("by_room", (q) => q.eq("room", room))
      .filter((q) => q.gte(q.field("lastSeen"), cutoff))
      .collect();
    // Enrich with user profile
    return Promise.all(
      entries.map(async (e) => {
        const user = await ctx.db.get(e.userId);
        return { ...e, user };
      })
    );
  },
});

export const heartbeat = mutation({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) =>
        q.eq("userId", userId as any).eq("room", room)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() });
    } else {
      await ctx.db.insert("presence", {
        userId: userId as any,
        room,
        lastSeen: Date.now(),
      });
    }
  },
});

export const leave = mutation({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) =>
        q.eq("userId", userId as any).eq("room", room)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
