export const INFANTRY = ['GUERRERO', 'ARQUERO', 'ESPADACHIN'];
export const RANK_NAMES = ['Básico', 'Élite', 'Real'];
export const ROYAL_ARMOR_COST = 8;

export function ensureEquipment(unit) {
  if (!INFANTRY.includes(unit.role)) return;
  if (!unit.equipment || typeof unit.equipment !== 'object') {
    const rank = [1, 2, 3].includes(unit.tier) ? unit.tier : 1;
    unit.equipment = { weapon: rank, armor: rank };
  }
  for (const piece of ['weapon', 'armor']) {
    if (![1, 2, 3].includes(unit.equipment[piece])) unit.equipment[piece] = 1;
  }
  unit.tier = Math.max(unit.equipment.weapon, unit.equipment.armor);
}

export function armyRequirement(state) {
  const next = state.armyTier + 1;
  if (next > 3) return 'Rango máximo alcanzado.';
  if (state.altarTier < next) return `Requiere altar de nivel ${next}.`;
  if (state.settlement.level < next) return `Requiere casa central de nivel ${next}.`;
  if (state.settlement.barracks.level < next) return `Requiere cuartel de nivel ${next}.`;
  return '';
}

export function equipmentOffer(unit, piece, state) {
  if (!INFANTRY.includes(unit.role) || !['weapon', 'armor'].includes(piece)) return null;
  ensureEquipment(unit);
  const rank = unit.equipment[piece] + 1;
  const cost = (piece === 'weapon' ? 2 : 3) + rank;
  const item = piece === 'armor' ? 'Armadura' : { GUERRERO: 'Lanza', ARQUERO: 'Arco', ESPADACHIN: 'Espada' }[unit.role];
  let reason = '';
  if (rank > 3) reason = 'Equipo de rango máximo.';
  else if (unit.kitOrder) reason = 'Tiene un encargo por recoger.';
  else if (unit.requestedRole) reason = 'Está preparando un cambio de oficio.';
  else if (state.armyTier < rank) reason = `Requiere rango ${RANK_NAMES[rank - 1]}.`;
  else if (state.coins < cost) reason = `Faltan ${cost - state.coins} reales.`;
  return { piece, rank, cost, item, reason };
}

export function orderEquipment(unit, piece, state) {
  const offer = equipmentOffer(unit, piece, state);
  if (!offer || offer.reason) return { success: false, message: offer?.reason || 'Este oficio tiene su propio equipo.' };
  state.coins -= offer.cost;
  unit.kitOrder = { piece, rank: offer.rank, cost: offer.cost, item: offer.item };
  return { success: true, message: `${unit.name} recogerá el equipo en el cuartel cuando sea seguro.` };
}

export function collectEquipment(unit, state, dt, maxHealth) {
  const order = unit.kitOrder;
  const x = state.settlement.barracks.x;
  if (!order || state.phase !== 'DAY_EXPLORE' || state.enemies.some(enemy => enemy.hp > 0 &&
    (Math.abs(enemy.x - unit.x) < 335 || Math.abs(enemy.x - x) < 335))) return false;
  const distance = x - unit.x;
  unit.activity = 'EQUIP';
  unit.mood = 'Recogiendo equipo en el cuartel';
  if (Math.abs(distance) > 12) {
    unit.facing = Math.sign(distance);
    unit.vx = unit.facing * 64;
    unit.x += unit.vx * dt;
    return true;
  }
  unit.vx = 0;
  const health = unit.hp / unit.maxHp;
  unit.equipment[order.piece] = order.rank;
  unit.tier = Math.max(unit.equipment.weapon, unit.equipment.armor);
  if (order.piece === 'armor') {
    unit.maxHp = maxHealth(unit);
    unit.hp = Math.max(1, Math.round(unit.maxHp * health));
  }
  unit.kitOrder = null;
  unit.mood = `Estrena ${order.item.toLowerCase()}`;
  return true;
}
