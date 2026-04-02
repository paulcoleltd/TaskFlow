import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  colour?: string;
  size?: 'sm' | 'md';
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, colour = '#4B8CF7', size = 'md', className, showLabel }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-[#122040] overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${clamped}%`, backgroundColor: colour }} />
      </div>
      {showLabel && <span className="text-xs text-slate-400 w-8 text-right">{clamped}%</span>}
    </div>
  );
}
