import { initialCommunity } from './community.js?v=645f44b03ee0';
import { initialStory, majorHaciendas } from './story.js?v=645f44b03ee0';
import { initialEcology } from './ecology.js?v=645f44b03ee0';
import { initialExploration } from './exploration.js?v=645f44b03ee0';
import { BALANCE, SKILLS, TOOL_COSTS, WATER_LINE_Y, STATION_X } from './config.js?v=645f44b03ee0';
import { initialSettlement } from './settlement.js?v=645f44b03ee0';
export function createInitialState() {
const state = {
  status: "playing",
  sandbox: false,
  score: 0,
  bossesDefeated: 0,
  enemiesDefeated: 0,
  fugitivesFreed: 0,
  waveNumber: 0,
  politicalEventSeen: false,
  rescueCount: 0,
  armorUnlocked: false,
  coins: 16,
  maxCoins: BALANCE.bagCapacity,
  treasuryCoins: 12,
  resources: {wood:8,stone:4,food:5},
  settlement: initialSettlement(),
  ecology:initialEcology(),
  exploration: initialExploration(),
  community: initialCommunity(),
  morale: 100,
  day: 1,
  timeOfDay: 0.18,
  phase: 'DAY_EXPLORE',
  truceDays: 0,
  alertLevel: 15,
  armyTier: 1,
  tierUpgradeSlots: 0,
  cameraX: 0,
  hitStopTimer: 0,
  screenShake: 0,
  holdPayTimer: 0,
  activeNodeId: null,
  messengers: [],
  campaign: { version:1, orders:[], letters:[], warnedDays:[], sentDays:[], bossAnnouncements:[], defeatedBosses:[], lastRaidDay:0, heraldDefeated:false, governorDefeated:false },

  story: initialStory(),

  benkos: {
    x: -20,
    y: WATER_LINE_Y,
    vx: 0,
    facing: 1,
    mounted: false,
    royalArmor: false,
    weaponMode: 'SPEAR',
    spirit: 100,
    maxSpirit: 100,
    comboStep: 0,
    attackTimer:0,attackDuration:.44,attackImpact:.15,attackElapsed:0,attackHit:false,attackFacing:1,queuedAttack:false,comboWindow:0,
    attackCooldown: 0,
    dashTimer: 0,
    ceibaTimer: 0,
    jaguarTimer: 0,
    roarWave: 0,
    invulnTimer: 0,
    hurtKneelTimer: 0,
    hurtTimer:0,
    payTimer:0,
    interaction:null,
    resting: false,
    torchManual: false,
    torchOff: false,
    sprintHoldTime: 0,
    animTime: 0
  },

  horses: [
    { id: 'horse_1', x: -135, facing: 1, rider: null }
  ],

  altarTier: 1,
  skills: SKILLS.map(skill => ({ ...skill })),

  toolRacks: [
    { id:'rack_hammer', role:'CONSTRUCTOR', x:125, label:'Martillos y planos', stock:1, maxStock:3, filledSlots:0 },
    { id:'rack_axe', role:'LENADOR', x:-420, label:'Hachas del monte', icon:'', stock:1, maxStock:3, filledSlots:0 },
    { id: 'rack_hoe',   role: 'AGRICULTOR', x: -200, label: 'Azadones y Cestos', icon: '', cost: 1, stock: 1, maxStock: 4, filledSlots: 0 },
    { id: 'rack_pick',  role: 'MINERO',     x: -145, label: 'Picos de Minero',   icon: '', cost: 2, stock: 1, maxStock: 4, filledSlots: 0 },
    { id: 'rack_hunt',  role: 'CAZADOR',    x: -95,  label: 'Redes y Jabalinas', icon: '', cost: 2, stock: 1, maxStock: 4, filledSlots: 0 },
    { id: 'rack_bow',   role: 'ARQUERO',    x: 95,   label: 'Arcos del Reino',   icon: '', cost: 2, stock: 1, maxStock: 4, filledSlots: 0 },
    { id: 'rack_spear', role: 'GUERRERO',   x: 150,  label: 'Lanzas y Escudos',  icon: '', cost: 3, stock: 1, maxStock: 4, filledSlots: 0 },
    { id: 'rack_sword', role: 'ESPADACHIN', x: 205,  label: 'Espadas Curvas',    icon: '', cost: 4, stock: 0, maxStock: 4, filledSlots: 0 },
    { id: 'rack_cav',   role: 'CABALLERO_ALIADO', x: 260, label: 'Establo Real', icon: '', cost: 5, stock: 0, maxStock: 3, filledSlots: 0 }
  ],

  mines: [
    { id: 'mine_west', x: -295, oreProgress: 0.3, level: 1 },
    { id: 'mine_east', x: 460,  oreProgress: 0.1, level: 1 }
  ],

  walls: [
    { id: 'wall_inner_L', x: -355, dir: -1, level: 1, hp: 190, maxHp: 190, filledSlots: 0 },
    { id: 'wall_inner_R', x: 355,  dir: 1,  level: 1, hp: 190, maxHp: 190, filledSlots: 0 },
    { id: 'wall_outer_L', x: -690, dir: -1, level: 0, hp: 0,   maxHp: 250, filledSlots: 0 },
    { id: 'wall_outer_R', x: 690,  dir: 1,  level: 0, hp: 0,   maxHp: 250, filledSlots: 0 }
  ],

  farms: [
    { id: 'farm_L', x: -250, level: 1, cropProgress: 0.5, filledSlots: 0, cost: 3 },
    { id: 'farm_R', x: 305,  level: 1, cropProgress: 0.2, filledSlots: 0, cost: 3 },
    { id: 'farm_outer_L', x: -520, level: 0, cropProgress: 0, filledSlots: 0, cost: 4 }
  ],

  haciendas: [
    { id: 'hac_west', x: -1460, side: -1, hp: 340, maxHp: 340, destroyed: false },
    { id: 'hac_east', x: 1460,  side: 1,  hp: 340, maxHp: 340, destroyed: false },
    ...majorHaciendas()
  ],

  altarSlotsFilled: 0,
  treasurySlotsFilled: 0,

  trees: [],
  wildlife: [],
  droppedCoins: [],
  units: [],
  enemies: [],
  corpses: [],
  projectiles: [],
  particles: [],
  waterRipples: [],
  floatingTexts: []
};

const treePositions = [-1300, -1040, -920, -740, -610, -450, -395, 395, 535, 610, 740, 920, 1040, 1300];
treePositions.forEach((tx, idx) => {
  state.trees.push({
    id: `tree_${idx}`,
    x: tx,
    height: 70 + (idx % 3) * 18,
    markedForChop: false,
    chopProgress: 0,
    filledSlots: 0
  });
});


state.toolRacks.forEach(rack => { rack.cost = TOOL_COSTS[rack.role]; rack.x=STATION_X[rack.role]??rack.x; });
return state;
}
