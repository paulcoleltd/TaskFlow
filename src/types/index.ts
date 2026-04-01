export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type ViewMode = 'board' | 'list' | 'table' | 'timeline' | 'matrix';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

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
  mentions?: string[];   // user IDs @mentioned in this comment
  reactions?: Record<string, string[]>;  // emoji → user IDs who reacted
}

export interface Attachment {
  id: string;
  name: string;
  size: number;        // bytes
  type: string;        // MIME type (e.g. "image/png")
  data: string;        // base64 data URL (e.g. "data:image/png;base64,...")
  uploadedAt: string;  // ISO datetime
  uploadedBy: string;  // userId
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
  attachments: Attachment[];
  attachmentCount: number;  // derived field kept for backward-compat (= attachments.length)
  estimatedHours?: number;
  loggedHours?: number;
  order: number;
  pinned?: boolean;
  recurrence?: Recurrence;
  blockedBy?: string[];   // task IDs that block this task
  sprintId?: string;      // sprint this task belongs to
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  createdAt: string;
  retrospective?: string;
  velocity?: number;  // tasks completed
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  colour: string;
  icon: string;
  ownerId: string;
  memberIds: string[];
  status: 'active' | 'archived' | 'completed';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
}

export type ActivityVerb =
  | 'created' | 'status_changed' | 'priority_changed' | 'assigned'
  | 'commented' | 'subtask_added' | 'subtask_completed' | 'pinned' | 'duplicated';

export interface ActivityEvent {
  id: string;
  taskId: string;
  userId: string;
  verb: ActivityVerb;
  meta?: Record<string, string>;   // e.g. { from: 'todo', to: 'done' }
  createdAt: string;
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
