// Canonical gameplay balance. SQL catalogs are descriptive legacy metadata.
export const WORLD_MIN_X = -11700;
export const WORLD_MAX_X = 11700;
export const CAMP_EDGE = 1060;
export const WATER_LINE_Y = 268;
export const BALANCE = Object.freeze({
  bagCapacity: 24, dayDuration: 225, baseWaveSize: 2,
  fixedStep: 1 / 60,
  tierCosts: [0, 6, 8], farmCapacity: 2, mineCapacity: 2
});
export const SKILLS = Object.freeze([
  { id:'machete', level:1, name:'Filo de Monte', cost:5, spiritCost:0, unlocked:true },
  { id:'dash', level:2, name:'Paso de Sombra', cost:6, spiritCost:15, unlocked:false },
  { id:'ceiba', level:3, name:'Piel de Ceiba', cost:8, spiritCost:25, unlocked:false },
  { id:'roar', level:4, name:'Rugido del Magdalena', cost:10, spiritCost:30, unlocked:false },
  { id:'jaguar', level:5, name:'Espíritu Jaguar Negro', cost:14, spiritCost:40, unlocked:false }
]);
export const SPECIALISTS = Object.freeze({
  ESCUDERO: { base: 'GUERRERO', fee: 3, name: 'Escudero' },
  LANCERO: { base: 'GUERRERO', fee: 2, name: 'Lancero de formación' },
  ARQUERO_COMPUESTO: { base: 'ARQUERO', fee: 4, name: 'Arquero compuesto' },
  JAVALINERO: { base: 'CAZADOR', fee: 2, name: 'Jabalinero' }
});
export const BOW_ROLES = ['ARQUERO', 'ARQUERO_COMPUESTO'];
export const RANGED_ROLES = ['CAZADOR', ...BOW_ROLES, 'JAVALINERO'];
export const MELEE_ROLES = ['GUERRERO', 'ESCUDERO', 'LANCERO', 'ESPADACHIN', 'CABALLERO_ALIADO', 'CAMPEON_REAL'];
export const FELIDS = ['JAGUAR', 'PANTHER'];
export const TOOL_COSTS = Object.freeze({ CONSTRUCTOR:2, LENADOR:2, AGRICULTOR:1, MINERO:2, CAZADOR:2, ARQUERO:2, GUERRERO:3, ESPADACHIN:4, CABALLERO_ALIADO:5, CURANDERO:2, BRUJO:3,
  ESCUDERO: 3, LANCERO: 3, ARQUERO_COMPUESTO: 2, JAVALINERO: 2 });
export const ALLY_COMBAT = Object.freeze({
  GUERRERO:{ damage:20, speed:68, cooldown:.8 }, ESPADACHIN:{ damage:24, speed:76, cooldown:.7 },
  CABALLERO_ALIADO:{ damage:28, speed:96, cooldown:.85 }, CAMPEON_REAL:{ damage:32, speed:76, cooldown:.8 },
  ESCUDERO:{ damage:16, speed:53, cooldown:1.05, reach:34 }, LANCERO:{ damage:24, speed:62, cooldown:1.05, reach:64 }
});
export const UNIT_HP = Object.freeze({
  FUGITIVO: 80, ALDEANO: 80, CONSTRUCTOR:90, LENADOR:95, AGRICULTOR: 80, MINERO: 80,
  CAZADOR: 80, ARQUERO: 80, GUERRERO: 115, ESPADACHIN: 115,
  CABALLERO_ALIADO: 150, CAMPEON_REAL: 260, CURANDERO: 85, BRUJO: 80,
  ESCUDERO: 155, LANCERO: 115, ARQUERO_COMPUESTO: 85, JAVALINERO: 95
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
  MOSQUETERO: { hp: 90, speed: 42, dmg: 24, range: 215, reward: 4, armor: .14 },
  CANONERO: { hp: 155, speed: 18, dmg: 28, range: 390, reward: 7, armor: .30 },
  CABALLERO: { hp: 135, speed: 82, dmg: 24, range: 30, reward: 4 },
  HERALDO_ALADO: { hp: 280, speed: 74, dmg: 22, range: 140, reward: 10, isBoss: true },
  GOBERNADOR_GIRON: { hp: 360, speed: 70, dmg: 26, range: 34, reward: 18, isBoss: true, phase: 1 }
});

export const STATION_X = Object.freeze({
  LENADOR: -795, AGRICULTOR: -685, MINERO: -575, CAZADOR: -465, ESPADACHIN: -355, CABALLERO_ALIADO: -245,
  CONSTRUCTOR: 365, ARQUERO: 475, GUERRERO: 585, CURANDERO: 695, BRUJO: 805
});
export const PLAZA = Object.freeze({ left: 87, right: 318, fireX: 105, dayX: 153, nightX: 143,
  watchLeft: 215, watchRight: 290, seats: Object.freeze([210, 235, 260, 285]) });
