import { createAnimal } from './ecology.js?v=3d37a370ad47';

export const ALTAR_X = -1880;
export const TRAIL_SIGNS = [-1565, -1815, -4360];
export const TRAIL_TORCHES = [-11220, -10420, -9740, -7960, -6850, -5510, -5100, -4620, -3985, -3280, -2815, -1720, -2048,
  1685, 2135, 2840, 3455, 4040, 4590, 5100, 5510, 7020, 8170, 9670, 10280, 11090];
export const TRAIL_CACHES = [
  { id: 'ceiba_cache', x: -2350, name: 'Mirador de la Ceiba', wood: 4, stone: 0, coins: 3 },
  { id: 'mangrove_cache', x: 2290, name: 'Manglar de la Marea', wood: 0, stone: 4, coins: 3 },
  { id: 'roots_cache', x: -1265, name: 'Cofre bajo las raíces', wood: 2, stone: 0, coins: 5, hidden: true },
  { id: 'reeds_cache', x: 2074, name: 'Cofre entre los juncos', wood: 0, stone: 2, coins: 5, hidden: true },
  { id: 'jegua_cache', x: -2920, name: 'Alijo de los guías de Jegua', wood: 3, stone: 0, coins: 5, hidden: true },
  { id: 'coast_cache', x: 3130, name: 'Depósito junto a la marea', wood: 0, stone: 3, coins: 5, hidden: true },
  { id: 'ridge_cache', x: -4740, name: 'Alijo de la Loma del Vigía', wood: 2, stone: 4, coins: 5 },
  { id: 'marsh_cache', x: 4740, name: 'Provisiones del Estero', wood: 4, stone: 2, coins: 5 },
  { id: 'ridge_lookout', x: -5630, name: 'Vigía del barranco', wood: 2, stone: 6, coins: 4 },
  { id: 'estuary_shore', x: 5630, name: 'Orilla del estero', wood: 6, stone: 1, coins: 5 },
  { id: 'deep_west_cache', x: -6200, name: 'Alijo de las canteras', wood: 2, stone: 5, coins: 4 },
  { id: 'deep_east_cache', x: 6280, name: 'Alijo de los pescadores', wood: 5, stone: 2, coins: 4 },
  { id: 'western_post_cache', x: -8740, name: 'Provisiones del Camino Real', wood: 5, stone: 2, coins: 5 },
  { id: 'eastern_post_cache', x: 8880, name: 'Provisiones del estero alto', wood: 5, stone: 2, coins: 5 }
];

export function initialExploration() {
  return { altarFound: false, frontierSeeded: false, trailSnakesSeeded: false, estateWildlifeSeeded: false, wildlifePairsSeeded: false,
    distantWildlifeSeeded: false, waypoint: '', opened: [], revealed: [] };
}

export function ensureExploration(state) {
  const old = state.exploration;
  state.exploration = {
    altarFound: old?.altarFound === true || state.altarTier > 1,
    frontierSeeded: old?.frontierSeeded === true,
    trailSnakesSeeded: old?.trailSnakesSeeded === true,
    estateWildlifeSeeded: old?.estateWildlifeSeeded === true,
    wildlifePairsSeeded: old?.wildlifePairsSeeded === true,
    distantWildlifeSeeded: old?.distantWildlifeSeeded === true,
    waypoint: typeof old?.waypoint === 'string' && /^[a-z_]{1,30}$/.test(old.waypoint) ? old.waypoint : '',
    opened: TRAIL_CACHES.filter(cache => Array.isArray(old?.opened) && old.opened.includes(cache.id)).map(cache => cache.id),
    revealed: TRAIL_CACHES.filter(cache => Array.isArray(old?.revealed) && old.revealed.includes(cache.id)).map(cache => cache.id)
  };
}

export function seedFrontier(state, nextId) {
  ensureExploration(state);
  if (!state.exploration.distantWildlifeSeeded) {
    for (const [species, x] of [['DEER', -6100], ['BOAR', -7400], ['JAGUAR', -9010],
      ['CAPYBARA', 6180], ['SNAKE', 7600], ['DEER', 9030]]) {
      state.wildlife.push(createAnimal(nextId(), species, x));
    }
    state.exploration.distantWildlifeSeeded = true;
  }
  for (const [id, x] of [['creek_ravine', -2135], ['creek_mangrove', 2015], ['creek_jegua', -3090], ['creek_tide', 3290], ['creek_estero', 4545]]) {
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
  if (!state.exploration.wildlifePairsSeeded) {
    for (const [species, x] of [['CAPYBARA', 560], ['DEER', -3170], ['BOAR', -3620], ['JAGUAR', 3080]]) {
      const resident = state.wildlife.find(animal => animal.species === species && Math.abs(animal.homeX - x) < 120);
      if (!resident) state.wildlife.push(createAnimal(nextId(), species, x, { sex: 'F' }));
      state.wildlife.push(createAnimal(nextId(), species, x + 74, { sex: resident?.sex === 'M' ? 'F' : 'M' }));
    }
    state.exploration.wildlifePairsSeeded = true;
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
  const player = state.benkos;
  return !player.waterFall && player.interaction?.kind !== 'fish' &&
    (player.torchManual || (state.phase !== 'DAY_EXPLORE' && !player.torchOff));
}

export function explorationHint(state) {
  const x = state.benkos.x;
  if (nearestTrailCache(state)) return 'E · Abrir el alijo del sendero';
  if (Math.abs(x) < 25) return 'S · Mejorar la casa central · E / B · Ver Obras';
  if (Math.abs(x - ALTAR_X) < 58) return 'Santuario de los Ancestros · S para ofrendar';
  if (x < -6100) return 'Camino Real · Abre el mapa con M';
  if (x > 6100) return 'Estero alto · Abre el mapa con M';
  if (x < -2700) return 'Paso de Jegua · Camino de las tierras altas';
  if (x > 2700) return 'Boca de Marea · Camino de los mangles';
  if (!state.exploration.altarFound && x < 150) return 'Rumbo oeste · Cruza el riachuelo y sigue las piedras talladas';
  if (x > 1670) return 'Manglar de la Marea';
  if (x < -1640) return 'Cañada de los Ancestros';
  return '';
}
