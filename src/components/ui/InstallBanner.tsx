/**
 * InstallBanner — a subtle "Install app" call-to-action shown at the bottom
 * of the screen when the PWA install prompt is available.
 *
 * Design: matches the dark navy theme, slides up from the bottom.
 * Dismissed state is persisted to localStorage so it doesn't reappear.
 */
import { Download, X, Zap } from 'lucide-react';

interface Props {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallBanner({ onInstall, onDismiss }: Props) {
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-bottom-4 duration-300"
      role="banner"
      aria-label="Install TaskFlow app"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111C44] border border-[#1F3461] shadow-2xl shadow-black/40">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Zap className="w-4 h-4 text-blue-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 leading-tight">Install TaskFlow</p>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Add to home screen for offline access</p>
        </div>

        {/* Install button */}
        <button
          onClick={onInstall}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          aria-label="Install app"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
