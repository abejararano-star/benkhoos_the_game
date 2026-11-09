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
    const s = targetH / (sp.ref || 175);
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
    ctx.drawImage(this.sheets[sp.sheet], f.x, f.y, f.w, f.h, Math.round(-f.ax * s), Math.round(-f.ay * s), Math.round(dw), Math.round(dh));
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
  drawAnimal(ctx,x,y,a,time){
    if (a.species === 'SNAKE') return this.drawSnake(ctx, x, y, a);
    const cls='animal_'+(a.species||'CAPYBARA'),height={CAPYBARA:19,DEER:31,BOAR:23,MONKEY:23,MACAW:23,TURTLE:12,JAGUAR:28}[a.species]||19;
    const t=a.animTime??time,gait=this.motion?.sample(a,t);
    const anim=a.hurtTimer>0||a.state==='CHARGE'?'hurt':a.state==='EAT'?'eat':gait?.moving||Math.abs(a.vx)>2?'walk':'idle';
    const pounce = a.pounceTimer > 0 ? Math.sin(a.pounceTimer / .32 * Math.PI) : 0;
    return this.draw(ctx,cls,[pounce ? 'walk' : anim],x+(a.facing||1)*pounce*7,y-pounce*4,a.facing,height,t,6,pounce ? .62 : anim==='walk'?(gait?.phase??0):null);
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

  drawIdle(ctx, cls, x, y, facing, height, time, actor, animation = 'idle') {
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
    const breath = this.reduceMotion ? null : { tilt: 0, stretch: 1 + Math.sin(phase * Math.PI * 4) * .012 };
    return this.draw(ctx, cls, [animation], x, y, facing, height, 0, 0, frame, breath);
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

  drawBenkos(ctx, x, y, facing, player, time) {
    const mounted = player.mounted;
    const cls = 'actor_hero' + (mounted ? '_mounted' : '') + (player.royalArmor ? '_royal' : '');
    const height = mounted ? 60 : 48;
    const animationTime = player.animTime ?? time;
    const running = Math.abs(player.vx) > (mounted ? 150 : 120) || player.dashTimer > 0;
    const gait = this.motion?.sample(player, animationTime, mounted ? (running ? 112 : 76) : undefined);
    if (player.hurtKneelTimer > 0 || player.resting) {
      return this.drawIdle(ctx, cls, x, y, facing, height, animationTime, player, mounted ? 'idle' : 'rest');
    }
    if (player.hurtTimer > 0) {
      return this.draw(ctx, cls, ['hurt'], x, y, facing, height, 0, 0, 1 - player.hurtTimer / .4);
    }
    if (player.attackTimer > 0) {
      const animation = player.weaponMode === 'SPEAR' ? 'spear' : 'sword';
      const progress = this.attackProgress(player, mounted ? 3 : 6, mounted ? 1 : 3, .15);
      return this.draw(ctx, cls, [animation], x, y, player.attackFacing || facing, height, 0, 0, progress);
    }
    if (!mounted && player.payTimer > 0) {
      return this.draw(ctx, cls, ['pay'], x, y, facing, height, 0, 0, 1 - player.payTimer / .35);
    }
    if (!mounted && player.interaction?.kind === 'fish') {
      return this.draw(ctx, cls, ['fish'], x, y, facing, height, animationTime, 2.5, this.reduceMotion ? 0 : null);
    }
    if (gait?.moving ?? Math.abs(player.vx) > 8) {
      const lift = mounted && running && !this.reduceMotion ? [2, 2, 1, 0, 0, 0, 1, 2][Math.floor((gait?.phase ?? 0) * 8)] : 0;
      return this.draw(ctx, cls, [running ? 'run' : 'walk'], x, y - lift, facing, height, animationTime, 9, gait?.phase);
    }
    return this.drawIdle(ctx, cls, x, y, facing, height, animationTime, player);
  }

  drawHorse(ctx, x, y, horse, time) {
    return this.drawIdle(ctx, 'actor_horse', x, y, horse.facing, 48, time, horse);
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
    const cls = this.personClass(unit.role, unit.equipment?.armor ?? unit.tier, unit.equipment?.weapon);
    const height = unit.role === 'CABALLERO_ALIADO' ? 58 : unit.role === 'CAMPEON_REAL' ? 51 : 45;
    const t = unit.animSeed ?? time;
    const gait = this.motion?.sample(unit, t, unit.role === 'CABALLERO_ALIADO' ? 88 : undefined);
    if (unit.hurtTimer > 0) {
      return this.draw(ctx, cls, ['hurt'], x, y, facing, height, 0, 0, 1 - unit.hurtTimer / .4);
    }
    if (unit.socialPose && unit.activity === 'SOCIAL' && !unit.vx) {
      return this.drawSocial(ctx, cls, x, y, facing, height, unit);
    }
    if (unit.liberateAnimTimer > 0) {
      return this.draw(ctx, 'actor_captive', ['action'], x, y, facing, height, 0, 0, 1 - unit.liberateAnimTimer / 1.2);
    }
    if (unit.attackAnimTimer > 0) {
      const progress = this.attackProgress(unit, 3, 1, unit.role === 'ARQUERO' ? .18 : .17);
      return this.draw(ctx, cls, ['action'], x, y, facing, height, 0, 0, progress);
    }
    if (gait?.moving ?? Math.abs(unit.vx || 0) > 8) {
      const run = unit.role === 'CABALLERO_ALIADO' && Math.abs(unit.vx) > 85;
      const drawn = this.draw(ctx, cls, [run ? 'run' : 'walk'], x, y, facing, height, t, 8, gait?.phase);
      if (drawn) this.drawCargo(ctx, x, y, facing, unit);
      return drawn;
    }
    if (['CHOP', 'BUILD', 'WORK'].includes(unit.activity)) {
      return this.draw(ctx, cls, ['action'], x, y, facing, height, t, 4);
    }
    if (['BATHE', 'PLAY', 'FETCH_WATER'].includes(unit.activity)) {
      const lean = this.reduceMotion ? null : { tilt: Math.sin(t * 4) * .045, stretch: 1 };
      return this.draw(ctx, cls, ['rest'], x, y + (unit.activity === 'BATHE' ? 3 : 0), facing, height, t, 0, 0, lean);
    }
    const rest = ['REST', 'RECOVER', 'MOURN', 'LEAVE'].includes(unit.activity) && unit.role !== 'CABALLERO_ALIADO';
    return this.drawIdle(ctx, cls, x, y, facing, height, t, unit, rest ? 'rest' : 'idle');
  }

  drawMessenger(ctx, x, y, messenger, time) {
    const t = messenger.animTime ?? time;
    const gait = this.motion?.sample(messenger, t);
    if (messenger.state !== 'WAIT') return this.draw(ctx, 'actor_messenger', ['walk'], x, y, messenger.facing, 45, t, 8, gait?.phase);
    return this.drawIdle(ctx, 'actor_messenger', x, y, messenger.facing, 45, t, messenger);
  }

  drawEnemy(ctx, x, y, facing, enemy, time) {
    const cls = this.enemyClass(enemy);
    const height = this.enemyHeight(enemy);
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
