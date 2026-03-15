'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  life: number;
}

interface ParticleEmitterProps {
  /** Number of particles alive at any time */
  count?: number;
  /** Array of CSS color strings for particles */
  colors?: string[];
  /** Speed multiplier */
  speed?: number;
  /** Max particle radius in px */
  maxSize?: number;
  /** Whether to draw connection lines between nearby particles */
  connectLines?: boolean;
  /** Connection line distance threshold */
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
  const animationRef = useRef<number>(0);
  const isDark = useRef(false);

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
      decay: 0,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
      life: 1,
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

    // Check dark mode
    isDark.current = document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => {
      isDark.current = document.documentElement.classList.contains('dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Init particles
    particles.current = Array.from({ length: count }, () =>
      createParticle(canvas.width, canvas.height)
    );

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw particles
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      // Draw connection lines
      if (connectLines) {
        const lineColor = isDark.current
          ? 'rgba(129,140,248,'
          : 'rgba(79,70,229,';
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
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
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
