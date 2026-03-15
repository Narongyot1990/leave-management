'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ParticleEmitterProps {
  count?: number;
  colors?: string[];
  speed?: number;
  maxSize?: number;
  connectLines?: boolean;
  lineDistance?: number;
  className?: string;
}

export default function ParticleEmitter({
  count = 40,
  colors,
  speed = 0.4,
  maxSize = 3,
  connectLines = true,
  lineDistance = 120,
  className = '',
}: ParticleEmitterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const isDark = useRef(false);
  const tick = useRef(0);

  const defaultColors = [
    'rgba(79,70,229,0.6)',
    'rgba(129,140,248,0.5)',
    'rgba(99,102,241,0.4)',
    'rgba(165,180,252,0.3)',
    'rgba(59,130,246,0.4)',
  ];

  const particleColors = colors || defaultColors;

  const createParticle = useCallback(
    (w: number, h: number): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size: Math.random() * maxSize + 1,
      alpha: Math.random() * 0.5 + 0.2,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
      twinkleSpeed: Math.random() * 0.06 + 0.02,
      twinkleOffset: Math.random() * Math.PI * 2,
    }),
    [speed, maxSize, particleColors]
  );

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

    isDark.current = document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => {
      isDark.current = document.documentElement.classList.contains('dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    particles.current = Array.from({ length: count }, () =>
      createParticle(canvas.width, canvas.height)
    );

    const animate = () => {
      tick.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Twinkle effect: sine wave modulates alpha
        const twinkle = Math.sin(tick.current * p.twinkleSpeed + p.twinkleOffset);
        const currentAlpha = p.alpha + twinkle * p.alpha * 0.5;

        // Soft glow for larger particles
        if (p.size > 1.5) {
          const glowR = p.size * 4;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
          grad.addColorStop(0, p.color.replace(/[\d.]+\)$/, (currentAlpha * 0.25).toFixed(3) + ')'));
          grad.addColorStop(1, p.color.replace(/[\d.]+\)$/, '0)'));
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, currentAlpha);
        ctx.fill();
      }

      // Connection lines
      if (connectLines) {
        const lineColor = isDark.current ? 'rgba(129,140,248,' : 'rgba(79,70,229,';
        for (let i = 0; i < particles.current.length; i++) {
          for (let j = i + 1; j < particles.current.length; j++) {
            const a = particles.current[i];
            const b = particles.current[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < lineDistance) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              const opacity = (1 - dist / lineDistance) * 0.15;
              ctx.strokeStyle = lineColor + opacity + ')';
              ctx.globalAlpha = 1;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, [count, createParticle, connectLines, lineDistance]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
