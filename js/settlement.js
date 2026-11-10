import { ALTAR_X } from './exploration.js?v=48baf0700084';
import { CAMP_EDGE } from './config.js?v=48baf0700084';

const UPGRADE_COSTS = [null, null, [6, 4, 0, 5], [8, 8, 3, 6], [12, 12, 8, 8], [16, 18, 14, 10]];
export const MATERIALS = ['Palma y bejuco', 'Madera de ceiba', 'Bahareque y cal', 'Piedra y teja', 'Cantería tallada'];
export const HQ_NAMES = ['Refugio de la Matuna', 'Casa del consejo', 'Casa de bahareque', 'Cabildo de piedra', 'Gran Palenque'];
export const ALTAR_HEIGHT = [0, 53, 57, 65, 73, 83];
export const altarSprite = level => level === 1 ? 'landmark_altar' : `altar_${level}`;
export const HQ_X = 0;
export const TOWER_TIERS = Object.freeze([
  { name: 'Puesto sin construir', height: 0, range: 200, damage: 1, cooldown: 1 },
  { name: 'Atalaya de madera', height: 51, range: 250, damage: 1.10, cooldown: .96 },
  { name: 'Torre de piedra y madera', height: 66, range: 290, damage: 1.27, cooldown: .87 },
  { name: 'Torre almenada', height: 82, range: 330, damage: 1.48, cooldown: .76 }
]);
export const TOWER_HEIGHT = TOWER_TIERS.map(tower => tower.height);
const WORK_REACH = 18;

export function initialSettlement() {
  return { level: 1, homes: [{ id: 'home_west', x: -890, level: 1 }, { id: 'home_inner', x: -150, level: 1 },
    { id: 'home_east', x: 890, level: 1 }],
    towers: [-1, 1].map(side => ({ id: side < 0 ? 'tower_west' : 'tower_east', x: side * (CAMP_EDGE - 75), side, level: 0 })),
    deposits: {}, projects: [], completed: 0 };
}

export function buildingTarget(state, kind, id) {
  if (kind === 'hq' && (!id || id === 'hq')) return { id: 'hq', x: HQ_X, level: state.settlement.level };
  if (kind === 'home') return state.settlement.homes.find(home => home.id === id);
  if (kind === 'tower') return state.settlement.towers.find(tower => tower.id === id);
  if (kind === 'wall') return state.walls.find(wall => wall.id === id);
  if (kind === 'farm') return state.farms.find(farm => farm.id === id);
  if (kind === 'rack') return state.toolRacks.find(rack => rack.id === id);
  if (kind === 'altar' && id === 'node_altar') return { id, x: ALTAR_X, level: state.altarTier };
}

export function ensureSettlement(state) {
  state.resources ??= { wood: 8, stone: 4, food: 5 };
  state.resources.food ??= 5;
  state.settlement ??= initialSettlement();
  const s = state.settlement;
  if (typeof s !== 'object' || Array.isArray(s) || typeof state.resources !== 'object' || Array.isArray(state.resources)) throw Error('Recursos del palenque inválidos.');
  if (!Array.isArray(s.homes) || s.homes.length !== 3 || !Array.isArray(s.projects) || s.projects.length > 32) throw Error('Las obras del palenque están dañadas.');
  const level = value => Math.max(1, Math.min(5, Math.floor(Number(value) || 1)));
  s.level = level(s.level);
  const homeIds = initialSettlement().homes.map(home => home.id);
  for (const home of s.homes) {
    if (!home || !homeIds.includes(home.id) || !Number.isFinite(home.x)) throw Error('Vivienda inválida.');
    home.level = level(home.level);
  }
  if (new Set(s.homes.map(home => home.id)).size !== 3) throw Error('Viviendas duplicadas.');
  const savedTowers = Array.isArray(s.towers) ? s.towers : [];
  s.towers = initialSettlement().towers.map(tower => {
    const saved = savedTowers.find(entry => entry?.id === tower.id);
    return { ...tower, level: Number.isInteger(saved?.level) ? Math.max(0, Math.min(3, saved.level)) : 0 };
  });
  for (const key of ['wood', 'stone', 'food']) state.resources[key] = Math.max(0, Math.min(100000, Math.floor(Number(state.resources[key]) || 0)));
  s.completed = Math.max(0, Number(s.completed) || 0);

  const oldBarracks = s.barracks;
  const oldHouseLevel = s.level;
  if (oldBarracks) s.level = Math.max(s.level, level(oldBarracks.level));
  const migrated = [];
  for (const job of s.projects) {
    if (!job || !Number.isFinite(job.duration) || job.duration <= 0 || !Number.isFinite(job.progress) || job.progress < 0 || job.progress > 1) throw Error('Proyecto de construcción inválido.');
    if (oldBarracks && (job.kind === 'barracks' || job.kind === 'hq')) {
      const x = job.kind === 'barracks' ? oldBarracks.x : HQ_X;
      const id = job.kind === 'barracks' ? oldBarracks.id : 'hq';
      const previousLevel = job.kind === 'barracks' ? level(oldBarracks.level) : oldHouseLevel;
      if (job.x !== x || job.targetId !== id || job.targetLevel !== previousLevel + 1 || job.targetLevel > 5) throw Error('Obra del cuartel inválida.');
      if (job.targetLevel <= s.level) {
        const factor = job.kind === 'barracks' ? .55 : 1;
        const [coins, wood, stone] = UPGRADE_COSTS[job.targetLevel].map(value => Math.ceil(value * factor));
        state.treasuryCoins += coins;
        state.resources.wood += wood;
        state.resources.stone += stone;
        continue;
      }
      migrated.push({ ...job, id: `hq_${job.targetLevel}`, kind: 'hq', targetId: 'hq', x: HQ_X,
        duration: Math.min(job.duration, UPGRADE_COSTS[job.targetLevel][3]) });
    } else migrated.push(job);
  }
  delete s.barracks;
  const headquarters = migrated.filter(job => job.kind === 'hq').sort((a, b) => b.targetLevel - a.targetLevel || b.progress - a.progress);
  s.projects = oldBarracks ? [...migrated.filter(job => job.kind !== 'hq'), ...headquarters.slice(0, 1)] : migrated;
  if (new Set(s.projects.map(job => job.targetId)).size !== s.projects.length) throw Error('Obras duplicadas.');
  for (const job of s.projects) {
    const target = buildingTarget(state, job.kind, job.targetId);
    const max = job.kind === 'farm' ? 2 : job.kind === 'tower' ? 3 : 5;
    const validLevel = job.kind === 'rack' ? job.targetLevel === null :
      Number.isInteger(job.targetLevel) && job.targetLevel <= max && job.targetLevel === target?.level + (job.repair ? 0 : 1);
    if (!target || target.id !== job.targetId || job.x !== target.x || !validLevel || (job.repair && job.kind !== 'wall')) throw Error('Destino de construcción inválido.');
    delete job.working;
  }

  const oldDeposits = s.deposits;
  s.deposits = {};
  for (const [kind, id] of [['hq', 'hq'], ...homeIds.map(id => ['home', id]), ...s.towers.map(tower => ['tower', tower.id])]) {
    const cost = upgradeInfo(state, kind, id).coins ?? 0;
    const paid = oldDeposits?.[id];
    if (cost > 1 && Number.isInteger(paid) && paid > 0) s.deposits[id] = Math.min(cost - 1, paid);
  }
  return s;
}

export const constructionAt = (state, id) => state.settlement.projects.find(job => job.targetId === id);

export function upgradeInfo(state, kind, id) {
  const target = buildingTarget(state, kind, id);
  if (!target) return { reason: 'No existe este edificio.' };
  const next = target.level + 1;
  const costs = kind === 'tower' ? [null, [5, 3, 0, 5], [7, 4, 2, 6], [9, 4, 5, 8]][next] : UPGRADE_COSTS[next];
  const job = constructionAt(state, target.id);
  if (job) return { target, job, reason: 'Obra en marcha.' };
  if (!costs) return { target, reason: 'Evolución máxima alcanzada.' };
  const [coins, wood, stone, duration] = kind === 'hq' ? [costs[0], 0, 0, costs[3]] :
    kind === 'tower' ? costs : costs.map(value => Math.ceil(value * .55));
  const paid = state.settlement.deposits[target.id] ?? 0;
  let reason = '';
  if ((kind === 'home' || kind === 'tower') && next > state.settlement.level) reason = `Requiere Casa del Cuartel de nivel ${next}.`;
  else if (state.resources.wood < wood || state.resources.stone < stone) reason = 'Faltan materiales para iniciar la obra.';
  return { target, next, coins, paid, wood, stone, duration, reason };
}

export function queueConstruction(state, kind, target, targetLevel, duration, repair = false) {
  const job = { id: `${target.id}_${targetLevel ?? 'forja'}`, kind, targetId: target.id, x: target.x, targetLevel, duration, progress: 0 };
  if (repair) job.repair = true;
  state.settlement.projects.push(job);
  return job;
}

export function requestBuilding(state, kind, id) {
  const info = upgradeInfo(state, kind, id);
  if (info.reason) return { success: false, message: info.reason };
  if (state.coins < 1) return { success: false, message: 'Necesitas un real en la bolsa.' };
  const paid = info.paid + 1;
  state.coins--;
  if (paid < info.coins) {
    state.settlement.deposits[info.target.id] = paid;
    return { success: true, paid, message: `${paid} de ${info.coins} reales aportados.` };
  }
  delete state.settlement.deposits[info.target.id];
  state.resources.wood -= info.wood;
  state.resources.stone -= info.stone;
  queueConstruction(state, kind, info.target, info.next, info.duration);
  return { success: true, paid, message: `Obra pagada. Requiere ${info.duration} s de trabajo de un constructor.` };
}

export function constructionStatus(state, job) {
  if (job.working) return 'En obra';
  if (job.kind === 'rack' && job.targetId === 'rack_hammer') return 'Esperando al forjador';
  return state.units.some(unit => unit.role === 'CONSTRUCTOR' && unit.hp > 0)
    ? 'Esperando al constructor' : 'Requiere un constructor';
}

export function advanceConstruction(state, dt, onComplete) {
  const settlement = state.settlement;
  if (!settlement.projects.length) return;
  const builders = state.units.filter(unit => unit.hp > 0 && unit.activity === 'BUILD' && unit.constructionJob);
  for (let index = settlement.projects.length - 1; index >= 0; index--) {
    const job = settlement.projects[index];
    job.working = builders.some(unit => unit.constructionJob === job.id && Math.abs(unit.x - job.x) <= WORK_REACH &&
      (unit.role === 'CONSTRUCTOR' || job.kind === 'rack' && job.targetId === 'rack_hammer'));
    if (!job.working) continue;
    job.progress = Math.min(1, job.progress + dt / job.duration);
    if (job.progress < 1 - 1e-8) continue;
    const target = buildingTarget(state, job.kind, job.targetId);
    if (job.kind === 'hq') settlement.level = job.targetLevel;
    else if (job.kind === 'altar') {
      state.altarTier = job.targetLevel;
      state.skills.find(skill => skill.level === job.targetLevel).unlocked = true;
    }
    else if (job.kind === 'rack') target.stock = Math.min(target.maxStock, target.stock + 1);
    else {
      target.level = job.targetLevel;
      if (job.kind === 'wall') {
        if (!job.repair) target.maxHp = 150 + target.level * 90;
        target.hp = target.maxHp;
      }
    }
    settlement.projects.splice(index, 1);
    settlement.completed++;
    onComplete?.(job);
  }
}

export function workConstruction(unit, state, dt, reserved = new Set(), onlyJob = null) {
  delete unit.constructionJob;
  let job = null;
  for (const candidate of state.settlement.projects) {
    if (reserved.has(candidate.id) || onlyJob && candidate !== onlyJob) continue;
    if (!job || Math.abs(candidate.x - unit.x) < Math.abs(job.x - unit.x)) job = candidate;
  }
  if (!job) { unit.vx = 0; unit.activity = 'IDLE'; unit.mood = 'Esperando una obra'; return null; }
  reserved.add(job.id);
  const dx = job.x - unit.x;
  if (Math.abs(dx) > WORK_REACH) {
    unit.activity = 'DELIVER'; unit.mood = 'Llevando materiales';
    unit.vx = Math.sign(dx) * 82;
    unit.facing = Math.sign(dx);
    unit.x += Math.sign(dx) * Math.min(Math.abs(dx), 82 * dt);
    return null;
  }
  unit.constructionJob = job.id;
  unit.vx = 0;
  unit.facing = Math.sign(dx) || unit.facing || 1;
  unit.activity = 'BUILD';
  unit.mood = 'Levantando el palenque';
  return job;
}

export function homeRecovery(state) {
  return 1 + state.settlement.homes.reduce((sum, home) => sum + home.level - 1, 0) * .15;
}
