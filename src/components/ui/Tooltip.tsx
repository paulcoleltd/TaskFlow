import { useState } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <div className={cn('relative inline-flex', className)} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-[#0B1437] border border-[#1F3461] rounded-lg whitespace-nowrap z-50 shadow-card">
          {content}
        </div>
      )}
    </div>
  );
}
