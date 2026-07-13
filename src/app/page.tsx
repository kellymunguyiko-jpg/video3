"use client";

import { useState, useCallback, useEffect } from "react";
import AdOverlay from "@/components/AdOverlay";
import SubscribeGate from "@/components/SubscribeGate";

interface DownloadLink {
  quality: string;
  url: string;
  format: string;
  size: string;
}

interface VideoResult {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  channel: string;
  channelUrl: string | null;
  views: number | null;
  likes: number | null;
  resolution: string | null;
  fps: number | null;
  videoUrl: string | null;
  downloadLinks: DownloadLink[];
}

interface ChannelVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
}

interface ChannelResult {
  channel: string;
  channelUrl: string;
  thumbnail: string | null;
  count: number;
  videos: ChannelVideo[];
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-12 h-12" fill="white">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function formatDuration(seconds: number | string | null): string {
  if (!seconds) return "N/A";
  const s = typeof seconds === "string" ? parseInt(seconds) : seconds;
  if (isNaN(s)) return String(seconds);
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatViews(views: number | string | null): string {
  if (views === null || views === undefined) return "N/A";
  const num = typeof views === "string" ? parseInt(views) : Number(views);
  if (isNaN(num)) return String(views);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState("");
  const [adsActive, setAdsActive] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [subscribed, setSubscribed] = useState(true); // gate sets real value

  // Mode: "video" (single) or "channel" (bulk .zip)
  const [mode, setMode] = useState<"video" | "channel">("video");
  const [channelData, setChannelData] = useState<ChannelResult | null>(null);
  const [channelLoading, setChannelLoading] = useState(false);
  const [zipCount, setZipCount] = useState(5);
  const [zipQuality, setZipQuality] = useState(720);
  const [zipPreparing, setZipPreparing] = useState(false);
  const [downloadToast, setDownloadToast] = useState("");
  // Active download progress: index of the link being downloaded + percent.
  const [dlIndex, setDlIndex] = useState<number | null>(null);
  const [dlPercent, setDlPercent] = useState(0);
  const [dlReceived, setDlReceived] = useState(0);

  // Ads run while processing/downloading AND for a short window after results,
  // BUT only for users who have NOT subscribed to the channel.
  // They rotate every 7 seconds inside the AdOverlay component.
  useEffect(() => {
    if (loading && !subscribed) {
      setAdsActive(true);
    }
  }, [loading, subscribed]);

  // If the user subscribes at any point, immediately stop all ads.
  useEffect(() => {
    if (subscribed) {
      setAdsActive(false);
    }
  }, [subscribed]);

  const handleDownload = useCallback(async () => {
    setError("");
    setResult(null);
    setShowPlayer(false);

    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/;
    if (!youtubeRegex.test(url.trim())) {
      setError("Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)");
      return;
    }

    setLoading(true);
    try {
      // Allow up to ~110 seconds for the download service (multiple qualities).
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 110000);

      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to download video");
        setAdsActive(false);
        return;
      }

      setResult(data);
      // Auto-show the player once the video is ready.
      if (data.videoUrl) {
        setShowPlayer(true);
      }
      // Keep ads rotating for 21 seconds (3 rotations) after the video is ready
      // — only for non-subscribers.
      if (!subscribed) {
        setAdsActive(true);
        window.setTimeout(() => setAdsActive(false), 21000);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "The video is taking longer than usual to process. Please try again."
        );
      } else {
        setError(
          "Network error. The video may be large — please wait a moment and try again."
        );
      }
      setAdsActive(false);
    } finally {
      setLoading(false);
    }
  }, [url, subscribed]);

  const handleLoadChannel = useCallback(async () => {
    setError("");
    setChannelData(null);

    if (!url.trim()) {
      setError("Please enter a YouTube channel URL");
      return;
    }

    const channelRegex =
      /youtube\.com\/(@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)/;
    if (!channelRegex.test(url.trim())) {
      setError(
        "Please enter a valid channel URL (e.g., https://youtube.com/@name)"
      );
      return;
    }

    if (!subscribed) setAdsActive(true);
    setChannelLoading(true);
    try {
      const res = await fetch("/api/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load channel");
        return;
      }
      setChannelData(data);
    } catch {
      setError("Network error while loading channel. Please try again.");
    } finally {
      setChannelLoading(false);
      if (!subscribed) setTimeout(() => setAdsActive(false), 14000);
    }
  }, [url, subscribed]);

  const handleDownloadZip = useCallback(() => {
    if (!channelData) return;
    setZipPreparing(true);
    if (!subscribed) setAdsActive(true);
    const zipUrl = `/api/channel-zip?url=${encodeURIComponent(
      channelData.channelUrl || url.trim()
    )}&count=${zipCount}&height=${zipQuality}`;
    // Trigger the download in a hidden iframe so the page stays usable.
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = zipUrl;
    document.body.appendChild(iframe);
    // Reset the "preparing" state after a while (download continues in bg).
    setTimeout(() => {
      setZipPreparing(false);
      if (!subscribed) setAdsActive(false);
    }, 8000);
  }, [channelData, url, zipCount, zipQuality, subscribed]);

  // Download a file with a real progress indicator, then save it to the device.
  const handleFileDownload = useCallback(
    async (link: DownloadLink, index: number, filenameBase: string) => {
      if (dlIndex !== null) return; // one at a time
      setDlIndex(index);
      setDlPercent(0);
      setDlReceived(0);
      setDownloadToast(`Starting your ${link.quality} download...`);

      try {
        const res = await fetch(link.url);
        if (!res.ok || !res.body) {
          throw new Error("download failed");
        }

        const total = Number(res.headers.get("Content-Length")) || 0;
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            setDlReceived(received);
            if (total > 0) {
              setDlPercent(Math.min(100, Math.round((received / total) * 100)));
            }
          }
        }

        // Assemble and trigger the save dialog.
        const blobParts = chunks.map(
          (c) => c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength) as ArrayBuffer
        );
        const blob = new Blob(blobParts, {
          type: link.format === "mp3" || link.format === "m4a" ? "audio/mp4" : "video/mp4",
        });
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        const ext = link.format === "mp3" || link.format === "m4a" ? "m4a" : "mp4";
        a.download = `${filenameBase} - ${link.quality}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);

        setDownloadToast("✅ Download complete! Saved to your device.");
        window.setTimeout(() => setDownloadToast(""), 5000);
      } catch {
        setDownloadToast(
          "Download failed. Please try again or pick another quality."
        );
        window.setTimeout(() => setDownloadToast(""), 6000);
      } finally {
        setDlIndex(null);
        setDlPercent(0);
        setDlReceived(0);
      }
    },
    [dlIndex]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !loading && !channelLoading) {
        if (mode === "video") handleDownload();
        else handleLoadChannel();
      }
    },
    [handleDownload, handleLoadChannel, loading, channelLoading, mode]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Subscribe gate — unlocks ad-free experience after subscribing */}
      <SubscribeGate onSubscribedChange={setSubscribed} />

      {/* Rotating full-screen sponsored ads (every 7 seconds, non-subscribers) */}
      <AdOverlay active={adsActive && !subscribed} />

      {/* Download preparing toast */}
      {downloadToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[95] w-[calc(100%-2rem)] max-w-md">
          <div className="bg-white border border-green-200 shadow-2xl shadow-green-200/50 rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
            <svg className="animate-spin w-5 h-5 text-green-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-green-800 flex-1">{downloadToast}</p>
            <button
              onClick={() => setDownloadToast("")}
              className="text-green-400 hover:text-green-600 shrink-0 cursor-pointer"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
              <YouTubeIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-800">VidGrab</h1>
              <p className="text-xs text-green-600">YouTube Downloader</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/about"
              className="text-sm font-semibold text-green-700 hover:text-green-900 hover:bg-green-50 px-3 py-1.5 rounded-full transition-colors"
            >
              About
            </a>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
              {subscribed ? (
                <span className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Ad-Free
                </span>
              ) : (
                <span className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Free &amp; Fast
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-green-900 mb-4 leading-tight">
              Download YouTube Videos
              <span className="block text-green-500">Instantly & Free</span>
            </h2>
            <p className="text-green-700 text-lg max-w-xl mx-auto">
              Download a single video, or grab an entire channel as a{" "}
              <span className="font-semibold text-green-600">.zip</span> file.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="inline-flex w-full sm:w-auto mx-auto bg-white border border-green-200 rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => {
                  setMode("video");
                  setError("");
                  setChannelData(null);
                }}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  mode === "video"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow"
                    : "text-green-700 hover:bg-green-50"
                }`}
              >
                🎬 Single Video
              </button>
              <button
                onClick={() => {
                  setMode("channel");
                  setError("");
                  setResult(null);
                }}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  mode === "channel"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow"
                    : "text-green-700 hover:bg-green-50"
                }`}
              >
                📦 Whole Channel (.zip)
              </button>
            </div>
          </div>

          {/* Input Section */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-green-100/50 border border-green-100 p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <YouTubeIcon />
                <input
                  type="text"
                  placeholder={
                    mode === "video"
                      ? "Paste YouTube video URL here..."
                      : "Paste YouTube channel URL (e.g. youtube.com/@name)..."
                  }
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full py-4 text-base outline-none text-gray-800 placeholder:text-gray-400 bg-transparent"
                  disabled={loading || channelLoading}
                />
              </div>
              <button
                onClick={mode === "video" ? handleDownload : handleLoadChannel}
                disabled={loading || channelLoading}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-green-200 hover:shadow-green-300 cursor-pointer"
              >
                {loading || channelLoading ? (
                  <>
                    <LoaderIcon />
                    {mode === "video" ? "Processing..." : "Loading..."}
                  </>
                ) : (
                  <>
                    <DownloadIcon />
                    {mode === "video" ? "Download" : "Load Videos"}
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-slide-up">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Supported formats hint */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-green-600">
              {mode === "video" ? (
                <>
                  <span className="bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">youtube.com/watch?v=...</span>
                  <span className="bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">youtu.be/...</span>
                  <span className="bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">youtube.com/shorts/...</span>
                </>
              ) : (
                <>
                  <span className="bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">youtube.com/@name</span>
                  <span className="bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">youtube.com/@name/shorts</span>
                  <span className="bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">youtube.com/channel/ID</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Channel loading */}
        {channelLoading && (
          <section className="px-4 pb-12">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-green-100 shadow-lg p-8 text-center animate-pulse-glow">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                  <svg className="animate-spin w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p className="text-green-800 font-semibold text-lg">Loading channel videos...</p>
                <p className="text-green-600 text-sm mt-1">Fetching the video list. Please wait.</p>
              </div>
            </div>
          </section>
        )}

        {/* Channel results */}
        {channelData && !channelLoading && (
          <section className="px-4 pb-16">
            <div className="max-w-3xl mx-auto animate-slide-up">
              {/* Channel header + zip controls */}
              <div className="bg-white rounded-2xl border border-green-100 shadow-xl shadow-green-100/30 p-6 mb-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                    {channelData.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={channelData.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      channelData.channel.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-green-900 truncate">{channelData.channel}</h3>
                    <p className="text-green-600 text-sm">{channelData.count} videos found</p>
                  </div>
                </div>

                {/* ZIP options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <label className="text-sm">
                    <span className="block text-green-700 font-medium mb-1">Number of videos</span>
                    <select
                      value={zipCount}
                      onChange={(e) => setZipCount(parseInt(e.target.value))}
                      className="w-full border border-green-200 rounded-xl px-3 py-2.5 text-gray-800 bg-green-50 outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
                    >
                      {[3, 5, 8, 10, 15, 20, 30].map((n) => (
                        <option key={n} value={n}>
                          First {n} videos
                        </option>
                      ))}
                      <option value={0}>
                        ⭐ All videos{channelData ? ` (${channelData.count})` : ""}
                      </option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="block text-green-700 font-medium mb-1">Quality</span>
                    <select
                      value={zipQuality}
                      onChange={(e) => setZipQuality(parseInt(e.target.value))}
                      className="w-full border border-green-200 rounded-xl px-3 py-2.5 text-gray-800 bg-green-50 outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
                    >
                      {[360, 480, 720, 1080].map((q) => (
                        <option key={q} value={q}>
                          {q}p
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={zipPreparing}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 cursor-pointer"
                >
                  {zipPreparing ? (
                    <>
                      <LoaderIcon />
                      Preparing .zip... (this may take a few minutes)
                    </>
                  ) : (
                    <>
                      📦 Download{" "}
                      {zipCount === 0
                        ? `ALL ${channelData ? channelData.count : ""} videos`
                        : `${zipCount} videos`}{" "}
                      as .zip
                    </>
                  )}
                </button>
                {zipPreparing && (
                  <p className="text-green-600 text-xs text-center mt-3">
                    {zipCount === 0
                      ? "Downloading ALL videos — this can take several minutes. Keep this tab open."
                      : "Your download will start automatically once ready. Keep this tab open."}
                  </p>
                )}
              </div>

              {/* Video grid preview */}
              <div className="bg-white rounded-2xl border border-green-100 shadow-xl shadow-green-100/30 p-6">
                <h4 className="text-lg font-bold text-green-800 mb-4">Channel Videos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {channelData.videos.map((v, i) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 p-2 bg-green-50 border border-green-100 rounded-xl"
                    >
                      <div className="relative w-24 shrink-0 aspect-video rounded-lg overflow-hidden bg-green-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 bg-green-600 text-white text-[10px] font-bold px-1.5 rounded">
                          {i + 1}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-2 flex-1">{v.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <section className="px-4 pb-12">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-green-100 shadow-lg p-8 text-center animate-pulse-glow">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                  <svg className="animate-spin w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <p className="text-green-800 font-semibold text-lg">Fetching download options...</p>
                <p className="text-green-600 text-sm mt-1">Extracting video &amp; audio with no size limits. Please wait.</p>
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {result && (
          <section className="px-4 pb-16">
            <div className="max-w-3xl mx-auto animate-slide-up">
              {/* Video Player */}
              {result.videoUrl && showPlayer && (
                <div className="bg-white rounded-2xl border border-green-100 shadow-xl shadow-green-100/30 overflow-hidden mb-6">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-green-100 bg-green-50">
                    <span className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Now Playing
                    </span>
                    <button
                      onClick={() => setShowPlayer(false)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1 cursor-pointer"
                    >
                      Hide Player
                    </button>
                  </div>
                  <div className="aspect-video bg-black">
                    <video
                      key={result.videoUrl}
                      src={result.videoUrl}
                      poster={result.thumbnail || undefined}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}

              {/* Video Info Card */}
              <div className="bg-white rounded-2xl border border-green-100 shadow-xl shadow-green-100/30 overflow-hidden mb-6">
                {/* Thumbnail (hidden while player is shown) */}
                {result.thumbnail && !showPlayer && (
                  <div
                    className={`relative aspect-video bg-green-950 ${result.videoUrl ? "cursor-pointer group" : ""}`}
                    onClick={() => {
                      if (result.videoUrl) setShowPlayer(true);
                    }}
                  >
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div className="w-16 h-16 bg-white/90 group-hover:bg-white group-hover:scale-110 rounded-full flex items-center justify-center shadow-lg transition-all">
                        <PlayIcon />
                      </div>
                    </div>
                    {result.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-mono px-2 py-1 rounded">
                        {formatDuration(result.duration)}
                      </span>
                    )}
                  </div>
                )}

                {/* Video Details */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 leading-snug">
                    {result.title}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      {result.channel}
                    </span>
                    {result.views !== null && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        {formatViews(result.views)} views
                      </span>
                    )}
                    {result.likes !== null && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        {formatViews(result.likes)} likes
                      </span>
                    )}
                    {result.resolution && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M2 9h20" />
                        </svg>
                        {result.resolution}{result.fps ? ` @ ${result.fps}fps` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Download Links */}
              {result.downloadLinks.length > 0 ? (
                <div className="bg-white rounded-2xl border border-green-100 shadow-xl shadow-green-100/30 p-6">
                  <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                    <DownloadIcon />
                    Download Options
                  </h4>
                  <div className="space-y-3">
                    {result.downloadLinks.map((link, index) => {
                      const isDownloading = dlIndex === index;
                      const isDisabled = dlIndex !== null && !isDownloading;
                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={isDisabled}
                          onClick={() =>
                            handleFileDownload(link, index, result.title)
                          }
                          className={`relative w-full overflow-hidden flex items-center justify-between p-4 border rounded-xl transition-all duration-200 group text-left ${
                            isDownloading
                              ? "bg-green-100 border-green-300"
                              : "bg-green-50 hover:bg-green-100 border-green-200"
                          } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {/* Progress fill behind content */}
                          {isDownloading && (
                            <span
                              className="absolute inset-y-0 left-0 bg-green-200/70 transition-all duration-150"
                              style={{ width: `${dlPercent}%` }}
                            />
                          )}
                          <div className="relative flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {(link.format || "MP4").toUpperCase().slice(0, 4)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {link.quality} Quality
                              </p>
                              <p className="text-xs text-gray-500">
                                {link.format.toUpperCase()}{" "}
                                {link.size !== "N/A" ? `• ${link.size}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="relative flex items-center gap-2 text-green-600 font-semibold text-sm group-hover:text-green-700">
                            {isDownloading ? (
                              <>
                                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>
                                  {dlPercent > 0
                                    ? `${dlPercent}%`
                                    : `${(dlReceived / 1048576).toFixed(1)} MB`}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">Download</span>
                                <svg className="w-5 h-5 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-yellow-200 shadow-lg p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-full mb-3">
                    <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-yellow-800 font-semibold">No direct download links found</p>
                  <p className="text-yellow-600 text-sm mt-1">
                    The video might be restricted or the server returned metadata only.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Features Section */}
        {!result && !loading && !channelData && !channelLoading && (
          <section className="px-4 pb-16">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    icon: (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    ),
                    title: "Lightning Fast",
                    desc: "Get download links in seconds with our cloud-powered processing.",
                  },
                  {
                    icon: (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    ),
                    title: "Safe & Secure",
                    desc: "Reliable cloud processing with clean, direct download links.",
                  },
                  {
                    icon: (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    ),
                    title: "Multiple Formats",
                    desc: "Choose from various quality options and formats.",
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-green-100 p-6 text-center hover:shadow-lg hover:shadow-green-100/50 transition-all duration-300"
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 text-green-600 rounded-xl mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="font-bold text-green-900 text-lg mb-2">{feature.title}</h3>
                    <p className="text-green-700 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-green-100 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-green-600 text-sm">
            VidGrab &mdash; Free YouTube Video Downloader
          </p>
          <p className="text-green-700 text-sm mt-1 font-semibold">
            Developer: <span className="text-green-600">Munguyiko Kelly</span>
            <span className="mx-2 text-green-300">•</span>
            Ideas: <span className="text-green-600">Steven</span>
          </p>
          <a
            href="/about"
            className="inline-block mt-2 text-green-500 text-xs font-medium hover:underline"
          >
            About Us →
          </a>
        </div>
      </footer>
    </div>
  );
}
