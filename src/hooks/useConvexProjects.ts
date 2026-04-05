import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useProjects() {
  return useQuery(api.projects.list);
}

export function useProject(id: Id<"projects"> | null) {
  return useQuery(api.projects.get, id ? { id } : "skip");
}

export function useCreateProject() {
  return useMutation(api.projects.create);
}

export function useUpdateProject() {
  return useMutation(api.projects.update);
}

export function useDeleteProject() {
  return useMutation(api.projects.remove);
}
