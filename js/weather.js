const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const approach = (from, to, dt, seconds) => to + (from - to) * Math.exp(-dt / seconds);
const seed = n => { const value = Math.sin(n * 78.233 + 19.19) * 43758.5453; return value - Math.floor(value); };
export const initialWeather = () => ({ version: 1, time: 0, rain: 0, clouds: .10, wetness: 0,
  puddles: 0, wind: .18, surfaceTick: 0, playerSheltered: false });

export function restoreWeather(state) {
  const old = state.weather, clean = initialWeather();
  for (const key of ['rain', 'clouds', 'wetness', 'puddles']) if (Number.isFinite(old?.[key])) clean[key] = clamp(old[key]);
  if (Number.isFinite(old?.time)) clean.time = clamp(old.time, 0, 100000000);
  if (Number.isFinite(old?.wind)) clean.wind = clamp(old.wind, -1, 1);
  state.weather = clean;
  for (const actor of [state.benkos, ...state.units, ...state.enemies, ...state.horses, ...state.wildlife]) {
    if (Number.isFinite(actor.weatherWetness)) actor.weatherWetness = clamp(actor.weatherWetness);
    else delete actor.weatherWetness;
  }
}

export function rainAt(day, time) {
  const showers = [
    [[.20, .42, 1], [.70, .90, .65]],
    [[.46, .66, .86], [.91, .995, .4]],
    [[.14, .30, .55], [.48, .62, 1]],
    [[.03, .14, .28]]
  ][day % 4];
  let rain = 0;
  for (const [start, end, strength] of showers) {
    const ramp = Math.min(.035, (end - start) / 4);
    const up = clamp((time - start) / ramp), down = clamp((end - time) / ramp);
    const t = Math.min(up, down);
    rain = Math.max(rain, strength * t * t * (3 - 2 * t));
  }
  return rain;
}

export function weatherShelters(state) {
  const roofs = [{ id: 'hq', x: 0, half: 60, peak: 82 + (state.settlement.level - 1) * 8, eave: 45 }];
  for (const home of state.settlement.homes) roofs.push({ id: home.id, x: home.x, half: 39,
    peak: 50 + (home.level - 1) * 5, eave: 29 + (home.level - 1) * 4 });
  for (const rack of state.toolRacks) {
    if (['ESPADACHIN', 'CABALLERO_ALIADO'].includes(rack.role) && state.armyTier < 2) continue;
    roofs.push({ id: rack.id, x: rack.x, half: (20 + rack.maxStock * 17) / 2 + 3, peak: 52, eave: 46 });
  }
  for (const site of state.haciendas) {
    if (site.destroyed) continue;
    roofs.push({ id: site.id, x: site.x, half: site.major ? 77 : 59,
      peak: site.major ? 97 : 80, eave: site.major ? 66 : 54 });
  }
  return roofs;
}

export function rainCeiling(roofs, x, ground) {
  let ceiling = ground;
  for (const roof of roofs) {
    const delta = Math.abs(x - roof.x);
    if (delta < roof.half) ceiling = Math.min(ceiling,
      ground - roof.eave - (roof.peak - roof.eave) * (1 - delta / roof.half));
  }
  return ceiling;
}

export const isSheltered = (roofs, x) => roofs.some(roof => Math.abs(x - roof.x) < roof.half - 3);

export function advanceWeather(state, dt) {
  const w = state.weather;
  w.time += dt;
  const target = rainAt(state.day, state.timeOfDay);
  w.rain = approach(w.rain, target, dt, target > w.rain ? 4 : 7);
  const coming = rainAt(state.day, Math.min(.9999, state.timeOfDay + .035));
  w.clouds = approach(w.clouds, .10 + Math.max(target, coming) * .85, dt, 9);
  const gust = Math.sin(w.time * .055 + state.day * .3) * .40 + Math.sin(w.time * .21) * .16;
  w.wind = approach(w.wind, clamp(.12 + gust + w.rain * .26, -1, 1), dt, 2);
  w.wetness = clamp(w.wetness + dt * (w.rain * .045 - (1 - w.rain) * .0045));
  w.puddles = clamp(w.puddles + dt * (w.rain * w.rain * .016 - (1 - w.rain) * .0025));
  w.surfaceTick += dt;
  if (w.surfaceTick < .12) return;
  const tick = w.surfaceTick;
  w.surfaceTick = 0;
  const roofs = weatherShelters(state);
  w.playerSheltered = isSheltered(roofs, state.benkos.x);
  for (const actor of [state.benkos, ...state.units, ...state.enemies, ...state.horses, ...state.wildlife]) {
    if (actor.hp <= 0) continue;
    const inWater = actor.waterFall || actor.inStream || actor.activity === 'BATHE';
    const sheltered = isSheltered(roofs, actor.x);
    const rain = sheltered ? 0 : w.rain;
    actor.weatherWetness = inWater ? 1 : clamp((actor.weatherWetness ?? 0) + tick *
      (rain * .075 - (1 - rain) * (sheltered ? .022 : .010)));
  }
}

// World-anchored leaves fall from the canopy, settle, and wash down the riverbank.
export function leafPose(index, time, wind, rain, height = 95, front = false) {
  const duration = 17 + seed(index + 41) * 9;
  const phase = ((time / duration + seed(index + 7)) % 1 + 1) % 1;
  const fall = Math.min(1, phase / .72);
  const washed = front && rain > .25 && phase > .86 ? (phase - .86) / .14 : 0;
  return { x: fall * (12 + wind * 36) + Math.sin(phase * 15 + index) * (1 - fall) * 9 + washed * wind * 25,
    y: -height * (1 - fall) ** 1.1 + washed * 29,
    alpha: phase > .95 ? (1 - phase) / .05 : 1,
    pose: Math.floor((phase * 16 + seed(index) * 4) % 4), landed: phase >= .72, washed: washed > 0 };
}

export function leafSources(state, camera, width, front) {
  const left = camera - width / 2 - 80, right = camera + width / 2 + 80;
  if (front) return state.trees.filter(tree => !tree.chopped && tree.x >= left && tree.x <= right)
    .map(tree => ({ x: tree.x, height: tree.height + 15, id: Math.round(tree.x) }));
  const sources = [];
  // Share the near backdrop's parallax, canopy spacing and planted tree axes.
  const backLeft = camera * .41 - width / 2;
  for (let cell = Math.floor((backLeft - 100) / 101); cell <= (backLeft + width + 100) / 101; cell++) {
    const id = cell + 503, clearing = Math.abs(cell * 101) < 140;
    sources.push({ x: cell * 101 + seed(id) * 101 * .74 + camera * .59,
      height: ((clearing ? 61 : 96) + seed(id + 61) * 44) * .77, id });
  }
  return sources;
}
