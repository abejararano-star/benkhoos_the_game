import { CAMP_EDGE, PLAZA } from './config.js?v=bf41c5a26f23';
import { canTendCrop } from './crops.js?v=bf41c5a26f23';
import { roleAvailable } from './people.js?v=bf41c5a26f23';
import { threatensMilitia } from './combat.js?v=bf41c5a26f23';

const DUTY = new Set(['GUERRERO', 'ESPADACHIN', 'ARQUERO', 'CABALLERO_ALIADO', 'CAMPEON_REAL', 'CAZADOR', 'CURANDERO', 'BRUJO', 'MINERO']);
export const initialFestivity = () => ({ clock: 0, mode: 'REST', x: PLAZA.dayX, attendees: [],
  watch: 0, dance: 0, kiss: 0, kissCooldown: 12, line: '', nextLine: 0 });

// A three-day cycle: first day, midday music; second day, an evening gathering.
// The remaining hours belong to the town crier. The alarm always takes priority.
export function festivalProgram(state) {
  const t = state.timeOfDay;
  if (state.status !== 'playing' || state.phase === 'RED_NIGHT' ||
      state.enemies.some(e => e.hp > 0 && !e.waterFall && Math.abs(e.x) < CAMP_EDGE + 100) ||
      state.wildlife.some(a => threatensMilitia(a) && Math.abs(a.x) < CAMP_EDGE)) return 'SHELTER';
  if (state.day % 3 === 1 && t >= .28 && t < .46 || state.day % 3 === 2 && t >= .76 && t < .92) return 'MUSIC';
  if (t >= .15 && t < .63 || t >= .76 && t < .92) return 'PROCLAIM';
  return 'REST';
}

export function heraldLines(state) {
  const lines = ['¡Oigan, vecinas y vecinos! La Matuna sigue en pie.',
    'Aquí cada mano libre tiene un lugar en el palenque.'];
  if (state.fugitivesFreed > 0) lines.push(`¡Benkos y su gente han liberado a ${state.fugitivesFreed} personas!`);
  if (state.enemiesDefeated > 0) lines.push(`¡${state.enemiesDefeated} enemigos vencidos en la resistencia!`);
  if (state.story.outposts.length) lines.push(`¡Ya son ${state.story.outposts.length} avanzadas recuperadas!`);
  if (state.settlement.completed > 0) lines.push('¡Nuevas obras levantadas por las manos del palenque!');
  return lines;
}

function healthyAndFree(unit, state) {
  return unit.hp >= unit.maxHp * .8 && !unit.wound && !unit.grief && unit.fatigue < 65 && unit.fear < 20 &&
    !(unit.hurtTimer > 0) && !unit.waterFall && !unit.escortHome && !(unit.liberateAnimTimer > 0) &&
    !unit.carryingSack && !unit.cargoWood && !unit.recoveredCoins && !unit.requestedRole && !unit.kitOrder &&
    !unit.pendingShot && !unit.pendingStrike && !(unit.attackAnimTimer > 0) && !unit.leisure && !unit.socialPose &&
    !state.story.expedition?.party.includes(unit.id) && Math.abs(unit.x) < CAMP_EDGE - 80;
}

export function freeForFestival(unit, state) {
  if (!healthyAndFree(unit, state) || unit.role === 'FUGITIVO' || DUTY.has(unit.role)) return false;
  if (unit.namedAmara) return state.amara.leads && !state.amara.order && !(state.amara.managing && state.amara.budget > 0);
  if (unit.role === 'CONSTRUCTOR') return !state.settlement.projects.length;
  if (unit.role === 'LENADOR') return !state.trees.some(tree => tree.markedForChop && !tree.chopped);
  if (unit.role === 'AGRICULTOR') return !state.farms.some(canTendCrop);
  return unit.role === 'ALDEANO' && !state.toolRacks.some(rack => rack.stock > 0 && roleAvailable(rack.role, state.armyTier));
}

export function updateFestivity(state, dt, controls = {}) {
  const f = state.festivity ??= initialFestivity();
  f.clock += dt;
  const mode = festivalProgram(state);
  if (f.mode !== mode) { f.attendees = []; f.nextLine = 0; f.line = ''; }
  f.mode = mode;
  const active = mode === 'MUSIC' || mode === 'PROCLAIM';
  const target = active ? state.timeOfDay >= .68 ? PLAZA.nightX : PLAZA.dayX : -135;
  f.x += Math.sign(target - f.x) * Math.min(Math.abs(target - f.x), dt * 42);
  const b = state.benkos;
  b.festivalClock = f.clock;
  b.festivalDance = false;
  const watching = mode === 'MUSIC' && b.x >= PLAZA.watchLeft && b.x <= PLAZA.watchRight && b.facing < 0 &&
    Math.abs(b.vx) < 3 && !b.mounted && !b.waterFall && !b.attackTimer && !b.dashTimer &&
    !b.hurtTimer && !b.hurtKneelTimer && !b.payTimer && !b.interaction && !b.resting && !controls.busy;
  f.watch = watching ? f.watch + dt : 0;
  const leader = state.units.find(u => u.id === state.amara.id && u.namedAmara && freeForFestival(u, state));
  f.invitedLeader = !!leader && watching && f.watch >= 2;
  f.leaderX = Math.min(PLAZA.watchRight + 20, b.x + 25);
  const together = f.invitedLeader && f.watch >= 4 && Math.abs(leader.x - f.leaderX) < 4 &&
    Math.abs(leader.x - b.x) <= 35;
  b.festivalDance = !!together;
  f.dance = together ? f.dance + dt : 0;
  f.kissCooldown = Math.max(0, f.kissCooldown - (together ? dt : 0));
  f.kiss = together && state.amara.bond === 'partners' ? Math.max(0, f.kiss - dt) : 0;
  if (together && state.amara.bond === 'partners' && f.kissCooldown === 0 && !f.kiss) {
    f.kiss = 2.4;
    f.kissCooldown = 28 + state.day % 4 * 3;
  }
  b.festivalKiss = f.kiss;
  if (active && f.clock >= f.nextLine) {
    const lines = mode === 'PROCLAIM' ? heraldLines(state) : ['Tambor y semillas · Música de la Matuna'];
    const cycle = Math.floor(f.clock / 9);
    f.line = lines[cycle % lines.length];
    f.nextLine = f.clock + 9;
  }
  f.attendees = f.attendees.filter(entry => {
    const unit = state.units.find(u => u.id === entry.id);
    return active && unit && freeForFestival(unit, state) && !unit.namedAmara && entry.until > f.clock &&
      (!watching || Math.abs(entry.x - b.x) > 31 && Math.abs(entry.x - f.leaderX) > 23);
  });
}

export function joinFestivity(unit, state, dt) {
  const f = state.festivity;
  const active = f.mode === 'MUSIC' || f.mode === 'PROCLAIM';
  if (!active || !freeForFestival(unit, state)) return false;
  let target;
  if (unit.namedAmara) {
    if (!f.invitedLeader) return false;
    target = f.leaderX;
  } else {
    let seat = f.attendees.find(entry => entry.id === unit.id);
    if (!seat) {
      if (f.clock < (unit.nextFestivalAt ?? 0) || f.attendees.length >= 4) return false;
      const occupied = new Set(f.attendees.map(entry => entry.x));
      const slot = PLAZA.seats.find(x => !occupied.has(x) && (!f.watch ||
        Math.abs(x - state.benkos.x) > 31 && Math.abs(x - f.leaderX) > 23));
      if (slot === undefined) return false;
      seat = { id: unit.id, x: slot, until: f.clock + 32 };
      f.attendees.push(seat);
      unit.nextFestivalAt = f.clock + 65 + unit.id % 13;
    }
    target = seat.x;
  }
  const dx = target - unit.x;
  unit.festivalClock = f.clock;
  unit.vx = Math.abs(dx) > 3 ? Math.sign(dx) * 58 : 0;
  if (unit.vx) {
    unit.x += Math.sign(dx) * Math.min(Math.abs(dx), 58 * dt);
    unit.facing = Math.sign(dx);
    unit.activity = 'WALK';
    unit.mood = f.mode === 'MUSIC' ? 'Camino a la música' : 'Acercándose al pregón';
  } else {
    unit.facing = -1;
    unit.activity = f.mode === 'MUSIC' ? 'DANCE' : 'LISTEN';
    unit.mood = unit.namedAmara ? 'Bailando junto a Benkos' : f.mode === 'MUSIC' ? 'Bailando en la plaza' : 'Escuchando las hazañas del palenque';
    unit.fatigue = Math.max(0, unit.fatigue - dt * 1.3);
    unit.festivalKiss = unit.namedAmara ? f.kiss : 0;
  }
  return true;
}

// Gatherings are ephemeral; loading never resumes a kiss or overrides controls.
export function restoreFestivity(state) {
  state.festivity = initialFestivity();
  for (const unit of state.units) {
    delete unit.nextFestivalAt;
    delete unit.festivalKiss;
    delete unit.festivalClock;
    if (['DANCE', 'LISTEN'].includes(unit.activity)) { unit.activity = 'IDLE'; unit.vx = 0; }
  }
  state.benkos.festivalDance = false;
  state.benkos.festivalKiss = 0;
}
