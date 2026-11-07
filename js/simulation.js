import { collectEquipment } from './equipment.js?v=d67d25007032';
import { advanceCrops, tendCrop } from './crops.js?v=d67d25007032';
import { recordLoss, updateGrief, patrolOffset, takeLeisure } from './daily-life.js?v=d67d25007032';
import { updateCommunity, joinEncounter } from './community.js?v=d67d25007032';
import { updateEcology, isHuntable } from './ecology.js?v=d67d25007032';
import { advancePlayerAttack, advanceAllyAction, strikeEnemy } from './combat.js?v=d67d25007032';
import { workConstruction, homeRecovery } from './settlement.js?v=d67d25007032';
import { ensurePerson, updatePerson, reactToDamage, proficiency, completeProfession, personMaxHp } from './people.js?v=d67d25007032';
import { ensureCampaign } from './campaign.js?v=d67d25007032';
import { BALANCE, ALLY_COMBAT, WATER_LINE_Y, WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=d67d25007032';
import { nearest, chooseToolRack, chooseWorksite, defensePostX } from './ai.js?v=d67d25007032';
export function createSimulation(api) {
const { state, keys, audio, updateHUD, spawnSpanishWave, spawnWildlife, showBanner,
saveGameToMySQL, getNearestInteractiveNode, refundUnfinishedSlots, addParticles,
addFloatingText, spawnPhysicalCoin, giveCoinToBenkos, spawnEnemy, hitBenkosKingdomStyle, finishCampaign, nextId, campaign, queueReinforcement, resolveBenkosHit, triggerBenkosAttack } = api;
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
  if (state.timeOfDay >= 0.68 && prevTime < 0.68) {
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
  audio.update(dt, state.phase);

  b.animTime += dt;
  b.payTimer=Math.max(0,(b.payTimer??0)-dt);
  if(Math.abs(b.vx)>60){b.stepDust=(b.stepDust??0)+dt;if(b.stepDust>.18){b.stepDust=0;addParticles(b.x,WATER_LINE_Y-22,1,b.inStream?'#9fcac0':'#ac9670',12);}}
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

  const moveInput = (keys['KeyA'] || keys['ArrowLeft']) ? -1 : ((keys['KeyD'] || keys['ArrowRight']) ? 1 : 0);
  if (moveInput !== 0) {
    b.resting = false;
    b.sprintHoldTime += dt;
  } else {
    b.sprintHoldTime = 0;
  }

  const isRunning = b.sprintHoldTime > 0.35 || keys['ShiftLeft'] || keys['ShiftRight'] || b.jaguarTimer > 0;
  const baseSpeed = b.mounted ? (isRunning ? 212 : 117) : (isRunning ? 155 : 95);
  b.inStream=state.ecology.streams.some(c=>Math.abs(c.x-b.x)<23);
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

  const activeNode = getNearestInteractiveNode(b.x);
  const currentNodeId = activeNode ? activeNode.id : null;
  if (currentNodeId !== state.activeNodeId) {
    refundUnfinishedSlots(currentNodeId);
    state.activeNodeId = currentNodeId;
    state.holdPayTimer = 0;
  }

  const isHoldingPay = keys['KeyS'] || keys['ArrowDown'] || keys['KeyK'] || state.touchHoldPay;
  if (isHoldingPay && !activeNode?.locked) {
    state.holdPayTimer += dt;
    if (activeNode) {
      if (state.holdPayTimer >= 0.22) {
        state.holdPayTimer = 0;
        if (state.coins > 0) {
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

    let claimed = false;
    for (let j = 0; j < state.units.length; j++) {
      const u = state.units[j];
      if (!c.fallsInRiver && Math.abs(u.x - c.x) < 18 && u.role === 'FUGITIVO') {
        u.role = 'ALDEANO';
        state.fugitivesFreed++;
        u.liberateAnimTimer = 1.2;
        audio.playSfx('chainBreak');
        addParticles(u.x, WATER_LINE_Y - 18, 16, '#94a3b8', 95);
        addParticles(u.x, WATER_LINE_Y - 22, 10, '#fde047', 65);
        addFloatingText(u.x, WATER_LINE_Y - 42, ' ¡Cadenas Rotas! ¡Libre!', '#fde047');
        updateHUD();
        claimed = true;
        break;
      }
    }
    if (claimed || c.life <= 0) state.droppedCoins.splice(i, 1);
  }

  updateEcology(state, dt, {
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
    recordLoss(unit, state);
    state.units.splice(i, 1);
    addFloatingText(unit.x, WATER_LINE_Y - 53, `Cayó ${unit.name}`, '#c9bea7');
    showBanner('EL PALENQUE ESTÁ DE LUTO', unit.name);
    updateHUD();
  }
  updateCommunity(state, dt);
  // Allied work and defense
  const moraleMult = state.morale / 100;
  for (let idx = state.units.length - 1; idx >= 0; idx--) {
    const u = state.units[idx];
    ensurePerson(u);
    updateGrief(u, dt);
    u.animSeed = (u.animSeed ?? 0) + dt;
    advanceAllyAction(u,state,dt,(enemy,damage)=>{addParticles(enemy.x,WATER_LINE_Y-20,5,'#d7bd8b',45);audio.playSfx('slash');});
    if (u.attackCooldown > 0) u.attackCooldown -= dt;
    if (u.attackAnimTimer > 0) u.attackAnimTimer -= dt;
    if (u.liberateAnimTimer > 0) {
      u.liberateAnimTimer -= dt;
      continue;
    }

    if(updatePerson(u,state,dt,Math.abs(u.x)<600?homeRecovery(state):1))continue;
    if (collectEquipment(u, state, dt, personMaxHp)) continue;
    if (joinEncounter(u, state, dt) || takeLeisure(u, state, dt)) continue;
    const fitMult = proficiency(u);
    const weaponRank = u.equipment?.weapon ?? (u.role === 'CAMPEON_REAL' ? u.tier : 1);
    const tierMult = (weaponRank === 3 ? 1.75 : weaponRank === 2 ? 1.35 : 1) * fitMult;

    if (u.role === 'CONSTRUCTOR') {
      const done=workConstruction(u,state,dt);
      if(u.activity==='BUILD'&&Math.random()<dt*3)addParticles(u.x,WATER_LINE_Y-38,2,'#c9ab75',30);
      if(done){addFloatingText(done.x,WATER_LINE_Y-95,'Obra terminada · nivel '+done.targetLevel,'#d6c78e');updateHUD();}
    } else if (u.role === 'FUGITIVO') {
      const dangerEnemy = state.enemies.find((en) => Math.abs(en.x - u.x) < 90);
      const nearCoin = state.droppedCoins.find((c) => !c.fallsInRiver && Math.abs(c.x - u.x) < 120);
      if (dangerEnemy) {
        const fleeDir = Math.sign(u.x - dangerEnemy.x) || 1;
        u.facing = fleeDir;
        u.vx = fleeDir * 72;
        u.x += u.vx * dt;
      } else if (nearCoin) {
        const dir = Math.sign(nearCoin.x - u.x) || 1;
        u.vx = dir * 52;
        u.facing = dir;
        u.x += u.vx * dt;
      } else {
        u.vx = 0;
      }
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
        const workable = state.farms.filter(farm => farm.stage === 'PLANT' || farm.stage === 'RIPE');
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
      const postX = u.assignedSide * 270 + patrolOffset(u, state);
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
      const prey = state.phase === 'DAY_EXPLORE'
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
      const postX = defensePostX(u, state.units, activeWall) + patrolOffset(u, state);
      if (u.activity === 'KITE') {
        // Keep distance and retain the opportunity to shoot.
      } else if (Math.abs(postX - u.x) > 3) {
        u.facing = Math.sign(postX - u.x) || 1;
        u.vx = u.facing * 64;
        u.x += u.vx * dt;
      } else {
        u.vx = 0;
        u.facing = u.assignedSide;
      }
      if (u.attackCooldown <= 0) {
        const enemyTarget = nearest(u, state.enemies, (en) => en.hp > 0 && Math.abs(en.x - u.x) < 200);
        if (enemyTarget) {
          u.attackCooldown = weaponRank === 3 ? 0.85 : 1.1;
          u.attackDuration=.5;u.attackAnimTimer=.5;u.activity='ATTACK';
          u.facing = Math.sign(enemyTarget.x - u.x) || 1;
          u.pendingShot={eta:.18,
            x:u.x,y: WATER_LINE_Y - 19, vx: u.facing * 245, vy: -20,
            dmg: 15 * moraleMult * tierMult, fromPlayerSide: true, color: weaponRank === 3 ? '#fde047' : '#4ade80'
          };
        }
      }
    } else if (u.role === 'GUERRERO' || u.role === 'ESPADACHIN' || u.role === 'CABALLERO_ALIADO' || u.role === 'CAMPEON_REAL') {
      const moveSpd = ALLY_COMBAT[u.role].speed;
      const nearEnemy = nearest(u, state.enemies, (en) => en.hp > 0 && Math.abs(en.x - u.x) < 310);
      const activeWall = state.walls.filter(w => w.dir === u.assignedSide && w.level > 0 && w.hp > 0).sort((a,b) => Math.abs(b.x)-Math.abs(a.x))[0];
      const frontX=activeWall?activeWall.x-u.assignedSide*10:u.assignedSide*285;
      const guardX = defensePostX(u, state.units, activeWall) + patrolOffset(u, state);
      const targetX = nearEnemy ? (u.role === 'GUERRERO' ? Math.max(frontX - 85, Math.min(frontX + 85, nearEnemy.x)) : nearEnemy.x) : guardX;

      if (Math.abs(targetX-u.x)>(nearEnemy?22:3)) {
        u.facing = Math.sign(targetX - u.x) || 1;
        u.vx = u.facing * moveSpd;
        u.x += u.vx * dt;
      } else {
        u.vx = 0;
      }

      if (u.attackCooldown <= 0 && nearEnemy && Math.abs(nearEnemy.x - u.x) <= 42) {
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

  // ==================== COLONIAL ENEMIES & BOSS AI ====================
  for (let i = state.enemies.length - 1; i >= 0 && state.status === 'playing'; i--) {
    const en = state.enemies[i];
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
      if (en.type === 'GOBERNADOR_GIRON' && en.phase === 1) {
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

      if (en.type === 'GOBERNADOR_GIRON' && en.phase === 2) {
      state.bossesDefeated++;
      const progress = ensureCampaign(state); progress.governorDefeated = true; progress.defeatedBosses.push('GOBERNADOR_GIRON');
      state.score += 5000;
      showBanner('GOBERNADOR DERROTADO', 'El territorio recuperado permanece libre.');
      if (state.haciendas.every(h => h.destroyed) && ensureCampaign(state).governorDefeated) {
        state.status = 'victory';
      }
    } else if (en.type === 'HERALDO_ALADO') {
        const progress = ensureCampaign(state); progress.heraldDefeated = true; progress.defeatedBosses.push('HERALDO_ALADO'); state.bossesDefeated++;
        audio.playSfx('trumpet');
        state.screenShake = 10;
        showBanner(' ¡HERALDO ALADO DERRIBADO!', '¡El cielo de la Matuna vuelve a ser libre!');
        addFloatingText(en.x, WATER_LINE_Y - 50, ' ¡HERALDO DERROTADO! +2500 PUNTOS', '#fde047');
        state.score = (state.score || 0) + 2500;
      }

      state.corpses.push({
        type: en.type,
        phase: en.phase,
        x: en.x,
        facing: en.facing,
        timer: 3.2
      });

      const totalDrop = en.reward + en.stolenCoins;
      for (let c = 0; c < totalDrop; c++) {
        spawnPhysicalCoin(en.x + (c * 5 - 6), WATER_LINE_Y - 18, (Math.random() - 0.5) * 85, -120 - Math.random() * 30, true, false);
      }
      addParticles(en.x, WATER_LINE_Y - 18, 16, '#f59e0b', 90);
      state.enemies.splice(i, 1);
      state.enemiesDefeated++;
      if (!en.isBoss) state.score += 100;
      updateHUD();
      if (state.status === 'victory') finishCampaign('victory');
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
      if (Math.abs(en.x) > 1810) state.enemies.splice(i, 1);
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
    const dirToTarget = Math.sign((target ? target.x : b.x) - en.x) || (en.x > 0 ? -1 : 1);
    en.facing = dirToTarget;

    const blockingWall = state.walls.find(
      (w) => w.level > 0 && w.hp > 0 && Math.sign(w.x - en.x) === dirToTarget && Math.abs(en.x - w.x) < 26
    );

    const distToBenkos = Math.abs(en.x - b.x);
    const nearAlly = nearest(en, state.units,
      u => u.hp > 0 && Math.abs(u.x - en.x) <= Math.max(en.range, 34) && Math.sign(u.x - en.x) === dirToTarget
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
        blockingWall.hp = Math.max(0, blockingWall.hp - en.dmg);
        audio.playSfx('slash');
        addParticles(blockingWall.x, WATER_LINE_Y - 22, 6, '#d97706', 50);
        addFloatingText(blockingWall.x, WATER_LINE_Y - 44, `Muralla -${Math.round(en.dmg)}`, '#fbbf24');
      }
    } else if (nearAlly) {
      if (en.attackCooldown <= 0) {
        en.attackCooldown = 1.15;
      en.attackReady = false;
        en.attackAnimTimer = 0.35;
        reactToDamage(nearAlly, en.dmg, en.facing);
        audio.playSfx('slash');
        addParticles(nearAlly.x, WATER_LINE_Y - 20, 6, '#ef4444', 55);
        addFloatingText(nearAlly.x, WATER_LINE_Y - 38, `-${Math.round(en.dmg)}`, '#f87171');
        nearAlly.vx = en.facing * 60;

      }
    } else {
      en.x += dirToTarget * en.speed * dt + en.vx * dt;
      en.vx *= Math.pow(0.82, dt * 60);
    }
    if (en.isBoss) updateHUD();
  }

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
          addParticles(en.x, p.y, 4, p.color, 45);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (let j = 0; j < state.wildlife.length; j++) {
          const an = state.wildlife[j];
          if(isHuntable(an)&&Math.abs(p.x-an.x)<14){
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
        hitWall.hp = Math.max(0, hitWall.hp - p.dmg);
        addParticles(hitWall.x, p.y, 6, '#d97706', 45);
        audio.playSfx('slash');
        hit = true;
      } else {
        // Impacto en defensor aliado con escudo
        const hitAlly = state.units.find(u => u.hp > 0 && (u.role === 'GUERRERO' || u.role === 'CAMPEON_REAL') && Math.abs(p.x - u.x) < 14);
        if (hitAlly) {
          reactToDamage(hitAlly, p.dmg, Math.sign(p.vx));
          addParticles(hitAlly.x, p.y, 5, '#fde047', 50);
          audio.playSfx('slash');
          hit = true;
        } else if (Math.abs(p.x - b.x) < 14) {
          hitBenkosKingdomStyle(p.dmg, Math.sign(p.vx));
          hit = true;
        }
      }
    }
    if (hit || p.y > WATER_LINE_Y || Math.abs(p.x) > 1680) {
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
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 180 * dt;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y -= 20 * dt;
    ft.life -= dt;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }
}
}
