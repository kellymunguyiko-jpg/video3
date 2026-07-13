"use client";

import { useEffect, useState, useCallback } from "react";

// Ads rotate through these partner sites every 7 seconds.
const AD_SITES = [
  {
    url: "https://kellybox.netlify.app",
    name: "KellyBox",
    tagline: "Stream & Watch Movies Free",
    gradient: "from-emerald-500 via-green-600 to-teal-600",
    image:
      "https://www.image2url.com/r2/default/images/1783874779115-e90190b5-c9cd-4b8c-9c3b-6ecef7740ef8.png",
  },
  {
    url: "https://rebafilms.netlify.app",
    name: "Reba Films",
    tagline: "Reba Filime Nyinshi Ku Buntu",
    gradient: "from-green-500 via-emerald-600 to-lime-600",
    image:
      "https://www.image2url.com/r2/default/images/1783874819509-65c86884-d971-4ad2-8cf8-7a1840f8eb81.png",
  },
  {
    url: "https://devspacelive.netlify.app",
    name: "DevSpace Live",
    tagline: "Learn to Code & Build Apps",
    gradient: "from-teal-500 via-green-600 to-emerald-700",
    image:
      "https://www.image2url.com/r2/default/images/1783874917802-a0fbac60-9119-45e7-b6a2-ba3d4c158cae.png",
  },
];

const ROTATE_MS = 7000;

interface AdOverlayProps {
  active: boolean;
}

export default function AdOverlay({ active }: AdOverlayProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  const rotate = useCallback(() => {
    setIndex((prev) => (prev + 1) % AD_SITES.length);
    setKey((k) => k + 1);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    // Show the first ad immediately when activated.
    setVisible(true);
    setKey((k) => k + 1);

    const interval = setInterval(() => {
      rotate();
    }, ROTATE_MS);

    return () => clearInterval(interval);
  }, [active, rotate]);

  if (!active || !visible) return null;

  const ad = AD_SITES[index];

  const openAd = () => {
    window.open(ad.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        key={key}
        className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up cursor-pointer group"
        onClick={openAd}
        role="button"
        tabIndex={0}
        aria-label={`Open ${ad.name}`}
      >
        {/* Full-screen gradient card */}
        <div
          className={`relative flex flex-col items-center justify-center text-center h-full min-h-screen sm:min-h-[80vh] w-full bg-gradient-to-br ${ad.gradient} p-8`}
        >
          {/* Sponsored badge */}
          <span className="absolute top-4 left-4 bg-white/25 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md">
            Sponsored Ad
          </span>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
            }}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/25 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors"
            aria-label="Close ad"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Ad image */}
          <div className="mb-6 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/30">
            <img
              src={ad.image}
              alt={ad.name}
              className="w-full h-auto object-contain bg-white/10"
            />
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-md mb-3">
            {ad.name}
          </h2>
          <p className="text-white/90 text-lg sm:text-xl font-medium mb-8 max-w-md">
            {ad.tagline}
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-white text-green-700 font-bold text-lg px-8 py-4 rounded-2xl shadow-xl group-hover:scale-105 transition-transform">
              Open Now
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <span className="text-white/70 text-xs break-all">{ad.url}</span>
          </div>

          {/* Rotation progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-white/90 ad-progress-bar"
              style={{ animationDuration: `${ROTATE_MS}ms` }}
            />
          </div>

          {/* Dots indicator */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {AD_SITES.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === index ? "bg-white w-6" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
