import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  colour?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ children, colour, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
      style={colour ? { backgroundColor: `${colour}22`, color: colour, border: `1px solid ${colour}44` } : undefined}
    >
      {children}
    </span>
  );
}
