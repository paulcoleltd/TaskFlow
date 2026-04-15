"use node";
/**
 * seedAuth — seeds @convex-dev/auth Password provider accounts for demo users.
 *
 * Runs as a Node.js action so it can use Scrypt (the same hasher that the
 * Password provider uses internally via lucia).
 *
 * Safe to call multiple times — the mutation it calls skips existing accounts.
 *
 * Usage (after npx convex dev is running):
 *   npx convex run seedAuth:run
 */
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";

const DEMO_ACCOUNTS = [
  { email: "alex@taskflow.io",   password: "Admin1234!"  },
  { email: "sarah@taskflow.io",  password: "Member1234!" },
  { email: "marcus@taskflow.io", password: "Viewer1234!" },
];

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<{ email: string; status: string }>> => {
    const scrypt = new Scrypt();
    const results: Array<{ email: string; status: string }> = [];

    for (const acc of DEMO_ACCOUNTS) {
      // Hash using the same Scrypt config the Password provider uses
      const secret = await scrypt.hash(acc.password);

      // DB write goes through an internal mutation (actions cannot use ctx.db)
      const status: string = await ctx.runMutation(
        internal.seedAuthMutation.insertAuthAccount,
        { email: acc.email, secret },
      );
      results.push({ email: acc.email, status });
    }

    return results;
  },
});
