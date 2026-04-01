import { useCollaborationStore } from '../../store/collaborationStore';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../lib/utils';
import { Tooltip } from '../ui/Tooltip';

const MAX_SHOWN = 4;

export function PresenceBar() {
  const onlineUsers = useCollaborationStore(s => s.onlineUsers);
  const { currentUser } = useAuthStore();

  // Filter out ourselves
  const others = onlineUsers.filter(u => u.userId !== currentUser?.id);

  if (others.length === 0) return null;

  const shown = others.slice(0, MAX_SHOWN);
  const overflow = others.length - MAX_SHOWN;

  return (
    <div className="hidden sm:flex items-center gap-1" aria-label="Online collaborators">
      {shown.map((user) => (
        <Tooltip key={user.userId} content={`${user.userName} is online`}>
          <div className="relative flex-shrink-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-emerald-400/70 ring-offset-1 ring-offset-[#0B1437]"
              style={{ backgroundColor: user.userColour }}
            >
              {getInitials(user.userName)}
            </div>
            {/* Green presence dot */}
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border border-[#0B1437] rounded-full" />
          </div>
        </Tooltip>
      ))}

      {overflow > 0 && (
        <Tooltip content={`${overflow} more ${overflow === 1 ? 'person' : 'people'} online`}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 bg-[#111C44] border border-[#1F3461]">
            +{overflow}
          </div>
        </Tooltip>
      )}
    </div>
  );
}
