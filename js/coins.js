import { WATER_LINE_Y } from './config.js?v=0e479f5c479a';

export const GROUND_COIN_LIFE = 150;
const DUTY = ['GUERRERO', 'ESPADACHIN', 'ARQUERO', 'CAMPEON_REAL', 'CABALLERO_ALIADO', 'CAZADOR', 'FUGITIVO'];

function coinIsRecoverable(coin) {
  return coin.recoverable === true && !coin.fallsInRiver && coin.pickupDelay <= 0 && coin.y >= WATER_LINE_Y - 3;
}

export function recoverCoins(unit, state, dt, onDeposit) {
  if (DUTY.includes(unit.role) || unit.hp <= 0 || unit.requestedRole || unit.carryingSack || unit.fear > 30 ||
    state.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - unit.x) < 165)) return false;

  const carried = unit.recoveredCoins ?? 0;
  const nearby = carried < 4 && state.droppedCoins.find(coin => coinIsRecoverable(coin) &&
    Math.abs(coin.x - unit.x) <= (carried ? 13 : 49));
  if (!nearby && !carried) return false;
  const destination = nearby ? nearby.x : 48;
  const delta = destination - unit.x;
  unit.activity = 'COIN_RECOVERY';
  unit.mood = nearby ? 'Recogiendo reales caídos' : 'Llevando los reales al cofre';
  if (Math.abs(delta) > 10) {
    unit.facing = Math.sign(delta);
    unit.vx = unit.facing * 57;
    unit.x += unit.vx * dt;
    return true;
  }
  unit.vx = 0;
  if (nearby) {
    state.droppedCoins.splice(state.droppedCoins.indexOf(nearby), 1);
    unit.recoveredCoins = carried + 1;
  } else {
    state.treasuryCoins += carried;
    unit.recoveredCoins = 0;
    onDeposit?.(unit, carried);
  }
  return true;
}
