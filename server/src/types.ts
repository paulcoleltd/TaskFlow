// Shared types mirroring src/types/index.ts — kept separate to avoid cross-package imports

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  mentions?: string[];
  reactions?: Record<string, string[]>;
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
  pinned?: boolean;
  recurrence?: Recurrence;
  blockedBy?: string[];
  sprintId?: string;
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

export type Role = 'admin' | 'member' | 'viewer';

// Socket handshake auth payload (sent by client on connect)
export interface SocketAuth {
  userId: string;
  userName: string;
  userColour: string;
  role: Role;
}

// Presence entry stored on server
export interface PresenceEntry {
  userId: string;
  userName: string;
  userColour: string;
}

// ── Client → Server event payloads ───────────────────────────────────────────

export interface JoinRoomPayload  { projectId?: string; taskId?: string }
export interface TaskCreatePayload { task: Task }
export interface TaskUpdatePayload { taskId: string; updates: Partial<Task> }
export interface TaskDeletePayload { taskId: string }
export interface TaskMovePayload   { taskId: string; newStatus: Status }
export interface CommentAddPayload { taskId: string; comment: Comment }
export interface ProjectCreatePayload { project: Project }
export interface ProjectUpdatePayload { projectId: string; updates: Partial<Project> }
export interface ProjectDeletePayload { projectId: string }
export interface SyncRequestPayload  { tasks?: Task[]; projects?: Project[] }

// ── Server → Client event payloads ───────────────────────────────────────────

export interface TaskCreatedEvent   { task: Task; senderId: string; senderName: string }
export interface TaskUpdatedEvent   { taskId: string; updates: Partial<Task>; senderId: string; senderName: string }
export interface TaskDeletedEvent   { taskId: string; senderId: string; senderName: string }
export interface TaskMovedEvent     { taskId: string; newStatus: Status; senderId: string; senderName: string }
export interface CommentAddedEvent  { taskId: string; comment: Comment; senderId: string; senderName: string }
export interface ProjectCreatedEvent { project: Project; senderId: string; senderName: string }
export interface ProjectUpdatedEvent { projectId: string; updates: Partial<Project>; senderId: string; senderName: string }
export interface ProjectDeletedEvent { projectId: string; senderId: string; senderName: string }
export interface PresenceOnlineEvent  { userId: string; userName: string; userColour: string }
export interface PresenceOfflineEvent { userId: string }
export interface PresenceSnapshotEvent { users: PresenceEntry[] }
export interface ViewerJoinedProjectEvent { projectId: string; userId: string; userName: string; userColour: string }
export interface ViewerLeftProjectEvent   { projectId: string; userId: string }
export interface ViewerJoinedTaskEvent    { taskId: string; userId: string; userName: string; userColour: string }
export interface ViewerLeftTaskEvent      { taskId: string; userId: string }
export interface SyncSnapshotEvent { tasks: Task[]; projects: Project[] }
export interface ErrorEvent { code: string; message: string }
