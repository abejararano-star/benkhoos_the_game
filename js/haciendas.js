import { estateById, hasOutpost } from './story.js?v=f1f96fdde58b';
import { deployGuards } from './frontier.js?v=f1f96fdde58b';
import { nominateAmara } from './amara.js?v=f1f96fdde58b';

const PRISONERS = [-23, 0, 23];
const LARGE_PRISON = [-49, -30, -10, 10, 30, 49];
const REBUILD_TIME = 180;
// Persisted rebuild deadlines use the original 180 units per game day.
const campaignTime = state => (state.day - 1 + state.timeOfDay) * 180;
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

export function updateHaciendas(state, spawnCaptive, distanceFromView = 440, spawnGuard, dt = 0, announce) {
  for (const hacienda of state.haciendas) {
    if (hacienda.major && (state.story.completed.includes(hacienda.id) || state.story.expedition?.site !== hacienda.id && !hacienda.destroyed)) continue;
    if (state.story.expedition?.site === hacienda.id && state.story.expedition.stage === 'return') continue;
    const estate = estateById(hacienda.id);
    if (estate?.cityX && Math.abs(state.benkos.x - hacienda.x) > 545 && haciendaActive(hacienda)) continue;
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
      for (const [index, offset] of positions.entries()) {
        if (index < existing) continue;
        const sex = (index + Number(hacienda.side > 0)) % 2 === 0 ? 'F' : 'M';
        const unit = spawnCaptive(hacienda.x + offset, sex);
        unit.captiveHacienda = hacienda.id;
      }
      hacienda.captivesPlaced = true;
    }
    nominateAmara(state, hacienda);
    if (!spawnGuard) continue;
    if (hacienda.garrisonPlaced) {
      if (!estate?.reserve || hacienda.reservesSent) continue;
      const survivors = state.enemies.filter(enemy => enemy.guardSite === hacienda.id && enemy.hp > 0).length;
      if (survivors > 3 || Math.abs(state.benkos.x - hacienda.x) > 285) continue;
      if (hacienda.reserveETA === undefined) {
        hacienda.reserveETA = 8;
        announce?.('TOQUE DE RELEVO', 'La guarnición de la ciudad llama a su reserva.');
      }
      hacienda.reserveETA = Math.max(0, hacienda.reserveETA - dt);
      if (hacienda.reserveETA === 0) {
        deployGuards(state, { ...estate, x: estate.x + estate.side * 190, grade: 3, towers: false }, estate.reserve, spawnGuard, .6);
        hacienda.reservesSent = true;
      }
      continue;
    }
    const roster = estate ? [...estate.roster] : hacienda.id === 'hac_east' ? ['SOLDADO_ESPANOL'] : [];
    const guided = estate?.cityX && hasOutpost(state, hacienda.side);
    if (guided) roster.pop();
    else if (estate && state.story.plan === 'assault') roster.push('SOLDADO_ESPANOL', 'PIQUERO');
    deployGuards(state, { ...hacienda, grade: estate?.grade ?? 1 }, roster, spawnGuard, estate?.cityX ? .45 : 0);
    hacienda.garrisonPlaced = true;
  }
}

export function gateRequirement(state, site) {
  if (site.major && state.story.expedition?.site !== site.id) return 'Convoca esta expedición en la casa central con E.';
  if (state.enemies.some(enemy => enemy.guardSite === site.id && enemy.hp > 0)) return 'Derrota a la guarnición antes de abrir el portón.';
  if (site.reserveETA > 0 && !site.reservesSent) return `La reserva está llegando · ${Math.ceil(site.reserveETA)} s.`;
  return '';
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
