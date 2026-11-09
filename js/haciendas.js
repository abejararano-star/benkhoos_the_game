import { BALANCE } from './config.js?v=78e42e07133a';
import { estateById } from './story.js?v=78e42e07133a';

const PRISONERS = [-23, 0, 23];
const LARGE_PRISON = [-49, -30, -10, 10, 30, 49];
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
    const hacienda = assigned ?? state.haciendas.filter(h => !h.major).sort((a, b) => Math.abs(a.x - unit.x) - Math.abs(b.x - unit.x))[0];
    if (hacienda && haciendaActive(hacienda)) {
      const held = state.units.filter(person => person.captiveHacienda === hacienda.id).length;
      unit.captiveHacienda = hacienda.id;
      unit.x = hacienda.x + PRISONERS[held % PRISONERS.length];
      unit.vx = 0;
    } else releaseCaptive(state, unit);
  }
}

export function updateHaciendas(state, spawnCaptive, distanceFromView = 440, spawnGuard) {
  for (const hacienda of state.haciendas) {
    if (hacienda.major && (state.story.completed.includes(hacienda.id) || state.story.expedition?.site !== hacienda.id && !hacienda.destroyed)) continue;
    if (state.story.expedition?.site === hacienda.id && state.story.expedition.stage === 'return') continue;
    const offScreen = Math.min(Math.abs(state.cameraX - hacienda.x), Math.abs(state.benkos.x - hacienda.x)) > distanceFromView;
    if (!haciendaActive(hacienda) && campaignTime(state) >= hacienda.rebuildAt && offScreen) {
      hacienda.reoccupied = true;
      hacienda.hp = hacienda.maxHp;
      hacienda.captivesPlaced = false;
      hacienda.garrisonPlaced = false;
    }
    if (!haciendaActive(hacienda)) continue;
    if (!hacienda.captivesPlaced) {
      const positions = hacienda.major ? LARGE_PRISON.slice(0, hacienda.prisoners) : PRISONERS;
      const existing = state.units.filter(unit => unit.captiveHacienda === hacienda.id && unit.role === 'FUGITIVO').length;
      for (const offset of positions.slice(existing)) {
        const unit = spawnCaptive(hacienda.x + offset);
        unit.captiveHacienda = hacienda.id;
      }
      hacienda.captivesPlaced = true;
    }
    if (!spawnGuard || hacienda.garrisonPlaced) continue;
    const estate = estateById(hacienda.id);
    const roster = estate ? [...estate.roster] : hacienda.id === 'hac_east' ? ['SOLDADO_ESPANOL'] : [];
    if (estate && state.story.plan === 'assault') roster.push('SOLDADO_ESPANOL', 'PIQUERO');
    for (const [index, type] of roster.entries()) {
      const post = hacienda.x + hacienda.side * (-95 + index * 38);
      const guard = spawnGuard(type, hacienda.side, post);
      guard.guardSite = hacienda.id;
      guard.guardX = post;
    }
    hacienda.garrisonPlaced = true;
  }
}

export function gateRequirement(state, site) {
  if (site.major && state.story.expedition?.site !== site.id) return 'Convoca esta expedición en la casa central con E.';
  return state.enemies.some(enemy => enemy.guardSite === site.id && enemy.hp > 0) ? 'Derrota a la guarnición antes de abrir el portón.' : '';
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
