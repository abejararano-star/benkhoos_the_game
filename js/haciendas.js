import { BALANCE } from './config.js?v=dd4c4df65f03';

const PRISONERS = [-23, 0, 23];
const REBUILD_TIME = 180;
const campaignTime = state => (state.day - 1 + state.timeOfDay) * BALANCE.dayDuration;
export const haciendaActive = hacienda => !hacienda.destroyed || hacienda.reoccupied === true;

export function restoreHaciendas(state) {
  for (const hacienda of state.haciendas) {
    if (!hacienda.destroyed) continue;
    hacienda.reoccupied = hacienda.reoccupied === true && hacienda.hp > 0;
    if (!hacienda.reoccupied) {
      hacienda.hp = 0;
      if (!Number.isFinite(hacienda.rebuildAt)) hacienda.rebuildAt = campaignTime(state) + REBUILD_TIME;
    }
  }
  for (const unit of state.units) {
    if (unit.role !== 'FUGITIVO') continue;
    const assigned = state.haciendas.find(h => h.id === unit.captiveHacienda);
    if (assigned && haciendaActive(assigned)) continue;
    const hacienda = assigned ?? state.haciendas.slice().sort((a, b) => Math.abs(a.x - unit.x) - Math.abs(b.x - unit.x))[0];
    if (hacienda && haciendaActive(hacienda)) {
      const held = state.units.filter(person => person.captiveHacienda === hacienda.id).length;
      unit.captiveHacienda = hacienda.id;
      unit.x = hacienda.x + PRISONERS[held % PRISONERS.length];
      unit.vx = 0;
    } else releaseCaptive(state, unit);
  }
}

export function updateHaciendas(state, spawnCaptive, distanceFromView = 440) {
  for (const hacienda of state.haciendas) {
    const offScreen = Math.min(Math.abs(state.cameraX - hacienda.x), Math.abs(state.benkos.x - hacienda.x)) > distanceFromView;
    if (!haciendaActive(hacienda) && campaignTime(state) >= hacienda.rebuildAt && offScreen) {
      hacienda.reoccupied = true;
      hacienda.hp = hacienda.maxHp;
      hacienda.captivesPlaced = false;
    }
    if (!haciendaActive(hacienda) || hacienda.captivesPlaced) continue;
    const existing = state.units.filter(unit => unit.captiveHacienda === hacienda.id && unit.role === 'FUGITIVO').length;
    for (const offset of PRISONERS.slice(existing)) {
      const unit = spawnCaptive(hacienda.x + offset);
      unit.captiveHacienda = hacienda.id;
    }
    hacienda.captivesPlaced = true;
  }
}

function releaseCaptive(state, unit) {
  delete unit.captiveHacienda;
  unit.role = 'ALDEANO';
  unit.escortHome = true;
  unit.liberateAnimTimer = 1.2;
  unit.vx = 0;
  state.fugitivesFreed++;
}

export function conquerHacienda(state, hacienda) {
  const first = !hacienda.destroyed;
  hacienda.hp = 0;
  hacienda.destroyed = true;
  hacienda.reoccupied = false;
  hacienda.rebuildAt = campaignTime(state) + REBUILD_TIME;
  const captives = state.units.filter(unit => unit.role === 'FUGITIVO' && unit.captiveHacienda === hacienda.id);
  for (const captive of captives) releaseCaptive(state, captive);
  return { first, captives };
}
