import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const priority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);

const status = v.union(
  v.literal("todo"),
  v.literal("in-progress"),
  v.literal("review"),
  v.literal("done"),
  v.literal("blocked")
);

export default defineSchema({
  // @convex-dev/auth injects: users (base), sessions, accounts, verificationCodes, etc.
  ...authTables,

  // Extended user profile — merged with authTables.users via @convex-dev/auth profile pattern
  users: defineTable({
    name: v.string(),
    email: v.string(),
    colour: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
    // Fields injected by @convex-dev/auth (image, emailVerificationTime, etc.)
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // opt-out model: undefined = enabled
    emailNotifications: v.optional(v.boolean()),
    activeWorkspaceId: v.optional(v.id("workspaces")),
  }).index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    colour: v.string(),
    icon: v.string(),
    ownerId: v.id("users"),
    memberIds: v.array(v.id("users")),
    status: v.union(
      v.literal("active"),
      v.literal("archived"),
      v.literal("completed")
    ),
    dueDate: v.optional(v.string()),
    shareToken: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    workspaceId: v.optional(v.id("workspaces")),
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          dueDate: v.string(),
          completed: v.boolean(),
          description: v.optional(v.string()),
        })
      )
    ),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status,
    priority,
    projectId: v.id("projects"),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    tags: v.array(v.string()),
    // Subtasks embedded — max 50, replaced atomically on update
    subtasks: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        completed: v.boolean(),
      })
    ),
    attachmentCount: v.number(),
    estimatedHours: v.optional(v.number()),
    loggedHours: v.optional(v.number()),
    order: v.number(),
    pinned: v.optional(v.boolean()),
    recurrence: v.optional(
      v.union(
        v.literal("none"),
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly")
      )
    ),
    blockedBy: v.optional(v.array(v.string())),
    sprintId: v.optional(v.id("sprints")),
    workspaceId: v.optional(v.id("workspaces")),
  })
    .index("by_project", ["projectId"])
    .index("by_assignee", ["assigneeId"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_sprint", ["sprintId"]),

  // Comments normalised — task document stays lean as comments grow
  comments: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    content: v.string(),
    mentions: v.optional(v.array(v.id("users"))),
    reactions: v.optional(v.any()),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"]),

  // File attachments backed by Convex file storage
  attachments: defineTable({
    taskId: v.id("tasks"),
    name: v.string(),
    size: v.number(),
    type: v.string(),
    storageId: v.id("_storage"),
    uploadedBy: v.id("users"),
  }).index("by_task", ["taskId"]),

  // Activity / audit log — replaces in-memory taskStore.activityLog (was capped at 500)
  activityLog: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    verb: v.union(
      v.literal("created"),
      v.literal("status_changed"),
      v.literal("priority_changed"),
      v.literal("assigned"),
      v.literal("commented"),
      v.literal("subtask_added"),
      v.literal("subtask_completed"),
      v.literal("pinned"),
      v.literal("duplicated")
    ),
    meta: v.optional(v.any()),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"]),

  sprints: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    goal: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("completed")
    ),
    retrospective: v.optional(v.string()),
    velocity: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"]),

  tags: defineTable({
    name: v.string(),
    colour: v.string(),
  }),

  // Per-user task templates
  templates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.string(),
    description: v.string(),
    priority,
    subtasks: v.array(v.string()),
    tags: v.array(v.string()),
    estimatedHours: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Multi-workspace support
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.id("users"),
    plan: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"]),

  memberships: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  // Lightweight presence — replaces Socket.io PresenceBar / ViewerPile entirely
  // room format: "project:<id>" | "task:<id>" | "global"
  presence: defineTable({
    userId: v.id("users"),
    room: v.string(),
    lastSeen: v.number(),
  })
    .index("by_room", ["room"])
    .index("by_user_room", ["userId", "room"]),
});
