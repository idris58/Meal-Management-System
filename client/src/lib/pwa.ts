import { useEffect, useState } from "react";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

function getStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsInstalled(getStandaloneMode());
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(ios);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsSupported(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setIsSupported(false);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      setIsInstalled(getStandaloneMode());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) {
      return { outcome: "dismissed" as const };
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setIsSupported(false);
    }

    return result;
  };

  return {
    isInstalled,
    isSupported,
    isIos,
    canInstall: isSupported && !isInstalled && !!installPrompt,
    promptInstall,
  };
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
