import { Modal } from '../ui/Modal';
import { useUIStore } from '../../store/uiStore';

const SHORTCUTS: { keys: string[]; description: string; group?: string }[] = [
  { keys: ['⌘', 'K'], description: 'Open command palette — search everything', group: 'Global' },
  { keys: ['N'],   description: 'Create a new task (admin / member only)', group: 'Global' },
  { keys: ['/'],   description: 'Focus the global search bar', group: 'Global' },
  { keys: ['?'],   description: 'Toggle this keyboard shortcuts reference', group: 'Global' },
  { keys: ['Esc'], description: 'Close the active modal, panel, or search', group: 'Global' },
  { keys: ['J'],   description: 'Next active task', group: 'Task Detail' },
  { keys: ['K'],   description: 'Previous active task', group: 'Task Detail' },
  { keys: ['F'],   description: 'Open focus mode with Pomodoro timer', group: 'Task Detail' },
  { keys: ['E'],   description: 'Edit selected task', group: 'Task Detail' },
  { keys: ['D'],   description: 'Toggle done / to-do on selected task', group: 'Task Detail' },
  { keys: ['P'],   description: 'Toggle pin on selected task', group: 'Task Detail' },
  { keys: ['T'],   description: 'Start / stop live timer on selected task', group: 'Task Detail' },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg bg-[#06091A] border border-[#1C3054] text-xs font-mono text-slate-300 shadow-inner">
      {children}
    </kbd>
  );
}

export function ShortcutsModal() {
  const { isShortcutsOpen, closeShortcuts } = useUIStore();

  return (
    <Modal open={isShortcutsOpen} onClose={closeShortcuts} title="Keyboard Shortcuts" size="sm">
      <div className="px-6 pb-6 pt-2">
        {['Global', 'Task Detail'].map(group => {
          const items = SHORTCUTS.filter(s => s.group === group);
          return (
            <div key={group} className="mb-4 last:mb-0">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">{group}</p>
              <div className="space-y-0">
                {items.map(({ keys, description }) => (
                  <div key={description} className="flex items-center justify-between gap-4 py-2.5 border-b border-[#1C3054] last:border-0">
                    <span className="text-sm text-slate-300">{description}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {keys.map(k => <Kbd key={k}>{k}</Kbd>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-slate-600 pt-2 text-center">
          Shortcuts are disabled while typing in an input field.
        </p>
      </div>
    </Modal>
  );
}
