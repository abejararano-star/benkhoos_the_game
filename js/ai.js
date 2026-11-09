import { affinity } from './people.js?v=78e42e07133a';
export function nearest(entity, candidates, predicate = () => true) {
  let best = null, distance = Infinity;
  for (const item of candidates) {
    const d = Math.abs(item.x - entity.x);
    if (predicate(item) && d < distance) { best = item; distance = d; }
  }
  return best;
}

export function defensePostX(unit,units,wall){
  const order=['GUERRERO','ESPADACHIN','CAMPEON_REAL','CABALLERO_ALIADO','ARQUERO'];
  const squad=units.filter(u=>u.hp>0&&u.assignedSide===unit.assignedSide&&order.includes(u.role))
    .sort((a,b)=>order.indexOf(a.role)-order.indexOf(b.role)||a.id-b.id);
  const slot=Math.max(0,squad.findIndex(u=>u.id===unit.id));
  const side=unit.assignedSide||1;
  return (wall?.x??side*320)-side*(18+slot*26);
}

export function chooseDefenseSide(x, units) {
  const defenders = units.filter(u => ['GUERRERO','ARQUERO','CAZADOR','ESPADACHIN','CABALLERO_ALIADO'].includes(u.role));
  const left = defenders.filter(u => u.assignedSide === -1).length;
  const right = defenders.length - left;
  return left === right ? (x < 0 ? -1 : 1) : left < right ? -1 : 1;
}

export function chooseToolRack(unit, state) {
  // Reserve the last tool for an approaching worker rather than sending everyone to it.
  const demand = { CONSTRUCTOR:2, LENADOR:2, AGRICULTOR: 2, MINERO: 2, CAZADOR: 2, ARQUERO: 4, GUERRERO: 4, ESPADACHIN: 3, CABALLERO_ALIADO: 2 };
  const candidates = state.toolRacks.filter(r => r.stock > 0 &&
    (state.armyTier >= 2 || !['ESPADACHIN', 'CABALLERO_ALIADO'].includes(r.role)));
  const score = r => {
    const population = state.units.filter(u => u.role === r.role).length;
    const reservations = state.units.filter(u => u !== unit && u.role === 'ALDEANO' && u.rackId === r.id).length;
    return Math.abs(r.x - unit.x)*.5 + (population / demand[r.role]) * 100 + (reservations >= r.stock ? 10000 : reservations * 60)
      - (affinity(unit,r.role)-3)*100 - (unit.preferredRole===r.role?110:0);
  };
  candidates.sort((a, b) => score(a) - score(b));
  const rack = candidates[0];
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
