/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as ai from "../ai.js";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as presence from "../presence.js";
import type * as projects from "../projects.js";
import type * as seed from "../seed.js";
import type * as seedAuth from "../seedAuth.js";
import type * as seedAuthMutation from "../seedAuthMutation.js";
import type * as sprints from "../sprints.js";
import type * as tags from "../tags.js";
import type * as tasks from "../tasks.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  ai: typeof ai;
  attachments: typeof attachments;
  auth: typeof auth;
  comments: typeof comments;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  migrations: typeof migrations;
  presence: typeof presence;
  projects: typeof projects;
  seed: typeof seed;
  seedAuth: typeof seedAuth;
  seedAuthMutation: typeof seedAuthMutation;
  sprints: typeof sprints;
  tags: typeof tags;
  tasks: typeof tasks;
  templates: typeof templates;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
