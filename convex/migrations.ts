/**
 * One-off migrations.
 *
 * Run with:
 *   npx convex run migrations:migrateToWorkspaces
 */
import { internalMutation } from "./_generated/server";

export const migrateToWorkspaces = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ migrated: number; skipped: number }> => {
    const users = await ctx.db.query("users").collect();
    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect();

      if (memberships.length > 0) {
        skipped++;
        continue;
      }

      // Create a personal workspace
      const slug = `personal-${user._id.slice(-8)}`;
      const workspaceId = await ctx.db.insert("workspaces", {
        name: "Personal",
        slug,
        ownerId: user._id,
      });

      await ctx.db.insert("memberships", {
        workspaceId,
        userId: user._id,
        role: "owner",
      });

      // Set as active workspace
      await ctx.db.patch(user._id, { activeWorkspaceId: workspaceId });

      // Assign all existing projects to this workspace
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_owner", q => q.eq("ownerId", user._id))
        .collect();

      for (const project of projects) {
        if (!(project as any).workspaceId) {
          await ctx.db.patch(project._id, { workspaceId });
        }
      }

      migrated++;
    }

    return { migrated, skipped };
  },
});
