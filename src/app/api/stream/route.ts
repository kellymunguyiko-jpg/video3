import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureTools, getFfmpegPath } from "@/lib/ytdlp";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CLIENTS = ["default", "tv", "android"];

// Streams a YouTube video/audio through our own server using yt-dlp (+ ffmpeg).
// Two paths:
//   • Progressive / audio (no merge) → piped straight to the client (fast,
//     starts immediately, no waiting for the whole file).
//   • Merged hi-res video (720p/1080p) → built in a temp file (needs ffmpeg),
//     then streamed.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const fmt = searchParams.get("fmt") || "video";
  const height = parseInt(searchParams.get("height") || "0", 10);
  const titleParam = searchParams.get("title") || "video";

  if (!url) return new Response("Missing url", { status: 400 });

  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/|music\.youtube\.com\/watch\?v=)[\w-]+/;
  if (!youtubeRegex.test(url)) return new Response("Invalid URL", { status: 400 });

  const isAudio = fmt === "audio";
  await ensureTools();
  const ffmpeg = await getFfmpegPath();

  const safeTitle =
    titleParam.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 80) || "video";

  // Decide whether we can stream directly (no ffmpeg merge required).
  // Progressive MP4 (video+audio in one file) is available up to 360p; audio
  // can always be piped. Anything higher needs a video+audio merge.
  const canPipe = isAudio || height <= 360 || !ffmpeg;

  if (canPipe) {
    return pipeStream({ url, isAudio, height, safeTitle, ffmpeg });
  }
  return mergeStream({ url, height, safeTitle, ffmpeg });
}

// ---- Fast path: pipe yt-dlp stdout straight to the client ----
function pipeStream(opts: {
  url: string;
  isAudio: boolean;
  height: number;
  safeTitle: string;
  ffmpeg: string | null;
}): Response {
  const { url, isAudio, height, safeTitle, ffmpeg } = opts;
  const ext = isAudio ? "m4a" : "mp4";

  const formatSel = isAudio
    ? "bestaudio[ext=m4a]/bestaudio[acodec!=none][vcodec=none]/bestaudio"
    : `best[ext=mp4][height<=${height > 0 ? height : 360}][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]/best`;

  // Use the android client first here: it reliably serves a single progressive
  // file that can be piped without seeking.
  const clientOrder = ["android", "tv", "default"];

  let procRef: ReturnType<typeof spawn> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let started = false;

      const tryClient = (idx: number) => {
        if (idx >= clientOrder.length) {
          try {
            controller.error(new Error("all clients failed"));
          } catch {
            /* noop */
          }
          return;
        }
        const args = [
          "-m",
          "yt_dlp",
          "--no-warnings",
          "--no-playlist",
          "--no-check-certificate",
          "--extractor-args",
          `youtube:player_client=${clientOrder[idx]}`,
          "-f",
          formatSel,
          "-o",
          "-",
          url,
        ];
        if (ffmpeg) args.splice(args.length - 3, 0, "--ffmpeg-location", ffmpeg);

        const proc = spawn("python3", args);
        procRef = proc;
        let got = false;

        proc.stdout.on("data", (chunk: Buffer) => {
          got = true;
          started = true;
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            /* controller closed */
          }
        });
        proc.stderr.on("data", () => {});
        proc.on("error", () => {
          if (!started) tryClient(idx + 1);
        });
        proc.on("close", (code) => {
          if (started) {
            try {
              controller.close();
            } catch {
              /* noop */
            }
          } else if (code !== 0 || !got) {
            tryClient(idx + 1);
          }
        });
      };

      tryClient(0);
    },
    cancel() {
      procRef?.kill("SIGKILL");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": isAudio ? "audio/mp4" : "video/mp4",
      "Content-Disposition": `attachment; filename="${safeTitle}.${ext}"`,
      "Cache-Control": "no-store",
    },
  });
}

// ---- Quality path: merge video+audio in a temp file, then stream ----
async function mergeStream(opts: {
  url: string;
  height: number;
  safeTitle: string;
  ffmpeg: string | null;
}): Promise<Response> {
  const { url, height, safeTitle, ffmpeg } = opts;
  const workDir = await mkdtemp(join(tmpdir(), "vidgrab-"));
  const outTemplate = join(workDir, "out.%(ext)s");
  const h = height > 0 ? height : 1080;

  const runWithClient = (client: string): Promise<boolean> =>
    new Promise((resolve) => {
      const args = [
        "-m",
        "yt_dlp",
        "--no-warnings",
        "--no-playlist",
        "--no-check-certificate",
        "--extractor-args",
        `youtube:player_client=${client}`,
        "-o",
        outTemplate,
        "-f",
        `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`,
        "--merge-output-format",
        "mp4",
      ];
      if (ffmpeg) args.push("--ffmpeg-location", ffmpeg);
      args.push(url);

      const proc = spawn("python3", args);
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve(false);
      }, 280000);
      proc.stderr.on("data", () => {});
      proc.stdout.on("data", () => {});
      proc.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
    });

  let finished = false;
  for (const client of CLIENTS) {
    finished = await runWithClient(client);
    if (finished) break;
  }

  if (!finished) {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    return new Response("Failed to prepare download. Please try again.", {
      status: 502,
    });
  }

  let produced: string | null = null;
  try {
    const files = await readdir(workDir);
    const match =
      files.find((f) => f.endsWith(".mp4")) ||
      files.find((f) => f.startsWith("out."));
    if (match) produced = join(workDir, match);
  } catch {
    /* noop */
  }

  if (!produced) {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    return new Response("Download not found. Please try again.", { status: 502 });
  }

  let fileSize = 0;
  try {
    fileSize = (await stat(produced)).size;
  } catch {
    /* noop */
  }

  const nodeStream = createReadStream(produced);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: string | Buffer) => {
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buf));
      });
      nodeStream.on("end", () => {
        controller.close();
        rm(workDir, { recursive: true, force: true }).catch(() => {});
      });
      nodeStream.on("error", () => {
        try {
          controller.error(new Error("read failed"));
        } catch {
          /* noop */
        }
        rm(workDir, { recursive: true, force: true }).catch(() => {});
      });
    },
    cancel() {
      nodeStream.destroy();
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
    "Cache-Control": "no-store",
  };
  if (fileSize > 0) headers["Content-Length"] = String(fileSize);

  return new Response(webStream, { headers });
}
