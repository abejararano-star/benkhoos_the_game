import { blend, color, smooth } from './daylight.js?v=d9994b11855a';

const fract = value => value - Math.floor(value);
export const landscapeSeed = index => fract(Math.sin(index * 78.233 + 19.19) * 43758.5453);

function pixelDisc(g, x, y, radius, fill) {
  g.fillStyle = fill;
  for (let row = -radius; row <= radius; row++) {
    const span = Math.floor(Math.sqrt(radius * radius - row * row));
    g.fillRect(x - span, y + row, span * 2 + 1, 1);
  }
}

function drawOrb(g, width, ground, progress, opacity, rgb, moon) {
  if (opacity <= 0) return;
  const x = Math.round(width * (.13 + progress * .74));
  const arc = Math.sin(progress * Math.PI);
  const y = Math.round(ground * (.68 - .44 * arc + .16 * arc ** 4));
  const radius = moon ? 12 : 17;
  const haloRadius = radius * 4;
  const halo = g.createRadialGradient(x, y, radius, x, y, haloRadius);
  halo.addColorStop(0, color(rgb, opacity * (moon ? .23 : .56)));
  halo.addColorStop(1, color(rgb, 0));
  g.fillStyle = halo;
  g.fillRect(x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2);
  pixelDisc(g, x, y, radius, color(rgb, opacity));
  if (moon) {
    pixelDisc(g, x - 4, y + 3, 3, color([121, 142, 168], opacity * .28));
    pixelDisc(g, x + 3, y - 4, 2, color([121, 142, 168], opacity * .36));
  }
}

function drawClouds(g, width, ground, camera, time, air) {
  for (let layer = 0; layer < 2; layer++) {
    const span = layer === 0 ? 196 : 236;
    const left = camera * (layer === 0 ? .045 : .09) - width / 2 - time * (layer === 0 ? .75 : 1.6);
    const shade = color(air.cloudShade, layer === 0 ? .54 : .82);
    const highlight = color(air.cloudLight, layer === 0 ? .56 : .87);
    for (let cell = Math.floor(left / span) - 1; cell <= (left + width) / span + 1; cell++) {
      const id = cell + layer * 137;
      const x = Math.round(cell * span - left + landscapeSeed(id) * 81);
      const y = Math.round(ground * (.15 + layer * .22 + landscapeSeed(id + 50) * .10));
      const length = 42 + Math.floor(landscapeSeed(id + 81) * (layer === 0 ? 43 : 78));
      const height = 4 + Math.floor(landscapeSeed(id + 137) * 9) + layer * 3;
      for (let dx = 0; dx < length; dx += 2) {
        const u = dx / length;
        const body = Math.sin(u * Math.PI) ** .55;
        const lobes = .49 + .38 * Math.sin(u * Math.PI * 3.3 + id) ** 2;
        const top = Math.round(body * height * lobes);
        const base = Math.round(body * height * .33);
        g.fillStyle = shade;
        g.fillRect(x + dx, y - top, 2, top + base + 1);
        g.fillStyle = highlight;
        g.fillRect(x + dx, y - top, 2, Math.max(1, Math.round(top * .77)));
      }
      g.fillStyle = color(air.cloudLight, .27);
      g.fillRect(x - 14, y + 3, 24, 1);
      g.fillRect(x + length - 13, y + 2, 30, 1);
    }
  }
}

export function drawSky(g, width, height, ground, camera, time, air) {
  const gradient = g.createLinearGradient(0, 0, 0, ground * .78);
  gradient.addColorStop(0, color(air.zenith));
  gradient.addColorStop(.57, color(blend(air.zenith, air.horizon, .42)));
  gradient.addColorStop(1, color(air.horizon));
  g.fillStyle = gradient;
  g.fillRect(0, 0, width, height);

  if (air.stars > 0) {
    for (let i = 0; i < 56; i++) {
      const x = Math.round(landscapeSeed(i) * width);
      const y = Math.round((.04 + landscapeSeed(i + 67) * .51) * ground);
      g.fillStyle = color([219, 226, 229], air.stars * (.24 + landscapeSeed(i + 132) * .55));
      g.fillRect(x, y, i % 13 === 0 ? 2 : 1, 1);
    }
  }

  const { t } = air;
  const sun = smooth(.035, .10, t) * (1 - smooth(.60, .68, t));
  drawOrb(g, width, ground, (t - .035) / .645, sun, blend([255, 245, 194], [255, 155, 85], smooth(.47, .65, t)), false);
  const moonClock = t < .5 ? t + 1 : t;
  const moon = smooth(.64, .76, moonClock) * (1 - smooth(1.03, 1.13, moonClock));
  drawOrb(g, width, ground, (moonClock - .64) / .49, moon, blend([220, 232, 225], [240, 140, 113], air.red), true);
  drawClouds(g, width, ground, camera, time, air);
}
