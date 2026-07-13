import {
  ensureTools,
  listChannel,
  YOUTUBE_CHANNEL_REGEX,
} from "@/lib/ytdlp";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { url, limit } = await request.json();

    if (!url) {
      return Response.json({ error: "Channel URL is required" }, { status: 400 });
    }

    if (!YOUTUBE_CHANNEL_REGEX.test(url)) {
      return Response.json(
        {
          error:
            "Please provide a valid YouTube channel URL (e.g., https://youtube.com/@name).",
        },
        { status: 400 }
      );
    }

    await ensureTools();

    const max = Math.min(Math.max(parseInt(String(limit)) || 20, 1), 50);

    let info;
    try {
      info = await listChannel(url, max);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/timeout/i.test(msg)) {
        return Response.json(
          { error: "The channel took too long to load. Please try again." },
          { status: 504 }
        );
      }
      console.error("channel list error:", msg);
      return Response.json(
        { error: "Could not load this channel. Please check the URL." },
        { status: 422 }
      );
    }

    if (info.entries.length === 0) {
      return Response.json(
        { error: "No videos found on this channel." },
        { status: 404 }
      );
    }

    return Response.json({
      channel: info.channel,
      channelUrl: info.channelUrl,
      thumbnail: info.thumbnail,
      count: info.entries.length,
      videos: info.entries.map((e) => ({
        id: e.id,
        title: e.title,
        url: e.url,
        thumbnail: `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
      })),
    });
  } catch (error) {
    console.error("channel error:", error);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
