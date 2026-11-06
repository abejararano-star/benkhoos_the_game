/**
 * Benkos: El Palenque de la Matuna - Sprite Sheet & Atlas Engine v2
 * Carga assets/atlas/atlas.json generado con segmentación precisa por capas,
 * fondos transparentes y anclaje sub-pixel en los pies (zero jitter, zero floating).
 * Con soporte completo de VFX (Cortes de Machete, Lanzas, Aura de Jaguar, Estelas de Sombra y Montura).
 */

class BenkosSpriteManager {
  constructor() {
    this.atlas = null;
    this.sheets = {};
    this.ready = false;
    this.init();
  }

  async init() {
    try {
      const res = await fetch('assets/atlas/atlas.json');
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
          img.src = 'assets/atlas/' + n + '.png';
        })));
        this.ready = true;
        console.log('[SpriteManager] Atlas v2 cargado con éxito. 36 tipos de sprites disponibles.');
      }
    } catch (e) {
      console.warn('[SpriteManager] Atlas no disponible; usando render procedural retro.', e);
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
  draw(ctx, cls, names, x, y, facing, targetH, t, fps = 8, progress = null) {
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
    ctx.drawImage(this.sheets[sp.sheet], f.x, f.y, f.w, f.h, Math.round(-f.ax * s), Math.round(-f.ay * s), Math.round(dw), Math.round(dh));
    ctx.restore();
    return true;
  }

  // =========================================================================
  // Benkos Biohó Player Rendering
  // =========================================================================
  drawBenkos(ctx, x, y, facing, b, time) {
    if (!this.ready) return false;
    const t = b.animTime ?? time;
    const royal = !!b.royalArmor;
    const isMoving = Math.abs(b.vx) > 8;
    const isRunning = Math.abs(b.vx) > 130 || b.jaguarTimer > 0;
    const isAttacking = b.attackTimer > 0;
    const isMounted = !!b.mounted;

    // 1. Estela de Sombra (Paso de Sombra)
    if (b.dashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      const d1 = x - facing * 18;
      const d2 = x - facing * 32;
      const shadowCls = isMounted ? 'real_caballero' : (royal ? 'campeon' : 'benkos');
      this.draw(ctx, shadowCls, ['run', 'walk'], d1, y, facing, isMounted ? 54 : 44, t, 12);
      ctx.globalAlpha = 0.18;
      this.draw(ctx, shadowCls, ['run', 'walk'], d2, y, facing, isMounted ? 54 : 44, t, 12);
      ctx.restore();
    }

    // 2. Aura de Espíritu Jaguar Negro
    if (b.jaguarTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      const trailX = x - facing * (isMoving ? 16 : 0);
      const trailCls = isMounted ? 'real_caballero' : (royal ? 'campeon' : 'benkos');
      this.draw(ctx, trailCls, isRunning ? ['run'] : ['walk'], trailX, y, facing, isMounted ? 54 : 44, t + 0.08, 12);

      // Resplandor felino
      const pulse = Math.sin(time * 12) * 3;
      ctx.globalAlpha = 0.45;
      const auraGrad = ctx.createRadialGradient(x, y - 22, 10, x, y - 22, 28 + pulse);
      auraGrad.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
      auraGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
      auraGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(x, y - 22, 30 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Renderizado del Personaje (Montado vs Pie)
    let drawn = false;
    if (isMounted) {
      const cavCls = this.has('real_caballero') ? 'real_caballero' : 'elite_caballero';
      const h = 54;
      if (isAttacking) {
        drawn = this.draw(ctx, cavCls, ['attack', 'seq'], x, y, facing, h, t, 10, 1 - (b.attackTimer / 0.26));
      } else if (isMoving) {
        drawn = this.draw(ctx, cavCls, isRunning ? ['run', 'walk'] : ['walk'], x, y, facing, h, t, isRunning ? 10 : 7);
      } else {
        drawn = this.draw(ctx, cavCls, ['idle'], x, y, facing, h, t, 3);
      }
    } else if (royal && this.has('campeon')) {
      const h = 46;
      if (isAttacking) {
        const animName = b.weaponMode === 'SPEAR' ? 'attack_spear' : 'attack_sword';
        drawn = this.draw(ctx, 'campeon', [animName, 'attack_sword'], x, y, facing, h, t, 10, 1 - (b.attackTimer / 0.26));
      } else if (b.roarTimer > 0 || (b.roarWave && b.roarWave > 0)) {
        drawn = this.draw(ctx, 'campeon', ['taunt'], x, y, facing, h, t, 6);
      } else if (b.dashTimer > 0) {
        drawn = this.draw(ctx, 'campeon', ['run'], x, y, facing, h, t, 12);
      } else if (isMoving) {
        drawn = this.draw(ctx, 'campeon', isRunning ? ['run', 'walk'] : ['walk'], x, y, facing, h, t, isRunning ? 10 : 7);
      } else {
        drawn = this.draw(ctx, 'campeon', ['idle'], x, y, facing, h, t, 3);
      }
    } else if (this.has('benkos')) {
      const h = 42;
      if (isAttacking) {
        drawn = this.draw(ctx, 'benkos', ['work'], x, y, facing, h, t, 8, 1 - (b.attackTimer / 0.26));
      } else if (b.roarTimer > 0 || (b.roarWave && b.roarWave > 0)) {
        drawn = this.draw(ctx, 'benkos', ['expr'], x, y, facing, h, t, 4);
      } else if (b.dashTimer > 0) {
        drawn = this.draw(ctx, 'benkos', ['run'], x, y, facing, h, t, 12);
      } else if (b.resting) {
        drawn = this.draw(ctx, 'benkos', ['rest'], x, y, facing, h, t, 3);
      } else if (isMoving) {
        drawn = this.draw(ctx, 'benkos', isRunning ? ['run', 'walk'] : ['walk'], x, y, facing, h, t, isRunning ? 10 : 7);
      } else {
        drawn = this.draw(ctx, 'benkos', ['idle'], x, y, facing, h, t, 3);
      }
    }

    // 4. Efectos Visuales de Armas (Arcos de Machete, Estocada de Lanza, Gran Hendidura)
    if (isAttacking) {
      this.drawWeaponSlashVFX(ctx, x, y, facing, b);
    }

    return drawn;
  }

  drawWeaponSlashVFX(ctx, x, y, facing, b) {
    ctx.save();
    const progress = 1 - Math.max(0, b.attackTimer / 0.26);
    const isJaguar = b.jaguarTimer > 0;
    const isSpear = b.weaponMode === 'SPEAR';
    const isCleave = b.comboStep === 3;

    ctx.translate(Math.round(x), Math.round(y - 20));
    ctx.scale(facing, 1);

    if (isSpear) {
      const thrustLen = 32 + progress * 24;
      ctx.strokeStyle = isJaguar ? '#fde047' : '#f8fafc';
      ctx.lineWidth = isJaguar ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.lineTo(10 + thrustLen, -2);
      ctx.stroke();

      ctx.fillStyle = isJaguar ? '#fbbf24' : '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(10 + thrustLen + 8, -2);
      ctx.lineTo(6 + thrustLen, -6);
      ctx.lineTo(6 + thrustLen, 2);
      ctx.closePath();
      ctx.fill();
    } else if (isCleave) {
      const startAngle = -Math.PI * 0.45;
      const endAngle = Math.PI * 0.4;
      const currentAngle = startAngle + (endAngle - startAngle) * progress;

      ctx.strokeStyle = isJaguar ? 'rgba(253, 224, 71, 0.95)' : 'rgba(251, 191, 36, 0.85)';
      ctx.lineWidth = isJaguar ? 5 : 3.5;
      ctx.beginPath();
      ctx.arc(12, 0, 26, startAngle, currentAngle);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(12, 0, 24, startAngle, currentAngle);
      ctx.stroke();
    } else {
      const arcProgress = Math.min(1, progress * 1.4);
      ctx.strokeStyle = isJaguar ? '#fde047' : '#fef08a';
      ctx.lineWidth = isJaguar ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(14, -2, 20, -0.6, -0.6 + arcProgress * 1.5);
      ctx.stroke();

      const tipX = 14 + Math.cos(-0.6 + arcProgress * 1.5) * 20;
      const tipY = -2 + Math.sin(-0.6 + arcProgress * 1.5) * 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tipX - 1.5, tipY - 1.5, 3, 3);
    }

    ctx.restore();
  }

  // =========================================================================
  // Allied Units Rendering (Tiers 1, 2, 3)
  // =========================================================================
  allyClass(u) {
    const tier = u.tier || 1;
    const pick = (base) => {
      const order = tier >= 3 ? ['real_', 'elite_', 'retro_'] : tier === 2 ? ['elite_', 'retro_'] : ['retro_', 'elite_'];
      for (const p of order) {
        if (this.has(p + base)) return p + base;
      }
      return null;
    };

    switch (u.role) {
      case 'GUERRERO': return pick('guerrero');
      case 'LANCERO': return pick('lancero') || pick('guerrero');
      case 'ARQUERO': return pick('arquero');
      case 'CAZADOR': return this.has('retro_cazador') ? 'retro_cazador' : pick('arquero');
      case 'ESPADACHIN': return pick('espadachin') || pick('guerrero');
      case 'CABALLERO_ALIADO': return pick('caballero');
      case 'MINERO': return pick('minero');
      case 'AGRICULTOR': return pick('agricultor');
      default: return null;
    }
  }

  drawAlly(ctx, x, y, facing, u, time) {
    if (!this.ready) return false;
    const t = u.animSeed ?? time;
    const isMoving = Math.abs(u.vx || 0) > 8;
    const isAttacking = (u.attackAnimTimer || 0) > 0;
    const tier = u.tier || 1;

    // 1. Fugitivo / Esclavizado con cadenas
    if (u.role === 'FUGITIVO' || (u.liberateAnimTimer || 0) > 0) {
      if ((u.liberateAnimTimer || 0) > 0) {
        return this.draw(ctx, 'trabajador', ['plead', 'idle'], x, y, facing, 40, t, 4);
      }
      return this.draw(ctx, 'trabajador', isMoving ? ['escape', 'walk'] : ['idle'], x, y, facing, 40, t, isMoving ? 10 : 3);
    }

    // 2. Aldeano con saco de cosecha o trabajando
    if (u.role === 'ALDEANO' || u.carryingSack) {
      if (u.carryingSack) {
        return this.draw(ctx, 'trabajador', ['carry'], x, y, facing, 42, t, 8);
      }
      return this.draw(ctx, 'trabajador', isMoving ? ['walk'] : ['idle'], x, y, facing, 40, t, isMoving ? 8 : 3);
    }

    // 3. Campeón Real Africano (Lámina 3)
    if (u.role === 'CAMPEON_REAL') {
      if (isAttacking) {
        const animName = u.weaponSubMode === 'SWORD' ? 'attack_sword' : 'attack_spear';
        return this.draw(ctx, 'campeon', [animName, 'attack_sword'], x, y, facing, 48, t, 10);
      }
      return this.draw(ctx, 'campeon', isMoving ? ['walk'] : ['idle'], x, y, facing, 48, t, isMoving ? 9 : 3);
    }

    // 4. Tropas Regulares y Especialistas (Tiers 1, 2, 3)
    const cls = this.allyClass(u);
    if (!cls) return false;

    const isMounted = u.role === 'CABALLERO_ALIADO';
    const h = (isMounted ? 52 : 42) + (tier >= 3 ? 3 : 0);

    if (isAttacking) {
      return this.draw(ctx, cls, ['attack', 'seq'], x, y, facing, h, t, 10);
    }
    return this.draw(ctx, cls, isMoving ? ['walk', 'seq'] : ['idle', 'portrait'], x, y, facing, h, t, isMoving ? 8 : 3);
  }

  // =========================================================================
  // Enemy & Boss Units Rendering
  // =========================================================================
  drawEnemy(ctx, x, y, facing, en, time) {
    if (!this.ready) return false;
    const t = en.animTime ?? time;
    const isMoving = !!en.isMoving;
    const isAttacking = (en.attackAnimTimer || 0) > 0;
    let cls;
    let h = 42;

    switch (en.type) {
      case 'HERALDO_ALADO':
        cls = 'heraldo';
        h = 64;
        break;
      case 'GOBERNADOR_GIRON':
        if (en.phase === 1 && this.has('giron_jinete')) {
          cls = 'giron_jinete';
          h = 62;
        } else {
          cls = 'giron_general';
          h = 52;
        }
        break;
      case 'CABALLERO':
        cls = 'caballero_esp';
        h = 54;
        break;
      case 'ARCABUCERO':
        cls = 'arcabucero';
        h = 42;
        break;
      case 'ARQUERO_COLONIAL':
        cls = 'arquero_esp';
        h = 42;
        break;
      case 'PIQUERO':
        cls = 'piquero';
        h = 44;
        break;
      case 'CAMPESINO':
        cls = 'campesino';
        h = 38;
        break;
      case 'BANDOLERO':
        cls = 'bandolero';
        h = 42;
        break;
      default:
        cls = 'soldado';
        h = 42;
    }

    if (!this.has(cls)) return false;

    if (isAttacking) {
      const drawn = this.draw(ctx, cls, ['attack_horn', 'attack_charge', 'attack', 'attack_sword', 'seq'], x, y, facing, h, t, 10);
      if (en.type === 'GOBERNADOR_GIRON' && en.phase === 2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(x + facing * 18, y - 22, 28, -Math.PI * 0.45, Math.PI * 0.35);
        ctx.stroke();
        ctx.restore();
      }
      return drawn;
    }

    if (isMoving) {
      return this.draw(ctx, cls, ['walk', 'seq'], x, y, facing, h, t, 8);
    }
    return this.draw(ctx, cls, ['idle', 'seq'], x, y, facing, h, t, 3);
  }
}

window.SpriteManager = new BenkosSpriteManager();
