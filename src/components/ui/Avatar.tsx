import { getInitials, cn } from '../../lib/utils';

interface AvatarProps {
  name: string;
  colour: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, colour, size = 'md', className }: AvatarProps) {
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0', sizes[size], className)}
      style={{ backgroundColor: colour }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
