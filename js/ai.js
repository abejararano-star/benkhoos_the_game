import { affinity, roleAvailable } from './people.js?v=763cc8e52309';
export function nearest(entity, candidates, predicate = () => true) {
  let best = null, distance = Infinity;
  for (const item of candidates) {
    const d = Math.abs(item.x - entity.x);
    if (predicate(item) && d < distance) { best = item; distance = d; }
  }
  return best;
}

const defenseOrder = ['GUERRERO', 'ESPADACHIN', 'CAMPEON_REAL', 'CABALLERO_ALIADO', 'ARQUERO'];
const defendingSquad = (units, side) => units.filter(u => u.hp > 0 && u.assignedSide === side && defenseOrder.includes(u.role))
  .sort((a, b) => defenseOrder.indexOf(a.role) - defenseOrder.indexOf(b.role) || a.id - b.id);

export function defensePostX(unit,units,wall){
  const squad=defendingSquad(units, unit.assignedSide);
  const slot=Math.max(0,squad.findIndex(u=>u.id===unit.id));
  const side=unit.assignedSide||1;
  return (wall?.x??side*320)-side*(18+slot*26);
}

export function defenseLines(state, expedition, escort) {
  const posts = new Map();
  const walls = new Map();
  for (const side of [-1, 1]) {
    const wall = state.walls.reduce((outer, candidate) =>
      candidate.dir === side && candidate.hp > 0 && candidate.level > 0 &&
      (!outer || Math.abs(candidate.x) > Math.abs(outer.x)) ? candidate : outer, null);
    const squad = defendingSquad(state.units, side)
      .filter(unit => !expedition?.has(unit.id) && !escort.has(unit.id) && !unit.waterFall && !unit.requestedRole);
    const line = wall?.x ?? side * 320;
    walls.set(side, line);
    squad.forEach((unit, slot) => posts.set(unit.id, line - side * (18 + slot * 26)));
  }
  return { posts, walls };
}

export function chooseDefenseSide(x, units) {
  const defenders = units.filter(u => ['GUERRERO','ARQUERO','CAZADOR','ESPADACHIN','CABALLERO_ALIADO'].includes(u.role));
  const left = defenders.filter(u => u.assignedSide === -1).length;
  const right = defenders.length - left;
  return left === right ? (x < 0 ? -1 : 1) : left < right ? -1 : 1;
}

export function chooseToolRack(unit, state) {
  const demand = { CONSTRUCTOR:2, LENADOR:2, AGRICULTOR: 2, MINERO: 2, CAZADOR: 2, ARQUERO: 4, GUERRERO: 4, ESPADACHIN: 3, CABALLERO_ALIADO: 2, CURANDERO: 1, BRUJO: 1 };
  const population = {}, claims = {};
  for (const worker of state.units) {
    if (worker.hp <= 0 || worker.waterFall || worker.escortHome) continue;
    population[worker.role] = (population[worker.role] ?? 0) + 1;
    if (worker !== unit && worker.rackId && (worker.requestedRole || worker.role === 'ALDEANO')) {
      claims[worker.rackId] = (claims[worker.rackId] ?? 0) + 1;
    }
  }
  let rack, best = Infinity;
  for (const candidate of state.toolRacks) {
    const { id, role, stock, x } = candidate;
    const reserved = claims[id] ?? 0;
    if (stock <= reserved || !roleAvailable(role, state.armyTier)) continue;
    const score = Math.abs(x - unit.x) * .5 + (population[role] ?? 0) / demand[role] * 100 + reserved * 60
      - (affinity(unit, role) - 3) * 100 - (unit.preferredRole === role ? 110 : 0) - (unit.rackId === id ? 18 : 0);
    if (score >= best) continue;
    rack = candidate;
    best = score;
  }
  unit.rackId = rack?.id ?? null;
  return rack ?? null;
}

export function chooseWorksite(unit, sites, units, role, capacity) {
  const occupancy = site => units.filter(u => u !== unit && u.role === role && u.worksiteId === site.id).length;
  const assigned = sites.find(s => s.id === unit.worksiteId && s.level > 0 && occupancy(s) < capacity);
  if (assigned) return assigned;
  const site = nearest(unit, sites, s => s.level > 0 && occupancy(s) < capacity);
  unit.worksiteId = site?.id ?? null;
  return site;
}
