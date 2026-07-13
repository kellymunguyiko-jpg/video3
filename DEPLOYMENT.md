# VidGrab — Deployment Guide

VidGrab is a **full-stack** app. Its download engine uses **yt-dlp (Python)** and
**ffmpeg** running as server processes, plus long-running downloads (up to a few
minutes) and temporary files.

## ⚠️ Netlify Limitation (Please Read)

**The download features do NOT work on Netlify.** Netlify only runs short
serverless functions (max **26 seconds**, no Python, no ffmpeg, no spawnable
binaries). It can serve the **frontend + PWA** shell, but any attempt to
download a video will fail.

| Feature | Netlify | Container/VPS Host |
| --- | --- | --- |
| Frontend + PWA install | ✅ | ✅ |
| Video metadata / quality list | ❌ | ✅ |
| 1080p / 720p downloads (ffmpeg) | ❌ | ✅ |
| MP3 audio | ❌ | ✅ |
| Channel `.zip` bulk download | ❌ | ✅ |

## ✅ Recommended Hosts (Everything Works)

Use any host that runs a **persistent Node server** and lets you install
**Python + ffmpeg**:

- **Railway** — easiest, supports Nixpacks/Docker
- **Render** — supports Docker web services
- **Fly.io** — Docker-based, global
- **A VPS** (DigitalOcean, Hetzner, etc.) with Docker

### Deploy with Docker (works on Railway, Render, Fly.io, any VPS)

A ready-to-use `Dockerfile` is included. It installs Node, Python, yt-dlp and
ffmpeg, builds the app, and runs it.

```bash
# Build & run locally to test
docker build -t vidgrab .
docker run -p 3000:3000 -e DATABASE_URL="postgresql://..." vidgrab
```

Then push to your host:

**Railway**
1. Create a new project → "Deploy from GitHub repo".
2. Railway auto-detects the Dockerfile.
3. Add env var `DATABASE_URL` (Railway can provision a Postgres plugin).
4. Deploy — done.

**Render**
1. New → Web Service → connect repo.
2. Runtime: **Docker**.
3. Add env var `DATABASE_URL`.
4. Create Web Service.

## Environment Variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Optional* | Postgres URL. *App works without DB for downloads. |

## PWA

The PWA (installable app, offline shell, icons) works on **any** host that
serves the site over HTTPS — including Netlify. Users get an "Install" prompt on
mobile and desktop.
