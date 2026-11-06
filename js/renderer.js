import { drawLandscape, drawVillage, drawHacienda, drawMarker, drawRoadGate, drawPersonStory, drawFortification, drawToolStand } from './terrain.js';
import { ROAD_GATES } from './campaign.js';
import { WATER_LINE_Y } from './config.js';
export function createRenderer({ state, keys, canvas, ctx, sceneCanvas, sctx, view, settings, getNearestInteractiveNode }) {
const PALETTE = {
  outline: '#1a120d',
  hair: '#1e1510',
  hairHi: '#36261d',
  skinLight: '#8a5a3c',
  skinMid: '#6e452c',
  skinShadow: '#4d2e1c',
  tunicLight: '#e4d5be',
  tunicMid: '#cbb89b',
  tunicShadow: '#a69072',
  scarfGold: '#ca984c',
  scarfShadow: '#966b28',
  strawHat: '#d8b467',
  strawBand: '#7c4d25',
  bronzeGold: '#d97706',
  brightGold: '#fbbf24',
  royalRed: '#b91c1c'
};

function drawPixelHorse(g, animTime, isMoving, opts = {}) {
  const {
    coat = '#5c3a21',
    coatShadow = '#3b2313',
    mane = '#1c130c',
    caparison = '#991b1b',
    goldTrim = '#eab308',
    rearing = false
  } = opts;

  const px = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  const gallop = isMoving ? Math.sin(animTime * 15) : 0;
  const bob = isMoving ? Math.abs(gallop) * 2 : 0;
  const rearAngle = rearing ? -6 : 0;

  px(-16, -2, 32, 2, 'rgba(0,0,0,0.38)');

  const l1 = Math.round(gallop * 5);
  const l2 = Math.round(-gallop * 5);
  px(-13 + l1, -11, 3, 10, coatShadow);
  px(-13 + l1, -2, 4, 2, '#111');
  px(-8 + l2, -11, 3, 10, coat);
  px(-8 + l2, -2, 4, 2, '#1c1917');

  px(7 + l2, -11 + rearAngle, 3, 10, coatShadow);
  px(7 + l2, -2 + rearAngle, 4, 2, '#111');
  px(11 + l1, -11 + rearAngle, 3, 10, coat);
  px(11 + l1, -2 + rearAngle, 4, 2, '#1c1917');

  const by = Math.round(-21 - bob + rearAngle * 0.5);
  px(-14, by, 28, 11, coat);
  px(-13, by + 7, 26, 4, coatShadow);

  px(-9, by, 16, 8, caparison);
  px(-9, by + 7, 16, 2, goldTrim);
  px(-5, by - 1, 9, 3, '#451a03');

  px(-18, by + 1, 4, 8, mane);
  px(-19, by + 4, 3, 7, mane);

  const hy = by - 9 + rearAngle * 0.5;
  px(8, hy + 2, 8, 11, coat);
  px(7, hy, 4, 9, mane);
  px(11, hy - 2, 9, 6, coat);
  px(13, hy - 5, 3, 3, coat);
  px(16, hy, 2, 1, '#ffffff');
  px(11, hy + 2, 8, 1, goldTrim);
  px(6, hy + 4, 7, 1, goldTrim);
}

function drawAfricanShield(px, x, y, isRoyalGold) {
  if (isRoyalGold) {
    px(x, y, 7, 16, '#1c1917');
    px(x + 1, y - 1, 5, 18, '#eab308');
    px(x + 1, y + 1, 5, 14, '#1c1917');
    px(x + 3, y + 2, 1, 12, '#fde047');
    px(x + 1, y + 7, 5, 2, '#fde047');
  } else {
    px(x, y, 7, 14, '#5c3418');
    px(x + 1, y + 1, 5, 12, '#78492a');
    px(x + 3, y + 2, 1, 10, '#f8fafc');
    px(x + 1, y + 6, 5, 2, '#f8fafc');
  }
}

function drawAlliedUnitSprite(g, sx, groundY, u, time) {
  if (state.useRealSprites !== false && window.SpriteManager && window.SpriteManager.drawAlly(g, sx, groundY, u.facing, u, time)) {
    return;
  }
  const isMoving = Math.abs(u.vx) > 8;
  const isChampion = u.role === 'CAMPEON_REAL';
  const isMounted = u.role === 'CABALLERO_ALIADO';
  const tier = isChampion ? 3 : (u.tier || 1);

  g.save();
  g.translate(Math.round(sx), Math.round(groundY));
  g.scale(u.facing, 1);

  const px = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  if (isMounted) {
    drawPixelHorse(g, u.animSeed, isMoving, {
      coat: tier === 3 ? '#3b2313' : '#6b4226',
      coatShadow: '#27170e',
      mane: '#111',
      caparison: tier === 3 ? '#b91c1c' : '#d97706',
      goldTrim: '#fde047'
    });
    g.translate(0, -14);
  }

  const walk = Math.sin(u.animSeed * 11);
  const legL = isMoving ? Math.round(walk * 4) : -2;
  const legR = isMoving ? Math.round(-walk * 4) : 2;
  const bounce = isMoving ? Math.abs(walk) * 1.5 : 0;

  if (u.role === 'FUGITIVO' || u.liberateAnimTimer > 0) {
    px(-6, -2, 12, 2, 'rgba(0,0,0,0.35)');
    px(legL - 1, -10, 3, 10, PALETTE.skinMid);
    px(legR, -10, 3, 10, PALETTE.skinShadow);
    px(-5, -14, 10, 7, PALETTE.tunicMid);
    px(-5, -7, 3, 2, PALETTE.tunicShadow);
    px(2, -7, 3, 2, PALETTE.tunicShadow);
    px(-4, -24, 8, 11, PALETTE.skinMid);
    px(-4, -24, 5, 11, PALETTE.tunicLight);
    px(-3, -32, 7, 7, PALETTE.skinMid);
    px(-4, -34, 9, 4, PALETTE.hair);

    if (u.liberateAnimTimer > 0) {
      px(-6, -33, 3, 9, PALETTE.skinLight);
      px(5, -33, 3, 9, PALETTE.skinLight);
      px(-7, -30, 3, 2, '#94a3b8');
      px(6, -30, 3, 2, '#94a3b8');
    } else {
      px(-4, -25, 8, 2, '#64748b');
      px(0, -23, 2, 19, '#475569');
      px(1, -21, 1, 15, '#cbd5e1');
      px(legL - 1, -4, 3, 2, '#94a3b8');
      px(legR, -4, 3, 2, '#94a3b8');
      px(2, -22, 3, 8, PALETTE.skinLight);
      px(2, -16, 3, 2, '#94a3b8');
    }
    g.restore();
    return;
  }

  if (u.carryingSack) {
    px(-6, -2, 12, 2, 'rgba(0,0,0,0.35)');
    px(legL - 1, -10, 3, 10, PALETTE.skinMid);
    px(legR, -10, 3, 10, PALETTE.skinShadow);
    px(-4, -15, 9, 7, PALETTE.tunicMid);
    px(-3, -24, 9, 10, PALETTE.tunicLight);
    px(0, -31, 7, 7, PALETTE.skinMid);
    px(-1, -33, 8, 3, PALETTE.hair);
    px(-11, -30, 11, 14, '#a16207');
    px(-10, -29, 9, 12, '#ca8a04');
    px(-4, -24, 7, 3, PALETTE.skinLight);
    g.restore();
    return;
  }

  if (!isMounted) {
    px(-7, -2, 14, 2, 'rgba(0,0,0,0.35)');
    px(legL - 1, -10, 3, 10, PALETTE.skinMid);
    px(legR + 1, -10, 3, 10, PALETTE.skinShadow);
    if (tier >= 2 || isChampion) {
      px(legL - 1, -8, 3, 6, PALETTE.bronzeGold);
      px(legR + 1, -8, 3, 6, PALETTE.brightGold);
    }
    px(-5, -15, 10, 6, PALETTE.tunicLight);
    if (tier >= 2 || u.role === 'GUERRERO' || isChampion) {
      px(-5, -16, 10, 2, PALETTE.royalRed);
      px(-1, -15, 3, 6, PALETTE.royalRed);
    }
  }

  const ty = Math.round(-25 - bounce);

  if (tier === 3 || isChampion) {
    const capeWave = isMoving ? 3 : 0;
    px(-9 - capeWave, ty + 1, 7 + capeWave, 18, '#991b1b');
    px(-8 - capeWave, ty + 2, 5 + capeWave, 15, '#dc2626');
  }

  if (tier >= 2 || isChampion) {
    px(-5, ty, 10, 11, '#78350f');
    px(-4, ty + 1, 8, 9, PALETTE.bronzeGold);
    px(-2, ty + 2, 5, 6, PALETTE.brightGold);
    px(-6, ty, 4, 4, PALETTE.brightGold);
    px(3, ty, 4, 4, PALETTE.brightGold);
  } else {
    px(-4, ty, 9, 11, PALETTE.tunicLight);
    if (u.role === 'GUERRERO') {
      px(-4, ty + 1, 3, 9, PALETTE.royalRed);
      px(-1, ty + 4, 4, 5, PALETTE.royalRed);
    }
  }

  const hy = ty - 8;
  px(-3, hy, 7, 7, PALETTE.skinMid);
  px(2, hy + 2, 2, 1, '#ffffff');
  px(-4, hy - 2, 9, 3, PALETTE.hair);

  if (u.role === 'AGRICULTOR' || u.role === 'MINERO') {
    if (tier >= 2) {
      px(-6, hy - 2, 12, 2, PALETTE.strawHat);
      px(-3, hy - 5, 7, 3, PALETTE.brightGold);
    } else {
      px(-4, hy - 2, 8, 3, '#d6c7b2');
    }
  } else if (tier === 3) {
    px(-4, hy - 3, 9, 3, PALETTE.brightGold);
    px(-2, hy - 8, 5, 5, '#dc2626');
    px(-1, hy - 9, 3, 3, '#ef4444');
  } else if (tier === 2) {
    px(-4, hy - 3, 9, 4, '#f8fafc');
    px(2, hy - 3, 2, 2, PALETTE.brightGold);
  } else if (u.role === 'ARQUERO' || u.role === 'CAZADOR') {
    px(-4, hy - 1, 8, 2, '#fde047');
  }

  const isAtk = u.attackAnimTimer > 0;
  if (u.role === 'AGRICULTOR') {
    const swing = Math.sin(u.animSeed * 9) > 0 ? 4 : -2;
    px(2, ty + 3, 5, 3, PALETTE.skinLight);
    px(6, ty + 2, 2, 12 + swing, '#78350f');
    px(5, ty + 13 + swing, 5, 3, '#94a3b8');
  } else if (u.role === 'MINERO') {
    const swing = Math.sin(u.animSeed * 10) > 0 ? 5 : -4;
    px(2, ty + 2, 5, 3, PALETTE.skinLight);
    px(6, ty - 2 + swing, 2, 13, '#78350f');
    px(3, ty - 4 + swing, 8, 2, '#cbd5e1');
  } else if (u.role === 'CAZADOR') {
    px(-6, ty + 1, 3, 8, '#78350f');
    const thrust = isAtk ? 6 : 0;
    px(-2 + thrust, ty + 1, 20, 2, '#78350f');
    px(18 + thrust, ty, 4, 3, '#e2e8f0');
    g.strokeStyle = '#d6c7b2';
    g.lineWidth = 1;
    g.strokeRect(2, ty + 4, 6, 8);
  } else if (u.role === 'ARQUERO') {
    px(-6, ty + 1, 3, 8, '#78350f');
    g.strokeStyle = tier >= 2 ? '#fde047' : '#854d0e';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(5, ty + 5, 9, -1.2, 1.2);
    g.stroke();
    if (isAtk) {
      px(2, ty + 4, 11, 1, '#f8fafc');
    }
  } else if (u.role === 'ESPADACHIN') {
    const slash = isAtk ? 6 : 0;
    px(2 + slash, ty + 3, 5, 3, PALETTE.skinLight);
    px(6 + slash, ty - 7, 3, 12, '#f8fafc');
    px(7 + slash, ty - 9, 4, 3, '#e2e8f0');
    if (isAtk) {
      g.strokeStyle = 'rgba(253, 224, 71, 0.85)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(6, ty + 3, 18, -1.1, 0.7);
      g.stroke();
    }
  } else {
    const thrust = isAtk ? 7 : 0;
    if (isChampion && u.weaponSubMode === 'SWORD' && isAtk) {
      px(4, ty + 1, 16, 2, '#f8fafc');
      g.strokeStyle = 'rgba(253, 224, 71, 0.9)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(6, ty + 2, 20, -1.0, 0.8);
      g.stroke();
    } else {
      if (isAtk || isMounted) {
        px(-6 + thrust, ty + 3, 28, 2, '#78350f');
        px(22 + thrust, ty + 2, 6, 4, '#f8fafc');
      } else {
        px(-5, ty - 14, 2, 30, '#78350f');
        px(-6, ty - 18, 4, 5, '#f8fafc');
      }
    }
    drawAfricanShield(px, 3, ty - 1, tier >= 2 || isChampion);
  }

  g.restore();
}

function drawColonialUnitSprite(g, sx, groundY, en, time) {
  if (state.useRealSprites !== false && window.SpriteManager && window.SpriteManager.drawEnemy(g, sx, groundY, en.facing, en, time)) {
    return;
  }
  g.save();
  g.translate(Math.round(sx), Math.round(groundY));
  g.scale(en.facing, 1);

  const px = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  if (en.appearTimer > 0) {
    g.fillStyle = `rgba(253, 224, 71, ${Math.min(0.75, en.appearTimer)})`;
    g.fillRect(-20, -85, 40, 85);
  }

  const walk = Math.sin(en.animTime * 11);
  const legL = Math.round(walk * 3.5);
  const legR = Math.round(-walk * 3.5);
  const isAttacking = en.attackAnimTimer > 0;

  if (en.type === 'HERALDO_ALADO') {
    if (en.trumpetRing > 0) {
      g.strokeStyle = `rgba(251, 191, 36, ${en.trumpetRing})`;
      g.lineWidth = 2.5;
      for (let r = 1; r <= 3; r++) {
        g.beginPath();
        g.arc(24, -34, (1 - en.trumpetRing) * 55 + r * 10, -0.9, 0.9);
        g.stroke();
      }
    }
    drawPixelHorse(g, en.animTime, true, {
      coat: '#f1f5f9', coatShadow: '#cbd5e1', mane: '#94a3b8', caparison: '#1e3a8a', goldTrim: '#f59e0b', rearing: isAttacking
    });
    const wingFlap = Math.round(Math.sin(en.animTime * 10) * 3);
    px(-22, -46 + wingFlap, 16, 16, '#ffffff');
    px(-14, -36, 12, 16, '#b91c1c');
    px(-4, -37, 9, 12, '#1d4ed8');
    px(-3, -45, 7, 7, '#d6a885');
    px(-5, -52, 10, 5, '#dc2626');
    px(7, -38, 14, 2, '#f59e0b');
    g.restore();
    return;
  }

  if (en.type === 'GOBERNADOR_GIRON') {
    if (en.phase === 1) {
      drawPixelHorse(g, en.animTime, true, {
        coat: '#4a2c18', coatShadow: '#2e1a0d', mane: '#170d06', caparison: '#172554', goldTrim: '#f59e0b', rearing: en.tauntTimer > 0
      });
      px(-15, -36, 13, 18, '#991b1b');
      px(-4, -37, 9, 13, '#1e293b');
      px(-3, -45, 7, 7, '#e2b897');
      px(-6, -47, 10, 4, '#f1f5f9');
      px(4, -52, 3, 14, '#f8fafc');
    } else {
      px(legL - 3, -9, 4, 9, '#27170e');
      px(legR + 1, -9, 4, 9, '#3b2314');
      px(-11, -28, 12, 20, '#991b1b');
      px(-4, -29, 10, 14, '#172554');
      px(-3, -38, 8, 8, '#e2b897');
      px(-6, -40, 11, 4, '#f8fafc');
      px(8, -26, 16, 2, '#ffffff');
    }
    if (en.nettedTimer > 0) {
      g.strokeStyle = '#fef08a';
      g.strokeRect(-12, -36, 24, 34);
    }
    g.restore();
    return;
  }

  if (en.type === 'CABALLERO') {
    drawPixelHorse(g, en.animTime, true, {});
    px(-4, -36, 9, 11, '#94a3b8');
    px(-3, -43, 7, 7, '#d6a885');
    px(-5, -46, 11, 4, '#64748b');
    px(-6, -32, 28, 2, '#78350f');
    g.restore();
    return;
  }

  px(-6, -2, 12, 2, 'rgba(0,0,0,0.35)');
  px(legL - 2, -10, 3, 10, '#5c3a21');
  px(legR + 1, -10, 3, 10, '#432818');
  px(-4, -23, 9, 12, en.type === 'SOLDADO_ESPANOL' ? '#94a3b8' : (en.type === 'ARCABUCERO' ? '#9a5b32' : '#2f5e35'));
  px(-3, -30, 7, 7, '#d6a885');
  px(-5, -33, 10, 3, '#475569');
  if (en.type === 'ARCABUCERO') {
    px(2, -21, 14, 2, '#475569');
    if (en.muzzleFlash > 0) px(16, -24, 7, 6, '#fde047');
  } else {
    px(4, -20, 10, 2, '#e2e8f0');
  }

  if (en.nettedTimer > 0) {
    g.strokeStyle = '#fde047';
    g.lineWidth = 1;
    g.strokeRect(-8, -32, 16, 30);
    g.beginPath();
    g.moveTo(-8, -32); g.lineTo(8, -2);
    g.moveTo(8, -32); g.lineTo(-8, -2);
    g.stroke();
  }

  g.restore();
}

function drawBenkosPlayer(g, sx, groundY, time) {
  const b = state.benkos;
  if (state.useRealSprites !== false && window.SpriteManager && window.SpriteManager.drawBenkos(g, sx, groundY, b.facing, b, time)) {
    return;
  }
  const isHoldingPay = keys['KeyS'] || keys['ArrowDown'] || keys['KeyK'] || state.touchHoldPay;

  if (b.royalArmor) {
    drawAlliedUnitSprite(g, sx, groundY, {
      role: 'CAMPEON_REAL',
      tier: 3,
      vx: b.vx,
      facing: b.facing,
      animSeed: b.animTime,
      attackAnimTimer: b.attackTimer,
      weaponSubMode: b.weaponMode
    }, time);
    return;
  }

  drawAlliedUnitSprite(g, sx, groundY, {
    role: 'GUERRERO',
    tier: 1,
    vx: b.vx,
    facing: b.facing,
    animSeed: b.animTime,
    attackAnimTimer: b.attackTimer,
    carryingSack: isHoldingPay
  }, time);
}

function drawKingdomClusterTree(g, sx, groundY, height, isNight, markedForChop, chopped, time=0) {
  if (chopped) {
    // Tocón de Ceiba talada
    g.fillStyle = isNight ? '#27170e' : '#451a03';
    g.fillRect(sx - 7, groundY - 14, 14, 14);
    g.fillStyle = isNight ? '#5c3a21' : '#78350f';
    g.fillRect(sx - 5, groundY - 15, 10, 3);
    g.fillStyle = '#b45309';
    g.fillRect(sx - 2, groundY - 15, 4, 1);
    // Pequeño brote verde
    g.fillStyle = '#84cc16';
    g.fillRect(sx + 5, groundY - 6, 3, 4);
    return;
  }

  g.fillStyle='#14291b66';g.beginPath();g.ellipse(sx,groundY,24,4,0,0,Math.PI*2);g.fill();
  g.fillStyle = '#3b2314';
  g.fillRect(sx-5,groundY-height,10,height);
  g.fillStyle=isNight?'#715137':'#ab7a47';g.fillRect(sx-4,groundY-height,2,height);
  for(let y=8;y<height;y+=13){g.fillStyle='#2c281b';g.fillRect(sx+(y%3)-1,groundY-y,2,7);}
  g.strokeStyle=isNight?'#57402a':'#826039';g.lineWidth=3;
  for(const side of [-1,1]){g.beginPath();g.moveTo(sx,groundY-height*.55);g.lineTo(sx+side*18,groundY-height+10);g.stroke();g.beginPath();g.moveTo(sx+side*3,groundY-12);g.lineTo(sx+side*15,groundY);g.stroke();}

  const cShadow = isNight ? '#0a2618' : '#1b3b1a';
  const cMid = isNight ? '#133c26' : '#355e27';
  const cLight = isNight ? '#1e5235' : '#588136';

  const puffs = [
    { dx: -18, dy: -height + 8, r: 16 },
    { dx: 18, dy: -height + 6, r: 15 },
    { dx: -8, dy: -height - 6, r: 18 },
    { dx: 10, dy: -height - 4, r: 17 },
    { dx: 0, dy: -height - 14, r: 16 }
  ];

  puffs.forEach((pf,index)=>{
    const wind=settings.reduce_motion?0:Math.round(Math.sin(time*1.1+height+index*.4));
    const cx=sx+pf.dx+wind,cy=groundY+pf.dy,r=pf.r;
    for(let dy=-r;dy<=r;dy+=3){
      const span=Math.round(Math.sqrt(Math.max(0,r*r-dy*dy)));
      g.fillStyle=dy>r*.35?cShadow:dy>-r*.4?cMid:cLight;
      g.fillRect(cx-span,cy+dy,span*2,4);
      if(span>8){g.fillStyle=dy<0?cLight:cShadow;g.fillRect(cx-span+3+(index*7+dy*dy)%Math.max(1,span),cy+dy,4,2);}
    }
    g.fillStyle=isNight?'#2e6040':'#80954c';
    for(let k=0;k<5;k++){const dx=((k*13+index*7)%25)-12,dy=((k*11+index*3)%19)-12;g.fillRect(cx+dx,cy+dy,3,1);}
  });

  if (markedForChop) {
    g.fillStyle = '#ef4444';
    g.fillRect(sx - 6, groundY - 22, 12, 4);
    g.fillStyle = '#ffffff';
    g.fillRect(sx - 2, groundY - 26, 4, 4); // ícono hacha
  }
}

// ==================== 10. HD-2D SCENE & REFLECTION RENDERER ====================
function renderWorldAboveWater(g, time) {
  const w = view.width;
  const h = WATER_LINE_Y;
  const GROUND_SURFACE_Y = h - 22;
  const camX = state.cameraX;
  const toScreenX = (wx) => Math.round(wx - camX + w / 2);
  const isNight = state.phase !== 'DAY_EXPLORE';

  const skyGrad = g.createLinearGradient(0, 0, 0, GROUND_SURFACE_Y);
  if (state.phase === 'RED_NIGHT') {
    skyGrad.addColorStop(0, '#1f050a');
    skyGrad.addColorStop(0.55, '#5c111b');
    skyGrad.addColorStop(1, '#991b1b');
  } else if (state.phase === 'NIGHT_DEFENSE' || state.phase === 'TRUCE_NIGHT') {
    skyGrad.addColorStop(0, '#142a31');
    skyGrad.addColorStop(0.6, '#2a4449');
    skyGrad.addColorStop(1, '#607b75');
  } else {
    skyGrad.addColorStop(0, '#688b8d');
    skyGrad.addColorStop(0.58, '#adc0b1');
    skyGrad.addColorStop(1, '#e0cda7');
  }
  g.fillStyle = skyGrad;
  g.fillRect(0, 0, w, h);

  const sunX = Math.round(w * 0.54 + Math.cos(state.timeOfDay * Math.PI * 2 - Math.PI / 2) * (w * 0.25));
  const sunY = Math.round(78 + Math.sin(state.timeOfDay * Math.PI) * 18);
  const haze=g.createRadialGradient(sunX,sunY,12,sunX,sunY,55);haze.addColorStop(0,isNight?'#dce6cc30':'#f6e7bb70');haze.addColorStop(1,'#e8cf9800');g.fillStyle=haze;g.fillRect(sunX-55,sunY-55,110,110);
  g.fillStyle=state.phase==='RED_NIGHT'?'#dda39a':isNight?'#dce0c8':'#f1dfad';g.beginPath();g.arc(sunX,sunY,isNight?16:19,0,Math.PI*2);g.fill();
  g.fillStyle=isNight?'#c2d2c40a':'#f0e1c128';
  for(let i=0;i<5;i++){const cloudX=((i*193-camX*.07+(settings.reduce_motion?0:time*.8))%(w+160)+w+160)%(w+160)-80;for(let band=0;band<3;band++)g.fillRect(Math.round(cloudX+band*7),35+i%3*25+band*4,45+band*13,3);}

  drawLandscape(g, w, GROUND_SURFACE_Y, camX, isNight, time);

  g.fillStyle = isNight ? '#271911' : '#4a321e';
  g.fillRect(0, GROUND_SURFACE_Y, w, h - GROUND_SURFACE_Y);
  for (let bx = -((Math.round(camX) % 24 + 24) % 24); bx < w; bx += 24) {
    g.fillStyle = isNight ? '#382417' : '#654429';
    g.fillRect(bx + 2, GROUND_SURFACE_Y + 3, 18, 8);
    g.fillStyle = isNight ? '#22543d' : '#588c36';
    g.fillRect(bx, GROUND_SURFACE_Y - 2, 24, 3);
  }

  // Fine clay strata and gravel replace the uniform blocks along the riverbank.
  for(let i=0;i<Math.ceil(w/9)+2;i++){
    const wx=Math.floor(camX/9)+i-Math.ceil(w/18),sx=toScreenX(wx*9),seed=Math.abs((wx*71)^0x4a31);
    g.fillStyle=isNight?'#776348':'#a48a59';g.fillRect(sx,GROUND_SURFACE_Y+3+(seed%12),1+seed%3,1);
    if(seed%4===0){g.fillStyle='#294c2e';g.fillRect(sx,GROUND_SURFACE_Y-4,1,5);g.fillRect(sx+2,GROUND_SURFACE_Y-6,1,6);}
  }
  drawVillage(g, toScreenX, GROUND_SURFACE_Y, isNight, time, state.settlement, settings.reduce_motion);

  state.trees.forEach((tr) => {
    const sx = toScreenX(tr.x);
    if (sx < -70 || sx > w + 70) return;
    drawKingdomClusterTree(g, sx, GROUND_SURFACE_Y, tr.height, isNight, tr.markedForChop, tr.chopped, time);
  });

  state.mines.forEach((mn) => {
    const sx = toScreenX(mn.x);
    if (sx < -50 || sx > w + 50) return;
    g.fillStyle = '#475569';
    g.fillRect(sx - 18, GROUND_SURFACE_Y - 22, 36, 22);
    g.fillStyle = '#64748b';
    g.fillRect(sx - 14, GROUND_SURFACE_Y - 28, 26, 18);
    g.fillStyle = '#f8fafc';
    g.fillRect(sx - 8, GROUND_SURFACE_Y - 20, 4, 4);
    g.fillRect(sx + 4, GROUND_SURFACE_Y - 14, 5, 4);
    g.fillStyle = '#fde047';
    g.fillRect(sx - 2, GROUND_SURFACE_Y - 24, 3, 3);
  });

  state.haciendas.forEach((hac) => {
    const sx = toScreenX(hac.x);
    if (sx < -120 || sx > w + 120) return;
    drawHacienda(g, sx, GROUND_SURFACE_Y, hac.destroyed, isNight);
  });

  state.farms.forEach((f) => {
    const sx = toScreenX(f.x);
    if (sx < -60 || sx > w + 60) return;
    if (f.level > 0) {
      g.fillStyle = '#3f2e18';
      g.fillRect(sx - 28, GROUND_SURFACE_Y - 6, 56, 6);
      const cropH = Math.round(6 + f.cropProgress * 16);
      for (let cx = -22; cx <= 22; cx += 11) {
        g.fillStyle = '#15803d';
        const sway=settings.reduce_motion?0:Math.round(Math.sin(time*2+f.x+cx)*1.5);
        g.fillRect(sx+cx-1,GROUND_SURFACE_Y-6-cropH,2,cropH);
        g.fillStyle=f.cropProgress>.7?'#d0b75a':'#79a353';g.fillRect(sx+cx+sway-4,GROUND_SURFACE_Y-7-cropH,5,3);g.fillRect(sx+cx+sway,GROUND_SURFACE_Y-3-cropH,5,2);
      }
      g.fillStyle = '#a16207';
      g.fillRect(sx + 24, GROUND_SURFACE_Y - 11, 10, 11);
      g.fillStyle = '#eab308';
      g.fillRect(sx + 25, GROUND_SURFACE_Y - 14, 8, 4);
    }
  });

  state.toolRacks.forEach((rk) => {
    const sx = toScreenX(rk.x);
    if (sx < -50 || sx > w + 50) return;
    drawToolStand(g,sx,GROUND_SURFACE_Y,rk,state.armyTier,isNight);
  });

  const totemSX = toScreenX(-48);
  g.fillStyle = '#78350f';
  g.fillRect(totemSX - 10, GROUND_SURFACE_Y - 34, 20, 34);
  g.fillStyle = '#eab308';
  g.fillRect(totemSX - 12, GROUND_SURFACE_Y - 36, 24, 5);
  g.fillStyle = '#dc2626';
  g.fillRect(totemSX - 6, GROUND_SURFACE_Y - 42, 12, 6);

  const altarSX = toScreenX(0);
  g.fillStyle = '#44403c';
  g.fillRect(altarSX - 22, GROUND_SURFACE_Y - 18, 44, 18);
  g.fillStyle = '#57534e';
  g.fillRect(altarSX - 15, GROUND_SURFACE_Y - 38, 30, 20);
  g.fillStyle = '#fde047';
  g.fillRect(altarSX - 6, GROUND_SURFACE_Y - 32, 4, 3);
  g.fillRect(altarSX + 2, GROUND_SURFACE_Y - 32, 4, 3);

  const chestSX = toScreenX(48);
  g.fillStyle = '#78350f';
  g.fillRect(chestSX - 10, GROUND_SURFACE_Y - 14, 20, 14);
  g.fillStyle = '#f59e0b';
  g.fillRect(chestSX - 10, GROUND_SURFACE_Y - 9, 20, 3);
  g.fillStyle = '#ca8a04';
  g.fillRect(chestSX + 12, GROUND_SURFACE_Y - 12, 9, 12);

  state.horses.forEach((hr) => {
    const hsx = toScreenX(hr.x);
    if (hsx < -50 || hsx > w + 50) return;
    g.save();
    g.translate(hsx, GROUND_SURFACE_Y);
    g.scale(hr.facing, 1);
    drawPixelHorse(g, time, false, {});
    g.restore();
  });

  state.walls.forEach((wall) => {
    const sx = toScreenX(wall.x);
    if (sx < -50 || sx > w + 50) return;
    if (wall.level > 0 && wall.hp > 0) {
      drawFortification(g,sx,GROUND_SURFACE_Y,wall,isNight,settings.reduce_motion?0:time);
    }
  });

  state.droppedCoins.forEach((c) => {
    const sx = toScreenX(c.x);
    const cy = c.fallsInRiver ? Math.round(c.y) : Math.min(GROUND_SURFACE_Y, Math.round(c.y));
    g.fillStyle = '#f8fafc';
    g.fillRect(sx - 3, cy - 5, 6, 5);
    g.fillStyle = '#fbbf24';
    g.fillRect(sx - 1, cy - 4, 2, 3);
  });

  state.wildlife.forEach((an) => {
    const sx = toScreenX(an.x);
    if (sx < -30 || sx > w + 30) return;
    g.save();
    g.translate(sx, GROUND_SURFACE_Y);
    g.scale(an.facing, 1);

    const walkLeg = Math.sin((time + an.id) * 12) * 2;
    // Sombra
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(-10, -2, 20, 2);
    // Patas
    g.fillStyle = '#451a03';
    g.fillRect(-7 + (an.vx !== 0 ? walkLeg : 0), -4, 3, 4);
    g.fillRect(4 - (an.vx !== 0 ? walkLeg : 0), -4, 3, 4);
    // Cuerpo redondeado
    g.fillStyle = '#78350f';
    g.fillRect(-9, -12, 16, 9);
    g.fillStyle = '#92400e';
    g.fillRect(-7, -13, 12, 3);
    // Cabeza y hocico característico del chigüiro
    g.fillStyle = '#78350f';
    g.fillRect(5, -13, 7, 8);
    g.fillStyle = '#451a03';
    g.fillRect(9, -10, 4, 4); // hocico plano
    g.fillStyle = '#1c1917';
    g.fillRect(7, -12, 2, 2); // ojito
    g.fillStyle = '#92400e';
    g.fillRect(4, -15, 3, 3); // orejita

    // Si está atrapado en la red del cazador
    if (an.nettedTimer > 0) {
      g.strokeStyle = '#fde047';
      g.lineWidth = 1.5;
      g.strokeRect(-11, -16, 24, 16);
      g.beginPath();
      g.moveTo(-11, -16); g.lineTo(13, 0);
      g.moveTo(13, -16); g.lineTo(-11, 0);
      g.stroke();
    }
    g.restore();
  });

  ROAD_GATES.forEach(gate => drawRoadGate(g,toScreenX(gate.x),GROUND_SURFACE_Y,gate.side,state.campaign.orders.some(o=>o.side===gate.side)));
  const closestPerson = state.units.filter(u=>Math.abs(u.x-state.benkos.x)<90).sort((a,b)=>Math.abs(a.x-state.benkos.x)-Math.abs(b.x-state.benkos.x))[0];
  state.units.forEach((u) => {
    const sx = toScreenX(u.x);
    if (sx < -50 || sx > w + 50) return;
    drawMarker(g, sx, GROUND_SURFACE_Y, u);
    drawAlliedUnitSprite(g, sx, GROUND_SURFACE_Y, u, time);
    drawPersonStory(g,sx,GROUND_SURFACE_Y,u,u===closestPerson);
  });

  state.messengers.forEach(m=>{
    const sx=toScreenX(m.x);if(sx < -50 || sx > w+50)return;
    if(window.SpriteManager?.drawMessenger)window.SpriteManager.drawMessenger(g,sx,GROUND_SURFACE_Y,m,time);
    else {g.fillStyle='#7694a0';g.fillRect(sx-6,GROUND_SURFACE_Y-28,12,28);}
    g.fillStyle='#e2dfc7';g.fillRect(sx+m.facing*12,GROUND_SURFACE_Y-49,2,23);g.fillRect(sx+m.facing*12,GROUND_SURFACE_Y-49,12,7);
    if(m.state==='WAIT'&&!m.delivered){g.font='7px monospace';g.textAlign='center';g.fillStyle='#e4c98f';g.fillText('E · Leer carta',sx,GROUND_SURFACE_Y-58);}
  });

  state.enemies.forEach((en) => {
    const sx = toScreenX(en.x);
    if (sx < -70 || sx > w + 70) return;
    g.save();
    if(en.appearTimer>0)g.globalAlpha=Math.max(0,Math.min(1,1-en.appearTimer/1.2));
    drawColonialUnitSprite(g, sx, GROUND_SURFACE_Y, en, time);
    g.restore();
    drawMarker(g, sx, GROUND_SURFACE_Y, en, true);
  });

  const b = state.benkos;
  const bsx = toScreenX(b.x);
  const by = GROUND_SURFACE_Y;

  if (b.jaguarTimer > 0) {
    g.fillStyle = 'rgba(253, 224, 71, 0.28)';
    g.beginPath();
    g.arc(bsx, by - 16, 22, 0, Math.PI * 2);
    g.fill();
  }
  if (b.roarWave > 0) {
    g.strokeStyle = `rgba(251, 191, 36, ${b.roarWave})`;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(bsx, by - 16, (1 - b.roarWave) * 180, 0, Math.PI * 2);
    g.stroke();
  }

  drawBenkosPlayer(g, bsx, by, time);
  g.fillStyle = '#e6c486';
  g.fillRect(bsx - 3, by + 2, 6, 2);
  g.fillRect(bsx - 1, by + 4, 2, 2);

  state.projectiles.forEach((p) => {
    const psx = toScreenX(p.x);
    const psy = Math.round(p.y - 22);
    if (p.isNet) {
      g.strokeStyle = '#fde047';
      g.strokeRect(psx - 5, psy - 5, 10, 10);
    } else {
      g.fillStyle = p.color;
      g.fillRect(psx - 3, psy - 1, 6, 2);
    }
  });

  state.particles.forEach((pt) => {
    g.fillStyle = pt.color;
    g.fillRect(toScreenX(pt.x), Math.round(pt.y - 22), pt.size, pt.size);
  });

  g.font = '9px monospace';
  g.textAlign = 'center';
  state.floatingTexts.forEach((ft) => {
    const sx = toScreenX(ft.x);
    g.fillStyle = '#000';
    g.fillText(ft.text, sx + 1, Math.round(ft.y - 22) + 1);
    g.fillStyle = ft.color;
    g.fillText(ft.text, sx, Math.round(ft.y - 22));
  });

  if (state.phase === 'DAY_EXPLORE' && state.timeOfDay > .56) {
    g.fillStyle = `rgba(121, 57, 29, ${Math.min(.22, (state.timeOfDay - .56) * 1.8)})`;
    g.fillRect(0, 0, w, h);
  }
  // ==================== DYNAMIC 2.5D TORCH & NIGHT LIGHTING ====================
  if (isNight || state.benkos.torchManual) {
    g.save();
    const torchFlicker = settings.reduce_motion ? 0 : Math.sin(time * 6) * 1.5;
    const bsx = toScreenX(state.benkos.x);
    const bsy = GROUND_SURFACE_Y - 24;

    // 1. Torch on Benkos
    const torchGrad = g.createRadialGradient(bsx, bsy, 8, bsx, bsy, 75 + torchFlicker);
    torchGrad.addColorStop(0, 'rgba(251, 146, 60, 0.42)');
    torchGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
    torchGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
    g.fillStyle = torchGrad;
    g.beginPath();
    g.arc(bsx, bsy, 75 + torchFlicker, 0, Math.PI * 2);
    g.fill();

    // 2. Altar of Wiwa Campfire (x = 0)
    const altarSx = toScreenX(0);
    const altarGrad = g.createRadialGradient(altarSx, GROUND_SURFACE_Y - 20, 10, altarSx, GROUND_SURFACE_Y - 20, 95 + torchFlicker * 1.5);
    altarGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
    altarGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.20)');
    altarGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
    g.fillStyle = altarGrad;
    g.beginPath();
    g.arc(altarSx, GROUND_SURFACE_Y - 20, 95 + torchFlicker * 1.5, 0, Math.PI * 2);
    g.fill();

    // 3. Wall Torches
    state.walls.forEach(wall => {
      if (wall.level > 0 && wall.hp > 0) {
        const wsx = toScreenX(wall.x);
        const wGrad = g.createRadialGradient(wsx, GROUND_SURFACE_Y - 30, 4, wsx, GROUND_SURFACE_Y - 30, 45 + torchFlicker);
        wGrad.addColorStop(0, 'rgba(253, 224, 71, 0.38)');
        wGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
        wGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        g.fillStyle = wGrad;
        g.beginPath();
        g.arc(wsx, GROUND_SURFACE_Y - 30, 45 + torchFlicker, 0, Math.PI * 2);
        g.fill();
      }
    });

    // 4. Arcabucero Muzzle Flashes
    state.enemies.forEach(en => {
      if (en.muzzleFlash > 0 && !settings.reduce_motion) {
        const esx = toScreenX(en.x);
        const mGrad = g.createRadialGradient(esx + en.facing * 18, GROUND_SURFACE_Y - 20, 2, esx + en.facing * 18, GROUND_SURFACE_Y - 20, 50);
        mGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        mGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.6)');
        mGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        g.fillStyle = mGrad;
        g.beginPath();
        g.arc(esx + en.facing * 18, GROUND_SURFACE_Y - 20, 50, 0, Math.PI * 2);
        g.fill();
      }
    });

    g.restore();
  }
}

function renderFrame(time) {
  const w = view.width;
  const h = view.height;
  const waterHeight = h - WATER_LINE_Y;

  renderWorldAboveWater(sctx, time);

  ctx.save();
  if (state.screenShake > 0 && !settings.reduce_motion) {
    ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
  }

  ctx.drawImage(sceneCanvas, 0, 0);

  for (let wy = 0; wy < waterHeight; wy++) {
    const destY = WATER_LINE_Y + wy;
    const progress = wy / waterHeight;
    const srcY = Math.max(0, Math.min(WATER_LINE_Y - 1, Math.floor(WATER_LINE_Y - 1 - wy * 1.15)));
    const rippleX = settings.reduce_motion ? 0 : Math.round(Math.sin(wy * 0.35 - time * 2) * (0.8 + progress * 2));
    ctx.drawImage(sceneCanvas, 0, srcY, w, 1, rippleX, destY, w, 1);
  }

  const riverGrad = ctx.createLinearGradient(0, WATER_LINE_Y, 0, h);
  riverGrad.addColorStop(0, state.phase === 'RED_NIGHT' ? 'rgba(69, 10, 10, 0.32)' : 'rgba(28, 45, 52, 0.28)');
  riverGrad.addColorStop(1, 'rgba(14, 24, 32, 0.58)');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, WATER_LINE_Y, w, waterHeight);

  ctx.restore();
}


return renderFrame;
}
