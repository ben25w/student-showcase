/*
 * DESIGN: Dreamy Watercolor / Soft Studio
 * - Watercolor splash background image
 * - 20 circular bubbles with radial-gradient pastel fills
 * - Quicksand font for names, staggered float-in animation
 * - Bubbles breathe on hover, scale-down on click
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { STUDENT_NAMES, PASTEL_PALETTE, getShuffledPaletteIndices } from "@/lib/students";

const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392424189/H5iSaioCjgbnNDeZvbC7R5/hero-watercolor-bg-4XctfvaiA4BQoe42WqUp8Q.webp";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function Home() {
  const [, navigate] = useLocation();

  // Shuffle palette indices once per page load
  const paletteIndices = useMemo(() => getShuffledPaletteIndices(), []);

  // Track when bubbles should animate in
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const [pressed, setPressed] = useState<number | null>(null);

  function handleBubbleClick(name: string, idx: number) {
    setPressed(idx);
    setTimeout(() => {
      navigate(`/gallery/${slugify(name)}`);
    }, 180);
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#ffffff" }}
    >
      {/* Watercolor background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.55,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="pt-10 pb-4 text-center px-4">
          <h1
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              color: "#3d3558",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Our Project Showcase
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
              color: "#6b6585",
              marginTop: "0.5rem",
            }}
          >
            Tap a name to see their creations
          </p>
        </header>

        {/* Bubble grid */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "1.5rem",
              maxWidth: "900px",
              width: "100%",
            }}
          >
            {STUDENT_NAMES.map((name, idx) => {
              const paletteIdx = paletteIndices[idx % paletteIndices.length];
              const palette = PASTEL_PALETTE[paletteIdx];
              const isPressed = pressed === idx;
              const delay = idx * 40;

              return (
                <button
                  key={name}
                  onClick={() => handleBubbleClick(name, idx)}
                  className="bubble-float-in"
                  style={{
                    animationDelay: visible ? `${delay}ms` : "9999ms",
                    animationPlayState: visible ? "running" : "paused",
                    aspectRatio: "1 / 1",
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 38% 38%, ${palette.light} 0%, ${palette.deep} 100%)`,
                    boxShadow: isPressed
                      ? `0 2px 8px ${palette.deep}55`
                      : `0 6px 24px ${palette.deep}55, 0 2px 8px ${palette.deep}33`,
                    border: `2.5px solid ${palette.deep}88`,
                    transform: isPressed ? "scale(0.93)" : "scale(1)",
                    transition: "transform 0.15s ease, box-shadow 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.75rem",
                    cursor: "pointer",
                    outline: "none",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!isPressed) {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        `0 10px 32px ${palette.deep}77, 0 4px 12px ${palette.deep}44`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPressed) {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        `0 6px 24px ${palette.deep}55, 0 2px 8px ${palette.deep}33`;
                    }
                  }}
                  aria-label={`View ${name}'s gallery`}
                >
                  {/* Full name — displayed as one unit, wraps naturally if needed */}
                  <span
                    style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontWeight: 700,
                      fontSize: "clamp(1.1rem, 3.5vw, 1.5rem)",
                      color: palette.text,
                      textAlign: "center",
                      lineHeight: 1.25,
                      wordBreak: "break-word",
                      hyphens: "auto",
                      padding: "0 0.25rem",
                    }}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center pb-6 px-4">
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              color: "#9b97b0",
            }}
          >
            Student Project Showcase &mdash; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
