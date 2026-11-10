class BenkosSpriteManager {
  constructor() {
    this.atlas = null;
    this.sheets = {};
    this.ready = false;
    this.init();
  }

  async init() {
    try {
      const res = await fetch('assets/atlas/atlas.json', { cache:'no-store' });
      if (res.ok) {
        const data = await res.json();
        this.atlas = data.sprites || data;
        const names = [...new Set(Object.values(this.atlas).map(s => s.sheet))];
        await Promise.all(names.map(n => new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { this.sheets[n] = img; resolve(); };
          img.onerror = () => {
            console.warn('[SpriteManager] No se pudo cargar atlas:', n);
            resolve();
          };
          img.src = 'assets/atlas/' + n + '.png?v=' + encodeURIComponent(data.build ?? data.version ?? 1);
        })));
        this.ready = true;
        console.log(`[SpriteManager] Atlas cargado: ${Object.keys(this.atlas).length} clases.`);
      }
    } catch (e) {
      console.warn('[SpriteManager] Atlas no disponible.', e);
    }
  }

  has(cls) {
    return this.ready && !!this.atlas && !!this.atlas[cls] && !!this.sheets[this.atlas[cls].sheet];
  }

  /** Obtiene la primera animación disponible entre la lista de nombres */
  anim(cls, names) {
    if (!this.has(cls)) return null;
    const sp = this.atlas[cls];
    for (const n of names) {
      if (sp.anims && sp.anims[n] && sp.anims[n].length) return sp.anims[n];
    }
    return null;
  }

  /**
   * Dibuja un fotograma con el anclaje de pies en (x, y).
   * targetH = altura lógica en píxeles de la figura de pie.
   * progress (0..1) fuerza un fotograma para animaciones de acción; si no, cicla con t * fps.
   */
  draw(ctx, cls, names, x, y, facing, targetH, t, fps = 8, progress = null, pose = null) {
    if (!this.has(cls)) return false;
    const frames = this.anim(cls, names);
    if (!frames || !frames.length) return false;
    const sp = this.atlas[cls];
    let idx = progress != null
      ? Math.min(frames.length - 1, Math.max(0, Math.floor(progress * frames.length)))
      : Math.floor(t * fps) % frames.length;
    const f = frames[idx];
    const s = targetH / (f.ref || sp.ref || 175);
    const dw = f.w * s;
    const dh = f.h * s;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (facing < 0) ctx.scale(-1, 1);
    if (pose) {
      ctx.rotate(pose.tilt);
      ctx.scale(1, pose.stretch);
    }
    if (pose?.torch) this.drawHeldTorch(ctx, x, y, facing, pose);
    const dx = Math.round(-f.ax * s);
    const dy = Math.round(-f.ay * s);
    if (pose?.bend) {
      const bands = 8;
      for (let band = 0; band < bands; band++) {
        const from = Math.round(f.h * band / bands);
        const to = Math.round(f.h * (band + 1) / bands);
        const top = Math.round(dh * band / bands);
        const bottom = Math.round(dh * (band + 1) / bands);
        const shift = Math.round(pose.bend * (1 - (band + .5) / bands) ** 2);
        ctx.drawImage(this.sheets[sp.sheet], f.x, f.y + from, f.w, to - from,
          dx + shift, dy + top, Math.round(dw), bottom - top);
      }
    } else {
      ctx.drawImage(this.sheets[sp.sheet], f.x, f.y, f.w, f.h, dx, dy, Math.round(dw), Math.round(dh));
    }
    if (f.flame) {
      if (pose?.royal) {
        const tx = Math.round((f.torso[0] - f.ax) * s);
        const ty = Math.round((f.torso[1] - f.ay) * s);
        ctx.fillStyle = '#514031'; ctx.fillRect(tx - 3, ty - 3, 7, 12);
        ctx.fillStyle = '#8b7352'; ctx.fillRect(tx - 2, ty - 2, 5, 8);
        ctx.fillStyle = '#c9a463'; ctx.fillRect(tx - 3, ty - 4, 5, 2);
        ctx.fillRect(tx + 3, ty + 1, 1, 7);
        ctx.fillStyle = '#b68d57'; ctx.fillRect(tx - 2, ty + 2, 4, 1);
      }
      const fx = (f.flame[0] - f.ax) * s;
      const fy = (f.flame[1] - f.ay) * s * (pose?.stretch ?? 1);
      const tilt = pose?.tilt ?? 0;
      this.heroTorch = {
        x: Math.round(x) + (fx * Math.cos(tilt) - fy * Math.sin(tilt)) * (facing < 0 ? -1 : 1),
        y: Math.round(y) + fx * Math.sin(tilt) + fy * Math.cos(tilt)
      };
    }
    if (f.rod) {
      const tipX = Math.round((f.rod[0] - f.ax) * s);
      const tipY = Math.round((f.rod[1] - f.ay) * s);
      const bob = this.reduceMotion ? 6 : 6 + Math.round(Math.sin(t * 4));
      ctx.strokeStyle = '#c4d2b6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + 3, bob);
      ctx.stroke();
      ctx.fillStyle = '#d29c70';
      ctx.fillRect(tipX + 2, bob, 3, 2);
    }
    ctx.restore();
    return true;
  }

  drawPouch(ctx,x,y,height,fill){return this.draw(ctx,'currency_pouch',['fill'],x,y,1,height,0,0,Math.min(4,Math.ceil(Math.max(0,fill)*4))/5+.01);}
  drawCargo(ctx,x,y,facing,u){
    if (u.recoveredCoins > 0) {
      this.drawPouch(ctx, x - facing * 9, y - 12, 12, u.recoveredCoins / 4);
      return;
    }
    if (u.activity === 'CARRY_WATER') {
      const bx = Math.round(x + facing * 11);
      const by = Math.round(y - 17);
      ctx.fillStyle = '#312c23'; ctx.fillRect(bx - 2, by - 4, 4, 5);
      ctx.fillStyle = '#634b36'; ctx.fillRect(bx - 5, by, 10, 8);
      ctx.fillStyle = '#aa8255'; ctx.fillRect(bx - 4, by + 2, 2, 5);
      ctx.fillStyle = '#b6a282'; ctx.fillRect(bx - 5, by + 5, 10, 1);
      ctx.fillStyle = '#84a99b'; ctx.fillRect(bx - 4, by, 8, 2);
      return;
    }
    if(!u.carryingSack&&u.activity!=='DELIVER')return;
    const bx=x-facing*9;
    if(u.cargoWood){
      ctx.save();ctx.fillStyle='#69452e';ctx.fillRect(Math.round(bx-8),Math.round(y-23),16,8);ctx.fillStyle='#bd955b';
      for(let i=0;i<3;i++){ctx.fillRect(Math.round(bx-7),Math.round(y-23+i*3),13,1);ctx.fillRect(Math.round(bx+6),Math.round(y-23+i*3),2,2);}
      ctx.fillStyle='#c9b881';ctx.fillRect(Math.round(bx-1),Math.round(y-24),2,10);ctx.restore();
    }else if(u.role!=='AGRICULTOR')this.drawPouch(ctx,bx,y-13,14,.7);
  }

  drawBackdrop(ctx,cls,width,ground,camera,factor,height){
    if (!this.has(cls)) return false;
    const sp = this.atlas[cls], frame = sp.anims.idle[0];
    const scale = Math.max(height / frame.h, (width + 56) / frame.w);
    const span = Math.ceil(frame.w * scale);
    const offset = Math.max(0, Math.min(span - width, (span - width) / 2 + camera * factor));
    const drawnHeight = Math.ceil(frame.h * scale);
    ctx.drawImage(this.sheets[sp.sheet], frame.x, frame.y, frame.w, frame.h,
      -Math.round(offset), ground - drawnHeight, span, drawnHeight);
    return true;
  }

  drawSnake(ctx, x, y, a) {
    const warning = a.state === 'WARN';
    const phase = this.reduceMotion || !a.vx ? 0 : a.animTime * 12;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(a.facing || 1, 1);
    ctx.fillStyle = '#141e16'; ctx.fillRect(-15, -2, 26, 3);
    for (let i = 0; i < 8; i++) {
      const px = -15 + i * 3;
      const py = -3 - Math.round(Math.sin(i * 1.15 + phase) * 2) - (warning ? Math.max(0, i - 4) * 2 : 0);
      ctx.fillStyle = '#303923'; ctx.fillRect(px, py - 1, 5, 5);
      ctx.fillStyle = i % 2 ? '#aa8c48' : '#71804b'; ctx.fillRect(px, py, 4, 2);
    }
    const head = warning ? -9 : -4;
    ctx.fillStyle = '#575d35'; ctx.fillRect(8, head - 1, 6, 4);
    ctx.fillStyle = '#e2bf68'; ctx.fillRect(11, head, 1, 1);
    if (warning) { ctx.fillStyle = '#ca7352'; ctx.fillRect(14, head + 1, 3, 1); }
    ctx.restore();
    return true;
  }
  drawAnimal(ctx,x,y,a,time,jaguarPose){
    if (a.species === 'SNAKE') return this.drawSnake(ctx, x, y, a);
    const cls='animal_'+(a.species||'CAPYBARA');
    const adultHeight={CAPYBARA:19,DEER:31,BOAR:23,MONKEY:23,MACAW:23,TURTLE:12,JAGUAR:28}[a.species]||19;
    const height = a.bornAt === undefined ? adultHeight : adultHeight * (.62 + Math.min(.37, (a.animTime ?? 0) * .00475));
    if (a.waterFall) return this.drawDrowning(ctx, cls, x, y, a.facing, height, a.waterFall.time);
    const t=a.animTime??time,gait=this.motion?.sample(a,t,a.species==='JAGUAR' ? (a.state==='FLEE' ? 20 : 23) : undefined);
    if (jaguarPose && this.has('animal_jaguar_motion') && this.has('animal_jaguar_combat')) {
      const combat = { CROUCH:'crouch', POUNCE:'pounce', SWIPE:'swipe', RECOVER:'recover', EAT:'eat' }[a.state];
      const action = a.hurtTimer > 0 && a.state !== 'POUNCE' && a.state !== 'FLEE' ? 'hurt' : combat;
      if (action) {
        return this.draw(ctx, 'animal_jaguar_combat', [action], x, y - jaguarPose.lift,
          a.facing, height, t, 0, jaguarPose.progress);
      }
      const movement = a.state === 'STALK' ? 'stalk' : a.state === 'FLEE' ? 'run'
        : Math.abs(a.vx) > 2 ? 'walk' : 'idle';
      return this.draw(ctx, 'animal_jaguar_motion', [movement], x, y, a.facing, height, t, .75,
        movement === 'idle' ? (this.reduceMotion ? 0 : null) : gait?.phase ?? 0);
    }
    const anim=a.hurtTimer>0||a.state==='CHARGE'?'hurt':a.state==='EAT'?'eat':gait?.moving||Math.abs(a.vx)>2?'walk':'idle';
    return this.draw(ctx,cls,[anim],x,y-(jaguarPose?.lift??0),a.facing,height,t,6,anim==='walk'?(gait?.phase??0):null);
  }

  personClass(role, tier = 1, weapon = 1) {
    const name = {
      FUGITIVO: 'captive', ALDEANO: 'civil', LENADOR: 'woodcutter', AGRICULTOR: 'farmer',
      MINERO: 'miner', CAZADOR: 'hunter', CONSTRUCTOR: 'builder', ARQUERO: 'archer',
      GUERRERO: 'spearman', ESPADACHIN: 'swordsman', CAMPEON_REAL: 'champion',
      CABALLERO_ALIADO: 'ally_mounted'
    }[role];
    const ranked = ['GUERRERO', 'ARQUERO', 'ESPADACHIN'].includes(role);
    if (ranked && weapon > 1) return `actor_${name}_a${tier}_w${weapon}`;
    const rank = !ranked || tier < 2 ? '' : tier === 2 ? 'elite_' : 'royal_';
    return 'actor_' + rank + name;
  }

  enemyClass(enemy) {
    return enemy.type === 'GOBERNADOR_GIRON' && enemy.phase === 1 ? 'actor_giron_mounted' : 'actor_' + enemy.type;
  }

  enemyHeight(enemy) {
    if (enemy.type === 'HERALDO_ALADO') return 55;
    if (enemy.type === 'CABALLERO' || enemy.type === 'GOBERNADOR_GIRON' && enemy.phase === 1) return 59;
    if (enemy.type === 'GOBERNADOR_GIRON') return 51;
    return enemy.type === 'CAMPESINO' ? 43 : 46;
  }

  // The contact frame starts at the exact instant the simulation applies the hit.
  attackProgress(actor, frameCount, contactFrame, impact) {
    const duration = actor.attackDuration || .46;
    const remaining = actor.attackTimer ?? actor.attackAnimTimer ?? 0;
    const elapsed = Math.max(0, duration - remaining);
    const contactTime = actor.attackImpact ?? impact;
    if (elapsed < contactTime) return elapsed / contactTime * contactFrame / frameCount;
    return (contactFrame + (elapsed - contactTime) / Math.max(.01, duration - contactTime) *
      (frameCount - contactFrame)) / frameCount;
  }

  drawIdle(ctx, cls, x, y, facing, height, time, actor, animation = 'idle', options = null) {
    // The alternate armed poses shift the hands and weapons by whole pixels.
    // Keep the planted silhouette until a walk, attack or social action starts.
    if (animation === 'idle' && ['ARQUERO', 'GUERRERO', 'ESPADACHIN', 'CAMPEON_REAL'].includes(actor.role)) {
      return this.draw(ctx, cls, ['idle'], x, y, facing, height, 0);
    }
    const temperament = actor.temperament;
    const period = { RESTLESS: 2.8, CAUTIOUS: 3.7, CARING: 4.4, CALM: 5.4 }[temperament] ?? 4.6;
    const offset = (Number(actor.id) || 0) * .71;
    const phase = ((time + offset) % period) / period;
    const frame = this.reduceMotion ? 0 : phase < .36 ? 0 : phase < .68 || phase > .86 ? .4 : .8;
    const breath = options || !this.reduceMotion ? { ...options, tilt: 0,
      stretch: this.reduceMotion ? 1 : 1 + Math.sin(phase * Math.PI * 4) * .012 } : null;
    return this.draw(ctx, cls, [animation, 'idle'], x, y, facing, height, 0, 0, frame, breath);
  }

  drawSocial(ctx, cls, x, y, facing, height, unit) {
    const { kind, time, index } = unit.socialPose;
    const speaker = Math.floor(time / 1.8) % 2 === index;
    const laugh = kind === 'LAUGH' || kind === 'ROMANCE';
    const scuffle = kind === 'SCUFFLE';
    const hit = scuffle && time >= 1.15 && time < 1.48;
    const windup = scuffle && time >= .6 && time < 1.15;
    const gesture = !scuffle && unit.role === 'ALDEANO' && (speaker || laugh);
    const animation = hit ? 'hurt' : gesture ? 'action' : 'idle';
    const pose = this.reduceMotion || !scuffle ? null : { tilt: hit ? -.12 : windup ? .1 : 0, stretch: 1 };
    const progress = gesture && !this.reduceMotion ? .35 : 0;
    const drawn = this.draw(ctx, cls, [animation, 'idle'], x, y, facing, height, 0, 0, progress, pose);
    if (drawn && speaker && !scuffle) {
      const sx = Math.round(x), sy = Math.round(y - height - 9);
      ctx.fillStyle = '#172a23'; ctx.fillRect(sx - 7, sy - 3, 14, 7); ctx.fillRect(sx - 3, sy + 4, 2, 2);
      ctx.fillStyle = laugh ? '#dfbc75' : '#c7ccad';
      for (let i = -4; i <= 4; i += 4) ctx.fillRect(sx + i, sy, 1, 1);
    }
    return drawn;
  }

  drawHeldTorch(ctx, x, y, facing, pose) {
    const gx = pose.mounted ? 21 : 15;
    const gy = pose.mounted ? -47 : -33;
    const flameHeight = this.reduceMotion ? 8 : 8 + Math.round(Math.sin(pose.clock * 14));
    ctx.fillStyle = '#70482d';
    ctx.fillRect(0, gy + 3, gx - 1, 3);
    ctx.fillRect(gx - 4, gy + 1, 5, 3);
    ctx.fillStyle = '#ad7b50';
    ctx.fillRect(gx - 4, gy, 3, 2);
    if (!this.draw(ctx, 'hand_torch_shaft', ['idle'], gx, gy + 4, 1, 16, 0)) {
      ctx.fillStyle = '#704321';
      ctx.fillRect(gx - 1, gy - 12, 3, 16);
    }
    if (!this.draw(ctx, 'hand_torch_flame', ['idle'], gx, gy - 11, 1, flameHeight, 0)) {
      ctx.fillStyle = '#f2aa51';
      ctx.fillRect(gx - 2, gy - 17, 4, 5);
    }
    this.heroTorch = {
      x: Math.round(x) + gx * (facing < 0 ? -1 : 1),
      y: Math.round(y) + (gy - 14) * pose.stretch
    };
  }

  drawBenkos(ctx, x, y, facing, player, time, torch = false) {
    this.heroTorch = null;
    if (!torch) this.heroTorchAction = null;
    const mounted = player.mounted;
    const cls = 'actor_hero' + (mounted ? '_mounted' : '') + (player.royalArmor ? '_royal' : '');
    const height = mounted ? 60 : 48;
    const animationTime = player.animTime ?? time;
    const torchPose = torch ? { torch, mounted, clock: animationTime, tilt: 0, stretch: 1 } : null;
    if (player.waterFall) return this.drawDrowning(ctx, cls, x, y, facing, height, player.waterFall.time);
    const running = Math.abs(player.vx) > (mounted ? 150 : 120) || player.dashTimer > 0;
    const gait = this.motion?.sample(player, animationTime, mounted ? (running ? 112 : 76) : undefined);
    const torchClass = mounted ? 'actor_hero_mounted_torch' : 'actor_hero_torch';
    if (torch && this.has(torchClass)) {
      return this.drawTorchAction(ctx, torchClass, x, y, facing, height, player, animationTime, gait, running);
    }
    if (player.hurtKneelTimer > 0 || player.resting) {
      return this.drawIdle(ctx, cls, x, y, facing, height, animationTime, player, mounted ? 'idle' : 'rest', torchPose);
    }
    if (player.hurtTimer > 0) {
      return this.draw(ctx, cls, ['hurt'], x, y, facing, height, 0, 0, 1 - player.hurtTimer / .4, torchPose);
    }
    if (player.attackTimer > 0) {
      const animation = player.weaponMode === 'SPEAR' ? 'spear' : 'sword';
      const progress = this.attackProgress(player, mounted ? 3 : 6, mounted ? 1 : 3, .15);
      return this.draw(ctx, cls, [animation], x, y, player.attackFacing || facing, height, 0, 0, progress, torchPose);
    }
    if (!mounted && player.payTimer > 0) {
      return this.draw(ctx, cls, ['pay'], x, y, facing, height, 0, 0, 1 - player.payTimer / .35, torchPose);
    }
    if (!mounted && player.interaction?.kind === 'fish') {
      return this.draw(ctx, cls, ['fish'], x, y, facing, height, animationTime, 2.5, this.reduceMotion ? 0 : null, torchPose);
    }
    if (gait?.moving ?? Math.abs(player.vx) > 8) {
      const lift = mounted && running && !this.reduceMotion ? [2, 2, 1, 0, 0, 0, 1, 2][Math.floor((gait?.phase ?? 0) * 8)] : 0;
      return this.draw(ctx, cls, [running ? 'run' : 'walk'], x, y - lift, facing, height, animationTime, 9, gait?.phase, torchPose);
    }
    return this.drawIdle(ctx, cls, x, y, facing, height, animationTime, player, 'idle', torchPose);
  }

  drawTorchAction(ctx, cls, x, y, facing, height, player, time, gait, running) {
    const frames = this.atlas[cls].anims;
    const moving = gait?.moving ?? Math.abs(player.vx) > 8;
    let action = moving ? (running ? 'run' : 'walk') : 'idle';
    if (player.payTimer > 0) action = 'pay';
    if (player.attackTimer > 0) action = 'sword';
    if (player.hurtTimer > 0) action = 'hurt';
    if (player.hurtKneelTimer > 0 || player.resting) action = 'rest';

    const previous = this.heroTorchAction;
    const sameActor = previous?.player === player && previous.cls === cls && time >= previous.since;
    if (sameActor && (action === 'walk' || action === 'idle') && frames.rise) {
      if (previous.action === 'rest' || previous.action === 'rise' && time - previous.since < .18) action = 'rise';
    }
    const since = sameActor && previous.action === action ? previous.since : time;
    this.heroTorchAction = { player, cls, action, since };

    let phase = null;
    let fps = 2;
    if (action === 'walk' || action === 'run') {
      phase = gait?.phase;
      fps = running ? 12 : 8;
    } else if (action === 'sword') {
      const length = frames.sword.length;
      const contact = Math.min(length - 1, this.atlas[cls].contactFrame ?? 1);
      phase = this.attackProgress(player, length, contact, .15);
      facing = player.attackFacing || facing;
    } else if (action === 'hurt') phase = 1 - player.hurtTimer / .4;
    else if (action === 'pay') phase = 1 - player.payTimer / .35;
    else if (action === 'rest') phase = this.reduceMotion ? 1 : Math.min(1, (time - since) / .38);
    else if (action === 'rise') phase = Math.min(1, (time - since) / .18);
    else if (this.reduceMotion) phase = 0;

    const pose = { tilt: 0, stretch: 1, royal: player.royalArmor };
    if (action === 'walk' || action === 'run') {
      if (this.draw(ctx, cls + '_travel', [action], x, y, facing, height, time, fps, phase, pose)) return true;
    }
    return this.draw(ctx, cls, [action, 'idle'], x, y, facing, height, time, fps, phase, pose);
  }

  drawDrowning(ctx, cls, x, y, facing, height, time) {
    const struggling = time < 1.17;
    const pose = { tilt: this.reduceMotion ? 0 : Math.sin(time * 24) * (struggling ? .19 : .08),
      stretch: struggling ? 1 : .84 };
    return this.draw(ctx, cls, struggling ? ['hurt', 'walk', 'idle'] : ['rest', 'hurt', 'idle'],
      x, y, facing, height, this.reduceMotion ? 0 : time, 7, null, pose);
  }

  drawHorse(ctx, x, y, horse, time) {
    if (horse.waterFall) return this.drawDrowning(ctx, 'actor_horse', x, y, horse.facing, 48, horse.waterFall.time);
    return this.drawIdle(ctx, 'actor_horse', x, y, horse.facing, 48, time, horse);
  }

  drawTree(ctx, cls, x, y, facing, height, clock, worldX) {
    const gust = Math.sin(clock * .69 - worldX * .005) + .41 * Math.sin(clock * 1.83 - worldX * .011);
    const bend = this.reduceMotion ? 0 : gust * height * (cls === 'forest_palm' ? .041 : .028) * facing;
    const pose = bend ? { tilt: 0, stretch: 1, bend } : null;
    return this.draw(ctx, cls, ['idle'], x, y, facing, height, 0, 0, null, pose);
  }

  drawAlly(ctx, x, y, facing, unit, time) {
    if (!unit.grief) return this.drawAllyPose(ctx, x, y, facing, unit, time);
    ctx.save();
    const intensity = unit.grief.remaining / unit.grief.duration;
    ctx.filter = `saturate(${1 - intensity * .74}) brightness(${1 - intensity * .16})`;
    const drawn = this.drawAllyPose(ctx, x, y, facing, unit, time);
    ctx.restore();
    return drawn;
  }

  drawAllyPose(ctx, x, y, facing, unit, time) {
    const identity = 'actor_identity_' + (unit.sex === 'F' ? 'f' : 'm');
    const personalSprite = ['FUGITIVO', 'ALDEANO'].includes(unit.role) && this.has(identity);
    const workRole = { ARQUERO: 'archer', GUERRERO: 'guard', ESPADACHIN: 'sword', CAMPEON_REAL: 'sword',
      CAZADOR: 'guard', CABALLERO_ALIADO: 'rider' }[unit.role] ?? 'work';
    const profession = identity + '_' + workRole;
    const womanAtWork = !personalSprite && unit.sex === 'F' && this.has(profession);
    const cls = personalSprite ? identity : womanAtWork ? profession :
      this.personClass(unit.role, unit.equipment?.armor ?? unit.tier, unit.equipment?.weapon);
    const height = unit.role === 'CABALLERO_ALIADO' ? 58 : unit.role === 'CAMPEON_REAL' ? 51 : 45;
    if (unit.waterFall) return this.drawDrowning(ctx, cls, x, y, facing, height, unit.waterFall.time);
    const t = unit.animSeed ?? time;
    const gait = this.motion?.sample(unit, t, unit.role === 'CABALLERO_ALIADO' ? 88 : undefined);
    if (personalSprite && unit.role === 'FUGITIVO') return this.draw(ctx, cls, ['captive'], x, y, facing, height, 0);
    if (unit.hurtTimer > 0) {
      const pose = womanAtWork ? { tilt: -.1, stretch: .96 } : null;
      return this.draw(ctx, cls, ['hurt', 'idle'], x, y, facing, height, 0, 0, 1 - unit.hurtTimer / .4, pose);
    }
    if (unit.socialPose && unit.activity === 'SOCIAL' && !unit.vx) {
      return this.drawSocial(ctx, cls, x, y, facing, height, unit);
    }
    if (unit.liberateAnimTimer > 0) {
      if (personalSprite) return this.draw(ctx, cls, ['release'], x, y, facing, height, 0, 0, 1 - unit.liberateAnimTimer / 1.2);
      return this.draw(ctx, 'actor_captive', ['action'], x, y, facing, height, 0, 0, 1 - unit.liberateAnimTimer / 1.2);
    }
    if (unit.attackAnimTimer > 0) {
      const progress = this.attackProgress(unit, 3, 1, unit.role === 'ARQUERO' ? .18 : .17);
      if (womanAtWork && workRole === 'archer' && progress >= 1 / 3 && progress < .87) {
        return this.draw(ctx, 'actor_identity_f_guard', ['bow'], x, y, facing, height, 0);
      }
      return this.draw(ctx, cls, ['action'], x, y, facing, height, 0, 0, progress);
    }
    if (gait?.moving ?? Math.abs(unit.vx || 0) > 8) {
      const run = unit.role === 'CABALLERO_ALIADO' && Math.abs(unit.vx) > 85;
      const movingClass = womanAtWork && workRole === 'rider' ? 'actor_identity_f_trot'
        : womanAtWork && ['archer', 'sword'].includes(workRole) ? identity : cls;
      const drawn = this.draw(ctx, movingClass, [run ? 'run' : 'walk', 'walk', 'idle'], x, y, facing, height, t, 8, gait?.phase);
      if (drawn) this.drawCargo(ctx, x, y, facing, unit);
      return drawn;
    }
    if (['CHOP', 'BUILD', 'WORK'].includes(unit.activity)) {
      const pose = womanAtWork && !this.reduceMotion ? { tilt: Math.sin(t * 10) * .035, stretch: 1 } : null;
      const work = unit.role === 'AGRICULTOR' ? 'farm' : 'build';
      return this.draw(ctx, cls, ['action', work, 'idle'], x, y, facing, height, t, 4, null, pose);
    }
    if (['BATHE', 'PLAY', 'FETCH_WATER'].includes(unit.activity)) {
      const lean = this.reduceMotion ? null : { tilt: Math.sin(t * 4) * .045, stretch: 1 };
      return this.draw(ctx, cls, ['rest', 'idle'], x, y + (unit.activity === 'BATHE' ? 3 : 0), facing, height, t, 0, 0, lean);
    }
    const rest = ['REST', 'RECOVER', 'MOURN', 'LEAVE'].includes(unit.activity) && unit.role !== 'CABALLERO_ALIADO';
    return this.drawIdle(ctx, cls, x, y, facing, height, t, unit, rest ? 'rest' : 'idle');
  }

  drawMessenger(ctx, x, y, messenger, time) {
    if (messenger.waterFall) return this.drawDrowning(ctx, 'actor_messenger', x, y, messenger.facing, 45, messenger.waterFall.time);
    const t = messenger.animTime ?? time;
    const gait = this.motion?.sample(messenger, t);
    if (messenger.state !== 'WAIT') return this.draw(ctx, 'actor_messenger', ['walk'], x, y, messenger.facing, 45, t, 8, gait?.phase);
    return this.drawIdle(ctx, 'actor_messenger', x, y, messenger.facing, 45, t, messenger);
  }

  drawEnemy(ctx, x, y, facing, enemy, time) {
    const cls = this.enemyClass(enemy);
    const height = this.enemyHeight(enemy);
    if (enemy.waterFall) return this.drawDrowning(ctx, cls, x, y, facing, height, enemy.waterFall.time);
    const t = enemy.animTime ?? time;
    const gait = this.motion?.sample(enemy, t, enemy.type === 'CABALLERO' ? 88 : undefined);
    if (enemy.hurtTimer > 0) {
      return this.draw(ctx, cls, ['hurt'], x, y, facing, height, 0, 0, 1 - enemy.hurtTimer / .24);
    }
    if (enemy.windupTimer > 0) {
      return this.draw(ctx, cls, ['windup'], x, y, facing, height, 0, 0, 1 - enemy.windupTimer / (enemy.windupTotal || .4));
    }
    if (enemy.attackAnimTimer > 0) {
      const duration = enemy.type === 'HERALDO_ALADO' ? .7 : .38;
      return this.draw(ctx, cls, ['strike'], x, y, facing, height, 0, 0, 1 - enemy.attackAnimTimer / duration);
    }
    if (gait?.moving ?? !!enemy.isMoving) return this.draw(ctx, cls, [enemy.type === 'CABALLERO' ? 'run' : 'walk'], x, y, facing, height, t, 8, gait?.phase);
    return this.drawIdle(ctx, cls, x, y, facing, height, t, enemy);
  }

  drawCorpse(ctx, x, y, corpse) {
    ctx.save();
    ctx.globalAlpha = Math.min(.85, corpse.timer / .9);
    const progress = Math.min(1, (3.2 - corpse.timer) / .38);
    const drawn = this.draw(ctx, this.enemyClass(corpse), ['die'], x, y, corpse.facing, this.enemyHeight(corpse), 0, 0, progress);
    ctx.restore();
    return drawn;
  }
}

window.SpriteManager = new BenkosSpriteManager();
