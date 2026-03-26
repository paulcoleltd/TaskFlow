import { cn } from '../../lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return (
  <div className="flex flex-col gap-1">
    {label && <label htmlFor={inputId} className="text-xs font-medium text-slate-400">{label}</label>}
    <input
      ref={ref}
      id={inputId}
      className={cn(
        'w-full rounded-lg px-3 py-2 text-sm bg-[#0B2060] border border-[#1F3461] text-slate-100 placeholder-slate-500',
        'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors',
        error && 'border-red-500',
        className
      )}
      {...props}
    />
    {error && <span className="text-xs text-red-400">{error}</span>}
  </div>
  );
});
Input.displayName = 'Input';
