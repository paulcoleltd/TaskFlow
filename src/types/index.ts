export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type ViewMode = 'board' | 'list' | 'table';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  colour: string;
}

export interface Tag {
  id: string;
  name: string;
  colour: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  subtasks: Subtask[];
  comments: Comment[];
  attachmentCount: number;
  estimatedHours?: number;
  loggedHours?: number;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  colour: string;
  icon: string;
  ownerId: string;
  memberIds: string[];
  status: 'active' | 'archived' | 'completed';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  search: string;
  status: Status[];
  priority: Priority[];
  assigneeIds: string[];
  projectIds: string[];
  showCompleted: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultView: ViewMode;
  sidebarCollapsed: boolean;
  currentUserId: string;
}
