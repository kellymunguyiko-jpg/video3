import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us - VidGrab",
  description:
    "Learn about VidGrab, the free YouTube video downloader. Developed by Munguyiko Kelly with ideas by Steven.",
};

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const TEAM = [
  {
    name: "Munguyiko Kelly",
    role: "Developer",
    emoji: "👨‍💻",
    desc: "Built and engineered the entire VidGrab platform — from the download engine to the user experience.",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    name: "Steven",
    role: "Ideas & Concept",
    emoji: "💡",
    desc: "The mind behind the ideas and vision that shaped what VidGrab is today.",
    gradient: "from-emerald-500 to-teal-600",
  },
];

const FEATURES = [
  { icon: "♾️", title: "No Limits", text: "Download videos of any size, in any quality up to 1080p Full HD." },
  { icon: "📦", title: "Bulk Channel Download", text: "Grab an entire channel's videos in a single .zip file." },
  { icon: "🎵", title: "Video & Audio", text: "Save full videos or extract audio-only (MP3) in one click." },
  { icon: "📱", title: "Works Everywhere", text: "Installable PWA — use it on phone, tablet, or desktop." },
  { icon: "⚡", title: "Fast & Free", text: "Powered by a reliable engine with no monthly limits." },
  { icon: "🔒", title: "Clean & Safe", text: "No malware, no pop-ups. Just clean, direct downloads." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 text-white">
              <YouTubeIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-800">VidGrab</h1>
              <p className="text-xs text-green-600">YouTube Downloader</p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-green-700 hover:text-green-900 bg-green-50 border border-green-200 px-4 py-2 rounded-full transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-14 sm:py-20 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block text-6xl mb-4">🎬</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-green-900 mb-4">
              About <span className="text-green-500">VidGrab</span>
            </h2>
            <p className="text-green-700 text-lg leading-relaxed">
              VidGrab is a fast, free, and unlimited YouTube video downloader.
              Save single videos in Full HD, extract audio, or download an entire
              channel as a <span className="font-semibold text-green-600">.zip</span> file —
              all in one clean, easy-to-use app.
            </p>
          </div>
        </section>

        {/* Team */}
        <section className="px-4 pb-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-green-900 text-center mb-8">
              Meet the Team
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {TEAM.map((m) => (
                <div
                  key={m.name}
                  className="bg-white rounded-3xl border border-green-100 shadow-xl shadow-green-100/40 p-8 text-center hover:-translate-y-1 transition-transform"
                >
                  <div
                    className={`mx-auto w-24 h-24 rounded-full bg-gradient-to-br ${m.gradient} flex items-center justify-center text-5xl shadow-lg mb-5`}
                  >
                    {m.emoji}
                  </div>
                  <h4 className="text-xl font-extrabold text-green-900">{m.name}</h4>
                  <span className="inline-block mt-1 mb-3 text-xs font-bold uppercase tracking-wider text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                    {m.role}
                  </span>
                  <p className="text-green-700 text-sm leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we offer */}
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-green-900 text-center mb-8">
              What VidGrab Offers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl border border-green-100 p-6 hover:shadow-lg hover:shadow-green-100/50 transition-all"
                >
                  <span className="text-3xl">{f.icon}</span>
                  <h4 className="font-bold text-green-900 text-lg mt-3 mb-1">
                    {f.title}
                  </h4>
                  <p className="text-green-700 text-sm">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-16">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 rounded-3xl p-8 sm:p-10 text-center shadow-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Ready to download?
            </h3>
            <p className="text-green-50 mb-6">
              Start grabbing your favorite YouTube videos now — it&apos;s free.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-transform"
            >
              🚀 Open VidGrab
            </Link>
          </div>
        </section>
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
        </div>
      </footer>
    </div>
  );
}
