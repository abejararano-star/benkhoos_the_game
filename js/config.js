// Canonical gameplay balance. SQL catalogs are descriptive legacy metadata.
export const WORLD_MIN_X = -4350;
export const WORLD_MAX_X = 4350;
export const WATER_LINE_Y = 268;
export const BALANCE = Object.freeze({
  bagCapacity: 24, dayDuration: 180, baseWaveSize: 2,
  rescueCost: 8, rescueGrant: 3, fixedStep: 1 / 60,
  tierCosts: [0, 6, 8], farmCapacity: 2, mineCapacity: 2
});
export const SKILLS = Object.freeze([
  { id:'machete', level:1, name:'Filo de Monte', cost:5, spiritCost:0, unlocked:true },
  { id:'dash', level:2, name:'Paso de Sombra', cost:6, spiritCost:15, unlocked:false },
  { id:'ceiba', level:3, name:'Piel de Ceiba', cost:8, spiritCost:25, unlocked:false },
  { id:'roar', level:4, name:'Rugido del Magdalena', cost:10, spiritCost:30, unlocked:false },
  { id:'jaguar', level:5, name:'Espíritu Jaguar Negro', cost:14, spiritCost:40, unlocked:false }
]);
export const TOOL_COSTS = Object.freeze({ CONSTRUCTOR:2, LENADOR:2, AGRICULTOR:1, MINERO:2, CAZADOR:2, ARQUERO:2, GUERRERO:3, ESPADACHIN:4, CABALLERO_ALIADO:5 });
export const ALLY_COMBAT = Object.freeze({
  GUERRERO:{ damage:20, speed:68, cooldown:.8 }, ESPADACHIN:{ damage:24, speed:76, cooldown:.7 },
  CABALLERO_ALIADO:{ damage:28, speed:96, cooldown:.85 }, CAMPEON_REAL:{ damage:32, speed:76, cooldown:.8 }
});
export const UNIT_HP = Object.freeze({
  FUGITIVO: 80, ALDEANO: 80, CONSTRUCTOR:90, LENADOR:95, AGRICULTOR: 80, MINERO: 80,
  CAZADOR: 80, ARQUERO: 80, GUERRERO: 115, ESPADACHIN: 115,
  CABALLERO_ALIADO: 150, CAMPEON_REAL: 260
});
export const ROLES = Object.keys(UNIT_HP);
export function getUnitMaxHp(role, tier) {
  if (role === 'CAMPEON_REAL') return UNIT_HP.CAMPEON_REAL;
  return Math.round((UNIT_HP[role] ?? 80) * (tier === 3 ? 1.85 : tier === 2 ? 1.4 : 1));
}
export const ENEMY_CATALOG = Object.freeze({
  CAMPESINO: { hp: 38, speed: 44, dmg: 8, range: 24, reward: 1 },
  BANDOLERO: { hp: 48, speed: 62, dmg: 11, range: 30, reward: 2 },
  SOLDADO_ESPANOL: { hp: 75, speed: 46, dmg: 14, range: 22, reward: 2 },
  ARQUERO_COLONIAL: { hp: 45, speed: 42, dmg: 11, range: 155, reward: 2 },
  PIQUERO: { hp: 85, speed: 38, dmg: 16, range: 38, reward: 3 },
  ARCABUCERO: { hp: 52, speed: 35, dmg: 18, range: 160, reward: 3 },
  CABALLERO: { hp: 135, speed: 82, dmg: 24, range: 30, reward: 4 },
  HERALDO_ALADO: { hp: 280, speed: 74, dmg: 22, range: 140, reward: 10, isBoss: true },
  GOBERNADOR_GIRON: { hp: 360, speed: 70, dmg: 26, range: 34, reward: 18, isBoss: true, phase: 1 }
});

export const STATION_X=Object.freeze({LENADOR:-585,AGRICULTOR:-215,MINERO:-140,CAZADOR:-70,CONSTRUCTOR:125,ARQUERO:200,GUERRERO:275,ESPADACHIN:430,CABALLERO_ALIADO:515});
