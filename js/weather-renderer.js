import { blend, color } from './daylight.js?v=6e8525fead6a';
import { landscapeSeed } from './sky.js?v=6e8525fead6a';
import { leafPose, leafSources, rainCeiling, weatherShelters, isSheltered } from './weather.js?v=6e8525fead6a';

export function weatherAir(air, weather) {
  const cloud = weather.clouds;
  const night = Math.min(1, air.shadow * 1.7);
  const storm = (day, dark) => blend(day, dark, night);
  return { ...air, overcast: cloud,
    zenith: blend(air.zenith, storm([66, 85, 97], [7, 15, 26]), cloud * .72),
    horizon: blend(air.horizon, storm([116, 133, 129], [40, 53, 64]), cloud * .66),
    cloudLight: blend(air.cloudLight, storm([139, 153, 151], [60, 76, 83]), cloud * .78),
    cloudShade: blend(air.cloudShade, storm([74, 91, 96], [26, 38, 48]), cloud * .70),
    shadow: Math.min(.76, air.shadow + cloud * .12), warmth: air.warmth * (1 - cloud * .8) };
}

export function drawLeaves(g, state, camera, width, ground, front, reduced) {
  const w = state.weather, clock = reduced ? 0 : w.time;
  const sources = leafSources(state, camera, width, front);
  g.save();
  for (const source of sources) {
    for (let k = 0; k < (front ? 2 : 1); k++) {
      const index = source.id + k * 37;
      const p = leafPose(index, clock, w.wind, w.rain, source.height, front);
      if (reduced && !p.landed) continue;
      const x = Math.round(source.x + p.x - camera + width / 2), y = Math.round(ground + p.y - (front ? 0 : 5));
      if (x < -6 || x > width + 6) continue;
      g.globalAlpha = p.alpha * (front ? .88 : .58);
      const palette = ['#8b8d45', '#b59a54', '#7e783a', '#b88742'];
      g.fillStyle = palette[Math.abs(index) % palette.length];
      if (p.pose === 0 || p.landed) { g.fillRect(x, y, 4, 1); g.fillRect(x + 1, y - 1, 2, 1); }
      else if (p.pose === 1) { g.fillRect(x, y - 1, 2, 3); g.fillRect(x + 1, y - 2, 1, 1); }
      else if (p.pose === 2) { g.fillRect(x, y, 3, 2); g.fillRect(x + 2, y - 1, 1, 1); }
      else { g.fillRect(x, y - 1, 1, 3); g.fillRect(x + 1, y, 2, 1); }
      g.fillStyle = '#d0b476'; g.fillRect(x + 1, y, 1, 1);
    }
  }
  g.restore();
}

export function drawWetGround(g, state, camera, width, ground, air, reduced) {
  const w = state.weather;
  if (w.wetness < .03) return;
  const left = camera - width / 2, roofs = weatherShelters(state);
  g.save();
  g.fillStyle = color([20, 39, 36], w.wetness * .13);
  g.fillRect(0, ground - 2, width, 9);
  for (let cell = Math.floor(left / 31); cell < (left + width) / 31; cell++) {
    const seed = landscapeSeed(cell + 301), wx = cell * 31 + seed * 17;
    if (seed > w.puddles * .85 || isSheltered(roofs, wx)) continue;
    const x = Math.round(wx - left), y = ground + 1 + cell % 2;
    const span = 6 + Math.round(seed * 18 + w.puddles * 9);
    g.fillStyle = '#283c36'; g.fillRect(x - span / 2 - 1, y, span + 2, 3);
    g.fillStyle = color(blend(air.horizon, [111, 145, 137], .55), .44);
    g.fillRect(x - span / 2, y, span, 1);
    g.fillStyle = '#bcc6ac66';
    g.fillRect(x - 2 + (reduced ? 0 : Math.round(Math.sin(w.time * 2 + cell))), y + 1, 4, 1);
  }
  g.restore();
}

function drawRain(g, state, camera, width, ground, height, front, reduced) {
  const w = state.weather;
  if (w.rain < .025) return;
  const roofs = front ? weatherShelters(state) : [];
  const time = reduced ? 0 : w.time;
  const spacing = front ? 19 : 31, left = camera - width / 2;
  const density = (front ? 3 : 2) * w.rain * (reduced ? .32 : 1);
  g.save();
  g.lineWidth = 1;
  g.strokeStyle = color(front ? [185, 209, 204] : [153, 179, 177], (front ? .35 : .19) * w.rain);
  g.beginPath();
  for (let cell = Math.floor(left / spacing) - 2; cell <= (left + width) / spacing + 2; cell++) {
    for (let row = 0; row < Math.ceil(density); row++) {
      const seed = landscapeSeed(cell * 7 + row * 193 + (front ? 0 : 47));
      if (row + seed > density) continue;
      const y = ((time * (180 + seed * 105) + seed * height * 11) % (height + 20)) - 20;
      const wx = cell * spacing + seed * spacing + w.wind * y * .08;
      const x = Math.round(wx - left), bottom = rainCeiling(roofs, wx, ground);
      if (y > bottom && y < ground + 21 || y >= ground + 21 && !front) continue;
      if (y > ground && y < ground + 21) continue;
      const length = reduced ? 3 : 4 + seed * 7;
      const end = y < ground ? Math.min(y + length, bottom) : Math.min(y + length, height);
      if (end <= y) continue;
      g.moveTo(x, Math.round(y)); g.lineTo(x + Math.round(w.wind * 3), Math.round(end));
    }
  }
  g.stroke();
  g.restore();
}

export function drawWeatherBack(g, state, camera, width, ground, reduced) {
  drawLeaves(g, state, camera, width, ground, false, reduced);
  drawRain(g, state, camera, width, ground, ground, false, reduced);
}

export function drawWeatherFront(g, state, camera, width, ground, waterLine, height, air, reduced) {
  const w = state.weather, left = camera - width / 2;
  drawLeaves(g, state, camera, width, ground, true, reduced);
  drawRain(g, state, camera, width, ground, height, true, reduced);
  if (w.rain < .025 && w.wetness < .08) return;
  const roofs = weatherShelters(state);
  const clock = reduced ? 0 : w.time;
  g.save();
  // Roof edges drip after a shower, with no streaks crossing the covered porch.
  for (const roof of roofs) {
    const x = roof.x - left;
    if (x < -120 || x > width + 120) continue;
    for (const side of [-1, 1]) {
      const phase = (clock * (1.1 + w.rain) + landscapeSeed(roof.x + side * 81)) % 1;
      const length = Math.max(0, roof.eave - 1);
      const y = ground - roof.eave + phase * length;
      g.fillStyle = color([162, 194, 185], w.wetness * (1 - phase) * .55);
      g.fillRect(Math.round(x + side * (roof.half - 2)), Math.round(y), 1, 2);
    }
  }
  // Rain rings belong to the water surface, never to the mirrored sky.
  for (let cell = Math.floor(left / 25); cell < (left + width) / 25; cell++) {
    const seed = landscapeSeed(cell + 641);
    if (seed > w.rain) continue;
    const phase = (clock * (1.6 + seed) + seed * 7) % 1;
    const x = Math.round(cell * 25 + seed * 22 - left);
    const y = Math.round(waterLine + 4 + seed * Math.max(1, height - waterLine - 8));
    g.strokeStyle = color(blend(air.horizon, [166, 198, 187], .55), (1 - phase) * w.rain * .48);
    g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, 1 + phase * 7, .6 + phase * 1.7, 0, 0, Math.PI * 2); g.stroke();
    if (phase < .16 && !reduced) { g.fillStyle = '#b8d1c17a'; g.fillRect(x, y - 3, 1, 2); }
  }
  g.restore();
}
