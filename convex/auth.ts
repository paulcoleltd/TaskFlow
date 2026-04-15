import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    // Merge application profile fields into the users table on sign-up
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      // New user: create with default role and colour
      const colours = [
        "#4B8CF7", "#7B6CF8", "#10B981", "#F59E0B",
        "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4",
      ];
      const colour = colours[Math.floor(Math.random() * colours.length)];
      const userId = await ctx.db.insert("users", {
        name: (args.profile.name as string | undefined) ?? args.profile.email?.split("@")[0] ?? "User",
        email: args.profile.email as string,
        colour,
        role: "member" as const,
        image: args.profile.image as string | undefined,
      });
      // Auto-create a Personal workspace for new users
      await ctx.runMutation(internal.workspaces.ensurePersonalWorkspace, { userId });
      return userId;
    },
  },
});
