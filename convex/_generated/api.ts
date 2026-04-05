/**
 * AUTO-GENERATED STUB — replaced by `npx convex dev`
 *
 * This file provides type stubs so the TypeScript build succeeds
 * before a Convex deployment is set up. Running `npx convex dev`
 * will overwrite this with the real generated API.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api: any = new Proxy({}, {
  get: (_, prop) => new Proxy(() => {}, {
    get: (_, sub) => `${String(prop)}.${String(sub)}`,
    apply: () => {},
  }),
});
