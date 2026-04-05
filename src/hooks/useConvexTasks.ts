/**
 * Convex-backed task hooks.
 * Replace the localStorage Zustand taskStore read paths.
 * Write paths (create/update/delete) go through useMutation.
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useTasksByProject(projectId: Id<"projects"> | null) {
  return useQuery(
    api.tasks.listByProject,
    projectId ? { projectId } : "skip"
  );
}

export function useTasksByAssignee(assigneeId: Id<"users"> | null) {
  return useQuery(
    api.tasks.listByAssignee,
    assigneeId ? { assigneeId } : "skip"
  );
}

export function useAllTasks() {
  return useQuery(api.tasks.listAll);
}

export function useTask(id: Id<"tasks"> | null) {
  return useQuery(api.tasks.get, id ? { id } : "skip");
}

// ── Write hooks ───────────────────────────────────────────────────────────────

export function useCreateTask() {
  return useMutation(api.tasks.create);
}

export function useUpdateTask() {
  return useMutation(api.tasks.update);
}

export function useUpdateTaskStatus() {
  return useMutation(api.tasks.updateStatus);
}

export function useDeleteTask() {
  return useMutation(api.tasks.remove);
}

export function useDuplicateTask() {
  return useMutation(api.tasks.duplicate);
}
