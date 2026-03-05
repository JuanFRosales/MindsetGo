import { useEffect, useMemo, useRef } from "react";

type Blob = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function hsla(h: number, s: number, l: number, a: number) {
  return `hsla(${h} ${s}% ${l}% / ${a})`;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize huge pastel blobs
  const blobs = useMemo<Blob[]>(() => {
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    return [
      // lavender
      { x: rand(0.18, 0.82), y: rand(0.18, 0.82), r: rand(0.62, 0.88), vx: rand(-0.016, 0.016), vy: rand(-0.013, 0.013), hue: 260 },
      // pink
      { x: rand(0.18, 0.82), y: rand(0.18, 0.82), r: rand(0.58, 0.84), vx: rand(-0.013, 0.013), vy: rand(-0.016, 0.016), hue: 330 },
      // mint
      { x: rand(0.18, 0.82), y: rand(0.18, 0.82), r: rand(0.54, 0.80), vx: rand(-0.011, 0.011), vy: rand(-0.011, 0.011), hue: 160 },
    ];
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    // Resize canvas to match screen size
    const resize = () => {
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const t0 = performance.now();

    // Soft vignette for depth
    const drawVignette = (w: number, h: number) => {
      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.35,
        Math.min(w, h) * 0.15,
        w * 0.5,
        h * 0.55,
        Math.max(w, h) * 0.75
      );

      g.addColorStop(0, "rgba(255,255,255,0.18)");
      g.addColorStop(1, "rgba(240,240,255,0.35)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };

    const step = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // background gradient
      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "rgb(21, 41, 32)");
      base.addColorStop(1, "rgb(33, 18, 18)");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      const time = (performance.now() - t0) / 1000;

      for (const b of blobs) {
        // Move blobs slowly unless reduced motion is preferred
        if (!prefersReduced) {
          b.x += b.vx * 0.35;
          b.y += b.vy * 0.35;

          if (b.x < 0.08 || b.x > 0.92) b.vx *= -1;
          if (b.y < 0.08 || b.y > 0.92) b.vy *= -1;

          b.x = clamp(b.x, 0.05, 0.95);
          b.y = clamp(b.y, 0.05, 0.95);
        }

        const cx = b.x * w;
        const cy = b.y * h;

        // Extra large radius multiplier for a massive look
        const rr = b.r * Math.min(w, h) * 1.25;

        // Slight hue drift for subtle color variation
        const drift = (Math.sin(time * 0.55 + b.x * 7 + b.y * 5) + 1) * 0.5;
        const hue = (b.hue + drift * 12) % 360;

        const g = ctx.createRadialGradient(cx, cy, rr * 0.06, cx, cy, rr);

        const a0 = 0.30;

        // Pastel blob gradient
        g.addColorStop(0, hsla(hue, 65, 78, a0));
        g.addColorStop(0.55, hsla(hue, 60, 82, a0 * 0.22));
        g.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Light atmospheric fog layer
      const fog = ctx.createLinearGradient(0, 0, w, h);
      fog.addColorStop(0, "rgba(255,255,255,0.18)");
      fog.addColorStop(1, "rgba(255,255,255,0.12)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, w, h);

      drawVignette(w, h);

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [blobs]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        filter: "blur(28px) saturate(1.08)",
        transform: "scale(1.06)",
        opacity: 0.96,
      }}
    />
  );
}