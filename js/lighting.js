import { blend, color, NIGHT_START, smooth } from './daylight.js?v=48baf0700084';
import { ALTAR_X, TRAIL_TORCHES } from './exploration.js?v=48baf0700084';

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

  return function lightScene(g, state, toScreen, handFlame, ground, width, time, reduceMotion, air) {
    const glowAmount = smooth(.08, .57, air.shadow);
    const flicker = reduceMotion ? 0 : Math.sin(time * 6) * 2 + Math.sin(time * 11) * .9;
    const lights = [];
    const posts = TRAIL_TORCHES.map(toScreen).filter(x => x > -60 && x < width + 60);
    for (const x of posts) lights.push({ x, y: ground - 32, radius: 62 + flicker, warmth: .06 + glowAmount * .19 });
    const torchGlow = state.benkos.torchManual ? 1 : smooth(NIGHT_START, .72, air.t) * (1 - smooth(.96, 1, air.t));
    if (handFlame) lights.push({ ...handFlame, radius: 107 + flicker, warmth: .20 * torchGlow, strength: torchGlow });
    if (glowAmount > 0) {
      lights.push({ x: toScreen(70), y: ground - 9, radius: 72, warmth: glowAmount * .25, strength: glowAmount });
      if (state.exploration.altarFound) lights.push({ x: toScreen(ALTAR_X), y: ground - 18, radius: 58, warmth: glowAmount * .12, strength: glowAmount });
      for (const wall of state.walls) if (wall.level && wall.hp > 0) lights.push({ x: toScreen(wall.x), y: ground - 28, radius: 47, warmth: glowAmount * .12, strength: glowAmount });
    }
    for (const enemy of state.enemies) {
      if (enemy.muzzleFlash > 0 && !reduceMotion) lights.push({ x: toScreen(enemy.x) + enemy.facing * 16, y: ground - 22, radius: 46, warmth: .32 });
    }
    const visible = lights.filter(light => light.x + light.radius >= 0 && light.x - light.radius <= width);

    if (air.shadow > 0 || air.warmth > 0) {
      const height = ground + 22;
      if (mask.width !== width || mask.height !== height) { mask.width = width; mask.height = height; }
      shade.globalCompositeOperation = 'source-over';
      shade.clearRect(0, 0, width, height);
      const tint = blend([15, 26, 49], [58, 20, 39], air.red);
      const shadow = shade.createLinearGradient(0, 0, 0, ground);
      shadow.addColorStop(.38, color(tint, 0));
      shadow.addColorStop(.73, color(tint, air.shadow * .54));
      shadow.addColorStop(1, color(tint, air.shadow));
      shade.fillStyle = shadow;
      shade.fillRect(0, 0, width, height);
      const amber = shade.createLinearGradient(0, ground * .44, 0, ground);
      amber.addColorStop(0, color([172, 74, 36], 0));
      amber.addColorStop(1, color([172, 74, 36], air.warmth * .57));
      shade.fillStyle = amber;
      shade.fillRect(0, 0, width, height);
      shade.globalCompositeOperation = 'destination-out';
      for (const { x, y, radius, strength = 1 } of visible) {
        const falloff = shade.createRadialGradient(x, y, 0, x, y, radius);
        falloff.addColorStop(0, color([255, 255, 255], strength));
        falloff.addColorStop(.42, color([255, 255, 255], strength * .8));
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
  };
}
