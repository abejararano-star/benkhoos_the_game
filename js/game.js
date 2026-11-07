import { createAnimal, seedEcology, interactEcology, SPECIES } from './ecology.js?v=9662674baa81';
import { startPlayerAttack, PLAYER_COMBOS, inStrikeRange, strikeEnemy } from './combat.js?v=9662674baa81';
import { GaitClock, pixelViewport } from './visual-motion.js?v=9662674baa81';
import { requestBuilding } from './settlement.js?v=9662674baa81';
import { BALANCE, WORLD_MIN_X, WORLD_MAX_X, WATER_LINE_Y, ENEMY_CATALOG, getUnitMaxHp } from './config.js?v=9662674baa81';
import { AfroColombianAudioEngine } from './audio.js?v=9662674baa81';
import { createInitialState } from './world-state.js?v=9662674baa81';
import { makeSave, restoreSave } from './save-system.js?v=9662674baa81';
import { createRenderer } from './renderer.js?v=9662674baa81';
import { createSimulation } from './simulation.js?v=9662674baa81';
import { FixedStepper } from './clock.js?v=9662674baa81';
import { bindInput } from './input.js?v=9662674baa81';
import { createUI } from './ui.js?v=9662674baa81';
import { chooseDefenseSide } from './ai.js?v=9662674baa81';
import { ensurePerson, personMaxHp, requestProfession, ROLE_NAMES } from './people.js?v=9662674baa81';
import { createCampaign, dispatchRaid, dispatchReinforcement, ensureCampaign } from './campaign.js?v=9662674baa81';

const reviewMode=new URLSearchParams(location.search).get('review')==='1';
const reviewScene=new URLSearchParams(location.search).get('scene')||'village';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sceneCanvas = document.createElement('canvas');
const sctx = sceneCanvas.getContext('2d');
const view = { width:640, height:360, waterLine:268, scale:1 };
window.SpriteManager.motion = new GaitClock();
const state = createInitialState();
const session = { mode: 'menu' };
const settings = { audio_enabled: true, audio_volume: .65, reduce_motion: window.matchMedia('(prefers-reduced-motion: reduce)').matches };
const keys = {};
const audio = new AfroColombianAudioEngine();
let input, saveTask, loading = false;
const isPlaying = () => session.mode === 'playing' && state.status === 'playing' && !ui.isBlocking() && !loading;
const ui = createUI({ state, session, settings, actions: {
  newGame, load: loadGameFromMySQL, save: () => saveGameToMySQL(), toggleArmor, useSkill,
  continueGame: () => session.hasCampaign && state.status === 'playing' ? ui.resume() : loadGameFromMySQL(),
  clearInput: () => input?.clear(), fullscreen: toggleFullscreen,
  settings: changeSettings, volume: v => audio.setVolume(v), politics: choosePolitics,
  leaderboard: () => window.BenkosDB.getLeaderboard(), debug: debugAction, inspectNpc, assignRole, autoRole, node:()=>getNearestInteractiveNode(state.benkos.x), build: (kind,id)=>requestBuilding(state,kind,id)
}});
function updateHUD() { ui.update(); }

let nextEntityId = 1;



function spawnCimarron(role, x, customTier) {
  const tier = customTier ?? state.armyTier;
  const maxHp = getUnitMaxHp(role, tier);
  const unit = {
    id: nextEntityId++,
    role,
    tier,
    x: x !== undefined ? x : (Math.random() * 60 - 30),
    y: WATER_LINE_Y,
    vx: 0,
    facing: Math.random() > 0.5 ? 1 : -1,
    hp: maxHp,
    maxHp,
    carryingSack: false,
    liberateAnimTimer: 0,
    attackCooldown: 0,
    attackAnimTimer: 0,
    weaponSubMode: 'SPEAR',
    assignedSide: chooseDefenseSide(x ?? 0, state.units),
    animSeed: Math.random() * 10
  };
  ensurePerson(unit);
  state.units.push(unit);
  updateHUD();
  return unit;
}


function spawnWildlife(x){state.wildlife.push(createAnimal(nextEntityId++,'CAPYBARA',x));}

function spawnPhysicalCoin(x, y, vx, vy, canBePickedByPlayer = false, fallsInRiver = false) {
  state.droppedCoins.push({
    id: nextEntityId++,
    x, y, vx, vy,
    life: 24,
    pickupDelay: canBePickedByPlayer ? 0.35 : 0.8,
    fallsInRiver
  });
}

function giveCoinToBenkos(amount = 1, sourceX = state.benkos.x) {
  for (let i = 0; i < amount; i++) {
    if (state.coins < state.maxCoins) {
      state.coins++;
      audio.playSfx('coinPickup');
    } else {
      spawnPhysicalCoin(
        sourceX + (Math.random() * 16 - 8),
        WATER_LINE_Y - 22,
        (Math.random() - 0.5) * 90,
        -115 - Math.random() * 35,
        false,
        true
      );
      addFloatingText(state.benkos.x, WATER_LINE_Y - 46, '¡Bolsa Llena!  reales  al Río', '#38bdf8');
    }
  }
  updateHUD();
}



function spawnEnemy(type, side, customX) {
  const cfg = ENEMY_CATALOG[type] || ENEMY_CATALOG.SOLDADO_ESPANOL;
  const spawnX = customX ?? side * (WORLD_MAX_X - 100);

  const en = {
    id: nextEntityId++,
    type,
    x: Math.max(WORLD_MIN_X - 100, Math.min(WORLD_MAX_X + 100, spawnX)),
    y: WATER_LINE_Y,
    vx: 0,
    facing: -side,
    hp: cfg.hp,
    maxHp: cfg.hp,
    speed: cfg.speed,
    dmg: cfg.dmg,
    range: cfg.range,
    reward: cfg.reward,
    isBoss: !!cfg.isBoss,
    phase: cfg.phase || 1,
    stolenCoins: 0,
    attackCooldown: 1.1,
    attackAnimTimer: 0,
    tauntTimer: 0,
    appearTimer: cfg.isBoss ? 1.4 : 0,
    trumpetRing: 0,
    stunTimer: 0,
    nettedTimer: 0,
    bleedTimer: 0,
    muzzleFlash: 0,
    animTime: Math.random() * 10
  };

  if (cfg.isBoss) {
    audio.playSfx('trumpet');
    state.screenShake = 8;
  }
  state.enemies.push(en);
  return en;
}

function spawnSpanishWave(mult = 1) {
  const count = dispatchRaid(state, mult);
  showBanner('UNA PATRULLA SE PONE EN MARCHA', `${count} hombres salen de los puestos fronterizos. Sus estandartes anuncian el camino.`);
}
function queueReinforcement(type, side) { dispatchReinforcement(state, type, side); }


function upgradeArmyTier() {
  if (state.armyTier >= 3) return;
  state.armyTier++;
  if (state.armyTier === 3) { state.armorUnlocked = true; state.benkos.royalArmor = true; spawnCimarron('CAMPEON_REAL', 25, 3); }
  state.units.forEach((u) => {
    if (u.role !== 'FUGITIVO' && u.role !== 'CAMPEON_REAL') {
      u.tier = state.armyTier;
      u.maxHp = personMaxHp(u, u.role, state.armyTier);
      u.hp = u.maxHp;
      addParticles(u.x, WATER_LINE_Y - 20, 12, '#fde047', 85);
    }
  });
  audio.playSfx('roar');
  const names = {
    1: 'CIMARRÓN',
    2: 'ÉLITE',
    3: 'REAL'
  };
  showBanner(`¡ASCENSO MILITAR: ${names[state.armyTier]}!`, 'Todas tus tropas y entrenamientos han evolucionado');
  updateHUD();
}

// ==================== 4. FLOATING TEXTS, PARTICLES & BANNERS ====================
function addFloatingText(x, y, text, color = '#fde047') {
  if (state.floatingTexts.length >= 80) state.floatingTexts.shift();
  state.floatingTexts.push({ x, y, text, color, life: 1.15 });
}

function addParticles(x, y, count, color, speed = 65) {
  count = Math.min(count, Math.max(0, 400 - state.particles.length));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = (0.3 + Math.random() * 0.7) * speed;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 25,
      color,
      size: Math.random() > 0.5 ? 2 : 3,
      life: 0.35 + Math.random() * 0.45
    });
  }
}

function showBanner(mainText, subText = 'MONTES DE MARÍA · 1600') { ui.banner(mainText, subText); }

// ==================== 5. DIEGETIC INTERACTIVE NODES ====================
function getNearestInteractiveNode(bx) {
  // Freeing a person takes precedence over paying into a nearby tree or building.
  if (state.units.some(u => u.role === 'FUGITIVO' && Math.abs(u.x - bx) < 36)) return null;
  const candidates = [];

  if (state.armyTier < 3) {
    const upgCost = BALANCE.tierCosts[state.armyTier];
    const nextName = state.armyTier === 1 ? 'Rango ÉLITE' : 'Rango REAL';
    candidates.push({
      id: 'node_tier_totem',
      x: -48,
      title: ` Ascender Ejército a ${nextName}`,
      sub: `Mantén [S] (${upgCost} reales ) para evolucionar todas tus tropas`,
      cost: upgCost,
      getFilled: () => state.tierUpgradeSlots,
      setFilled: (v) => { state.tierUpgradeSlots = v; },
      onComplete: () => {
        upgradeArmyTier();
      }
    });
  }

  const nextSkill = state.skills.find((s) => !s.unlocked);
  if (nextSkill) {
    candidates.push({
      id: 'node_altar',
      x: 0,
      title: ` Altar: ${nextSkill.name}`,
      sub: `Mantén [S] para ofrendar (${nextSkill.cost} reales )`,
      cost: nextSkill.cost,
      getFilled: () => state.altarSlotsFilled,
      setFilled: (v) => { state.altarSlotsFilled = v; },
      onComplete: () => {
        nextSkill.unlocked = true;
        state.altarTier = nextSkill.level;
        audio.playSfx('roar');
        addParticles(0, WATER_LINE_Y - 36, 26, '#fde047', 110);
        showBanner(`¡PODER DEL JAGUAR DESBLOQUEADO: ${nextSkill.name.toUpperCase()}!`, 'Usa las teclas [1-4] para invocar los espíritus del monte');
        updateHUD();
      }
    });
  }

  candidates.push({
    id: 'node_treasury',
    x: 48,
    title: ` Cofre de Wiwa (${state.treasuryCoins} reales  guardadas)`,
    sub: '[S] Guardar Plata | [W/E] Retirar 5 reales  a tu bolsa',
    cost: 2,
    getFilled: () => state.treasurySlotsFilled,
    setFilled: (v) => { state.treasurySlotsFilled = v; },
    onComplete: () => {
      state.treasuryCoins += 2;
      addFloatingText(48, WATER_LINE_Y - 40, '+2 reales  Guardadas en Cofre', '#fde047');
      updateHUD();
    }
  });

  state.toolRacks.forEach((rk) => {
    if (rk.stock < rk.maxStock && (state.armyTier >= 2 || !['ESPADACHIN','CABALLERO_ALIADO'].includes(rk.role))) {
      candidates.push({
        id: rk.id,
        x: rk.x,
        title: `${rk.label} · ${rk.stock}/${rk.maxStock}`,
        sub: `Mantén [S] para forjar equipo (${rk.cost} reales )`,
        cost: rk.cost,
        getFilled: () => rk.filledSlots,
        setFilled: (v) => { rk.filledSlots = v; },
        onComplete: () => {
          rk.stock++;
          addParticles(rk.x, WATER_LINE_Y - 24, 14, '#fde047', 75);
          addFloatingText(rk.x, WATER_LINE_Y - 42, `+1 ${rk.label}`, '#4ade80');
          updateHUD();
        }
      });
    }
  });

  state.walls.forEach((w) => {
    const isDamaged = w.level > 0 && w.hp < w.maxHp * 0.8;
    if (w.level < Math.max(3,Math.min(state.settlement.level,state.settlement.barracks.level)) || isDamaged) {
      const cost = w.level === 0 ? 2 : (isDamaged ? 2 : w.level * 2 + 1);
      const label = w.level === 0
        ? ' Levantar Empalizada'
        : (isDamaged ? ' Reparar Empalizada' : ` Mejorar Muralla a Nv.${w.level + 1}`);
      candidates.push({
        id: w.id,
        x: w.x,
        title: label,
        sub: `Mantén [S] para ordenar obra (${cost} reales )`,
        cost,
        getFilled: () => w.filledSlots,
        setFilled: (v) => { w.filledSlots = v; },
        onComplete: () => {
          if (isDamaged) {
            w.hp = w.maxHp;
            addFloatingText(w.x, WATER_LINE_Y - 45, '¡Muralla Reparada!', '#4ade80');
          } else {
            w.level++;
            w.maxHp = 150 + w.level * 90;
            w.hp = w.maxHp;
            addFloatingText(w.x, WATER_LINE_Y - 45, `¡Empalizada Nv.${w.level}!`, '#fde047');
          }
          addParticles(w.x, WATER_LINE_Y - 28, 18, '#f59e0b', 80);
        }
      });
    }
  });

  state.farms.forEach((f) => {
    if (f.level < 2) {
      candidates.push({
        id: f.id,
        x: f.x,
        title: f.level === 0 ? ' Construir Cultivo de Yuca' : ' Ampliar Granja Real Nv.2',
        sub: `Mantén [S] para invertir (${f.cost} reales )`,
        cost: f.cost,
        getFilled: () => f.filledSlots,
        setFilled: (v) => { f.filledSlots = v; },
        onComplete: () => {
          f.level++;
          addParticles(f.x, WATER_LINE_Y - 15, 16, '#4ade80', 70);
          addFloatingText(f.x, WATER_LINE_Y - 40, `¡Granja de Yuca Nv.${f.level}!`, '#4ade80');
        }
      });
    }
  });

  state.trees.forEach((tr) => {
    if (!tr.markedForChop && !tr.chopped) {
      candidates.push({
        id: tr.id,
        x: tr.x,
        title: ' Marcar Ceiba para Talar',
        sub: 'Mantén [S] (1 real) · Tus leñadores talarán y obtendrán 2 reales',
        cost: 1,
        getFilled: () => tr.filledSlots,
        setFilled: (v) => { tr.filledSlots = v; },
        onComplete: () => {
          tr.markedForChop = true;
          addFloatingText(tr.x, WATER_LINE_Y - 42, ' Árbol Marcado', '#fbbf24');
        }
      });
    }
  });

  let best = null;
  let bestDist = 34;
  candidates.forEach((c) => {
    const d = Math.abs(c.x - bx);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  });
  return best;
}

function refundUnfinishedSlots(activeId) {
  const refundAmount = (count, x) => {
    for (let i = 0; i < count; i++) {
      spawnPhysicalCoin(x, WATER_LINE_Y - 26, (Math.random() - 0.5) * 65, -95, true, false);
    }
  };
  if (activeId !== 'node_tier_totem' && state.tierUpgradeSlots > 0) {
    refundAmount(state.tierUpgradeSlots, -48); state.tierUpgradeSlots = 0;
  }
  if (activeId !== 'node_altar' && state.altarSlotsFilled > 0) {
    refundAmount(state.altarSlotsFilled, 0); state.altarSlotsFilled = 0;
  }
  if (activeId !== 'node_treasury' && state.treasurySlotsFilled > 0) {
    refundAmount(state.treasurySlotsFilled, 48); state.treasurySlotsFilled = 0;
  }
  state.toolRacks.forEach((rk) => {
    if (rk.id !== activeId && rk.filledSlots > 0) { refundAmount(rk.filledSlots, rk.x); rk.filledSlots = 0; }
  });
  state.walls.forEach((w) => {
    if (w.id !== activeId && w.filledSlots > 0) { refundAmount(w.filledSlots, w.x); w.filledSlots = 0; }
  });
  state.farms.forEach((f) => {
    if (f.id !== activeId && f.filledSlots > 0) { refundAmount(f.filledSlots, f.x); f.filledSlots = 0; }
  });
  state.trees.forEach((tr) => {
    if (tr.id !== activeId && tr.filledSlots > 0) { refundAmount(tr.filledSlots, tr.x); tr.filledSlots = 0; }
  });
}

// ==================== 6. PLAYER INPUT, ROYAL ARMOR [C] & COMBAT ====================
function handleInteractOrMount() {
  const b = state.benkos;
  if (!isPlaying()) return;
  const messenger = state.messengers.find(m => m.state === 'WAIT' && !m.delivered && Math.abs(m.x - b.x) < 60);
  if (messenger && campaign.readMessenger(messenger)) return;
  const freeHorse = state.horses.find((h) => !h.rider && Math.abs(h.x - b.x) < 38);
  if (b.mounted) {
    b.mounted = false;
    state.horses.push({ id: `horse_${nextEntityId++}`, x: b.x, facing: b.facing, rider: null });
    addFloatingText(b.x, WATER_LINE_Y - 45, ' Desmontado', '#fde047');
    updateHUD();
    return;
  } else if (freeHorse) {
    b.mounted = true;
    state.horses = state.horses.filter((h) => h.id !== freeHorse.id);
    addFloatingText(b.x, WATER_LINE_Y - 48, ' ¡Caballo Real Domado! (Velocidad +45%)', '#fde047');
    audio.playSfx('roar');
    updateHUD();
    return;
  }

  if(Math.abs(b.x-48)>=48){
    const interaction=interactEcology(state,{fish:!!(keys.ShiftLeft||keys.ShiftRight)});
    if(interaction.handled){b.attackTimer=0;b.queuedAttack=false;showBanner(interaction.message,'');updateHUD();return;}
  }
  if (Math.abs(b.x - 48) < 48) {
    if (state.treasuryCoins <= 0) {
      addFloatingText(48, WATER_LINE_Y - 42, 'Cofre de Wiwa vacío', '#f87171');
      return;
    }
    const take = Math.min(5, state.treasuryCoins, state.maxCoins - state.coins);
    if (take <= 0) {
      addFloatingText(b.x, WATER_LINE_Y - 44, '¡Tu bolsa ya está llena (24/24)!', '#fbbf24');
      return;
    }
    state.treasuryCoins -= take;
    state.coins += take;
    audio.playSfx('coinPickup');
    addFloatingText(48, WATER_LINE_Y - 42, `+${take} reales  Retiradas del Cofre`, '#fde047');
    updateHUD();
  } else {
    showBanner('ACÉRCATE A UN PUESTO', 'Mantén S para invertir. E sirve para montar o retirar plata del cofre.');
  }
}

function triggerBenkosAttack(){
  if(!isPlaying())return;
  if(startPlayerAttack(state.benkos))audio.playSfx('slash');
}
function resolveBenkosHit(){
  const b=state.benkos,spec=PLAYER_COMBOS[(b.comboStep||1)-1];
  const reach=spec.reach,armorMult=b.royalArmor?1.25:1;
  const baseDmg=spec.damage*(b.jaguarTimer>0?1.8:1)*(b.mounted?1.25:1)*armorMult;
  let hitAny = false;
  state.enemies.forEach((en) => {
    if(en.hp<=0||en.appearTimer>0)return;
    if(inStrikeRange(b,en,reach,b.attackFacing)){
      {
        strikeEnemy(en,baseDmg,b.attackFacing);
        en.vx = b.facing * (en.isBoss ? 45 : (b.comboStep === 3 ? 120 : 65));
        en.bleedTimer = 3.0;
        hitAny = true;
        addFloatingText(en.x, en.y - 38, `-${Math.round(baseDmg)}`, b.comboStep === 3 ? '#fde047' : '#f87171');
        addParticles(en.x, en.y - 20, 8, '#ef4444', 85);
      }
    }
  });

  for(const animal of state.wildlife){
    if(SPECIES[animal.species]?.predator&&animal.trust===0&&(animal.aggression>0||animal.state==='CHARGE')&&inStrikeRange(b,animal,reach,b.attackFacing)){
      animal.hp-=baseDmg;hitAny=true;addParticles(animal.x,WATER_LINE_Y-13,5,'#bd9b64',45);
    }
  }
  state.haciendas.forEach((hac) => {
    if (!hac.destroyed&&inStrikeRange(b,hac,reach+25,b.attackFacing)) {
      damageHacienda(hac, baseDmg);
      hitAny = true;
    }
  });

  if (hitAny) {
    state.hitStopTimer = 0.035;
    state.screenShake = b.comboStep === 3 ? 4 : 2;
    b.spirit = Math.min(b.maxSpirit, b.spirit + 8);
  }
}

function damageHacienda(hac, dmg) {
  hac.hp -= dmg;
  addParticles(hac.x, WATER_LINE_Y - 35, 8, '#f97316', 90);
  addFloatingText(hac.x, WATER_LINE_Y - 58, `-${Math.round(dmg)} `, '#fb923c');
  if (hac.hp <= 0 && !hac.destroyed) {
    hac.destroyed = true;
    state.screenShake = 12;
    audio.playSfx('roar');
    addParticles(hac.x, WATER_LINE_Y - 40, 45, '#fde047', 160);
    for (let i = 0; i < 12; i++) {
      spawnPhysicalCoin(hac.x + (Math.random() * 40 - 20), WATER_LINE_Y - 30, (Math.random() - 0.5) * 140, -140 - Math.random() * 50, true, false);
    }
    for (let i = 0; i < 3; i++) {
      spawnCimarron('FUGITIVO', hac.x + (Math.random() * 50 - 25));
    }
    state.horses.push({ id: `horse_${nextEntityId++}`, x: hac.x - hac.side * 40, facing: -hac.side, rider: null });
    showBanner('HACIENDA RECUPERADA', 'Tres personas pueden alcanzar la libertad. Los mensajeros llevarán noticias a Cartagena.');
  }
}

function useSkill(skillId) {
  const sk = state.skills.find((s) => s.id === skillId);
  const b = state.benkos;
  if (!sk || !isPlaying()) return;

  if (!sk.unlocked) {
    addFloatingText(b.x, b.y - 46, `Acércate al Altar del Jaguar y mantén [S] (${sk.cost} reales )`, '#fde047');
    return;
  }
  if (b.spirit < sk.spiritCost) {
    addFloatingText(b.x, b.y - 45, '¡Falta Espíritu del Jaguar!', '#facc15');
    return;
  }

  b.spirit -= sk.spiritCost;
  if (skillId === 'dash') {
    b.attackTimer=0;b.attackCooldown=0;b.queuedAttack=false;
    b.dashTimer = 0.42;
    b.vx = b.facing * 330;
    addParticles(b.x, b.y - 16, 15, '#a8a29e', 110);
    addFloatingText(b.x, b.y - 40, '¡PASO DE SOMBRA!', '#e7e5e4');
    audio.playSfx('slash');
  } else if (skillId === 'ceiba') {
    b.ceibaTimer = 5.5;
    addParticles(b.x, b.y - 20, 20, '#22c55e', 80);
    addFloatingText(b.x, b.y - 44, '¡PIEL DE CEIBA!', '#4ade80');
    audio.playSfx('roar');
  } else if (skillId === 'roar') {
    b.roarWave = 1.0;
    state.screenShake = 8;
    audio.playSfx('roar');
    addFloatingText(b.x, b.y - 48, '¡DESAFÍO REAL DEL MAGDALENA!', '#fde047');
    state.enemies.forEach((en) => {
      if (Math.abs(en.x - b.x) < 210) {
        en.hp -= 30;
        en.stunTimer = en.isBoss ? 1.3 : 2.8;
        en.vx = Math.sign(en.x - b.x || 1) * (en.isBoss ? 90 : 190);
        if (en.stolenCoins > 0) {
          for (let c = 0; c < en.stolenCoins; c++) {
            spawnPhysicalCoin(en.x, WATER_LINE_Y - 20, (Math.random() - 0.5) * 80, -120, true, false);
          }
          en.stolenCoins = 0;
        }
      }
    });
  } else if (skillId === 'jaguar') {
    b.jaguarTimer = 10.0;
    state.screenShake = 10;
    audio.playSfx('roar');
    addParticles(b.x, b.y - 22, 32, '#fde047', 140);
    showBanner('¡ESPÍRITU DEL JAGUAR NEGRO!', 'Velocidad x2, Aura Dorada y Golpes Letales');
  }
  updateHUD();
}


function hitBenkosKingdomStyle(rawDmg, knockDir) {
  if (state.status !== 'playing') return;
  const b = state.benkos;
  if (b.dashTimer > 0 || b.invulnTimer > 0) return;

  if (b.ceibaTimer > 0) {
    addFloatingText(b.x, WATER_LINE_Y - 38, '¡Piel de Ceiba Rebota Golpe!', '#4ade80');
    return;
  }

  b.invulnTimer=.65;b.hurtTimer=.4;b.attackTimer=0;b.queuedAttack=false;b.comboWindow=0;b.attackCooldown=Math.max(b.attackCooldown,.25);
  b.vx = (knockDir || -b.facing) * 115;
  state.screenShake = 5;

  const coinsLost = Math.min(state.coins, Math.max(1, Math.round(rawDmg / 8)));
  if (coinsLost > 0) {
    state.coins -= coinsLost;
    for (let i = 0; i < coinsLost; i++) {
      const fallsIntoWater = i === coinsLost - 1 && Math.random() < 0.45;
      spawnPhysicalCoin(
        b.x,
        WATER_LINE_Y - 22,
        (Math.random() - 0.5) * 135,
        -125 - Math.random() * 45,
        true,
        fallsIntoWater
      );
    }
    addFloatingText(b.x, WATER_LINE_Y - 42, `-${coinsLost} reales  ¡Monedas Caídas!`, '#f87171');
  } else {
    if (state.treasuryCoins >= BALANCE.rescueCost) {
      state.treasuryCoins -= BALANCE.rescueCost;
      state.rescueCount++;
      b.hurtKneelTimer = 1.6; b.invulnTimer = 3;
      if (b.mounted) state.horses.push({ id: `horse_${nextEntityId++}`, x: b.x, facing: b.facing, rider: null });
      b.mounted = false; b.x = 0; b.vx = 0;
      state.coins = BALANCE.rescueGrant;
      showBanner('WIWA TE HA RESCATADO', `El rescate cuesta ${BALANCE.rescueCost} reales del cofre. Recibes ${BALANCE.rescueGrant} en la bolsa.`);
    } else {
      state.status = 'defeat'; finishCampaign('defeat');
    }
  }
  updateHUD();
}



const renderFrame = createRenderer({ state, canvas, ctx, sceneCanvas, sctx, view, settings });
const campaign = createCampaign({ state, spawnEnemy, nextId: () => nextEntityId++, showBanner, onTreaty: () => ui.open('modalPolitics') });
const simulation = createSimulation({ state, keys, audio, updateHUD, spawnSpanishWave, spawnWildlife,
  showBanner, resolveBenkosHit, triggerBenkosAttack, saveGameToMySQL, getNearestInteractiveNode, refundUnfinishedSlots, addParticles,
  addFloatingText, spawnPhysicalCoin, giveCoinToBenkos, spawnEnemy, hitBenkosKingdomStyle, finishCampaign, campaign, queueReinforcement,
  nextId: () => nextEntityId++ });
const stepper = new FixedStepper(BALANCE.fixedStep);

function resize() {
  Object.assign(view,pixelViewport(window.innerWidth,window.innerHeight));
  canvas.width=view.width;canvas.height=view.height;
  sceneCanvas.width=view.width;sceneCanvas.height=view.waterLine;
  canvas.style.width=`${view.width*view.scale}px`;canvas.style.height=`${view.height*view.scale}px`;
  ctx.imageSmoothingEnabled=false;sctx.imageSmoothingEnabled=false;
}
window.addEventListener('resize', resize); resize();

function newGame() {
  if (saveTask || loading) return;
  input?.clear();
  Object.assign(state, createInitialState()); nextEntityId = 1;
  session.hasCampaign = true;
  state.sandbox=reviewMode;
  window.BenkosDB.currentSaveId = null;
  for (const [role, x] of [['ALDEANO',-35],['CONSTRUCTOR',65],['LENADOR',-405],['AGRICULTOR',-245],['MINERO',-290],['CAZADOR',-320],['ARQUERO',315],['GUERRERO',340],['FUGITIVO',-490],['FUGITIVO',510]]) spawnCimarron(role, x, 1);
  seedEcology(state,()=>nextEntityId++);
  if(reviewMode){
    state.coins=24;state.treasuryCoins=100;state.timeOfDay=.28;
    if(reviewScene==='creek')state.benkos.x=-850;
    if (reviewScene === 'mount') {
      state.benkos.x = -135;
      state.armorUnlocked = true;
    }
    if (reviewScene === 'community') {
      const [first, second] = state.units;
      first.x = 10;
      second.x = 42;
      first.temperament = 'CARING';
      state.units = [first, second];
      state.community.relations.push({ key: [first.id, second.id].join(':'), people: [first.id, second.id], score: 3, lastAt: -40 });
      state.community.nextAt = 0;
    }
    if(reviewScene==='combat'){state.benkos.x=-1130;state.units=[];spawnEnemy('SOLDADO_ESPANOL',-1,-1030);spawnEnemy('ARQUERO_COLONIAL',-1,-900);state.benkos.facing=1;}
  }
  state.cameraX = state.benkos.x; stepper.reset();
  ui.resume(); updateHUD(); audio.init();
  showBanner('BIENVENIDO A LA MATUNA', 'Libera a los fugitivos fuera de las murallas. El cofre de Wiwa protege tu futuro.');
}
function toggleArmor() {
  if (!state.armorUnlocked) { showBanner('LA ARMADURA SE GANA', 'Asciende al rango Real en el tótem para desbloquearla.'); return; }
  state.benkos.royalArmor = !state.benkos.royalArmor; updateHUD();
}
async function toggleFullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { showBanner('PANTALLA COMPLETA NO DISPONIBLE', 'Puedes ampliar la ventana del navegador.'); }
}
function changeSettings(patch) {
  Object.assign(settings, patch);
  settings.audio_enabled = !['0', 'false', false].includes(settings.audio_enabled);
  settings.audio_volume = Math.max(0, Math.min(1, Number(settings.audio_volume) || 0));
  settings.reduce_motion = ['1', 'true', true].includes(settings.reduce_motion);
  audio.enabled = settings.audio_enabled; audio.setVolume(settings.audio_volume);
  if (audio.enabled && session.mode !== 'menu') audio.init();
  ui.applySettings();
  return window.BenkosDB.saveConfig(settings);
}
async function saveGameToMySQL(automatic = false) {
  if(reviewMode){if(!automatic)showBanner('Vista temporal: no modifica tus partidas','');return {success:true,storage:'preview'};}
  if (session.mode === 'menu' || loading || state.status !== 'playing') return;
  if (saveTask) return saveTask;
  const payload = makeSave(state, nextEntityId);
  ui.busy(true);
  saveTask = window.BenkosDB.saveGame(payload);
  try {
    const res = await saveTask;
    if (!res.success) showBanner('NO SE PUDO GUARDAR', res.error ?? 'El almacenamiento no está disponible.');
    else if (!automatic || res.storage !== 'server') showBanner(res.storage === 'server' ? 'PARTIDA GUARDADA EN EL SERVIDOR' : 'PARTIDA GUARDADA EN ESTE NAVEGADOR', res.storage === 'server' ? `Día ${payload.dia_actual} · ${res.localBackup === false ? 'copia local no disponible' : 'copia local de respaldo'}.` : 'Tu progreso está a salvo localmente. El servidor no está disponible.');
    return res;
  } finally { saveTask = null; ui.busy(false); }
}
async function loadGameFromMySQL() {
  if(reviewMode){newGame();return;}
  if (loading || saveTask) return;
  loading = true; input?.clear(); ui.busy(true);
  try {
    const save = await window.BenkosDB.loadGame();
    if (!save) { showBanner('SIN PARTIDA GUARDADA', 'Comienza una nueva campaña para fundar la Matuna.'); return; }
    const restored = restoreSave(save, createInitialState());
    // Commit only after the complete snapshot has passed validation.
    Object.assign(state, restored.state); nextEntityId = restored.nextEntityId;
    session.hasCampaign = true;
    stepper.reset();
    if (state.status === 'playing') ui.resume(); else ui.result(state.status);
    updateHUD();
    showBanner('PARTIDA RECUPERADA', `Día ${state.day} · ${window.BenkosDB.lastLoadStorage === 'server' ? 'servidor' : 'copia local'}.`);
  } catch (error) { showBanner('NO SE PUDO CARGAR', error.message); }
  finally { loading = false; ui.busy(false); }
}
function finishCampaign(status) {
  if (session.mode === 'victory' || session.mode === 'defeat') return;
  input?.clear(); ui.result(status); updateHUD();
  if (!state.sandbox) window.BenkosDB.recordVictory({ dias_sobrevividos: state.day, tropas_reclutadas: state.units.length,
    oleadas_repelidas: Math.max(0, state.waveNumber - (state.enemies.length ? 1 : 0)), jefes_derrotados: state.bossesDefeated,
    plata_total_acumulada: state.coins + state.treasuryCoins, puntuacion_final: state.score, victoria_conseguida: +(status === 'victory') });
}
function choosePolitics(accept) {
  if (accept && state.coins < 15) return;
  if (accept) {
    state.coins -= 15; state.truceDays = 3; state.enemies = [];
    state.campaign.orders = state.campaign.orders.filter(order=>order.kind==='boss');
    if (state.timeOfDay>=.68) state.phase='TRUCE_NIGHT';
  }
  else { state.morale = 125; spawnCimarron('CAMPEON_REAL', -1550, 3); spawnSpanishWave(1.2); }
  state.politicalEventSeen = true; ui.resume(); updateHUD();
}
function debugAction(id) {
  if (id === 'btnUpgradeTier') upgradeArmyTier();
  if (id === 'btnSpawnChampion') spawnCimarron('CAMPEON_REAL', state.benkos.x + 30, 3);
  if (id === 'btnSpawnAllAllies') ['GUERRERO','ARQUERO','CAZADOR','MINERO','AGRICULTOR','ESPADACHIN','CABALLERO_ALIADO'].forEach((r,i) => spawnCimarron(r, state.benkos.x + i * 24));
  if (id === 'btnSimCoins') giveCoinToBenkos(15);
  if (id === 'btnSimWave') spawnSpanishWave(1.2);
  if (id === 'btnSpawnGovernor') spawnEnemy('GOBERNADOR_GIRON', 1, state.benkos.x + 220);
}
input = bindInput({ keys, isPlaying, openSettlement:()=>ui.openSettlement(), inspectNpc: () => inspectNpc(), attack: triggerBenkosAttack, interact: handleInteractOrMount, useSkill,
  toggleArmor, togglePause: ui.togglePause, save: () => saveGameToMySQL(), load: loadGameFromMySQL,
  toggleArmy: ui.toggleArmy, toggleFullscreen, rest:()=>{if(!state.benkos.attackTimer&&!state.benkos.interaction)state.benkos.resting=!state.benkos.resting;},
  torch: () => { state.benkos.torchManual = !state.benkos.torchManual; } });


function inspectNpc(id = null) {
  const unit = id === null ? state.units.filter(u => u.role !== 'FUGITIVO').sort((a,b) => Math.abs(a.x-state.benkos.x)-Math.abs(b.x-state.benkos.x))[0] : state.units.find(u => u.id === Number(id));
  if (!unit) { showBanner('NO HAY NADIE CERCA', 'Libera personas para conocer a tu comunidad.'); return; }
  session.selectedNpcId = unit.id; ensurePerson(unit); ui.openPeople(unit.id);
}
function assignRole(id, role) {
  const unit = state.units.find(u => u.id === Number(id));
  if (!unit) return { success:false, message:'Esta persona ya no está disponible.' };
  return requestProfession(unit, role, state);
}
function autoRole(id) {
  const unit = state.units.find(u => u.id === Number(id));
  if (!unit) return;
  ensurePerson(unit);unit.requestedRole = null;
  if (unit.role !== unit.preferredRole) requestProfession(unit, unit.preferredRole, state);
}
canvas.addEventListener('click', event => {
  if (!isPlaying()) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * view.width / rect.width + state.cameraX - view.width / 2;
  const y = (event.clientY - rect.top) * view.height / rect.height;
  const unit = state.units.filter(u => Math.abs(u.x-x)<18).sort((a,b) => Math.abs(a.x-x)-Math.abs(b.x-x))[0];
  if (unit && y>view.waterLine-95&&y<view.waterLine+4) inspectNpc(unit.id);
});

window.BenkosDB.onStatusChange(({connected})=>{if(!reviewMode)ui.connection(connected);});
async function init() {
  if(reviewMode){document.getElementById('dbStatusLabel').textContent='Revisión temporal · sin guardar';return;}
  const cfg = await window.BenkosDB.loadConfig();
  if (cfg) Object.assign(settings, cfg);
  audio.enabled = !['0','false',false].includes(settings.audio_enabled);
  settings.audio_enabled = audio.enabled;
  settings.audio_volume = Math.max(0, Math.min(1, Number(settings.audio_volume) || 0));
  settings.reduce_motion = ['1','true',true].includes(settings.reduce_motion);
  audio.setVolume(settings.audio_volume); ui.applySettings();
  window.BenkosDB.checkConnection();
}
let lastTime = performance.now(), hudTime = 0;
function loop(now) {
  const elapsed = Math.min(.25, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (isPlaying()) {
    stepper.advance(elapsed, dt => { if(isPlaying()){renderFrame.capturePrevious();simulation(dt);} });

  } else stepper.reset();
  if (hudTime > .1) { updateHUD(); hudTime = 0; } else hudTime += elapsed;
  renderFrame(stepper.time,isPlaying()?stepper.alpha:1);
  ui.renderWorldOverlay?.(renderFrame.projection());
  requestAnimationFrame(loop);
}
window.gameApp = Object.freeze({ useSkill, save: () => saveGameToMySQL(), load: loadGameFromMySQL,
  inspect: () => ({ mode: session.mode, state: JSON.parse(JSON.stringify(state)), spritesReady: window.SpriteManager.ready }) });
ui.menu(); updateHUD(); init(); requestAnimationFrame(loop);
