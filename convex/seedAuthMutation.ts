/**
 * seedAuthMutation — DB-write half of the auth seeding flow.
 *
 * Called by seedAuth.run (Node.js action) with a pre-computed Scrypt hash.
 * Inserts into @convex-dev/auth's `authAccounts` table linking the password
 * hash to the matching user record.
 *
 * Must NOT have "use node" — mutations run in the Convex V8 runtime.
 */
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertAuthAccount = internalMutation({
  args: {
    email:  v.string(),
    secret: v.string(),
  },
  handler: async (ctx, { email, secret }): Promise<string> => {
    // 1. Find the user record seeded by seed:runSeed
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      return `skipped (no user record found for ${email})`;
    }

    // 2. Check if an authAccount already exists for this email + provider
    const existing = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .unique();

    if (existing) {
      return `skipped (authAccount already exists)`;
    }

    // 3. Insert the auth account — mirrors what createAccountFromCredentials does
    await ctx.db.insert("authAccounts", {
      provider:          "password",
      providerAccountId: email,
      secret,
      userId:            user._id,
    } as any); // `as any` because authAccounts type comes from @convex-dev/auth internals

    return `created`;
  },
});
