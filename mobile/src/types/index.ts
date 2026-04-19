/**
 * Domain types — kept in sync with src/types/index.ts in the web app.
 * Only the fields consumed by the mobile app are listed here.
 */

export type TaskStatus   = 'todo' | 'in-progress' | 'in-review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type UserRole     = 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  _id: string; // Convex-style alias
  name: string;
  email: string;
  colour: string;
  role: UserRole;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string;
  assigneeId?: string;
  createdBy: string;
  dueDate?: string;
  tags?: string[];
  estimatedHours?: number;
  loggedHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  colour: string;
  status: 'active' | 'on-hold' | 'completed' | 'archived';
  startDate?: string;
  endDate?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface OnlineUser {
  userId:     string;
  userName:   string;
  userColour: string;
}
