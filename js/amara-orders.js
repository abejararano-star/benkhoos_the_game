import { TOOL_COSTS } from './config.js?v=bf41c5a26f23';
import { affinity, requestProfession, roleAvailable, speak } from './people.js?v=bf41c5a26f23';
import { applyBuildingPayment, constructionAt, queueConstruction, upgradeInfo } from './settlement.js?v=bf41c5a26f23';

const reserveCap = 99;
export const readBudget = saved => Number.isSafeInteger(saved) ? Math.max(0, Math.min(reserveCap, saved)) : 0;

export function transferAmaraBudget(state, amount) {
  if (!state.amara.leads || !state.units.some(u => u.namedAmara && u.hp > 0 && u.role !== 'FUGITIVO')) return 'Amara debe dirigir el palenque.';
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > state.coins) return 'Elige una cantidad de reales que tengas en la bolsa.';
  if (state.amara.budget + amount > reserveCap) return 'La reserva de Amara admite hasta 99 reales.';
  state.coins -= amount;
  state.amara.budget += amount;
  state.amara.managing = true;
  return `Entregaste ${amount} ${amount === 1 ? 'real' : 'reales'} a Amara.`;
}

export function returnAmaraBudget(state) {
  const amount = state.amara.budget;
  state.treasuryCoins += amount;
  state.amara.budget = 0;
  state.amara.order = null;
  return amount;
}

const ready = unit => unit.hp > 0 && !unit.waterFall && !unit.escortHome && !unit.requestedRole;
const dangerAt = (enemies, x) => enemies.some(enemy => Math.abs(enemy.x - x) < 210);

function plans(state) {
  const units = state.units.filter(ready);
  const builders = units.filter(unit => unit.role === 'CONSTRUCTOR');
  const count = role => units.filter(unit => unit.role === role).length;
  const applicants = state.units.filter(unit => unit.hp > 0 && unit.requestedRole);
  const candidates = [];
  function building(kind, id, priority, title) {
    const info = upgradeInfo(state, kind, id);
    if (info.reason || info.paid) return;
    candidates.push({ kind, id, x: info.target.x, cost: info.coins, priority, title,
      finish: () => applyBuildingPayment(state, kind, info, info.coins) });
  }
  const volunteers = units.filter(unit => unit.role === 'ALDEANO' && !unit.namedAmara && !unit.carryingSack && !unit.recoveredCoins);
  const wounded = units.some(unit => unit.wound > 0) || state.benkos.wound > 0;
  for (const rack of state.toolRacks) {
    if (rack.filledSlots || rack.stock >= rack.maxStock || !roleAvailable(rack.role, state.armyTier)) continue;
    const waiting = applicants.filter(unit => unit.requestedRole === rack.role).length;
    const missingBuilder = !builders.length && rack.role === 'CONSTRUCTOR';
    const missingHealer = wounded && rack.role === 'CURANDERO' && !count('CURANDERO');
    if (rack.stock >= Math.max(waiting, volunteers.length ? 1 : 0)) continue;
    const priority = waiting > rack.stock || missingBuilder || missingHealer ? 90 : count(rack.role) === 0 ? 50 : 24;
    candidates.push({ kind: 'rack', id: rack.id, x: rack.x, cost: TOOL_COSTS[rack.role], priority,
      title: rack.label, finish: () => {
        rack.stock++;
        if (!waiting && (missingBuilder || missingHealer) && volunteers.length) {
          const worker = volunteers.reduce((best, unit) => affinity(unit, rack.role) > affinity(best, rack.role) ? unit : best);
          requestProfession(worker, rack.role, state);
        }
      } });
  }
  if (builders.length > state.settlement.projects.length) {
    for (const wall of state.walls) {
      if (!wall.level || wall.filledSlots || constructionAt(state, wall.id)) continue;
      const repair = wall.hp < wall.maxHp * .75;
      if (!repair && (wall.level >= 5 || wall.level >= state.settlement.level)) continue;
      candidates.push({ kind: 'wall', id: wall.id, x: wall.x, cost: repair ? 2 : wall.level * 2 + 1,
        title: repair ? 'Reparación de muralla' : 'Mejora de muralla', priority: repair ? 110 : 65,
        finish: () => queueConstruction(state, 'wall', wall, repair ? wall.level : wall.level + 1, repair ? 3 : 4 + wall.level, repair) });
    }
    building('hq', 'hq', 62 - state.settlement.level * 3, 'Casa del Cuartel');
    for (const tower of state.settlement.towers) {
      if (!units.some(unit => unit.role === 'ARQUERO' && unit.assignedSide === tower.side)) continue;
      building('tower', tower.id, 72 - tower.level * 9, 'Torre de vigilancia');
    }
    for (const home of state.settlement.homes) building('home', home.id, 44 - home.level * 5, 'Vivienda');
  }
  return candidates;
}

export function managePalenque(leader, state, dt, enemies, notify) {
  const { amara } = state;
  if (!amara.leads || !amara.managing || !amara.budget || state.phase !== 'DAY_EXPLORE') {
    amara.order = null;
    return false;
  }
  amara.reviewIn = Math.max(0, (amara.reviewIn ?? 0) - dt);
  if (!amara.order) {
    if (amara.reviewIn > 0) return false;
    amara.reviewIn = 2;
    const available = plans(state).filter(plan => plan.cost <= amara.budget && !dangerAt(enemies, plan.x));
    const plan = available.sort((a, b) => b.priority - a.priority || Math.abs(a.x - leader.x) - Math.abs(b.x - leader.x))[0];
    if (!plan) return false;
    const { kind, id, x, title } = plan;
    amara.order = { kind, id, x, title };
  }
  const { order } = amara;
  if (dangerAt(enemies, order.x) || dangerAt(enemies, leader.x)) {
    amara.order = null;
    return false;
  }
  const dx = order.x - leader.x;
  if (Math.abs(dx) > 12) {
    leader.facing = Math.sign(dx);
    leader.vx = leader.facing * 73;
    leader.x += leader.facing * Math.min(Math.abs(dx), 73 * dt);
    leader.activity = 'WALK';
    leader.mood = order.title;
    return true;
  }
  amara.order = null;
  amara.reviewIn = 4;
  const plan = plans(state).find(item => item.kind === order.kind && item.id === order.id);
  if (!plan || plan.cost > amara.budget) return false;
  plan.finish();
  amara.budget -= plan.cost;
  amara.lastExpense = `${plan.title} · ${plan.cost} ${plan.cost === 1 ? 'real' : 'reales'}`;
  leader.vx = 0;
  leader.activity = 'LEAD';
  leader.mood = plan.title;
  speak(leader, plan.kind === 'rack' ? 'Ya pueden recoger el equipo.' : 'La cuadrilla ya tiene una obra.');
  notify?.(leader.x, amara.lastExpense);
  return true;
}
