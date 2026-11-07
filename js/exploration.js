import { createAnimal } from './ecology.js?v=e3b7c8bc5de3';

export const ALTAR_X = -1880;
export const TRAIL_SIGNS = [-610, -1040, -1555];
export const TRAIL_CACHES = [
  { id: 'ceiba_cache', x: -2350, name: 'Mirador de la Ceiba', wood: 4, stone: 0, coins: 3 },
  { id: 'mangrove_cache', x: 2290, name: 'Manglar de la Marea', wood: 0, stone: 4, coins: 3 }
];

export function initialExploration() {
  return { altarFound: false, frontierSeeded: false, opened: [] };
}

export function ensureExploration(state) {
  const old = state.exploration;
  state.exploration = {
    altarFound: old?.altarFound === true || state.altarTier > 1,
    frontierSeeded: old?.frontierSeeded === true,
    opened: TRAIL_CACHES.filter(cache => Array.isArray(old?.opened) && old.opened.includes(cache.id)).map(cache => cache.id)
  };
}

export function seedFrontier(state, nextId) {
  ensureExploration(state);
  for (const [id, x] of [['creek_ravine', -2135], ['creek_mangrove', 2015]]) {
    if (!state.ecology.streams.some(stream => stream.id === id)) state.ecology.streams.push({ id, x, fishStock: 3, regrow: 0 });
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

export function torchIsLit(state) {
  return state.benkos.torchManual || (state.phase !== 'DAY_EXPLORE' && !state.benkos.torchOff);
}

export function explorationHint(state) {
  const x = state.benkos.x;
  if (nearestTrailCache(state)) return 'E · Abrir el alijo del sendero';
  if (Math.abs(x) < 25) return 'E / B · Mejorar la casa central';
  if (Math.abs(x - ALTAR_X) < 58) return 'Santuario de los Ancestros · S para ofrendar';
  if (!state.exploration.altarFound && x < 150) return 'Rumbo oeste · Cruza el riachuelo y sigue las piedras talladas';
  if (x > 1670) return 'Manglar de la Marea';
  if (x < -1640) return 'Cañada de los Ancestros';
  return '';
}
