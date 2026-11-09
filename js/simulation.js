import { stepCrossings } from './crossings.js?v=89d5690bb102';
import { NIGHT_START } from './daylight.js?v=89d5690bb102';
import { recoverCoins } from './coins.js?v=89d5690bb102';
import { discoverAltar, revealTrailCache, torchIsLit } from './exploration.js?v=89d5690bb102';
import { collectEquipment } from './equipment.js?v=89d5690bb102';
import { advanceCrops, canTendCrop, tendCrop } from './crops.js?v=89d5690bb102';
import { recordLoss, updateGrief, patrolOffset, takeLeisure } from './daily-life.js?v=89d5690bb102';
import { updateCommunity, joinEncounter } from './community.js?v=89d5690bb102';
import { updateEcology, isHuntable, shallowWaterAt } from './ecology.js?v=89d5690bb102';
import { advancePlayerAttack, advanceAllyAction, strikeEnemy } from './combat.js?v=89d5690bb102';
import { advanceConstruction, workConstruction, homeRecovery, TOWER_HEIGHT } from './settlement.js?v=89d5690bb102';
import { advanceParticle, emitEffect } from './effects.js?v=89d5690bb102';
import { ensurePerson, updatePerson, reactToDamage, proficiency, completeProfession, personMaxHp } from './people.js?v=89d5690bb102';
import { ensureCampaign, finaleWon } from './campaign.js?v=89d5690bb102';
import { expeditionFormation } from './story.js?v=89d5690bb102';
import { BALANCE, ALLY_COMBAT, WATER_LINE_Y, WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=89d5690bb102';
import { nearest, chooseToolRack, chooseWorksite, defensePostX } from './ai.js?v=89d5690bb102';
export function createSimulation(api) {
const { state, keys, audio, updateHUD, spawnSpanishWave, spawnWildlife, showBanner,
saveGameToMySQL, getNearestInteractiveNode, refundUnfinishedSlots, addParticles,
addFloatingText, spawnPhysicalCoin, giveCoinToBenkos, spawnEnemy, hitBenkosKingdomStyle, finishCampaign, nextId, campaign, queueReinforcement, resolveBenkosHit, triggerBenkosAttack, updateCaptivity, updateStory } = api;
function damageWall(wall, damage, y, direction) {
  wall.hp = Math.max(0, wall.hp - damage);
  emitEffect(state, wall.level >= 4 ? 'stone' : 'wood', wall.x, y, direction, wall.hp ? .6 : 2.4);
  if (!wall.hp) emitEffect(state, 'dust', wall.x, WATER_LINE_Y - 13, direction, 1.8);
}
return function updateSimulation(dt) {
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
    return;
  }
  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt * 18);
  }

  const prevTime = state.timeOfDay;
  if (state.status !== 'playing') return;
  state.timeOfDay += dt / BALANCE.dayDuration;
  if (state.timeOfDay >= NIGHT_START && prevTime < NIGHT_START) {
    if (state.truceDays > 0) {
      state.truceDays--;
      state.phase = 'TRUCE_NIGHT';
      showBanner('NOCHE DE TREGUA EN LA MATUNA', 'Los tambores descansan bajo el pacto real');
    } else {
      state.phase = state.alertLevel >= 65 ? 'RED_NIGHT' : 'NIGHT_DEFENSE';
      spawnSpanishWave(state.phase === 'RED_NIGHT' ? 1.4 : 1.0);
    }
    updateHUD();
  }
  if (state.timeOfDay >= 1.0) {
    state.timeOfDay = 0;
    state.day++;

    state.trees.forEach(t=>{if(t.chopped&&t.regrowDay<=state.day){t.chopped=false;t.chopProgress=0;t.regrowDay=null;}});
    state.phase = 'DAY_EXPLORE';
    state.benkos.torchOff = false;
    state.alertLevel = Math.min(100, state.alertLevel + 8);
    if (state.wildlife.filter(isHuntable).length < 4) {
      spawnWildlife(-520 - Math.random() * 450);
      spawnWildlife(520 + Math.random() * 450);
    }
    showBanner(`AMANECER DEL DÍA ${state.day}`, 'Mineros a las vetas, Agricultores a la cosecha y Cazadores con sus redes');
    updateHUD();
    saveGameToMySQL(true);
  }

  const b = state.benkos;



  campaign?.update(dt);
  updateCaptivity?.();
  audio.update(dt, state.phase);

  b.animTime += dt;
  b.payTimer=Math.max(0,(b.payTimer??0)-dt);
  if (Math.abs(b.vx) > 60) {
    b.stepDust = (b.stepDust ?? 0) + dt;
    if (b.stepDust > .18) {
      b.stepDust = 0;
      emitEffect(state, b.inStream ? 'water' : 'dust', b.x, WATER_LINE_Y - 3, -b.facing, b.inStream ? .5 : .2);
    }
  }
  if (b.attackTimer > 0 && b.weaponMode === 'SPEAR' && torchIsLit(state)) {
    b.attackTimer = 0;
    b.queuedAttack = false;
  }
  if(advancePlayerAttack(b,dt))resolveBenkosHit?.();
  if(!b.attackTimer&&b.queuedAttack){b.queuedAttack=false;triggerBenkosAttack?.();}
  if (b.dashTimer > 0) b.dashTimer -= dt;
  if (b.ceibaTimer > 0) b.ceibaTimer -= dt;
  if (b.jaguarTimer > 0) b.jaguarTimer -= dt;
  if (b.invulnTimer > 0) b.invulnTimer -= dt;
  b.hurtTimer=Math.max(0,(b.hurtTimer??0)-dt);
  if (b.hurtKneelTimer > 0) b.hurtKneelTimer -= dt;
  if (b.roarWave > 0) b.roarWave = Math.max(0, b.roarWave - dt * 2.2);
  b.spirit = Math.min(b.maxSpirit, b.spirit + dt * (b.resting ? 8.0 : 2.5));

  const moveInput = b.waterFall ? 0 : (keys['KeyA'] || keys['ArrowLeft']) ? -1 : ((keys['KeyD'] || keys['ArrowRight']) ? 1 : 0);
  if (moveInput !== 0) {
    b.resting = false;
    b.sprintHoldTime += dt;
  } else {
    b.sprintHoldTime = 0;
  }

  const isRunning = b.sprintHoldTime > 0.35 || keys['ShiftLeft'] || keys['ShiftRight'] || b.jaguarTimer > 0;
  const baseSpeed = b.mounted ? (isRunning ? 212 : 117) : (isRunning ? 155 : 95);
  b.inStream = shallowWaterAt(state.ecology.streams, b.x);
  const moveSpeed=(b.jaguarTimer>0?205:baseSpeed)*(b.dashTimer>0?2.2:1)*(b.inStream&&!b.mounted?.72:1);

  if(b.hurtTimer>.24&&b.dashTimer<=0){b.vx*=Math.pow(.85,dt*60);}
  else if(b.attackTimer>0&&b.dashTimer<=0){
    b.facing=b.attackFacing||b.facing;
    const progress=b.attackElapsed/b.attackDuration;
    b.vx=progress>.27&&progress<.5?b.facing*28:moveInput*moveSpeed*.12;
  }else if (b.dashTimer <= 0 && b.hurtKneelTimer <= 0) {
    if (moveInput !== 0) {
      const targetSpeed = moveInput * moveSpeed;
      const change = b.mounted ? Math.min(1, dt * 5.5) : 1;
      b.vx += (targetSpeed - b.vx) * change;
      b.facing = Math.sign(b.vx) || moveInput;
    } else {
      b.vx *= Math.pow(b.mounted ? .88 : .78, dt * 60);
    }
  }
  b.x = Math.max(WORLD_MIN_X + 40, Math.min(WORLD_MAX_X - 40, b.x + b.vx * dt));
  state.cameraX += (b.x - state.cameraX) * Math.min(1, dt * 7.5);

  if (discoverAltar(state)) {
    showBanner('SANTUARIO DE LOS ANCESTROS', 'Ofrenda plata con S para despertar los poderes del jaguar.');
    updateHUD();
  }
  const foundCache = revealTrailCache(state);
  if (foundCache) addFloatingText(foundCache.x, WATER_LINE_Y - 35, 'Brillo entre las hojas · E al acercarte', '#e4cb85');
  const activeNode = getNearestInteractiveNode(b.x);
  const currentNodeId = activeNode ? activeNode.id : null;
  if (currentNodeId !== state.activeNodeId) {
    refundUnfinishedSlots(currentNodeId);
    state.activeNodeId = currentNodeId;
    state.holdPayTimer = 0;
  }

  const isHoldingPay = !b.waterFall && (keys['KeyS'] || keys['ArrowDown'] || keys['KeyK'] || state.touchHoldPay);
  if (isHoldingPay && !activeNode?.locked) {
    state.holdPayTimer += dt;
    if (activeNode) {
      if (state.holdPayTimer >= 0.22) {
        state.holdPayTimer = 0;
        if (activeNode.purchase) {
          const result = activeNode.purchase();
          if (result.success) {
            b.payTimer = .35;
            audio.playSlotDing(result.paid - 1);
            addParticles(activeNode.x, WATER_LINE_Y - 46, 5, '#fde047', 45);
            updateHUD();
          } else {
            addFloatingText(b.x, WATER_LINE_Y - 46, result.message, '#f87171');
            state.holdPayTimer = -.35;
          }
        } else if (state.coins > 0) {
          state.coins--; b.payTimer=.35;
          const filled = activeNode.getFilled() + 1;
          activeNode.setFilled(filled);
          audio.playSlotDing(filled - 1);
          addParticles(activeNode.x, WATER_LINE_Y - 46, 5, '#fde047', 45);
          if (filled >= activeNode.cost) {
            activeNode.setFilled(0);
            activeNode.onComplete();
          }
          updateHUD();
        } else {
          addFloatingText(b.x, WATER_LINE_Y - 46, '¡Sin Reales de Plata!', '#f87171');
          state.holdPayTimer = -0.35;
        }
      }
    } else if (state.holdPayTimer >= 0.28) {
      state.holdPayTimer = -0.2;
      if (state.coins > 0) {
        state.coins--;
        audio.playSfx('coinPickup');
        spawnPhysicalCoin(b.x + b.facing * 10, WATER_LINE_Y - 18, b.facing * 75, -135, false, false);
        updateHUD();
      } else {
        addFloatingText(b.x, WATER_LINE_Y - 44, '¡Bolsa Vacía!', '#f87171');
      }
    }
  } else {
    state.holdPayTimer = 0.18;
  }

  for (let i = state.droppedCoins.length - 1; i >= 0; i--) {
    const c = state.droppedCoins[i];
    c.life -= dt;
    if (c.pickupDelay > 0) c.pickupDelay -= dt;
    c.vy += 420 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;

    if (!c.fallsInRiver && c.y >= WATER_LINE_Y) {
      c.y = WATER_LINE_Y;
      c.vy = -c.vy * 0.35;
      c.vx *= 0.65;
      if (Math.abs(c.vy) < 18) c.vy = 0;
    } else if (c.fallsInRiver && c.y >= WATER_LINE_Y + 8) {
      audio.playSfx('splash');
      state.waterRipples.push({ x: c.x, y: WATER_LINE_Y + 6, rad: 2, alpha: 0.9 });
      addParticles(c.x, WATER_LINE_Y, 8, '#bae6fd', 55);
      state.droppedCoins.splice(i, 1);
      continue;
    }

    if (!c.fallsInRiver && c.pickupDelay <= 0 && state.coins < state.maxCoins && Math.abs(c.x - b.x) < 18) {
      giveCoinToBenkos(1, c.x);
      state.droppedCoins.splice(i, 1);
      continue;
    }

    if (c.life <= 0) state.droppedCoins.splice(i, 1);
  }

  updateEcology(state, dt, {
    torchLit: torchIsLit(state),
    damagePlayer: hitBenkosKingdomStyle,
    notice: (x, message) => {
      addFloatingText(x, WATER_LINE_Y - 45, message, '#c8be88');
      if (message.includes('pesca')) showBanner(message, '');
    },
    dropCoin: x => spawnPhysicalCoin(x, WATER_LINE_Y - 12, 0, -95, true, false),
    collectHunt: (animal, food) => {
      const hunter = state.units.find(unit => unit.id === animal.lastHunterId && unit.role === 'CAZADOR' && unit.hp > 0);
      if (!hunter) return false;
      hunter.huntCargo ??= { food: 0, coins: 0 };
      hunter.huntCargo.food += food;
      hunter.huntCargo.coins++;
      hunter.carryingSack = true;
      return true;
    }
  });

  advanceCrops(state, dt);
  for (let i = state.units.length - 1; i >= 0; i--) {
    const unit = state.units[i];
    if (unit.hp > 0) continue;
    for (let coin = 0; coin < (unit.recoveredCoins ?? 0); coin++) {
      spawnPhysicalCoin(unit.x, WATER_LINE_Y - 20, coin * 13 - 20, -80, true, !!unit.waterFall, true);
    }
    recordLoss(unit, state);
    state.units.splice(i, 1);
    addFloatingText(unit.x, WATER_LINE_Y - 53, `Cayó ${unit.name}`, '#c9bea7');
    showBanner('EL PALENQUE ESTÁ DE LUTO', unit.name);
    updateHUD();
  }
  updateCommunity(state, dt, x => {
    addFloatingText(x, WATER_LINE_Y - 66, '+2 moral · apoyo entre vecinos', '#d4df99');
    updateHUD();
  });
  // Allied work and defense
  const moraleMult = state.morale / 100;
  const formation = expeditionFormation(state);
  const reservedJobs = new Set();
  if (state.settlement.projects.length && !state.units.some(unit => unit.role === 'CONSTRUCTOR' && unit.hp > 0)) {
    // Keep one reserve hammer so the village can train a replacement after a loss.
    const rack = state.toolRacks.find(station => station.role === 'CONSTRUCTOR');
    if (rack?.stock === 0) rack.stock = 1;
  }
  const coveringRescue = state.story.expedition?.stage === 'return';
  for (let idx = state.units.length - 1; idx >= 0; idx--) {
    const u = state.units[idx];
    if (u.waterFall) continue;
    u.towerHeight = 0;
    delete u.constructionJob;
    ensurePerson(u);
    if (u.kitOrder?.remaining > 0) u.kitOrder.remaining = Math.max(0, u.kitOrder.remaining - dt);
    updateGrief(u, dt);
    u.animSeed = (u.animSeed ?? 0) + dt;
    advanceAllyAction(u,state,dt,enemy=>{emitEffect(state,'blood',enemy.x,WATER_LINE_Y-20,u.facing,.65);audio.playSfx('slash');});
    if (u.attackCooldown > 0) u.attackCooldown -= dt;
    if (u.attackAnimTimer > 0) u.attackAnimTimer -= dt;
    if (u.liberateAnimTimer > 0) {
      u.liberateAnimTimer -= dt;
      continue;
    }
    if (u.role === 'FUGITIVO') {
      u.vx = 0;
      u.activity = 'CAPTIVE';
      u.mood = 'Cautivo en la hacienda';
      continue;
    }

    if(updatePerson(u,state,dt,Math.abs(u.x)<600?homeRecovery(state):1))continue;
    if (u.escortHome) {
      if (Math.abs(u.x) > 275) {
        u.facing = -Math.sign(u.x);
        u.vx = u.facing * 86;
        u.x += u.vx * dt;
        u.activity = 'ESCORT';
        u.mood = 'Camino al palenque';
        continue;
      }
      delete u.escortHome;
      u.vx = 0;
      addFloatingText(u.x, WATER_LINE_Y - 45, `${u.name.split(' ')[0]} llegó a salvo`, '#d0dc9a');
    }
    if (recoverCoins(u, state, dt, (worker, amount) => {
      addFloatingText(48, WATER_LINE_Y - 42, `+${amount} ${amount === 1 ? 'real recuperado' : 'reales recuperados'} · ${worker.name.split(' ')[0]}`, '#e4cb85');
      audio.playSfx('coinPickup');
      updateHUD();
    })) continue;
    if (collectEquipment(u, state, dt, personMaxHp)) continue;
    if (u.role === 'CONSTRUCTOR' && !u.requestedRole && state.settlement.projects.length) {
      u.leisure = null;
      const job = workConstruction(u, state, dt, reservedJobs);
      if (job && Math.random() < dt * 3) {
        const effect = job.kind === 'rack' ? 'spark' : job.kind === 'wall' || job.kind === 'altar' ? 'stone' : 'wood';
        emitEffect(state, effect, u.x + u.facing * 8, WATER_LINE_Y - 23, u.facing, .35);
      }
      continue;
    }
    const expeditionX = formation?.get(u.id) ?? null;
    if (expeditionX === null && (joinEncounter(u, state, dt) || takeLeisure(u, state, dt))) continue;
    if (expeditionX !== null && Math.abs(expeditionX - u.x) > 140 && !state.enemies.some(e => e.hp > 0 && Math.abs(e.x - u.x) < 175)) {
      u.facing = Math.sign(expeditionX - u.x);
      u.vx = u.facing * (b.mounted ? 220 : 174);
      u.x += u.vx * dt;
      u.activity = 'PATROL';
      u.mood = 'En expedición con Benkos';
      continue;
    }
    const fitMult = proficiency(u);
    const weaponRank = u.equipment?.weapon ?? (u.role === 'CAMPEON_REAL' ? u.tier : 1);
    const tierMult = (weaponRank === 3 ? 1.75 : weaponRank === 2 ? 1.35 : 1) * fitMult;

    if (u.role === 'CONSTRUCTOR') {
      u.vx = 0;
      u.activity = 'IDLE';
      u.mood = 'Esperando una obra';
    } else if (u.role === 'ALDEANO') {
      const rack = chooseToolRack(u, state);
      if (rack) {
        const dx = rack.x - u.x;
        u.activity = 'TRAINING';
        if (Math.abs(dx) > 10) { u.facing = Math.sign(dx); u.vx = u.facing * 65; u.x += u.vx * dt; }
        else { u.vx = 0; if (completeProfession(u, rack, state)) { audio.playSfx('coinPickup'); updateHUD(); } }
      } else { u.vx = 0; }
    } else if (u.role === 'LENADOR') {
      if(u.carryingSack&&u.cargoWood){
        const dx=48-u.x;u.activity='DELIVER';
        if(Math.abs(dx)>12){u.vx=Math.sign(dx)*54;u.facing=Math.sign(dx);u.x+=u.vx*dt;}
        else{state.resources.wood+=u.cargoWood;addFloatingText(48,WATER_LINE_Y-55,'+'+u.cargoWood+' madera','#d4ba83');u.cargoWood=0;u.carryingSack=false;u.vx=0;updateHUD();}
        continue;
      }
      const tree = nearest(u, state.trees, t => t.markedForChop && !t.chopped);
      if (tree) {
        const dx = tree.x - u.x;
        if (Math.abs(dx) > 14) { u.activity = 'WALK'; u.vx = Math.sign(dx) * 62; u.facing = Math.sign(dx); u.x += u.vx * dt; }
        else {
          u.vx = 0; u.activity = 'CHOP';
          tree.chopProgress = (tree.chopProgress || 0) + dt * .24 * fitMult;
          if (Math.random() < dt * 3) { audio.playSfx('pickaxe'); addParticles(tree.x, WATER_LINE_Y - 15, 2, '#b88a54', 35); }
          if (tree.chopProgress >= 1) {
            tree.markedForChop = false; tree.chopped = true; tree.regrowDay=state.day+3; u.carryingSack = true; u.cargoWood=4+Math.floor((u.attributes.strength??3)/2);
            spawnPhysicalCoin(tree.x, WATER_LINE_Y - 20, 20, -90, true, false);
            spawnPhysicalCoin(tree.x, WATER_LINE_Y - 20, -20, -90, true, false);
            addFloatingText(tree.x, WATER_LINE_Y - 40, '+2 reales · madera', '#c6bb86'); updateHUD();
          }
        }
      } else { u.vx = 0; u.carryingSack = false; }
    } else if (u.role === 'AGRICULTOR') {
      if (u.carryingSack) {
        const dx = 48 - u.x;
        if (Math.abs(dx) > 12) {
          u.facing = Math.sign(dx) || 1;
          u.vx = u.facing * 52;
          u.x += u.vx * dt;
        } else {
          u.carryingSack = false;
          state.resources.food += u.cropCargo?.food ?? 2;
          const yieldCoins = u.cropCargo?.coins ?? 1;
          u.cropCargo = null;
          u.vx = 0;
          for (let c = 0; c < yieldCoins; c++) {
            spawnPhysicalCoin(48, WATER_LINE_Y - 18, (Math.random() - 0.5) * 45, -105, true, false);
          }
          addFloatingText(48, WATER_LINE_Y - 40, `+${yieldCoins} reales  Cosecha Entregada`, '#fde047');
        }
      } else {
        const workable = state.farms.filter(canTendCrop);
        const activeFarm = chooseWorksite(u, workable, state.units, 'AGRICULTOR', BALANCE.farmCapacity);
        if (!activeFarm) { u.vx = 0; continue; }
        const targetX = activeFarm.x + ((u.id % 3) - 1) * 14;
        if (Math.abs(targetX - u.x) > 8) {
          u.facing = Math.sign(targetX - u.x) || 1;
          u.vx = u.facing * 58;
          u.x += u.vx * dt;
        } else {
          u.vx = 0;
          u.activity = 'WORK';
          const harvest = tendCrop(activeFarm, state, dt, fitMult);
          if (harvest) {
            u.cropCargo = harvest;
            u.carryingSack = true;
            addFloatingText(u.x, WATER_LINE_Y - 38, 'Cosecha lista para entregar', '#4ade80');
          }
        }
      }
    } else if (u.role === 'MINERO') {
      if (u.carryingSack) {
        const dx = 48 - u.x;
        if (Math.abs(dx) > 12) {
          u.facing = Math.sign(dx) || 1;
          u.vx = u.facing * 50;
          u.x += u.vx * dt;
        } else {
          u.carryingSack = false;
          const oreCoins = u.tier >= 2 ? 2 : 1;
          state.resources.stone+=2;updateHUD();
          for (let c = 0; c < oreCoins; c++) {
            spawnPhysicalCoin(48, WATER_LINE_Y - 20, (Math.random() - 0.5) * 55, -115, true, false);
          }
          addFloatingText(48, WATER_LINE_Y - 44, ` +${oreCoins} reales · +2 piedra`, '#38bdf8');
        }
      } else {
        const mine = chooseWorksite(u, state.mines, state.units, 'MINERO', BALANCE.mineCapacity);
        if (!mine) { u.vx = 0; continue; }
        if (Math.abs(mine.x - u.x) > 12) {
          u.facing = Math.sign(mine.x - u.x) || 1;
          u.vx = u.facing * 60;
          u.x += u.vx * dt;
        } else {
          u.vx = 0;
          u.activity = 'WORK';
          mine.oreProgress += dt * 0.18 * tierMult;
          if (Math.random() < 1 - Math.exp(-3 * dt)) addParticles(mine.x, WATER_LINE_Y - 14, 2, '#cbd5e1', 40);
          if (mine.oreProgress >= 1.0) {
            mine.oreProgress = 0;
            u.carryingSack = true;
            audio.playSfx('pickaxe');
            addFloatingText(mine.x, WATER_LINE_Y - 38, ' Saco de Plata Extraído', '#e2e8f0');
          }
        }
      }
    } else if (u.role === 'CAZADOR') {
      const postX = expeditionX ?? u.assignedSide * 270 + patrolOffset(u, state);
      const enemyTarget = nearest(u, state.enemies, enemy => enemy.hp > 0 && Math.abs(enemy.x - u.x) < 175);
      if (u.huntCargo && !enemyTarget) {
        const delta = 48 - u.x;
        u.activity = 'DELIVER';
        u.mood = 'Llevando la caza y la plata al cofre';
        if (Math.abs(delta) > 12) {
          u.facing = Math.sign(delta);
          u.vx = u.facing * 61;
          u.x += u.vx * dt;
        } else {
          u.vx = 0;
          state.resources.food += u.huntCargo.food;
          state.treasuryCoins += u.huntCargo.coins;
          addFloatingText(48, WATER_LINE_Y - 42, `+${u.huntCargo.coins} real de caza · +${u.huntCargo.food} alimento`, '#dbc78f');
          u.huntCargo = null;
          u.carryingSack = false;
          updateHUD();
        }
        continue;
      }
      const prey = state.phase === 'DAY_EXPLORE' && expeditionX === null
        ? nearest(u, state.wildlife, animal => isHuntable(animal) && Math.abs(animal.x - postX) < 630)
        : null;
      const target = enemyTarget || (prey && Math.abs(prey.x - u.x) < 160 ? prey : null);
      const huntX = prey && !enemyTarget ? prey.x - Math.sign(prey.x - u.x) * 116 : postX;

      if (target && u.attackCooldown <= 0) {
        u.facing = Math.sign(target.x - u.x) || 1;
        u.attackCooldown = 1.45;
        u.attackDuration = .45;
        u.attackAnimTimer = .45;
        u.activity = 'HUNT';
        const throwNet = (!target.nettedTimer || target.nettedTimer <= 0) && Math.random() < 0.55;
        u.vx = 0;
        u.pendingShot={eta:.17, hunterId: u.id,
          x: u.x,
          y: WATER_LINE_Y - 20,
          vx: u.facing * 205,
          vy: -28,
          dmg: (throwNet ? 8 : 18) * moraleMult * tierMult,
          isNet: throwNet,
          fromPlayerSide: true,
          color: throwNet ? '#fde047' : '#a3e635'
        };
      } else if (u.activity === 'KITE') {
        // updatePerson has already taken a backward step while facing the threat.
      } else if (!u.pendingShot && Math.abs(huntX - u.x) > 16) {
        u.activity = 'PATROL';
        u.mood = prey ? 'Siguiendo un rastro' : 'Rondando el monte';
        u.facing = Math.sign(huntX - u.x) || 1;
        u.vx = u.facing * 68;
        u.x += u.vx * dt;
      } else {
        u.vx = 0;
        u.facing = u.assignedSide;
      }
    } else if (u.role === 'ARQUERO') {
      const activeWall = state.walls.filter(w => w.dir === u.assignedSide && w.level > 0 && w.hp > 0).sort((a,b) => Math.abs(b.x)-Math.abs(a.x))[0];
      const tower = state.settlement.towers.find(post => post.side === u.assignedSide && post.level > 0);
      const sentry = tower && state.units.find(archer => archer.role === 'ARQUERO' && archer.assignedSide === tower.side &&
        archer.hp > 0 && !archer.requestedRole && !state.story.expedition?.party.includes(archer.id));
      const postX = expeditionX ?? (sentry === u ? tower.x : defensePostX(u, state.units, activeWall) + patrolOffset(u, state));
      if (u.activity === 'KITE') {
        // Keep distance and retain the opportunity to shoot.
      } else if (Math.abs(postX - u.x) > (expeditionX === null ? 3 : 14)) {
        u.facing = Math.sign(postX - u.x) || 1;
        u.vx = u.facing * 64;
        u.x += u.vx * dt;
      } else {
        u.vx = 0;
        if (expeditionX === null) u.facing = u.assignedSide;
      }
      if (sentry === u && u.activity !== 'KITE' && Math.abs(tower.x - u.x) <= 3) u.towerHeight = TOWER_HEIGHT[tower.level];
      if (u.attackCooldown <= 0) {
        const range = u.towerHeight ? 225 + tower.level * 25 : 200;
        const enemyTarget = nearest(u, state.enemies, (en) => en.hp > 0 && !(en.appearTimer > 0) && Math.abs(en.x - u.x) < range);
        if (enemyTarget) {
          u.attackCooldown = weaponRank === 3 ? 0.85 : 1.1;
          u.attackDuration=.5;u.attackAnimTimer=.5;u.activity='ATTACK';
          u.facing = Math.sign(enemyTarget.x - u.x) || 1;
          const flight = Math.max(.10, (Math.abs(enemyTarget.x - u.x) - 12) / 245);
          u.pendingShot={eta:.18,
            x:u.x,y: WATER_LINE_Y - 19 - u.towerHeight, vx: u.facing * 245,
            vy: u.towerHeight ? u.towerHeight / flight - 22.5 * flight : -20,
            dmg: 15 * moraleMult * tierMult, fromPlayerSide: true, color: weaponRank === 3 ? '#fde047' : '#4ade80'
          };
        }
      }
    } else if (u.role === 'GUERRERO' || u.role === 'ESPADACHIN' || u.role === 'CABALLERO_ALIADO' || u.role === 'CAMPEON_REAL') {
      const moveSpd = ALLY_COMBAT[u.role].speed;
      const nearEnemy = nearest(u, state.enemies, (en) => en.hp > 0 && Math.abs(en.x - u.x) < 310 &&
        (!coveringRescue || expeditionX === null || Math.abs(en.x - expeditionX) < 130));
      const activeWall = state.walls.filter(w => w.dir === u.assignedSide && w.level > 0 && w.hp > 0).sort((a,b) => Math.abs(b.x)-Math.abs(a.x))[0];
      const frontX=activeWall?activeWall.x-u.assignedSide*10:u.assignedSide*285;
      const guardX = expeditionX ?? defensePostX(u, state.units, activeWall) + patrolOffset(u, state);
      const targetX = nearEnemy ? (u.role === 'GUERRERO' && expeditionX === null ? Math.max(frontX - 85, Math.min(frontX + 85, nearEnemy.x)) : nearEnemy.x) : guardX;

      if (Math.abs(targetX-u.x) > (nearEnemy ? 22 : expeditionX === null ? 3 : 14)) {
        u.facing = Math.sign(targetX - u.x) || 1;
        u.vx = u.facing * moveSpd;
        u.x += u.vx * dt;
      } else {
        u.vx = 0;
      }

      if (u.attackCooldown <= 0 && nearEnemy && Math.abs(nearEnemy.x - u.x) <= 42) {
        u.facing = Math.sign(nearEnemy.x - u.x) || u.facing;
        u.attackCooldown = ALLY_COMBAT[u.role].cooldown;
        u.attackDuration=.46;u.attackAnimTimer=.46;u.activity='ATTACK';
        u.weaponSubMode = u.weaponSubMode === 'SPEAR' ? 'SWORD' : 'SPEAR';
        const baseHit = ALLY_COMBAT[u.role].damage;
        const antiCav = (u.role === 'GUERRERO' && nearEnemy.type === 'CABALLERO') ? 1.8 : 1.0;
        const totalDmg = baseHit * moraleMult * tierMult * antiCav;
        u.pendingStrike={targetId:nearEnemy.id,damage:totalDmg,reach:52,facing:u.facing,eta:.17};
      }
    }
  }

  advanceConstruction(state, dt, job => {
    const sanctuary = job.kind === 'altar';
    emitEffect(state, job.kind === 'rack' || sanctuary ? 'spark' : 'dust', job.x, WATER_LINE_Y - 20);
    addFloatingText(job.x, WATER_LINE_Y - 65, job.kind === 'rack' ? 'Equipo forjado' : 'Obra terminada', '#d6c78e');
    audio.playSfx(sanctuary ? 'roar' : 'pickaxe');
    if (sanctuary) showBanner('NUEVO PODER DEL JAGUAR', state.skills.find(skill => skill.level === job.targetLevel).name);
    updateHUD();
  });

  // ==================== COLONIAL ENEMIES & BOSS AI ====================
  for (let i = state.enemies.length - 1; i >= 0 && state.status === 'playing'; i--) {
    const en = state.enemies[i];
    if (en.waterFall && en.hp > 0) continue;
    en.isMoving = Math.abs(en.x - (en.previousX ?? en.x)) > .05;
    en.previousX = en.x;
    en.animTime += dt;en.hurtTimer=Math.max(0,(en.hurtTimer??0)-dt);
    if (en.muzzleFlash > 0) en.muzzleFlash -= dt;
    if (en.attackAnimTimer > 0) en.attackAnimTimer -= dt;
    if (en.tauntTimer > 0) en.tauntTimer -= dt;
    if (en.nettedTimer > 0) en.nettedTimer -= dt;
    if (en.trumpetRing > 0) en.trumpetRing = Math.max(0, en.trumpetRing - dt * 1.8);

    if (en.appearTimer > 0) {
      en.appearTimer -= dt;
      continue;
    }

    if (en.bleedTimer > 0) {
      en.bleedTimer -= dt;
      en.hp -= 4.5 * dt;
    }

    if (en.hp <= 0) {
      if (en.type === 'GOBERNADOR_GIRON' && en.phase === 1 && !en.waterFall) {
        en.phase = 2;
        en.maxHp = 280;
        en.hp = 280;
        en.speed = 64;
        en.range = 32;
        en.tauntTimer = 1.4;
        state.screenShake = 12;
        audio.playSfx('roar');
        addParticles(en.x, WATER_LINE_Y - 24, 30, '#fde047', 130);
        state.horses.push({ id: `horse_${nextId()}`, x: en.x + 28, facing: en.facing, rider: null });
        showBanner(' ¡EL CORCEL DEL GOBERNADOR HA CAÍDO!', 'García Girón desenvaina su Gran Espada Toledana a pie (Fase 2)');
        updateHUD();
        continue;
      }

      if (en.type === 'GOBERNADOR_GIRON' && (en.phase === 2 || en.waterFall)) {
      state.bossesDefeated++;
      const progress = ensureCampaign(state); progress.governorDefeated = true; progress.defeatedBosses.push('GOBERNADOR_GIRON');
      state.score += 5000;
      showBanner('GOBERNADOR DERROTADO', 'Su escolta pierde el mando. Protege a la comunidad hasta que cese el asalto.');
    } else if (en.type === 'HERALDO_ALADO') {
        const progress = ensureCampaign(state); progress.heraldDefeated = true; progress.defeatedBosses.push('HERALDO_ALADO'); state.bossesDefeated++;
        audio.playSfx('trumpet');
        state.screenShake = 10;
        showBanner(' ¡HERALDO ALADO DERRIBADO!', '¡El cielo de la Matuna vuelve a ser libre!');
        addFloatingText(en.x, WATER_LINE_Y - 50, ' ¡HERALDO DERROTADO! +2500 PUNTOS', '#fde047');
        state.score = (state.score || 0) + 2500;
      }

      if (!en.waterFall) state.corpses.push({
        type: en.type,
        phase: en.phase,
        x: en.x,
        facing: en.facing,
        timer: 3.2
      });

      const totalDrop = en.reward + en.stolenCoins;
      for (let c = 0; c < totalDrop; c++) {
        spawnPhysicalCoin(en.x + (c * 5 - 6), WATER_LINE_Y - 18, (Math.random() - 0.5) * 85, -120 - Math.random() * 30, true, !!en.waterFall);
      }
      addParticles(en.x, WATER_LINE_Y - 18, 16, '#f59e0b', 90);
      state.enemies.splice(i, 1);
      state.enemiesDefeated++;
      if (!en.isBoss) state.score += 100;
      updateHUD();
      continue;
    }

    if (en.stunTimer > 0 || en.nettedTimer > 0) {
      en.stunTimer = Math.max(0, en.stunTimer - dt);
      en.x += en.vx * dt;
      en.vx *= Math.pow(0.82, dt * 60);
      continue;
    }

    if (en.stolenCoins > 0) {
      const escapeDir = en.x >= 0 ? 1 : -1;
      en.facing = escapeDir;
      en.x += escapeDir * en.speed * 1.25 * dt;
      if (en.x < WORLD_MIN_X - 90 || en.x > WORLD_MAX_X + 90) state.enemies.splice(i, 1);
      continue;
    }

    const groundCoinIdx = state.droppedCoins.findIndex((c) => !c.fallsInRiver && Math.abs(c.x - en.x) < 16);
    if (groundCoinIdx !== -1 && en.type === 'BANDOLERO') {
      state.droppedCoins.splice(groundCoinIdx, 1);
      en.stolenCoins++;
      addFloatingText(en.x, WATER_LINE_Y - 36, '¡Bandolero robó 1 reales !', '#f87171');
      continue;
    }

    const target = nearest(en, state.units, u => u.hp > 0 && u.role !== 'FUGITIVO' && Math.abs(u.x - en.x) < Math.abs(b.x - en.x));
    if (en.guardSite && Number.isFinite(en.guardX)) {
      const targetX = target?.x ?? b.x;
      const returnToPost = Math.abs(targetX - en.guardX) > 245 || Math.abs(en.x - en.guardX) > 265;
      if (returnToPost) {
        const step = en.guardX - en.x;
        en.windupTimer = 0;
        en.attackReady = false;
        en.vx = 0;
        if (Math.abs(step) > 2) {
          en.facing = Math.sign(step);
          en.x += en.facing * Math.min(Math.abs(step), en.speed * dt);
        }
        continue;
      }
    }
    const dirToTarget = Math.sign((target ? target.x : b.x) - en.x) || (en.x > 0 ? -1 : 1);
    en.facing = dirToTarget;

    const blockingWall = state.walls.find(
      (w) => w.level > 0 && w.hp > 0 && Math.sign(w.x - en.x) === dirToTarget && Math.abs(en.x - w.x) < 26
    );

    const distToBenkos = Math.abs(en.x - b.x);
    const nearAlly = nearest(en, state.units,
      u => u.hp > 0 && u.role !== 'FUGITIVO' && Math.abs(u.x - en.x) <= Math.max(en.range, 34) && Math.sign(u.x - en.x) === dirToTarget
    );
    const canAttack = distToBenkos <= (en.type === 'HERALDO_ALADO' ? 170 : en.range) || blockingWall || nearAlly;
    if (!canAttack) { en.attackReady = false; en.windupTimer = 0; }
    en.attackCooldown -= dt;
    if (en.attackCooldown <= 0 && !en.attackReady && !en.windupTimer) {
      if (distToBenkos <= Math.max(en.range, en.isBoss ? 170 : en.range) || blockingWall || nearAlly) {
        en.windupTimer = en.type === 'ARCABUCERO' ? 0.8 : (en.type === 'CABALLERO' || en.isBoss ? 0.65 : 0.4);
        en.windupTotal = en.windupTimer;
      }
    }
    if (en.windupTimer > 0) {
      en.windupTimer = Math.max(0, en.windupTimer - dt);
      if (en.windupTimer > 0) continue;
      en.attackReady = true;
    }

    if (en.type === 'HERALDO_ALADO') {
      // Refuerzos al 50% HP
      if (en.hp <= en.maxHp * 0.5 && !en.summonedMinions) {
        en.summonedMinions = true;
        audio.playSfx('trumpet');
        showBanner(' ¡EL HERALDO ALADO CONVOCA REFUERZOS!', 'Arqueros coloniales abren fuego desde la retaguardia');
        queueReinforcement('ARQUERO_COLONIAL', -en.facing);
        queueReinforcement('ARQUERO_COLONIAL', -en.facing);
        addParticles(en.x, WATER_LINE_Y - 30, 20, '#38bdf8', 90);
      }

      if (en.attackCooldown <= 0 && distToBenkos < 170) {
        en.attackCooldown = 2.4;
      en.attackReady = false;
        en.attackAnimTimer = 0.7;
        en.trumpetRing = 1.0;
        audio.playSfx('trumpet');
        state.projectiles.push({
          x: en.x + en.facing * 16,
          y: WATER_LINE_Y - 24,
          vx: en.facing * 200,
          vy: 0,
          dmg: 18,
          fromPlayerSide: false,
          color: '#38bdf8'
        });

      } else if (!blockingWall && distToBenkos > 55) {
        en.x += dirToTarget * en.speed * dt;
      }
      updateHUD();
      continue;
    }

    if (distToBenkos <= en.range && !blockingWall) {
      if (en.attackCooldown <= 0) {
        en.attackAnimTimer = 0.38;
        if (en.type === 'ARCABUCERO') {
          en.attackCooldown = en.type === 'ARCABUCERO' ? 2.4 : 1.7;
      en.attackReady = false;
          en.muzzleFlash = 0.16;
          audio.playSfx('musket');
          state.projectiles.push({
            x: en.x + en.facing * 12,
            y: WATER_LINE_Y - 20,
            vx: en.facing * 255,
            vy: 0,
            dmg: en.dmg,
            fromPlayerSide: false,
            color: '#fde047'
          });
        } else if (en.type === 'ARQUERO_COLONIAL') {
          en.attackCooldown = 1.8;
      en.attackReady = false;
          state.projectiles.push({
            x: en.x + en.facing * 10,
            y: WATER_LINE_Y - 20,
            vx: en.facing * 210,
            vy: -26,
            dmg: en.dmg,
            fromPlayerSide: false,
            color: '#f97316'
          });
        } else {
          en.attackCooldown = en.isBoss ? 0.9 : 1.2;
      en.attackReady = false;
          audio.playSfx('slash');
          if (en.isBoss) en.vx = en.facing * (en.phase === 2 ? 115 : 95);
          hitBenkosKingdomStyle(en.dmg, en.facing);
        }
      }
    } else if (blockingWall) {
      if (en.attackCooldown <= 0) {
        en.attackCooldown = 1.1;
      en.attackReady = false;
        en.attackAnimTimer = 0.35;
        damageWall(blockingWall, en.dmg, WATER_LINE_Y - 22, en.facing);
        audio.playSfx('slash');
        addFloatingText(blockingWall.x, WATER_LINE_Y - 44, `Muralla -${Math.round(en.dmg)}`, '#fbbf24');
      }
    } else if (nearAlly) {
      if (en.attackCooldown <= 0) {
        en.attackCooldown = 1.15;
      en.attackReady = false;
        en.attackAnimTimer = 0.35;
        reactToDamage(nearAlly, en.dmg, en.facing);
        audio.playSfx('slash');
        emitEffect(state, nearAlly.equipment?.armor > 1 ? 'spark' : 'blood', nearAlly.x, WATER_LINE_Y - 20, en.facing, .7);
        addFloatingText(nearAlly.x, WATER_LINE_Y - 38, `-${Math.round(en.dmg)}`, '#f87171');
        nearAlly.vx = en.facing * 60;

      }
    } else {
      const onOuterRoad = Math.abs(en.x) > 1600 && distToBenkos > 330 && !target;
      const marchSpeed = en.speed * (onOuterRoad ? 1.45 : 1);
      en.x += dirToTarget * marchSpeed * dt + en.vx * dt;
      en.vx *= Math.pow(0.82, dt * 60);
    }
    if (en.isBoss) updateHUD();
  }

  stepCrossings(state, dt, {
    splash: (x, velocity) => {
      emitEffect(state, 'water', x, WATER_LINE_Y + 3, Math.sign(velocity), 2.3);
      audio.playSfx('splash');
    },
    onPlayerDrowned: () => {
      state.status = 'defeat';
      finishCampaign('defeat');
    }
  });
  if (state.status !== 'playing') return;

  for (let i = state.corpses.length - 1; i >= 0; i--) {
    state.corpses[i].timer -= dt;
    if (state.corpses[i].timer <= 0) state.corpses.splice(i, 1);
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.vy !== 0) p.vy += 45 * dt;

    let hit = false;
    if (p.fromPlayerSide) {
      for (let j = 0; j < state.enemies.length; j++) {
        const en = state.enemies[j];
        if(en.hp>0&&en.appearTimer<=0&&Math.abs(p.x-en.x)<16&& Math.abs(p.y - (WATER_LINE_Y - 18)) < 26) {
          strikeEnemy(en,p.dmg,Math.sign(p.vx));
          if (p.isNet) {
            en.nettedTimer = en.isBoss ? 1.4 : 3.2;
            addFloatingText(en.x, WATER_LINE_Y - 46, ' ¡Atrapado en Red!', '#fde047');
          }
          if (!p.isNet) emitEffect(state, 'blood', en.x, p.y, Math.sign(p.vx), .65);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (let j = 0; j < state.wildlife.length; j++) {
          const an = state.wildlife[j];
          if(isHuntable(an)&&Math.abs(p.x-an.x)<14&&Math.abs(p.y-an.y)<28){
            an.hp -= p.dmg;
            an.lastHunterId = p.hunterId ?? null;
            if (p.isNet) an.nettedTimer = 4.0;
            hit = true;
            break;
          }
        }
      }
    } else {
      // Proyectil enemigo: verifica impacto en muralla defensiva
      const hitWall = state.walls.find(w => w.level > 0 && w.hp > 0 && Math.abs(p.x - w.x) < 16);
      if (hitWall) {
        damageWall(hitWall, p.dmg, p.y, Math.sign(p.vx));
        audio.playSfx('slash');
        hit = true;
      } else {
        // Impacto en defensor aliado con escudo
        const hitAlly = state.units.find(u => u.hp > 0 && (u.role === 'GUERRERO' || u.role === 'CAMPEON_REAL') && Math.abs(p.x - u.x) < 14);
        if (hitAlly) {
          reactToDamage(hitAlly, p.dmg, Math.sign(p.vx));
          emitEffect(state, hitAlly.equipment?.armor > 1 ? 'spark' : 'blood', hitAlly.x, p.y, Math.sign(p.vx), .6);
          audio.playSfx('slash');
          hit = true;
        } else if (Math.abs(p.x - b.x) < 14) {
          hitBenkosKingdomStyle(p.dmg, Math.sign(p.vx));
          hit = true;
        }
      }
    }
    if (hit || p.y > WATER_LINE_Y || (p.x < WORLD_MIN_X - 40 || p.x > WORLD_MAX_X + 40)) {
      state.projectiles.splice(i, 1);
    }
  }

  for (let i = state.waterRipples.length - 1; i >= 0; i--) {
    const wr = state.waterRipples[i];
    wr.rad += dt * 28;
    wr.alpha -= dt * 0.75;
    if (wr.alpha <= 0) state.waterRipples.splice(i, 1);
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    advanceParticle(pt, dt);
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y -= 20 * dt;
    ft.life -= dt;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }
  if (state.status !== 'playing') return;
  updateStory?.();
  if (finaleWon(state)) {
    state.story.finalWon = true;
    state.status = 'victory';
    finishCampaign('victory');
  }
}
}
