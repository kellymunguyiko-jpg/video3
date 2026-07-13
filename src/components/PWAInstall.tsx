"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    // Register the service worker.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    }

    // Already installed / running standalone?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Detect iOS (Safari has no beforeinstallprompt — needs manual "Add to Home Screen").
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS =
      /iphone|ipad|ipod/.test(ua) ||
      // iPadOS 13+ reports as Mac but is touch-capable
      (ua.includes("macintosh") && "ontouchend" in document);
    if (iOS) {
      setIsIOS(true);
      // Show the iOS install hint after a short delay (once per session).
      const dismissed = sessionStorage.getItem("vidgrab_ios_hint_dismissed");
      if (!dismissed) {
        const t = setTimeout(() => setShowButton(true), 2500);
        return () => clearTimeout(t);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };
    const installedHandler = () => {
      setInstalled(true);
      setShowButton(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowButton(false);
    setShowIOSHelp(false);
    if (isIOS) sessionStorage.setItem("vidgrab_ios_hint_dismissed", "1");
  };

  if (installed) return null;

  return (
    <>
      {/* Install banner */}
      {showButton && !showIOSHelp && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-white border border-green-200 shadow-2xl shadow-green-200/50 rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
            <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-green-900 text-sm">Install VidGrab</p>
              <p className="text-green-600 text-xs">
                {isIOS
                  ? "Add to your Home Screen for quick access"
                  : "Add to your device for quick access"}
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="shrink-0 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isIOS ? "How?" : "Install"}
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="shrink-0 text-green-400 hover:text-green-600 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* iOS "Add to Home Screen" instructions */}
      {showIOSHelp && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={dismiss}>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-xl">
                📲
              </div>
              <h3 className="font-bold text-green-900 text-lg">Install on iPhone / iPad</h3>
            </div>
            <ol className="space-y-3 text-sm text-gray-700 mb-5">
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 bg-green-100 text-green-700 font-bold rounded-full flex items-center justify-center text-xs">1</span>
                <span>
                  Tap the <span className="font-semibold">Share</span> button
                  <svg className="inline w-4 h-4 mx-1 -mt-0.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l4 4h-3v6h-2V6H8l4-4zm-7 9h4v2H7v7h10v-7h-2v-2h4a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                  </svg>
                  in Safari&apos;s toolbar.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 bg-green-100 text-green-700 font-bold rounded-full flex items-center justify-center text-xs">2</span>
                <span>Scroll down and tap <span className="font-semibold">&quot;Add to Home Screen&quot;</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 bg-green-100 text-green-700 font-bold rounded-full flex items-center justify-center text-xs">3</span>
                <span>Tap <span className="font-semibold">&quot;Add&quot;</span> — VidGrab will appear on your Home Screen!</span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-2xl transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
