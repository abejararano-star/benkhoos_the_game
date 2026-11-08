import { ALTAR_X, TRAIL_TORCHES, torchIsLit } from './exploration.js?v=dd4c4df65f03';

function drawFlame(g, x, y, flicker, length) {
  g.fillStyle = '#583824'; g.fillRect(x - 1, y + 2, 3, length);
  g.fillStyle = '#c99350'; g.fillRect(x, y + 4, 1, length - 4);
  g.fillStyle = '#dd692f'; g.fillRect(x - 2, y - 3, 5, 7);
  g.fillStyle = '#f9b858'; g.fillRect(x - 1, y - 5 - Math.round(flicker * .5), 3, 7);
  g.fillStyle = '#ffe3a0'; g.fillRect(x, y - 2, 2, 4);
}

export function createLighting() {
  const mask = document.createElement('canvas');
  const shade = mask.getContext('2d');

  return function lightScene(g, state, toScreen, playerX, ground, width, time, reduceMotion) {
    const night = state.phase !== 'DAY_EXPLORE';
    const lit = torchIsLit(state);
    const flicker = reduceMotion ? 0 : Math.sin(time * 6) * 2 + Math.sin(time * 11) * .9;
    const torchX = playerX + state.benkos.facing * (state.benkos.mounted ? -11 : -9);
    const torchY = ground - (state.benkos.mounted ? 46 : 32);
    const lights = [];
    const posts = TRAIL_TORCHES.map(toScreen).filter(x => x > -60 && x < width + 60);
    if (!night && !lit && !posts.length) return;
    for (const x of posts) lights.push({ x, y: ground - 32, radius: 62 + flicker, warmth: night ? .21 : .08 });
    if (lit) lights.push({ x: torchX, y: torchY, radius: 107 + flicker, warmth: .20 });
    if (night) {
      lights.push({ x: toScreen(70), y: ground - 9, radius: 62, warmth: .15 });
      if (state.exploration.altarFound) lights.push({ x: toScreen(ALTAR_X), y: ground - 18, radius: 58, warmth: .12 });
      for (const wall of state.walls) if (wall.level && wall.hp > 0) lights.push({ x: toScreen(wall.x), y: ground - 28, radius: 47, warmth: .12 });
    }
    for (const enemy of state.enemies) {
      if (enemy.muzzleFlash > 0 && !reduceMotion) lights.push({ x: toScreen(enemy.x) + enemy.facing * 16, y: ground - 22, radius: 46, warmth: .32 });
    }
    const visible = lights.filter(light => light.x + light.radius >= 0 && light.x - light.radius <= width);

    if (night) {
      const height = ground + 22;
      if (mask.width !== width || mask.height !== height) { mask.width = width; mask.height = height; }
      shade.globalCompositeOperation = 'source-over';
      shade.clearRect(0, 0, width, height);
      shade.fillStyle = state.phase === 'RED_NIGHT' ? '#2b0e246b' : '#091c34a2';
      shade.fillRect(0, 0, width, height);
      shade.globalCompositeOperation = 'destination-out';
      for (const { x, y, radius } of visible) {
        const falloff = shade.createRadialGradient(x, y, 0, x, y, radius);
        falloff.addColorStop(0, '#ffffffff');
        falloff.addColorStop(.42, '#ffffffcc');
        falloff.addColorStop(1, '#ffffff00');
        shade.fillStyle = falloff;
        shade.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      g.drawImage(mask, 0, 0);
    }

    for (const { x, y, radius, warmth } of visible) {
      const glow = g.createRadialGradient(x, y, 1, x, y, radius);
      glow.addColorStop(0, `rgba(255, 169, 72, ${warmth})`);
      glow.addColorStop(1, '#ff974800');
      g.fillStyle = glow;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    for (const x of posts) drawFlame(g, x, ground - 32, flicker, 30);
    if (lit) drawFlame(g, Math.round(torchX), Math.round(torchY), flicker, 13);
  };
}
