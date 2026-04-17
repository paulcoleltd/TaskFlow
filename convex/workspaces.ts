import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", q => q.eq("userId", userId as any))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(m => ctx.db.get(m.workspaceId))
    );
    return workspaces.filter(Boolean);
  },
});

export const get = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return ctx.db.get(id);
  },
});

export const listMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireAuth(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_workspace", q => q.eq("workspaceId", workspaceId))
      .collect();

    return Promise.all(
      memberships.map(async m => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      })
    );
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, { name, slug }): Promise<string> => {
    const userId = await requireAuth(ctx);
    const safeSlug = (slug ?? name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const workspaceId = await ctx.db.insert("workspaces", {
      name,
      slug: safeSlug,
      ownerId: userId as any,
    });

    await ctx.db.insert("memberships", {
      workspaceId,
      userId: userId as any,
      role: "owner",
    });

    // Set as active workspace for the user
    await ctx.db.patch(userId as any, { activeWorkspaceId: workspaceId });

    return workspaceId;
  },
});

export const setActive = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireAuth(ctx);
    // Verify the caller is actually a member of the workspace they are activating.
    // Without this check any user could adopt any workspace ID (MITRE T1548 / OWASP A01).
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_workspace_user", q =>
        q.eq("workspaceId", workspaceId).eq("userId", userId as any)
      )
      .unique();
    if (!membership) throw new Error("Forbidden: you are not a member of this workspace");
    await ctx.db.patch(userId as any, { activeWorkspaceId: workspaceId });
  },
});

export const inviteMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { workspaceId, email, role }) => {
    const callerId = await requireAuth(ctx);
    // Only workspace owners/admins may invite members (MITRE T1078 / OWASP A01).
    const callerMembership = await ctx.db
      .query("memberships")
      .withIndex("by_workspace_user", q =>
        q.eq("workspaceId", workspaceId).eq("userId", callerId as any)
      )
      .unique();
    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      throw new Error("Forbidden: only workspace owners or admins can invite members");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", email))
      .unique();
    if (!user) throw new Error(`No user found with email ${email}`);

    // Check not already a member
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_workspace_user", q =>
        q.eq("workspaceId", workspaceId).eq("userId", user._id)
      )
      .unique();
    if (existing) throw new Error("User is already a member");

    await ctx.db.insert("memberships", { workspaceId, userId: user._id, role });
  },
});

export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, { workspaceId, userId }) => {
    const callerId = await requireAuth(ctx);
    // Only workspace owners/admins may remove members (MITRE T1531 / OWASP A01).
    const callerMembership = await ctx.db
      .query("memberships")
      .withIndex("by_workspace_user", q =>
        q.eq("workspaceId", workspaceId).eq("userId", callerId as any)
      )
      .unique();
    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      throw new Error("Forbidden: only workspace owners or admins can remove members");
    }
    // Owners cannot be removed (prevents workspace lockout)
    if (String(userId) === String(callerId)) {
      throw new Error("You cannot remove yourself; transfer ownership first");
    }
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_workspace_user", q =>
        q.eq("workspaceId", workspaceId).eq("userId", userId)
      )
      .unique();
    if (membership) await ctx.db.delete(membership._id);
  },
});

// ── Internal: idempotently ensure a Personal workspace exists ─────────────────

export const ensurePersonalWorkspace = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<void> => {
    // Check if user already has a workspace
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();
    if (memberships.length > 0) return;

    // Create "Personal" workspace
    const slug = `personal-${userId.slice(-8)}`;
    const workspaceId = await ctx.db.insert("workspaces", {
      name: "Personal",
      slug,
      ownerId: userId,
    });

    await ctx.db.insert("memberships", {
      workspaceId,
      userId,
      role: "owner",
    });

    await ctx.db.patch(userId, { activeWorkspaceId: workspaceId });
  },
});

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
