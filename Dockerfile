# VidGrab — full-stack Dockerfile
# Includes Node, Python, yt-dlp and ffmpeg so ALL features work
# (1080p downloads, MP3, channel .zip). Deploy on Railway, Render, Fly.io, VPS.

FROM node:20-bookworm-slim AS base

# Install Python, ffmpeg, and build essentials.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (latest).
RUN pip3 install --break-system-packages --no-cache-dir yt-dlp

WORKDIR /app

# Install Node dependencies.
COPY package*.json ./
RUN npm ci

# Copy source and build.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# System ffmpeg is on PATH; the app also falls back to imageio-ffmpeg if needed.
CMD ["npm", "run", "start"]
