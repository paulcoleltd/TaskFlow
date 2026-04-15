import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send due-tomorrow email reminders every day at 08:00 UTC
crons.daily(
  "due-tomorrow-notifications",
  { hourUTC: 8, minuteUTC: 0 },
  internal.emails.checkDueTomorrow,
);

// Spawn new instances of completed recurring tasks every day at 00:05 UTC
crons.daily(
  "spawn-recurring-tasks",
  { hourUTC: 0, minuteUTC: 5 },
  internal.tasks.processRecurringTasks,
);

export default crons;
