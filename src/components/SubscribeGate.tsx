"use client";

import { useEffect, useState } from "react";

const CHANNEL_URL = "https://www.youtube.com/@speedDeep?sub_confirmation=1";
const CHANNEL_SHORTS = "https://www.youtube.com/@speedDeep/shorts";
const CHANNEL_HANDLE = "@speedDeep";
const STORAGE_KEY = "vidgrab_subscribed";

interface SubscribeGateProps {
  onSubscribedChange: (subscribed: boolean) => void;
}

export default function SubscribeGate({
  onSubscribedChange,
}: SubscribeGateProps) {
  const [subscribed, setSubscribed] = useState(true); // assume true until checked (avoid flash)
  const [open, setOpen] = useState(false);
  const [clickedSubscribe, setClickedSubscribe] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // On mount, read saved state.
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    const isSubbed = saved === "yes";
    setSubscribed(isSubbed);
    onSubscribedChange(isSubbed);
    if (!isSubbed) {
      // Show the gate shortly after load.
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [onSubscribedChange]);

  const handleSubscribeClick = () => {
    window.open(CHANNEL_URL, "_blank", "noopener,noreferrer");
    setClickedSubscribe(true);
  };

  const handleConfirm = () => {
    setVerifying(true);
    // Give a brief "verifying" moment for UX, then unlock.
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "yes");
      setSubscribed(true);
      onSubscribedChange(true);
      setOpen(false);
      setVerifying(false);
    }, 1200);
  };

  if (subscribed || !open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header banner */}
        <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 p-6 text-center relative">
          <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-3">
            <svg viewBox="0 0 24 24" className="w-11 h-11 text-red-600" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white drop-shadow">
            Unlock Ad-Free Downloads
          </h2>
          <p className="text-green-50 text-sm mt-1">
            Subscribe to remove all ads forever
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 mb-5">
            <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <div className="min-w-0">
              <p className="font-bold text-green-900 truncate">{CHANNEL_HANDLE}</p>
              <a
                href={CHANNEL_SHORTS}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 text-xs hover:underline"
              >
                View channel shorts →
              </a>
            </div>
          </div>

          <ul className="space-y-2 mb-6 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No more full-screen ads
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Faster, cleaner downloads
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Support the creator ❤️
            </li>
          </ul>

          {/* Step 1: Subscribe */}
          {!clickedSubscribe ? (
            <button
              onClick={handleSubscribeClick}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Subscribe on YouTube
            </button>
          ) : (
            /* Step 2: Confirm after subscribing */
            <button
              onClick={handleConfirm}
              disabled={verifying}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 cursor-pointer"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  I&apos;ve Subscribed — Unlock
                </>
              )}
            </button>
          )}

          {clickedSubscribe && !verifying && (
            <button
              onClick={handleSubscribeClick}
              className="w-full mt-2 text-green-600 text-sm font-medium hover:underline cursor-pointer"
            >
              Didn&apos;t open? Subscribe again
            </button>
          )}

          <p className="text-center text-gray-400 text-xs mt-4">
            Ads will keep showing until you subscribe.
          </p>
        </div>
      </div>
    </div>
  );
}
