/**
 * Confetti particle system for the win celebration.
 * Particles are module-level — reset each time initCelebrationParticles is called.
 * drawWinCelebration is called every RAF frame while animState.winCelebration is true.
 */

const PARTICLE_COUNT = 100;
const CELEBRATION_DURATION = 3000; // ms

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
}

const CONFETTI_COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
];

let particles: Particle[] = [];
let celebrationStart = 0;

// ─── Initialise ───────────────────────────────────────────────────────────────

/**
 * Create a fresh set of confetti particles across the canvas width.
 * Must be called before the first drawWinCelebration call for a new celebration.
 */
export function initCelebrationParticles(width: number, _height: number): void {
  celebrationStart = performance.now();
  particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? '#f59e0b';

    particles.push({
      x: Math.random() * width,
      y: -Math.random() * 80 - 10, // start above the canvas
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color,
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      alpha: 1,
    });
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────────

/**
 * Update and draw all confetti particles.
 * Fades out over CELEBRATION_DURATION ms.
 */
export function drawWinCelebration(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
): void {
  if (particles.length === 0) {
    return;
  }

  const elapsed = now - celebrationStart;
  const overallAlpha = Math.max(0, 1 - elapsed / CELEBRATION_DURATION);

  if (overallAlpha <= 0) {
    particles = [];
    return;
  }

  const dt = 1 / 60; // ~60fps delta for physics step

  for (const p of particles) {
    // Physics update
    p.vy += 9.8 * dt * 0.5; // gentle gravity
    p.vx += (Math.random() - 0.5) * 0.1; // subtle drift
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotationSpeed;
    p.alpha = overallAlpha;

    // Wrap horizontally
    if (p.x < -p.size) {
      p.x = width + p.size;
    } else if (p.x > width + p.size) {
      p.x = -p.size;
    }

    // Skip once below canvas
    if (p.y > height + p.size) {
      continue;
    }

    // Draw confetti rectangle
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
}
