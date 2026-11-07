import { restoreCommunity } from './community.js?v=d67d25007032';
import { ensureEcology, seedEcology } from './ecology.js?v=d67d25007032';
import { ROLES, ENEMY_CATALOG, WORLD_MIN_X, WORLD_MAX_X, getUnitMaxHp, STATION_X } from './config.js?v=d67d25007032';
import { ensurePerson } from './people.js?v=d67d25007032';
import { ensureSettlement } from './settlement.js?v=d67d25007032';
import { ensureCampaign } from './campaign.js?v=d67d25007032';
export const SAVE_VERSION = 3;
const clone = value => JSON.parse(JSON.stringify(value));
const number = (v, fallback, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function makeSave(state, nextEntityId) {
  return {
    save_version: SAVE_VERSION, saved_at: new Date().toISOString(),
    snapshot: { state: clone(state), nextEntityId },
    dia_actual: state.day, tiempo_dia: state.timeOfDay,
    monedas_bolsa: state.coins, monedas_cofre: state.treasuryCoins,
    salud_benkos: Math.round(state.benkos.spirit), salud_max_benkos: state.benkos.maxSpirit,
    nivel_palenque: state.altarTier, totem_ascenso_desbloqueado: +(state.armyTier >= 2),
    armadura_real_desbloqueada: +state.armorUnlocked, posicion_benkos_x: state.benkos.x,
    fugitivos_liberados: state.fugitivesFreed, enemigos_derrotados: state.enemiesDefeated,
    puntuacion_total: state.score,
    tropas: state.units.map(u => ({ tipo_unidad: u.role, tier: u.tier, salud_actual: Math.round(u.hp), posicion_x: u.x, estado_fsm: 'ACTIVE' })),
    construcciones: state.walls.map(w => ({ tipo_nodo: 'MURALLA', nivel: w.level, posicion_x: w.x, salud_actual: Math.round(w.hp) }))
  };
}

export function restoreSave(save, defaults) {
  if (!save || typeof save !== 'object') throw new Error('El guardado no es válido.');
  if (save.save_version > SAVE_VERSION) throw new Error('Esta partida necesita una versión más reciente del juego.');
  const next=clone(defaults);
  const migrateEcology=!save.snapshot?.state?.ecology;
  let source = save.snapshot?.state;
  if (save.save_version >= 2 && (!source || typeof source !== 'object' || Array.isArray(source))) {
    throw new Error('La partida está incompleta.');
  }
  if (!source) {
    // Upgrade v1 without replacing legitimate zeros or resurrecting empty armies.
    next.day = save.dia_actual ?? next.day;
    next.timeOfDay = save.tiempo_dia ?? next.timeOfDay;
    next.coins = save.monedas_bolsa ?? next.coins;
    next.treasuryCoins = save.monedas_cofre ?? next.treasuryCoins;
    next.altarTier = save.nivel_palenque ?? next.altarTier;
    next.armyTier = Math.max(save.totem_ascenso_desbloqueado ? 2 : 1, ...((save.tropas ?? []).map(t => Number(t.tier) || 1)));
    next.armorUnlocked = !!save.armadura_real_desbloqueada || next.armyTier === 3;
    next.benkos.royalArmor = !!save.armadura_real_desbloqueada;
    next.benkos.spirit = save.salud_benkos ?? 100;
    next.benkos.maxSpirit = save.salud_max_benkos ?? 100;
    next.benkos.x = save.posicion_benkos_x ?? -20;
    next.score = save.puntuacion_total ?? 0;
    next.fugitivesFreed = save.fugitivos_liberados ?? 0;
    next.enemiesDefeated = save.enemigos_derrotados ?? 0;
    next.skills.forEach(s => { s.unlocked = s.level <= next.altarTier; });
    if (Array.isArray(save.tropas)) next.units = save.tropas.map((t, i) => ({
      id: i + 1, role: t.tipo_unidad === 'LANCERO' ? 'GUERRERO' : t.tipo_unidad,
      tier: Number(t.tier ?? 1), x: Number(t.posicion_x ?? 0), y: 268,
      hp: Number(t.salud_actual ?? 80), maxHp: getUnitMaxHp(t.tipo_unidad === 'LANCERO' ? 'GUERRERO' : t.tipo_unidad, Number(t.tier ?? 1)),
      vx: 0, facing: 1, assignedSide: i % 2 ? 1 : -1, animSeed: 0,
      attackCooldown: 0, attackAnimTimer: 0, liberateAnimTimer: 0, carryingSack: false
    }));
    for (const wall of next.walls) {
      const saved = save.construcciones?.find(w => w.tipo_nodo === 'MURALLA' && Math.abs(w.posicion_x - wall.x) < 1);
      if (saved) { wall.level = Number(saved.nivel); wall.hp = Number(saved.salud_actual); wall.maxHp = Math.max(wall.hp, 150 + wall.level * 90); }
    }
    next.phase = next.timeOfDay >= 0.68 ? 'NIGHT_DEFENSE' : 'DAY_EXPLORE';
    source = next;
  }
  for (const key of Object.keys(next)) {
    if (key === 'benkos' || key === 'skills') continue;
    if (Array.isArray(next[key])) {
      if (key === 'messengers' && save.save_version < 3 && source[key] === undefined) continue;
      if (!Array.isArray(source[key]) || source[key].length > 5000) throw new Error(`Datos inválidos: ${key}`);
      next[key] = clone(source[key]);
    } else if (source[key] !== undefined && source[key] !== null && typeof source[key] === typeof next[key]) next[key] = source[key];
  }
  const validEntity = e => e && typeof e === 'object' && !Array.isArray(e) && typeof e.x === 'number' && Number.isFinite(e.x);
  for (const key of ['units','enemies','walls','farms','mines','trees','toolRacks','haciendas','horses','wildlife','droppedCoins','corpses','projectiles','particles','waterRipples','floatingTexts','messengers']) {
    if (next[key].some(e => !validEntity(e))) throw new Error(`Entidades dañadas: ${key}`);
  }
  if (!source.benkos || typeof source.benkos.x !== 'number' || !Number.isFinite(source.benkos.x)) throw new Error('Posición del jugador inválida.');
  for (const entity of [...next.units, ...next.enemies, ...next.walls]) {
    if (typeof entity.hp !== 'number' || typeof entity.maxHp !== 'number' || !Number.isFinite(entity.hp) || entity.maxHp <= 0) throw new Error('Salud de entidad inválida.');
  }
  next.benkos = Object.fromEntries(Object.entries(defaults.benkos).map(([key, value]) => [key,
    typeof source.benkos?.[key] === typeof value && (typeof value !== 'number' || Number.isFinite(source.benkos[key])) ? source.benkos[key] : value
  ]));
  next.skills = next.skills.map(skill => {
    const saved = source.skills?.find(s => s.id === skill.id);
    return { ...skill, unlocked: saved ? !!saved.unlocked : skill.unlocked };
  });
  next.day = Math.floor(number(next.day, 1, 1, 100000));
  next.maxCoins = defaults.maxCoins;
  next.armyTier = Math.floor(number(next.armyTier, 1, 1, 3));
  next.altarTier = Math.max(Math.floor(number(next.altarTier, 1, 1, 5)), ...next.skills.filter(skill => skill.unlocked).map(skill => skill.level));
  next.skills.forEach(skill => { skill.unlocked = skill.level <= next.altarTier; });
  next.coins = Math.floor(number(next.coins, 0, 0, next.maxCoins));
  next.treasuryCoins = Math.floor(number(next.treasuryCoins, 0, 0, 1000000));
  next.timeOfDay = number(next.timeOfDay, 0, 0, 0.999999);
  next.benkos.x = number(next.benkos.x, 0, WORLD_MIN_X + 40, WORLD_MAX_X - 40);
  next.benkos.maxSpirit = number(next.benkos.maxSpirit, 100, 1, 1000);
  next.benkos.spirit = number(next.benkos.spirit, 0, 0, next.benkos.maxSpirit);
  next.benkos.royalArmor = next.benkos.royalArmor && next.armorUnlocked;
  if (!['playing', 'victory', 'defeat'].includes(next.status)) next.status = 'playing';
  if (!['DAY_EXPLORE', 'NIGHT_DEFENSE', 'RED_NIGHT', 'TRUCE_NIGHT'].includes(next.phase)) next.phase = next.timeOfDay >= 0.68 ? 'NIGHT_DEFENSE' : 'DAY_EXPLORE';
  if (next.units.some(u => !ROLES.includes(u.role)) || next.enemies.some(e => !ENEMY_CATALOG[e.type])) throw new Error('La partida contiene unidades desconocidas.');
  next.units.forEach(ensurePerson);
  for (const unit of next.units) {
    const order = unit.kitOrder;
    if (order && (!unit.equipment || !['weapon', 'armor'].includes(order.piece) || ![2, 3].includes(order.rank) ||
      order.rank !== unit.equipment[order.piece] + 1 || order.cost !== (order.piece === 'weapon' ? 2 : 3) + order.rank)) unit.kitOrder = null;
    const grief = unit.grief;
    if (grief && (typeof grief.name !== 'string' || !Number.isFinite(grief.remaining) || !Number.isFinite(grief.duration) ||
      grief.remaining <= 0 || grief.remaining > grief.duration)) unit.grief = null;
    if (unit.leisure && (!['STROLL', 'BATHE', 'PLAY', 'LEAVE', 'MOURN'].includes(unit.leisure.kind) ||
      !Number.isFinite(unit.leisure.x) || !Number.isFinite(unit.leisure.remaining) || !Number.isFinite(unit.leisure.expiresAt))) unit.leisure = null;
  }
  restoreCommunity(next);
  next.enemies.forEach(e=>{if(e.type==='BANDOLERO')e.range=ENEMY_CATALOG.BANDOLERO.range;});
  ensureSettlement(next);
  ensureEcology(next);
  // Add new tool stations to old worlds without replacing their existing stocks.
  for (const rack of defaults.toolRacks) if (!next.toolRacks.some(r=>r.id===rack.id)) next.toolRacks.push(clone(rack));
  next.toolRacks.forEach(r=>{r.x=STATION_X[r.role]??r.x;});
  const campaign = ensureCampaign(next);
  if (!Array.isArray(campaign.orders) || !Array.isArray(campaign.letters) || campaign.orders.some(o => !ENEMY_CATALOG[o.type] || !Number.isFinite(o.eta) || ![-1,1].includes(o.side))) throw new Error('La ruta de campaña está dañada.');
  if (save.save_version < 3 && next.timeOfDay >= .68) campaign.lastRaidDay = next.day;
  const checkNumbers = value => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('La partida contiene números inválidos.');
    if (value && typeof value === 'object') Object.values(value).forEach(checkNumbers);
  };
  checkNumbers(next);
  if(save.snapshot?.state?.benkos?.attackDuration===undefined){next.benkos.attackTimer=0;next.benkos.attackCooldown=0;next.benkos.attackHit=true;next.benkos.queuedAttack=false;}
  next.benkos.vx = 0; next.benkos.sprintHoldTime = 0;
  next.touchHoldPay = false;
  next.cameraX = next.benkos.x;
  let maxId = Math.max(0, ...[...next.units, ...next.enemies, ...next.droppedCoins, ...next.wildlife, ...next.community.memorial].map(e => Number(e?.id) || 0));
  let nextId=Math.max(maxId+1,number(save.snapshot?.nextEntityId,1,1));
  if(migrateEcology)seedEcology(next,()=>nextId++);
  return {state:next,nextEntityId:nextId};
}
