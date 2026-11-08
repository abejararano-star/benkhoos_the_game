import { createAnimal } from './ecology.js?v=8d54c297ea97';

export const ALTAR_X = -1880;
export const TRAIL_SIGNS = [-610, -1040, -1555];
export const TRAIL_TORCHES = [-3985, -3280, -2815, -1720, -2048, 1685, 2135, 2840, 3455, 4040];
export const TRAIL_CACHES = [
  { id: 'ceiba_cache', x: -2350, name: 'Mirador de la Ceiba', wood: 4, stone: 0, coins: 3 },
  { id: 'mangrove_cache', x: 2290, name: 'Manglar de la Marea', wood: 0, stone: 4, coins: 3 },
  { id: 'roots_cache', x: -1265, name: 'Cofre bajo las raíces', wood: 2, stone: 0, coins: 5, hidden: true },
  { id: 'reeds_cache', x: 2074, name: 'Cofre entre los juncos', wood: 0, stone: 2, coins: 5, hidden: true },
  { id: 'jegua_cache', x: -2920, name: 'Alijo de los guías de Jegua', wood: 3, stone: 0, coins: 5, hidden: true },
  { id: 'coast_cache', x: 3130, name: 'Depósito junto a la marea', wood: 0, stone: 3, coins: 5, hidden: true }
];

export function initialExploration() {
  return { altarFound: false, frontierSeeded: false, trailSnakesSeeded: false, estateWildlifeSeeded: false, opened: [], revealed: [] };
}

export function ensureExploration(state) {
  const old = state.exploration;
  state.exploration = {
    altarFound: old?.altarFound === true || state.altarTier > 1,
    frontierSeeded: old?.frontierSeeded === true,
    trailSnakesSeeded: old?.trailSnakesSeeded === true,
    estateWildlifeSeeded: old?.estateWildlifeSeeded === true,
    opened: TRAIL_CACHES.filter(cache => Array.isArray(old?.opened) && old.opened.includes(cache.id)).map(cache => cache.id),
    revealed: TRAIL_CACHES.filter(cache => Array.isArray(old?.revealed) && old.revealed.includes(cache.id)).map(cache => cache.id)
  };
}

export function seedFrontier(state, nextId) {
  ensureExploration(state);
  for (const [id, x] of [['creek_ravine', -2135], ['creek_mangrove', 2015], ['creek_jegua', -3090], ['creek_tide', 3290]]) {
    if (!state.ecology.streams.some(stream => stream.id === id)) state.ecology.streams.push({ id, x, fishStock: 3, regrow: 0 });
  }
  if (!state.exploration.estateWildlifeSeeded) {
    state.wildlife.push(createAnimal(nextId(), 'DEER', -3170), createAnimal(nextId(), 'TURTLE', 3310));
    state.exploration.estateWildlifeSeeded = true;
  }
  if (!state.exploration.trailSnakesSeeded) {
    for (const x of [-1130, -2220, 1940, 2400]) state.wildlife.push(createAnimal(nextId(), 'SNAKE', x));
    state.exploration.trailSnakesSeeded = true;
  }
  if (state.exploration.frontierSeeded) return;
  for (const [species, x] of [['DEER', -2270], ['MACAW', -2040], ['MONKEY', -2205], ['TURTLE', 1995], ['CAPYBARA', 2080], ['BOAR', 2350]]) {
    if (!state.wildlife.some(animal => animal.species === species && Math.abs(animal.homeX - x) < 40)) {
      state.wildlife.push(createAnimal(nextId(), species, x));
    }
  }
  state.exploration.frontierSeeded = true;
}

export function discoverAltar(state) {
  if (state.exploration.altarFound || Math.abs(state.benkos.x - ALTAR_X) > 75) return false;
  state.exploration.altarFound = true;
  return true;
}

export function nearestTrailCache(state) {
  return TRAIL_CACHES.find(cache => Math.abs(cache.x - state.benkos.x) < 34 && !state.exploration.opened.includes(cache.id));
}

export function revealTrailCache(state) {
  const reach = torchIsLit(state) ? 76 : 36;
  const found = TRAIL_CACHES.find(cache => cache.hidden && Math.abs(cache.x - state.benkos.x) < reach &&
    !state.exploration.revealed.includes(cache.id) && !state.exploration.opened.includes(cache.id));
  if (found) state.exploration.revealed.push(found.id);
  return found;
}

export function torchIsLit(state) {
  return state.benkos.torchManual || (state.phase !== 'DAY_EXPLORE' && !state.benkos.torchOff);
}

export function explorationHint(state) {
  const x = state.benkos.x;
  if (nearestTrailCache(state)) return 'E · Abrir el alijo del sendero';
  if (Math.abs(x) < 25) return 'S · Mejorar la casa central · E / B · Ver Obras';
  if (Math.abs(x - ALTAR_X) < 58) return 'Santuario de los Ancestros · S para ofrendar';
  if (x < -2700) return 'Paso de Jegua · Camino de las tierras altas';
  if (x > 2700) return 'Boca de Marea · Camino de los mangles';
  if (!state.exploration.altarFound && x < 150) return 'Rumbo oeste · Cruza el riachuelo y sigue las piedras talladas';
  if (x > 1670) return 'Manglar de la Marea';
  if (x < -1640) return 'Cañada de los Ancestros';
  return '';
}
