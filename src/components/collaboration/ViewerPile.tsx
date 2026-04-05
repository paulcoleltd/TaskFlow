import { useEffect } from 'react';
import { useCollaborationStore } from '../../store/collaborationStore';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { getInitials } from '../../lib/utils';
import { Tooltip } from '../ui/Tooltip';
import { getSocket } from '../../lib/socket';

interface ViewerPileProps {
  projectId?: string;
  taskId?: string;
}

const MAX_SHOWN = 3;

export function ViewerPile({ projectId, taskId }: ViewerPileProps) {
  const currentUser = useCurrentUser();
  const projectViewers = useCollaborationStore(s => s.projectViewers);
  const taskViewers = useCollaborationStore(s => s.taskViewers);

  const viewers = projectId
    ? (projectViewers[projectId] ?? [])
    : taskId
    ? (taskViewers[taskId] ?? [])
    : [];

  const others = viewers.filter(v => v.userId !== currentUser?._id);

  // ── Emit join/leave on mount/unmount ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    try {
      const socket = getSocket();
      if (projectId) {
        socket.emit('join-project', { projectId });
        return () => { socket.emit('leave-project', { projectId }); };
      }
      if (taskId) {
        socket.emit('join-task', { taskId });
        return () => { socket.emit('leave-task', { taskId }); };
      }
    } catch {
      // Socket not connected — offline mode, skip
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId, currentUser?._id]);

  if (others.length === 0) return null;

  const shown = others.slice(0, MAX_SHOWN);
  const overflow = others.length - MAX_SHOWN;

  return (
    <div className="flex items-center gap-1.5" aria-label="Current viewers">
      <div className="flex items-center -space-x-1.5">
        {shown.map((viewer) => (
          <Tooltip key={viewer.userId} content={`${viewer.userName} is viewing`}>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-[#06091A] flex-shrink-0"
              style={{ backgroundColor: viewer.userColour }}
            >
              {getInitials(viewer.userName)}
            </div>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-400 bg-[#0C1526] ring-1 ring-[#06091A] flex-shrink-0">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-[10px] text-slate-500">
        {others.length === 1 ? '1 other viewing' : `${others.length} others viewing`}
      </span>
    </div>
  );
}
