import { useRef, useState } from "react";

/**
 * Hero video backdrop, premium cream + black theme.
 *   1. <video> playing /hero.mp4 (drop your own MP4 in frontend/public/hero.mp4).
 *   2. Two soft drifting glow blobs (pure CSS animation).
 *   3. Light grain.
 *   4. Bottom vignette fades to the page cream.
 */
export default function VideoBackdrop() {
  const [videoOk, setVideoOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0908]">
      {/* 1. The video — front and center */}
      {videoOk && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setVideoOk(false)}
          className="absolute inset-0 h-full w-full object-cover opacity-95"
        >
          <source src="/hero.mp4" type="video/mp4" />
          <source src="/hero.webm" type="video/webm" />
        </video>
      )}

      {/* 2. Soft drifting highlight — gives subtle cinematic warmth */}
      <div className="anim-drift-a absolute -inset-[10%]">
        <div
          className="absolute left-[15%] top-[20%] h-[55vw] w-[55vw] rounded-full opacity-[0.15] blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(245, 239, 226, 0.55) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="anim-drift-b absolute -inset-[14%]">
        <div
          className="absolute right-[12%] bottom-[8%] h-[55vw] w-[55vw] rounded-full opacity-[0.10] blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(245, 239, 226, 0.50) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* 3. Light film grain */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* 4. Bottom vignette — fades cleanly to the cream content below */}
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a0908]/40 to-transparent" />
    </div>
  );
}
