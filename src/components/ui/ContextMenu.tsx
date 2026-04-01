import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;   // renders a divider BEFORE this item
  onSelect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Auto-adjust so menu stays inside viewport
  const MENU_W = 220;
  const MENU_H_EST = items.length * 36 + 16;
  const adjustedX = Math.min(x, window.innerWidth  - MENU_W  - 8);
  const adjustedY = Math.min(y, window.innerHeight - MENU_H_EST - 8);

  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') onClose(); return; }
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const scroll = () => onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    document.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      document.removeEventListener('scroll', scroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[200] w-[220px] bg-[#111C44] border border-[#1F3461] rounded-xl shadow-2xl py-1.5 overflow-hidden select-none"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map(item => (
        <div key={item.id}>
          {item.separator && <div className="my-1 border-t border-[#1F3461]" />}
          <button
            disabled={item.disabled}
            onClick={() => { item.onSelect(); onClose(); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors',
              item.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-slate-300 hover:bg-[#1B254B]',
              item.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {item.icon && (
              <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center opacity-70">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-[10px] text-slate-600 font-mono">{item.shortcut}</kbd>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
