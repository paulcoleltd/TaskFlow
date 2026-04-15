import { useState, useRef } from 'react';
import { ChevronDown, Plus, Building2, Check } from 'lucide-react';
import { useWorkspaces, useCreateWorkspace, useSetActiveWorkspace } from '../../hooks/useWorkspaces';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import toast from 'react-hot-toast';

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const workspaces = useWorkspaces();
  const currentUser = useCurrentUser();
  const createWorkspace = useCreateWorkspace();
  const setActive = useSetActiveWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  const activeId = (currentUser as any)?.activeWorkspaceId;
  const activeWs = workspaces.find((w: any) => w?._id === activeId) ?? workspaces[0];

  if (!activeWs) return null;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createWorkspace({ name });
      setNewName('');
      setCreating(false);
      setOpen(false);
      toast.success(`Workspace "${name}" created`);
    } catch {
      toast.error('Failed to create workspace');
    }
  };

  const handleSwitch = async (id: string) => {
    if (id === activeId) { setOpen(false); return; }
    try {
      await setActive({ workspaceId: id as any });
      setOpen(false);
      toast.success('Workspace switched');
    } catch {
      toast.error('Failed to switch workspace');
    }
  };

  return (
    <div ref={ref} className="relative px-2 mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#06091A] border border-[#1C3054] hover:border-blue-500/30 hover:bg-[#0A1428] transition-all text-left ${
          collapsed ? 'justify-center px-0 w-10 mx-auto' : ''
        }`}
      >
        <div className="w-5 h-5 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-3 h-3 text-blue-400" />
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-xs font-semibold text-slate-300 truncate">
              {(activeWs as any).name}
            </span>
            <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {open && !collapsed && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-[#0C1526] border border-[#1C3054] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {(workspaces as any[]).map((ws: any) => ws && (
              <button
                key={ws._id}
                onClick={() => handleSwitch(ws._id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#122040] transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-2.5 h-2.5 text-blue-400" />
                </div>
                <span className="flex-1 text-slate-300 font-medium truncate">{ws.name}</span>
                {ws._id === activeId && <Check className="w-3 h-3 text-blue-400" />}
              </button>
            ))}
          </div>

          <div className="border-t border-[#1C3054] p-2">
            {creating ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                  placeholder="Workspace name"
                  className="flex-1 bg-[#06091A] border border-[#1C3054] focus:border-blue-500 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder-slate-600 outline-none"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-[#122040] rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
