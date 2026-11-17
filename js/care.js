import { STATION_X } from './config.js?v=756398033889';

export const CARE_ROLES = ['CURANDERO', 'BRUJO'];

function available(unit) {
  return unit.hp > 0 && !unit.requestedRole && !unit.waterFall && !unit.escortHome;
}

export function healerAtCamp(state) {
  return state.units.some(unit => unit.role === 'CURANDERO' && available(unit));
}

export function addWound(actor, severity) {
  actor.wound = Math.min(3, (actor.wound ?? 0) + severity);
}

export function recoverHealth(unit, amount) {
  if (unit.hp > 0 && !(unit.wound > 0)) unit.hp = Math.min(unit.maxHp, unit.hp + amount);
}

export function staffCareStation(unit, dt) {
  const dx = STATION_X[unit.role] - unit.x;
  unit.activity = 'CARE';
  unit.mood = unit.role === 'CURANDERO' ? 'Preparando vendajes en la botica' : 'Preparando el ritual';
  unit.vx = Math.abs(dx) > 5 ? Math.sign(dx) * 62 : 0;
  if (unit.vx) {
    unit.facing = Math.sign(unit.vx);
    unit.x += unit.vx * dt;
  }
}

export function provideCare(state, dt, onBandaged) {
  const b = state.benkos;
  for (const worker of state.units) {
    if (!CARE_ROLES.includes(worker.role) || !available(worker) || worker.hurtTimer > 0 ||
      Math.abs(worker.x - STATION_X[worker.role]) > 8 ||
      state.enemies.some(enemy => enemy.hp > 0 && !enemy.waterFall && !(enemy.appearTimer > 0) &&
        Math.abs(enemy.x - worker.x) < 180)) continue;
    const playerNear = !b.waterFall && !b.attackTimer && !b.hurtTimer && Math.abs(b.vx) < 15 && Math.abs(worker.x - b.x) < 32;
    if (worker.role === 'CURANDERO') {
      const patient = playerNear && b.wound > 0 ? b : state.units.filter(unit =>
        unit.hp > 0 && unit.role !== 'FUGITIVO' && !unit.waterFall && !unit.hurtTimer &&
        Math.abs(unit.x - worker.x) < 42 && (unit.wound > 0 || unit.hp < unit.maxHp * .9)
      ).sort((a, b) => (b.wound ?? 0) - (a.wound ?? 0) || a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (!patient) continue;
      if (patient.wound > 0) {
        patient.wound = Math.max(0, patient.wound - dt * .4);
        if (patient.wound === 0) onBandaged?.(patient);
      }
      if (patient !== b) recoverHealth(patient, dt * 12);
      worker.activity = 'TREAT';
      worker.mood = 'Vendando a ' + (patient === b ? 'Benkos' : patient.name);
    } else {
      if (playerNear && !b.wound) b.spirit = Math.min(b.maxSpirit, b.spirit + dt * 8);
      for (const unit of state.units) {
        if (unit.hp <= 0 || unit.role === 'FUGITIVO' || unit.waterFall || Math.abs(unit.x - worker.x) > 130) continue;
        unit.fear = Math.max(0, unit.fear - dt * 10);
        recoverHealth(unit, dt * 2.5);
      }
      worker.activity = 'RITUAL';
      worker.mood = 'Aliviando el miedo de quienes se acercan';
    }
  }
}
