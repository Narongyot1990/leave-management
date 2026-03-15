'use client';

import { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  driftSpeed: number;
  driftOffset: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export default function SnowEmitter({ count = 120 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flakesRef = useRef<Snowflake[]>([]);
  const animRef = useRef<number>(0);
  const tick = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (): Snowflake => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      radius: Math.random() * 4 + 1,
      speed: Math.random() * 1.2 + 0.4,
      drift: 0,
      driftSpeed: Math.random() * 0.015 + 0.005,
      driftOffset: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.55 + 0.3,
      twinkleSpeed: Math.random() * 0.04 + 0.01,
      twinkleOffset: Math.random() * Math.PI * 2,
    });

    flakesRef.current = Array.from({ length: count }, () => {
      const f = spawn();
      f.y = Math.random() * canvas.height; // scatter on init
      return f;
    });

    const animate = () => {
      tick.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const f of flakesRef.current) {
        f.y += f.speed;
        f.drift = Math.sin(tick.current * f.driftSpeed + f.driftOffset) * 0.8;
        f.x += f.drift;

        // Reset when off bottom
        if (f.y > canvas.height + 10) {
          f.y = -f.radius * 2;
          f.x = Math.random() * canvas.width;
        }
        // Wrap horizontal
        if (f.x < -10) f.x = canvas.width + 10;
        if (f.x > canvas.width + 10) f.x = -10;

        const twinkle = Math.sin(tick.current * f.twinkleSpeed + f.twinkleOffset);
        const alpha = Math.max(0.05, f.alpha + twinkle * 0.15);

        // Glow for larger flakes
        if (f.radius > 2.5) {
          const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 3);
          grad.addColorStop(0, `rgba(200,230,255,${(alpha * 0.4).toFixed(3)})`);
          grad.addColorStop(1, 'rgba(200,230,255,0)');
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,240,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
