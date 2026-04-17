/**
 * useInstallPrompt — captures the browser's native "add to home screen" prompt.
 *
 * The `beforeinstallprompt` event fires when the browser decides the PWA is
 * installable (manifest present, SW registered, HTTPS, not already installed).
 * We store the event so we can trigger it later from our own install button
 * rather than relying on the browser's default UI.
 *
 * Usage:
 *   const { canInstall, promptInstall, dismiss } = useInstallPrompt();
 *   if (canInstall) <InstallBanner onInstall={promptInstall} onDismiss={dismiss} />
 */
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'taskflow-pwa-dismissed';

export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed,   setIsDismissed]   = useState(() => {
    try { return !!localStorage.getItem(DISMISS_KEY); } catch { return false; }
  });
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // If the app is already running in standalone mode it's installed — hide banner
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // `appinstalled` fires after the user confirms installation
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredEvent(null);
  };

  const dismiss = () => {
    setIsDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  return {
    canInstall: !!deferredEvent && !isDismissed && !isInstalled,
    promptInstall,
    dismiss,
  };
}
