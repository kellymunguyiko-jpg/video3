import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { Archiver, CoreOptions, TransformOptions, ZipOptions } from "archiver";
const require = createRequire(import.meta.url);
// This archiver build only exposes classes; use ZipArchive directly.
const { ZipArchive } = require("archiver") as {
  ZipArchive: new (options?: CoreOptions & TransformOptions & ZipOptions) => Archiver;
};
import {
  ensureTools,
  getFfmpegPath,
  listChannel,
  YOUTUBE_CHANNEL_REGEX,
} from "@/lib/ytdlp";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Attempt one download with a specific player client.
function tryDownload(
  url: string,
  workDir: string,
  index: number,
  height: number,
  ffmpeg: string | null,
  client: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const outTemplate = join(
      workDir,
      `${String(index).padStart(2, "0")}-%(title).60s.%(ext)s`
    );
    const args = [
      "-m",
      "yt_dlp",
      "--no-warnings",
      "--no-playlist",
      "--no-check-certificate",
      "--restrict-filenames",
      "--extractor-args",
      `youtube:player_client=${client}`,
      "-o",
      outTemplate,
    ];
    if (ffmpeg) {
      args.push("--ffmpeg-location", ffmpeg);
      args.push(
        "-f",
        `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
        "--merge-output-format",
        "mp4"
      );
    } else {
      args.push("-f", "best[ext=mp4][acodec!=none][vcodec!=none]/best");
    }
    args.push(url);

    const proc = spawn("python3", args);
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve(null);
    }, 180000);
    proc.stdout.on("data", () => {});
    proc.stderr.on("data", () => {});
    proc.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    proc.on("close", async (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      try {
        const files = await readdir(workDir);
        const prefix = `${String(index).padStart(2, "0")}-`;
        const match = files.find((f) => f.startsWith(prefix));
        resolve(match ? join(workDir, match) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

// Download one video, trying clients in order for best quality + resilience.
async function downloadOne(
  url: string,
  workDir: string,
  index: number,
  height: number,
  ffmpeg: string | null
): Promise<string | null> {
  // "android" first: it's the fastest & most reliable for bulk (single
  // progressive file, no bot checks). Fall back only if it fails.
  const clients = ["android", "tv", "default"];
  for (const client of clients) {
    const path = await tryDownload(url, workDir, index, height, ffmpeg, client);
    if (path) return path;
  }
  return null;
}

// Run tasks with limited concurrency (parallel batches) for speed.
async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return next();
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    next()
  );
  await Promise.all(runners);
  return results;
}

// A hard safety cap so a huge channel can't run forever. "All" resolves to this.
const MAX_VIDEOS = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const rawCount = parseInt(searchParams.get("count") || "5", 10);
  // count=0 (or "all") means download every video, up to MAX_VIDEOS.
  const count =
    rawCount <= 0 ? MAX_VIDEOS : Math.min(Math.max(rawCount, 1), MAX_VIDEOS);
  const height = parseInt(searchParams.get("height") || "720", 10);

  if (!url) return new Response("Missing url", { status: 400 });
  if (!YOUTUBE_CHANNEL_REGEX.test(url)) {
    return new Response("Invalid channel URL", { status: 400 });
  }

  await ensureTools();
  const ffmpeg = await getFfmpegPath();

  // Resolve channel + video list.
  let channelName = "channel";
  let entries: { id: string; title: string; url: string }[] = [];
  try {
    const info = await listChannel(url, count);
    channelName =
      info.channel.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 50) ||
      "channel";
    entries = info.entries.slice(0, count);
  } catch {
    return new Response("Could not load channel.", { status: 422 });
  }

  if (entries.length === 0) {
    return new Response("No videos found on this channel.", { status: 404 });
  }

  const workDir = await mkdtemp(join(tmpdir(), "vidgrab-zip-"));

  // Download videos IN PARALLEL (batches of 4) for much faster zips.
  const CONCURRENCY = 4;
  const paths = await runPool(entries, CONCURRENCY, (entry, i) =>
    downloadOne(entry.url, workDir, i + 1, height, ffmpeg)
  );
  const files: string[] = paths.filter((p): p is string => Boolean(p));

  if (files.length === 0) {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    return new Response("Failed to download any videos. Please try again.", {
      status: 502,
    });
  }

  // Build a ZIP archive and stream it to the client.
  const archive = new ZipArchive({ zlib: { level: 0 } }); // store (video already compressed)

  const webStream = new ReadableStream({
    start(controller) {
      archive.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      archive.on("end", () => {
        controller.close();
        rm(workDir, { recursive: true, force: true }).catch(() => {});
      });
      archive.on("error", () => {
        try {
          controller.error(new Error("archive failed"));
        } catch {
          /* noop */
        }
        rm(workDir, { recursive: true, force: true }).catch(() => {});
      });

      for (const f of files) {
        const name = f.split("/").pop() || "video.mp4";
        archive.append(createReadStream(f), { name });
      }
      archive.finalize();
    },
    cancel() {
      archive.abort();
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    },
  });

  const safeName = channelName.replace(/\s+/g, "_") || "channel";

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}_videos.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
