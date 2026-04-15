import { useState } from 'react';
import { Building2, UserPlus, UserMinus, Crown, Shield, User } from 'lucide-react';
import { useWorkspaces, useWorkspaceMembers, useInviteMember, useRemoveMember, useCreateWorkspace } from '../hooks/useWorkspaces';
import { useCurrentUser } from '../hooks/useConvexUser';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

const ROLE_META = {
  owner:  { icon: Crown,  label: 'Owner',  colour: 'text-amber-400' },
  admin:  { icon: Shield, label: 'Admin',  colour: 'text-blue-400'  },
  member: { icon: User,   label: 'Member', colour: 'text-slate-400' },
};

function WorkspaceCard({ ws }: { ws: any }) {
  const members = useWorkspaceMembers(ws._id);
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const currentUser = useCurrentUser();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const myMembership = (members as any[]).find((m: any) => m.userId === currentUser?._id);
  const canManage = myMembership?.role === 'owner' || myMembership?.role === 'admin';

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    try {
      await inviteMember({ workspaceId: ws._id, email, role: 'member' });
      setInviteEmail('');
      toast.success(`Invited ${email}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from ${ws.name}?`)) return;
    try {
      await removeMember({ workspaceId: ws._id, userId: userId as any });
      toast.success(`${name} removed`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className="bg-[#0C1526] border border-[#1C3054] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">{ws.name}</h3>
          <p className="text-xs text-slate-500">/{ws.slug}</p>
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-2 mb-4">
        {(members as any[]).map((m: any) => {
          const meta = ROLE_META[m.role as keyof typeof ROLE_META] ?? ROLE_META.member;
          const RoleIcon = meta.icon;
          return (
            <div key={m._id} className="flex items-center gap-3 py-1.5 px-2.5 bg-[#06091A] rounded-lg">
              <RoleIcon className={`w-3.5 h-3.5 ${meta.colour}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{m.user?.name ?? '—'}</p>
                <p className="text-xs text-slate-500 truncate">{m.user?.email}</p>
              </div>
              <span className={`text-xs ${meta.colour}`}>{meta.label}</span>
              {canManage && m.role !== 'owner' && m.userId !== currentUser?._id && (
                <button
                  onClick={() => handleRemove(m.userId, m.user?.name ?? 'User')}
                  className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                  title="Remove member"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite */}
      {canManage && (
        <div className="flex gap-2">
          <Input
            placeholder="Invite by email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <Button
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
          >
            Invite
          </Button>
        </div>
      )}
    </div>
  );
}

export default function WorkspacesPage() {
  const workspaces = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createWorkspace({ name });
      setNewName('');
      toast.success(`Workspace "${name}" created`);
    } catch {
      toast.error('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-200">Workspaces</h2>
        <div className="flex gap-2">
          <Input
            placeholder="New workspace name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-48"
          />
          <Button
            size="sm"
            icon={<Building2 className="w-3.5 h-3.5" />}
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            Create
          </Button>
        </div>
      </div>

      {(workspaces as any[]).length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">No workspaces yet.</p>
      ) : (
        (workspaces as any[]).map((ws: any) => ws && (
          <WorkspaceCard key={ws._id} ws={ws} />
        ))
      )}
    </div>
  );
}
