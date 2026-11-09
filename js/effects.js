import { WATER_LINE_Y } from './config.js?v=290996c6041f';

const profiles = {
  blood: { colors: ['#711e26', '#a53539', '#c75c53'], count: 8, speed: 93, gravity: 225, life: .48, size: 2 },
  wood: { colors: ['#5a3926', '#9c693d', '#d4a66a'], count: 10, speed: 100, gravity: 210, life: .65, size: 3 },
  stone: { colors: ['#69685d', '#a09a80', '#d8ccad'], count: 11, speed: 108, gravity: 235, life: .75, size: 3 },
  dust: { colors: ['#6d5942', '#ac9470', '#c5ad83'], count: 7, speed: 45, gravity: -9, life: .95, size: 7 },
  spark: { colors: ['#e1813f', '#efbc69', '#fff0b5'], count: 7, speed: 120, gravity: 115, life: .31, size: 2 },
  water: { colors: ['#83beb8', '#a4d8ca', '#dae9d7'], count: 7, speed: 71, gravity: 195, life: .36, size: 2 }
};

export function emitEffect(state, kind, x, y, direction = 0, strength = 1) {
  const profile = profiles[kind];
  const count = Math.min(Math.ceil(profile.count * strength), Math.max(0, 400 - state.particles.length));
  for (let i = 0; i < count; i++) {
    const speed = profile.speed * (.38 + Math.random() * .72);
    const life = profile.life * (.72 + Math.random() * .58);
    state.particles.push({ kind, x: x + (Math.random() - .5) * 12 * strength, y: y + (Math.random() - .5) * 8,
      vx: (direction * .57 + (Math.random() - .5) * 1.35) * speed, vy: -(.22 + Math.random() * .75) * speed,
      gravity: profile.gravity, life, maxLife: life, color: profile.colors[i % profile.colors.length],
      size: 1 + Math.floor(Math.random() * profile.size) });
  }
}

export function advanceParticle(particle, dt) {
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vy += (particle.gravity ?? 180) * dt;
  particle.life -= dt;
  if (particle.kind && particle.kind !== 'dust' && particle.y >= WATER_LINE_Y) {
    particle.y = WATER_LINE_Y;
    particle.vy = 0;
    particle.vx *= Math.pow(.62, dt * 60);
  }
}

export function drawParticle(ctx, particle, x, y) {
  const age = 1 - particle.life / (particle.maxLife ?? .35);
  const dust = particle.kind === 'dust';
  const size = dust ? Math.ceil(particle.size * (1 + age * .8)) : particle.size;
  ctx.globalAlpha = dust ? Math.max(0, (1 - age) * .26) : Math.min(1, Math.max(0, particle.life * 6));
  ctx.fillStyle = particle.color;
  ctx.fillRect(x, y, size, particle.kind === 'spark' ? 1 : size);
  if (dust && size > 3) ctx.fillRect(x - 2, y + 2, size + 4, size - 3);
  ctx.globalAlpha = 1;
}
