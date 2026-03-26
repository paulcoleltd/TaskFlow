import { cn } from '../../lib/utils';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, options, error, className, id, ...props }, ref) => {
  const selectId = id ?? label?.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return (
  <div className="flex flex-col gap-1">
    {label && <label htmlFor={selectId} className="text-xs font-medium text-slate-400">{label}</label>}
    <div className="relative">
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'w-full rounded-lg px-3 py-2 pr-8 text-sm bg-[#0B2060] border border-[#1F3461] text-slate-100 appearance-none cursor-pointer',
          'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value} className="bg-[#111C44]">{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
    {error && <span className="text-xs text-red-400">{error}</span>}
  </div>
  );
});
Select.displayName = 'Select';
