import { cn } from '../../lib/utils';
import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className, id, ...props }, ref) => {
  const taId = id ?? label?.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return (
  <div className="flex flex-col gap-1">
    {label && <label htmlFor={taId} className="text-xs font-medium text-slate-400">{label}</label>}
    <textarea
      ref={ref}
      id={taId}
      className={cn(
        'w-full rounded-lg px-3 py-2 text-sm bg-[#091020] border border-[#1C3054] text-slate-100 placeholder-slate-500 resize-none',
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
Textarea.displayName = 'Textarea';
