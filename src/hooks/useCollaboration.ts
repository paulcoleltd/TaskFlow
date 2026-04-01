/**
 * useCollaboration — central Socket.io lifecycle + event wiring hook.
 *
 * Responsibilities:
 *  - Connect/disconnect the socket based on auth state.
 *  - Wire all inbound socket events to Zustand stores (_applyRemote* actions).
 *  - Export write-through functions for components to use instead of calling
 *    store actions directly — each emits to the socket AND updates local state.
 *
 * Echo-prevention: The _applyRemote* actions never re-emit. Components must
 * call the collab.* functions (not the store actions) for all write operations.
 */

import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useCollaborationStore } from '../store/collaborationStore';
import { useUIStore } from '../store/uiStore';
import { generateId, now } from '../lib/utils';
import type { Task, Project, Status, Comment } from '../types';

const TOAST_STYLE = {
  style: {
    background: '#111C44',
    color: '#E2E8F0',
    border: '1px solid #1F3461',
    fontSize: 13,
  },
};

export function useCollaboration() {
  const { currentUser, token } = useAuthStore();
  const taskStore = useTaskStore();
  const projectStore = useProjectStore();
  const collab = useCollaborationStore();

  // ── Connect / disconnect when auth changes ──────────────────────────────────
  useEffect(() => {
    if (!currentUser || !token) {
      disconnectSocket();
      collab.setConnected(false);
      collab.setOnlineUsers([]);
      return;
    }

    // Only the server-issued token is sent — identity/role are extracted server-side
    const socket = connectSocket(token);

    // ── Connection lifecycle ────────────────────────────────────────────────────

    const onConnect = () => {
      collab.setConnected(true);
      // Send our current local state so the server can seed if it's empty
      socket.emit('sync:request', {
        tasks: useTaskStore.getState().tasks,
        projects: useProjectStore.getState().projects,
      });
    };

    const onDisconnect = () => collab.setConnected(false);

    const onConnectError = () => collab.setConnected(false);

    // ── State sync ─────────────────────────────────────────────────────────────

    const onSyncSnapshot = (data: { tasks: Task[]; projects: Project[] }) => {
      // Only seed local state from server if local state is empty
      const localTasks = useTaskStore.getState().tasks;
      const localProjects = useProjectStore.getState().projects;
      if (localTasks.length === 0 && data.tasks.length > 0) {
        taskStore.seedTasks(data.tasks);
      }
      if (localProjects.length === 0 && data.projects.length > 0) {
        projectStore.seedProjects(data.projects);
      }
    };

    // ── Presence ───────────────────────────────────────────────────────────────

    const onPresenceSnapshot = (data: { users: Array<{ userId: string; userName: string; userColour: string }> }) => {
      // Filter out ourselves from the online list
      const others = data.users.filter(u => u.userId !== currentUser.id);
      collab.setOnlineUsers(others);
    };

    const onPresenceOnline = (data: { userId: string; userName: string; userColour: string }) => {
      if (data.userId === currentUser.id) return;
      collab.addOnlineUser(data);
    };

    const onPresenceOffline = (data: { userId: string }) => {
      collab.removeOnlineUser(data.userId);
    };

    // ── Viewer events ──────────────────────────────────────────────────────────

    const onViewerJoinedProject = (data: { projectId: string; userId: string; userName: string; userColour: string }) => {
      if (data.userId === currentUser.id) return;
      collab.addProjectViewer(data.projectId, { userId: data.userId, userName: data.userName, userColour: data.userColour });
    };

    const onViewerLeftProject = (data: { projectId: string; userId: string }) => {
      collab.removeProjectViewer(data.projectId, data.userId);
    };

    const onViewerSnapshotProject = (data: { projectId: string; viewers: Array<{ userId: string; userName: string; userColour: string }> }) => {
      const others = (data.viewers ?? []).filter(v => v.userId !== currentUser.id);
      collab.setProjectViewers(data.projectId, others);
    };

    const onViewerJoinedTask = (data: { taskId: string; userId: string; userName: string; userColour: string }) => {
      if (data.userId === currentUser.id) return;
      collab.addTaskViewer(data.taskId, { userId: data.userId, userName: data.userName, userColour: data.userColour });
    };

    const onViewerLeftTask = (data: { taskId: string; userId: string }) => {
      collab.removeTaskViewer(data.taskId, data.userId);
    };

    const onViewerSnapshotTask = (data: { taskId: string; viewers: Array<{ userId: string; userName: string; userColour: string }> }) => {
      const others = (data.viewers ?? []).filter(v => v.userId !== currentUser.id);
      collab.setTaskViewers(data.taskId, others);
    };

    // ── Task events ────────────────────────────────────────────────────────────

    const onTaskCreated = (data: { task: Task; senderId: string; senderName: string }) => {
      taskStore._applyRemoteTaskCreate(data.task);
      toast(`${data.senderName} created a task`, { ...TOAST_STYLE, icon: '✨' });
    };

    const onTaskUpdated = (data: { taskId: string; updates: Partial<Task>; senderId: string; senderName: string }) => {
      taskStore._applyRemoteTaskUpdate(data.taskId, data.updates);
      // Only toast if the user has this task open
      const { selectedTaskId, notificationsEnabled } = useUIStore.getState();
      if (notificationsEnabled && selectedTaskId === data.taskId) {
        toast(`${data.senderName} updated this task`, { ...TOAST_STYLE, icon: '✏️' });
      }
    };

    const onTaskDeleted = (data: { taskId: string; senderId: string; senderName: string }) => {
      const { selectedTaskId, setSelectedTask } = useUIStore.getState();
      taskStore._applyRemoteTaskDelete(data.taskId);
      if (selectedTaskId === data.taskId) {
        setSelectedTask(null);
        toast(`${data.senderName} deleted this task`, { ...TOAST_STYLE, icon: '🗑️' });
      }
    };

    const onTaskMoved = (data: { taskId: string; newStatus: Status; senderId: string; senderName: string }) => {
      taskStore._applyRemoteTaskMove(data.taskId, data.newStatus);
    };

    const onCommentAdded = (data: { taskId: string; comment: Comment; senderId: string; senderName: string }) => {
      // Append the comment to the task in local store
      const existingTask = useTaskStore.getState().tasks.find(t => t.id === data.taskId);
      if (existingTask) {
        const alreadyHas = existingTask.comments.some(c => c.id === data.comment.id);
        if (!alreadyHas) {
          taskStore._applyRemoteTaskUpdate(data.taskId, {
            comments: [...existingTask.comments, data.comment],
          });
        }
      }
      const { selectedTaskId } = useUIStore.getState();
      if (selectedTaskId === data.taskId) {
        toast(`${data.senderName} commented`, { ...TOAST_STYLE, icon: '💬' });
      }
    };

    // ── Project events ─────────────────────────────────────────────────────────

    const onProjectCreated = (data: { project: Project; senderId: string; senderName: string }) => {
      projectStore._applyRemoteProjectCreate(data.project);
      toast(`${data.senderName} created project "${data.project.name}"`, { ...TOAST_STYLE, icon: '📁' });
    };

    const onProjectUpdated = (data: { projectId: string; updates: Partial<Project>; senderId: string; senderName: string }) => {
      projectStore._applyRemoteProjectUpdate(data.projectId, data.updates);
    };

    const onProjectDeleted = (data: { projectId: string; senderId: string; senderName: string }) => {
      projectStore._applyRemoteProjectDelete(data.projectId);
    };

    // ── Error ──────────────────────────────────────────────────────────────────

    const onError = (data: { code: string; message: string }) => {
      if (data.code === 'FORBIDDEN') {
        toast.error(`Permission denied: ${data.message}`, { ...TOAST_STYLE });
      }
      // RATE_LIMITED and INVALID_PAYLOAD are silent failures — no UX noise
    };

    // ── Register all listeners ─────────────────────────────────────────────────

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    socket.on('sync:snapshot', onSyncSnapshot);

    socket.on('presence:snapshot', onPresenceSnapshot);
    socket.on('presence:online', onPresenceOnline);
    socket.on('presence:offline', onPresenceOffline);

    socket.on('viewer:joined-project', onViewerJoinedProject);
    socket.on('viewer:left-project', onViewerLeftProject);
    socket.on('viewer:snapshot-project', onViewerSnapshotProject);
    socket.on('viewer:joined-task', onViewerJoinedTask);
    socket.on('viewer:left-task', onViewerLeftTask);
    socket.on('viewer:snapshot-task', onViewerSnapshotTask);

    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('task:moved', onTaskMoved);
    socket.on('comment:added', onCommentAdded);

    socket.on('project:created', onProjectCreated);
    socket.on('project:updated', onProjectUpdated);
    socket.on('project:deleted', onProjectDeleted);

    socket.on('error', onError);

    // If already connected (reconnect case), fire the connection logic
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('sync:snapshot', onSyncSnapshot);
      socket.off('presence:snapshot', onPresenceSnapshot);
      socket.off('presence:online', onPresenceOnline);
      socket.off('presence:offline', onPresenceOffline);
      socket.off('viewer:joined-project', onViewerJoinedProject);
      socket.off('viewer:left-project', onViewerLeftProject);
      socket.off('viewer:snapshot-project', onViewerSnapshotProject);
      socket.off('viewer:joined-task', onViewerJoinedTask);
      socket.off('viewer:left-task', onViewerLeftTask);
      socket.off('viewer:snapshot-task', onViewerSnapshotTask);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('task:moved', onTaskMoved);
      socket.off('comment:added', onCommentAdded);
      socket.off('project:created', onProjectCreated);
      socket.off('project:updated', onProjectUpdated);
      socket.off('project:deleted', onProjectDeleted);
      socket.off('error', onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, token]);

  // ── Write-through functions (emit + local apply) ────────────────────────────

  const createTask = useCallback((task: Task) => {
    taskStore.addTask(task);
    try {
      getSocket().emit('task:create', { task });
    } catch {
      // Socket not connected — offline mode, local-only
    }
  }, [taskStore]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    taskStore.updateTask(taskId, updates);
    try {
      getSocket().emit('task:update', { taskId, updates });
    } catch {
      // offline
    }
  }, [taskStore]);

  const deleteTask = useCallback((taskId: string) => {
    taskStore.deleteTask(taskId);
    try {
      getSocket().emit('task:delete', { taskId });
    } catch {
      // offline
    }
  }, [taskStore]);

  const moveTask = useCallback((taskId: string, newStatus: Status) => {
    taskStore.moveTask(taskId, newStatus);
    try {
      getSocket().emit('task:move', { taskId, newStatus });
    } catch {
      // offline
    }
  }, [taskStore]);

  const addComment = useCallback((taskId: string, content: string, userId: string) => {
    const comment: Comment = {
      id: generateId(),
      taskId,
      userId,
      content,
      createdAt: now(),
    };
    const task = useTaskStore.getState().tasks.find(t => t.id === taskId);
    if (task) {
      taskStore.updateTask(taskId, { comments: [...task.comments, comment] });
    }
    try {
      getSocket().emit('comment:add', { taskId, comment });
    } catch {
      // offline
    }
  }, [taskStore]);

  const createProject = useCallback((project: Project) => {
    projectStore.addProject(project);
    try {
      getSocket().emit('project:create', { project });
    } catch {
      // offline
    }
  }, [projectStore]);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    projectStore.updateProject(projectId, updates);
    try {
      getSocket().emit('project:update', { projectId, updates });
    } catch {
      // offline
    }
  }, [projectStore]);

  const deleteProject = useCallback((projectId: string) => {
    projectStore.deleteProject(projectId);
    try {
      getSocket().emit('project:delete', { projectId });
    } catch {
      // offline
    }
  }, [projectStore]);

  return {
    connected: useCollaborationStore(s => s.connected),
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    addComment,
    createProject,
    updateProject,
    deleteProject,
  };
}
