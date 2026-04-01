import { useCollaborationStore } from '../../store/collaborationStore';

export function ConnectionStatus() {
  const connected = useCollaborationStore(s => s.connected);

  return (
    <div
      title={connected ? 'Real-time collaboration active' : 'Reconnecting to collaboration server…'}
      className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
        connected
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
        }`}
      />
      {connected ? 'Live' : 'Reconnecting…'}
    </div>
  );
}
