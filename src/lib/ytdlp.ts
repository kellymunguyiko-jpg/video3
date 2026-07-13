import { spawn } from "node:child_process";

// Shared helpers for yt-dlp + bundled ffmpeg across API routes.

let ready: Promise<void> | null = null;

/** Ensure yt-dlp and a bundled ffmpeg are installed (once). */
export function ensureTools(): Promise<void> {
  if (!ready) {
    ready = new Promise<void>((resolve) => {
      const install = spawn("pip3", [
        "install",
        "--break-system-packages",
        "--quiet",
        "yt-dlp",
        "imageio-ffmpeg",
      ]);
      install.on("close", () => resolve());
      install.on("error", () => resolve());
    });
  }
  return ready;
}

// Check whether a system `ffmpeg` is on PATH (e.g. installed in Docker).
function systemFfmpeg(): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"]);
    proc.stdout.on("data", () => {});
    proc.stderr.on("data", () => {});
    proc.on("close", (code) => resolve(code === 0 ? "ffmpeg" : null));
    proc.on("error", () => resolve(null));
  });
}

// Resolve a bundled ffmpeg path (imageio-ffmpeg), used in sandboxes.
function bundledFfmpeg(): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn("python3", [
      "-c",
      "import imageio_ffmpeg,sys;sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())",
    ]);
    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("close", (code) =>
      resolve(code === 0 && out.trim() ? out.trim() : null)
    );
    proc.on("error", () => resolve(null));
  });
}

/**
 * Resolve an ffmpeg binary. Prefers system ffmpeg (Docker/VPS), then the
 * pip-bundled imageio-ffmpeg (sandbox). Returns null if neither is present.
 */
export async function getFfmpegPath(): Promise<string | null> {
  const sys = await systemFfmpeg();
  if (sys) return sys;
  return bundledFfmpeg();
}

// Using the Android player client avoids YouTube's "Sign in to confirm you're
// not a bot" gate that blocks server-side/datacenter IPs, and works reliably
// for repeated requests (needed for bulk channel .zip downloads).
export const YT_CLIENT_ARGS = [
  "--extractor-args",
  "youtube:player_client=android",
];

export const YOUTUBE_VIDEO_REGEX =
  /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/|music\.youtube\.com\/watch\?v=)[\w-]+/;

export const YOUTUBE_CHANNEL_REGEX =
  /^(https?:\/\/)?(www\.)?(m\.)?youtube\.com\/(@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)/;

export interface FlatEntry {
  id: string;
  title: string;
  url: string;
}

export interface ChannelInfo {
  channel: string;
  channelUrl: string;
  thumbnail: string | null;
  entries: FlatEntry[];
}

/** List videos of a channel/playlist (flat, fast). */
export function listChannel(
  url: string,
  limit = 30
): Promise<ChannelInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      "-m",
      "yt_dlp",
      "--flat-playlist",
      "--no-warnings",
      ...YT_CLIENT_ARGS,
      "-J",
      "--playlist-end",
      String(limit),
      url,
    ];
    const proc = spawn("python3", args);
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("timeout"));
    }, 90000);

    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || !out.trim()) {
        reject(new Error(err || "yt-dlp failed"));
        return;
      }
      try {
        const data = JSON.parse(out.trim());
        const rawEntries: unknown[] = Array.isArray(data.entries)
          ? data.entries
          : [];
        const entries: FlatEntry[] = [];
        for (const e of rawEntries) {
          const item = e as {
            id?: string;
            title?: string;
            url?: string;
          };
          if (!item.id) continue;
          entries.push({
            id: item.id,
            title: item.title || "Untitled",
            url: `https://www.youtube.com/watch?v=${item.id}`,
          });
        }
        resolve({
          channel: data.title || data.channel || data.uploader || "Channel",
          channelUrl: data.channel_url || data.uploader_url || url,
          thumbnail:
            (Array.isArray(data.thumbnails) && data.thumbnails.length
              ? data.thumbnails[data.thumbnails.length - 1].url
              : null) || null,
          entries,
        });
      } catch {
        reject(new Error("Could not parse channel data"));
      }
    });
  });
}
