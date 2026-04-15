"use node";
/**
 * Email notification actions — powered by Resend.
 *
 * sendEmail      — generic internalAction; called by scheduler from mutations.
 * checkDueTomorrow — scans tasks due tomorrow; sends reminders to assignees.
 */
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendEmail = internalAction({
  args: {
    to:      v.string(),
    subject: v.string(),
    html:    v.string(),
  },
  handler: async (_ctx, { to, subject, html }): Promise<void> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return; // silently no-op when key not configured

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TaskFlow <noreply@taskflow.io>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      // Log but don't throw — email failure shouldn't break the app
      console.error("Resend error:", res.status, await res.text());
    }
  },
});

export const checkDueTomorrow = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const siteUrl = process.env.SITE_URL ?? "http://localhost:5174";

    // Tomorrow's date in ISO format (date part only)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Run query to get tasks due tomorrow
    const tasks: Array<{
      id: string;
      title: string;
      assigneeEmail: string | null;
      assigneeName: string;
      emailNotifications: boolean;
    }> = await ctx.runQuery(internal.tasks.tasksDueTomorrow, { dateStr: tomorrowStr });

    for (const task of tasks) {
      if (!task.assigneeEmail || !task.emailNotifications) continue;
      await ctx.runAction(internal.emails.sendEmail, {
        to: task.assigneeEmail,
        subject: `Reminder: "${task.title}" is due tomorrow`,
        html: `
          <p>Hi ${task.assigneeName},</p>
          <p>This is a reminder that the task <strong>${task.title}</strong> is due tomorrow.</p>
          <p><a href="${siteUrl}/my-tasks">View your tasks →</a></p>
        `,
      });
    }
  },
});
