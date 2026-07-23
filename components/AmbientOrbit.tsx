"use client";
import { useRef, useEffect, useCallback } from "react";

// Adapted from Domani's Orbit mark math (logarithmic spiral, 4 arms) —
// simplified to a steady ambient state for use as a homepage background.
// No boot sequence, no progress dependency, no audio, no gate: it just runs.

function spiralPt(u: number, tS: number, tE: number, a: number, b: number, off: number) {
  const theta = tS + u * (tE - tS);
  const r = a * Math.exp(b * theta);
  return { x: Math.cos(theta + off) * r, y: Math.sin(theta + off) * r };
}

function buildArm(N: number, scale: number, offset: number) {
  const a = scale * 0.082;
  const b = 0.295;
  const tS = 0.1;
  const tE = Math.PI * 1.54;
  const halfW = (u: number) => scale * (2.8 + u * 9.5) * 0.012;
  const pts = Array.from({ length: N + 1 }, (_, i) => spiralPt(i / N, tS, tE, a, b, offset));
  return { pts, halfW };
}

function pathLine(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

export function AmbientOrbit({ opacity = 0.5 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // eslint-disable-next-line react-hooks/immutability -- standard rAF self-reference loop; safe via closure
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (startRef.current === null) startRef.current = performance.now();

    const W = (canvas.width = canvas.clientWidth);
    const H = (canvas.height = canvas.clientHeight);
    const t = (performance.now() - startRef.current) / 1000;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W * 0.5, H * 0.42);

    const tx = (mouseRef.current.x / W - 0.5) * 0.08;
    const ty = (mouseRef.current.y / H - 0.5) * 0.08;
    ctx.transform(1, ty * 0.2, -tx * 0.2, 1, 0, 0);

    const scale = Math.min(W, H) * 0.34;
    ctx.rotate(t * 0.09);

    for (let arm = 0; arm < 4; arm++) {
      const off = (arm / 4) * Math.PI * 2;
      const { pts } = buildArm(90, scale, off);

      pathLine(ctx, pts);
      ctx.shadowBlur = 16;
      ctx.shadowColor = `rgba(184,240,255,${0.35 * opacity})`;
      ctx.strokeStyle = `rgba(184,240,255,${0.5 * opacity})`;
      ctx.lineWidth = scale * 0.02;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.shadowBlur = 0;

      pathLine(ctx, pts);
      ctx.strokeStyle = `rgba(255,255,255,${0.18 * opacity})`;
      ctx.lineWidth = scale * 0.006;
      ctx.stroke();
    }

    // Soft core glow
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 0.5);
    core.addColorStop(0, `rgba(184,240,255,${0.28 * opacity})`);
    core.addColorStop(1, "rgba(184,240,255,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, scale * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    // eslint-disable-next-line react-hooks/purity, react-hooks/immutability -- rAF loop calling itself; standard pattern
    rafRef.current = requestAnimationFrame(draw);
  }, [opacity]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}