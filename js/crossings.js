export const CROSSINGS = Object.freeze([
  { id: 'ridge_bridge', x: -5250, half: 84, kind: 'fixed', name: 'Puente de la Loma' },
  { id: 'estuary_bridge', x: 5250, half: 101, kind: 'rope', name: 'Puente colgante del Estero' }
]);

export const DROWN_TIME = 1.75;
const halfClamp = (value, max) => Math.max(-max, Math.min(max, value));
const spanShape = (site, x) => Math.max(0, 1 - ((x - site.x) / site.half) ** 2);

export function ensureCrossings(state) {
  const cut = state.crossings?.estuary_bridge?.cut === true;
  state.crossings = {
    ridge_bridge: { cut: false, sag: 0, velocity: 0 },
    estuary_bridge: { cut, sag: 0, velocity: 0 }
  };
  for (const group of ['units', 'enemies', 'horses', 'wildlife', 'messengers']) {
    for (const actor of state[group]) normalizeFall(actor);
  }
  normalizeFall(state.benkos);
}

function normalizeFall(actor) {
  const fall = actor.waterFall;
  if (fall && (fall.site !== 'estuary_bridge' || !Number.isFinite(fall.time) ||
      fall.time < 0 || fall.time >= DROWN_TIME || !Number.isFinite(fall.vx))) actor.waterFall = null;
}

export function crossingAt(x) {
  return CROSSINGS.find(site => Math.abs(x - site.x) < site.half);
}

export function bridgePost(x) {
  return CROSSINGS.find(site => Math.abs(Math.abs(x - site.x) - site.half) <= 21);
}

export function bridgeHint(state, site) {
  if (site.kind === 'fixed') return 'Puente fijo de madera · Cruza a pie o a caballo';
  if (state.crossings[site.id].cut) return 'Paso cortado · E: reparar por 3 de madera · No cruces el borde';
  return 'La plataforma cede con el peso · E: revisar · Mayús + E: cortar';
}

export function interactBridge(state, site, cut) {
  if (site.kind === 'fixed') return bridgeHint(state, site);
  const bridge = state.crossings[site.id];
  if (bridge.cut) {
    if (cut) return 'Las cuerdas ya están cortadas.';
    if (state.resources.wood < 3) return 'Necesitas 3 de madera para reparar el paso.';
    state.resources.wood -= 3;
    bridge.cut = false;
    bridge.sag = 6;
    bridge.velocity = 0;
    return 'Puente reparado. Puedes cruzar.';
  }
  if (!cut) return bridgeHint(state, site);
  if (state.benkos.mounted) return 'Desmonta para cortar la cuerda.';
  bridge.cut = true;
  return 'Cortaste la cuerda. El tramo central se ha soltado.';
}

export function deckOffset(state, site, x) {
  if (site.kind === 'fixed') return -2;
  const bridge = state.crossings[site.id];
  if (!bridge.cut) return Math.round(bridge.sag * spanShape(site, x));
  const u = Math.abs(x - site.x) / site.half;
  return u >= .72 - 1e-8 ? Math.round((1 - u) * (36 + bridge.sag)) : 0;
}

export function crossingFeet(state, actor, x = actor.x) {
  const fall = actor.waterFall;
  if (fall) {
    if (fall.time < .32) return Math.round(160 * fall.time ** 2);
    return Math.round(19 + Math.sin(fall.time * 26) * 3 + Math.max(0, fall.time - .62) * 54);
  }
  const site = crossingAt(x);
  return site ? deckOffset(state, site, x) : 0;
}

export function stepCrossings(state, dt, { splash, onPlayerDrowned }) {
  const rope = CROSSINGS[1];
  const bridge = state.crossings[rope.id];
  let load = 0;
  const bodies = [state.benkos, ...state.units, ...state.enemies, ...state.horses, ...state.wildlife, ...state.messengers];
  for (const actor of bodies) {
    if (actor.hp <= 0 || actor.appearTimer > 0 || actor.role === 'FUGITIVO' ||
        actor.species === 'MACAW' || actor.species === 'CAPYBARA' || actor.species === 'TURTLE' || actor.rider) continue;
    const fall = actor.waterFall;
    if (fall) {
      const before = fall.time;
      fall.time += dt;
      actor.x = rope.x + halfClamp(actor.x - rope.x + fall.vx * dt, rope.half * .68);
      if (before < .33 && fall.time >= .33) splash(actor.x, fall.vx);
      if (fall.time < DROWN_TIME) continue;
      if (actor === state.benkos) { onPlayerDrowned(); return; }
      if ('hp' in actor) actor.hp = 0;
      else {
        const group = actor.kind ? state.messengers : state.horses;
        const index = group.indexOf(actor);
        if (index >= 0) group.splice(index, 1);
      }
      continue;
    }
    if (Math.abs(actor.x - rope.x) >= rope.half) continue;
    if (bridge.cut && Math.abs(actor.x - rope.x) <= rope.half * .72) {
      actor.waterFall = { site: rope.id, time: 0, vx: halfClamp((actor.vx || 0) * .28, 35) + 9 };
      actor.vx = 0;
      actor.interaction = null;
      actor.attackTimer = 0;
      actor.dashTimer = 0;
      actor.queuedAttack = false;
      actor.pendingShot = null;
      actor.pendingStrike = null;
    } else if (!bridge.cut) {
      const weight = actor.mounted || state.horses.includes(actor) ? 2.4 : actor.species ? .5 : 1;
      load += weight * spanShape(rope, actor.x);
    }
  }
  const target = bridge.cut ? 20 : Math.min(16, 4 + load * 4.2);
  bridge.velocity += ((target - bridge.sag) * 24 - bridge.velocity * 5) * dt;
  bridge.sag += bridge.velocity * dt;
}
