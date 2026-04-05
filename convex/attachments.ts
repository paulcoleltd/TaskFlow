import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    await requireAuth(ctx);
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();
    // Resolve storage URLs
    return Promise.all(
      attachments.map(async (a) => ({
        ...a,
        url: await ctx.storage.getUrl(a.storageId),
      }))
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const saveAttachment = mutation({
  args: {
    taskId: v.id("tasks"),
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const attachmentId = await ctx.db.insert("attachments", {
      ...args,
      uploadedBy: userId as any,
    });
    // Increment attachment count on task
    const task = await ctx.db.get(args.taskId);
    if (task) {
      await ctx.db.patch(args.taskId, {
        attachmentCount: (task.attachmentCount ?? 0) + 1,
      });
    }
    return attachmentId;
  },
});

export const remove = mutation({
  args: { id: v.id("attachments") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    const attachment = await ctx.db.get(id);
    if (!attachment) throw new Error("Attachment not found");
    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(id);
    // Decrement count
    const task = await ctx.db.get(attachment.taskId);
    if (task && task.attachmentCount > 0) {
      await ctx.db.patch(attachment.taskId, {
        attachmentCount: task.attachmentCount - 1,
      });
    }
  },
});

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
