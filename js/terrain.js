// Native pixel scenery shares the ochre/forest palette of the character atlases.
import { blend, color, mix, smooth } from './daylight.js?v=c08e58e7c55c';
import { landscapeSeed } from './sky.js?v=c08e58e7c55c';

export function drawLandscape(g, width, ground, camera, air) {
  const manager = window.SpriteManager;
  for (let layer = 0; layer < 2; layer++) {
    const left = camera * (.09 + layer * .10) - width / 2;
    const step = 3;
    const ridge = blend(air.horizon, layer === 0 ? [84, 118, 112] : [38, 79, 68], .47 + layer * .23);
    const ridgeShade = blend(ridge, air.zenith, air.shadow * .64);
    const shade = color(ridgeShade);
    const light = color(blend(ridgeShade, air.horizon, .18));
    for (let x = -step; x < width; x += step) {
      const wx = left + x;
      const hills = Math.sin(wx * .010 + layer * 3) * 13 + Math.sin(wx * .025 + layer * 2) * 8;
      const canopy = landscapeSeed(Math.floor(wx / 4) + layer * 71) * (3 + layer * 3);
      const top = Math.round(ground * (.54 + layer * .13) + hills - canopy);
      g.fillStyle = shade;
      g.fillRect(x, top, step, ground - top);
      g.fillStyle = light;
      g.fillRect(x, top, step, layer + 1);
    }
  }

  const region = smooth(1280, 1780, Math.abs(camera));
  if (region > 0 && manager?.drawBackdrop) {
    g.save();
    g.globalAlpha = region * .65;
    const regionCamera = camera - Math.sign(camera) * 1840;
    manager.drawBackdrop(g, camera < 0 ? 'biome_ravine' : 'biome_mangrove', width, ground, regionCamera, .38, ground * .53);
    g.restore();
  }

  if (!manager?.has('forest_hardwood')) return;
  const trees = ['forest_ceiba', 'forest_hardwood', 'forest_mangrove', 'forest_palm'];
  for (let layer = 0; layer < 2; layer++) {
    const span = layer === 0 ? 55 : 101;
    const left = camera * (.23 + layer * .18) - width / 2;
    g.save();
    g.globalAlpha = (layer === 0 ? .43 : .77) * (1 - air.shadow * .19);
    for (let cell = Math.floor(left / span) - 2; cell <= (left + width) / span + 2; cell++) {
      const id = cell + layer * 503;
      const x = Math.round(cell * span - left + landscapeSeed(id) * span * .74);
      const centerClearing = layer === 1 && Math.abs(cell * span) < 140;
      const base = ground - (layer === 0 ? 18 : 4);
      const height = (layer === 0 ? 53 : centerClearing ? 61 : 96) + landscapeSeed(id + 61) * 44;
      const tree = trees[Math.floor(landscapeSeed(id + 26) * trees.length)];
      manager.draw(g, tree, ['idle'], x, base, cell % 2 === 0 ? 1 : -1, height, 0);
    }
    g.restore();
  }
}

export function drawMist(g, width, ground, camera, air, time) {
  const mistColor = blend(air.horizon, [192, 213, 199], .30);
  const amount = .18 + air.shadow * .25 + (1 - smooth(0, .16, air.t)) * .11;
  const mist = g.createLinearGradient(0, ground - 115, 0, ground + 1);
  mist.addColorStop(0, color(mistColor, 0));
  mist.addColorStop(.68, color(mistColor, amount));
  mist.addColorStop(1, color(mistColor, .06));
  g.fillStyle = mist;
  g.fillRect(0, ground - 115, width, 116);

  const left = camera * .18 - width / 2 - time * 2.5;
  for (let cell = Math.floor(left / 245) - 1; cell <= (left + width) / 245 + 1; cell++) {
    const x = cell * 245 - left + Math.sin(time * .35 + cell) * 20;
    const y = ground - 26 - landscapeSeed(cell) * 36;
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(1, .19);
    const patch = g.createRadialGradient(0, 0, 0, 0, 0, 128);
    patch.addColorStop(0, color(mistColor, amount * .63));
    patch.addColorStop(1, color(mistColor, 0));
    g.fillStyle = patch;
    g.fillRect(-128, -128, 256, 256);
    g.restore();
  }
}

export function drawAmbientMotes(g, width, ground, camera, air, time) {
  const left = camera - width / 2;
  const night = smooth(.17, .55, air.shadow);
  g.fillStyle = color(blend([238, 226, 163], [212, 228, 155], night));
  for (let cell = Math.floor((left - 30) / 47); cell <= (left + width + 30) / 47; cell++) {
    const phase = landscapeSeed(cell);
    const flow = time * (.35 + phase * .4) + phase * Math.PI * 2;
    const x = Math.round(cell * 47 - left + Math.sin(flow) * 15);
    const y = Math.round(ground - 8 - phase * mix(118, 67, night) + Math.cos(flow * .73) * 8);
    g.globalAlpha = mix(.25, phase > .66 ? 0 : .52, night) * (.65 + .35 * Math.sin(flow * 1.8) ** 2);
    g.fillRect(x, y, phase > .55 ? 2 : 1, 1);
  }
  g.globalAlpha = 1;
}

export function drawVines(g, project, ground, width, time) {
  for (const [anchor, length, side] of [[-2320, 85, 1], [-1990, 112, -1], [-1270, 94, -1], [1755, 96, 1], [2088, 107, -1], [2440, 85, 1]]) {
    const x = project(anchor);
    if (x < -65 || x > width + 65) continue;
    for (let strand = 0; strand < 3; strand++) {
      const top = ground - 221 - strand * 7;
      const end = length + 68 - strand * 13;
      for (let step = 0; step < end; step += 3) {
        const dx = Math.round(Math.sin(step / 21 + time * .48 + strand) * (4 + step / 18));
        const sx = x + side * (strand * 8 + dx);
        const y = top + step;
        g.fillStyle = '#263c24'; g.fillRect(sx - 1, y, 3, 5);
        g.fillStyle = '#718451'; g.fillRect(sx, y, 1, 4);
        if (step % 18 === 0) {
          const leafSide = (step / 18 + strand) % 2 ? -1 : 1;
          g.fillStyle = '#4c6940'; g.fillRect(sx + (leafSide < 0 ? -5 : 1), y, 6, 3);
          g.fillStyle = '#829352'; g.fillRect(sx + leafSide * 3, y, 2, 1);
        }
      }
    }
  }
}

export function drawCaptiveGate(g, x, ground, hacienda, captives) {
  const y = ground - 34;
  const half = hacienda.major ? 58 : 40;
  for (let i = -half + 2; i <= half; i += 8) {
    g.fillStyle = '#291f1a'; g.fillRect(x + i, y, 3, 35);
    g.fillStyle = '#86745a'; g.fillRect(x + i + 1, y + 4, 1, 21);
    g.fillStyle = '#a4936b'; g.fillRect(x + i + 1, y + 26, 1, 1);
  }
  g.fillStyle = '#393329'; g.fillRect(x - half, y + 1, half * 2, 3); g.fillRect(x - half, y + 26, half * 2, 3);
  g.fillStyle = '#8e7959'; g.fillRect(x - half, y + 1, half * 2, 1); g.fillRect(x - half, y + 26, half * 2, 1);
  g.fillStyle = '#ba9562'; g.fillRect(x + 2, y + 14, 6, 6);
  g.fillStyle = '#4b3e31'; g.fillRect(x + 4, y + 16, 2, 3);
  const labelY = ground - (hacienda.major ? 132 : 107);
  g.fillStyle = '#0c1c18'; g.fillRect(x - 35, labelY, 70, 5);
  g.fillStyle = '#d08a62'; g.fillRect(x - 34, labelY + 1, 68 * Math.max(0, hacienda.hp / hacienda.maxHp), 3);
  g.fillStyle = '#f1d8a0'; g.textAlign = 'center'; g.font = '8px monospace';
  g.fillText(captives ? `${captives} ${captives === 1 ? 'cautivo' : 'cautivos'}` : 'Puesto colonial', x, labelY - 6);
}

const OUTER_SCENERY = [
  [-4210, 'forest_ceiba', 147], [-3970, 'trail_terrace', 65], [-3750, 'forest_hardwood', 118],
  [-3630, 'trail_stones', 31], [-3355, 'trail_arch', 83], [-3145, 'forest_ceiba', 161],
  [-2920, 'trail_fern', 42], [-2740, 'trail_sign', 38],
  [2720, 'trail_sign', 36], [2910, 'forest_mangrove', 139], [3130, 'trail_reeds', 43],
  [3295, 'forest_palm', 150], [3535, 'trail_terrace', 49], [3895, 'forest_mangrove', 155],
  [4060, 'trail_reeds', 43], [4180, 'forest_palm', 123]
];

export function drawEstateScenery(g, project, ground, width) {
  for (const [worldX, art, height] of OUTER_SCENERY) {
    const x = project(worldX);
    if (x < -170 || x > width + 170) continue;
    window.SpriteManager?.draw?.(g, art, ['idle'], x, ground, worldX < 0 ? -1 : 1, height, 0);
  }
  for (const [worldX, label] of [[-2740, 'PASO DE JEGUA'], [2720, 'BOCA DE MAREA']]) {
    const x = project(worldX);
    if (x < -60 || x > width + 60) continue;
    g.fillStyle = '#19271e'; g.fillRect(x - 39, ground - 49, 78, 12);
    g.fillStyle = '#e0c491'; g.textAlign = 'center'; g.font = '7px monospace'; g.fillText(label, x, ground - 41);
  }
}

export function drawRiverbank(g, width, ground, camera) {
  const manager = window.SpriteManager;
  g.fillStyle = '#4b3b26';
  g.fillRect(0, ground - 2, width, 24);
  if (!manager?.has('bank_camp')) return;
  const frame = manager.atlas.bank_camp.anims.idle[0];
  const height = 27;
  const span = Math.round(frame.w * height / frame.h);
  const left = camera - width / 2;
  for (let tile = Math.floor(left / span); tile * span < left + width; tile++) {
    const x = (tile + .5) * span;
    const kind = Math.abs(x) < 665 ? 'bank_camp' : x < -1610 ? 'bank_ruin' : 'bank_forest';
    // Alternate mirroring to meet each edge with its matching texture.
    manager.draw(g, kind, ['idle'], x - left, ground + 22, Math.abs(tile % 2) ? -1 : 1, height, 0);
  }
}

export function drawTrailScenery(g, toScreen, ground, width, signs, altarX, foreground = false) {
  const manager = window.SpriteManager;
  const details = foreground ? [
    [-2240, 'trail_reeds', 14], [-2090, 'trail_reeds', 14], [-1970, 'trail_fern', 15],
    [-1245, 'trail_reeds', 12], [1770, 'trail_fern', 12], [2058, 'trail_reeds', 16], [2385, 'trail_fern', 16]
  ] : [
    ...signs.map(x => [x, 'trail_sign', 33, -1]),
    [altarX + 162, 'trail_arch', 102], [altarX - 97, 'trail_terrace', 47], [altarX + 78, 'trail_stones', 33],
    [-2360, 'trail_stones', 42], [-2200, 'trail_fern', 50], [1705, 'trail_fern', 57],
    [2130, 'trail_reeds', 42], [2300, 'trail_fern', 55], [2450, 'trail_stones', 41]
  ];
  for (const [x, sprite, height, facing = 1] of details) {
    const sx = toScreen(x);
    if (sx > -120 && sx < width + 120) manager?.draw?.(g, sprite, ['idle'], sx, ground + (foreground ? 12 : -1), facing, height, 0);
  }
}

export function drawVillage(g,toScreen,ground,shadow,time,settlement,armyTier,reduceMotion=false) {
  const sm=window.SpriteManager, buildings=[{kind:'hq',x:0,level:settlement.level,h:124},...settlement.homes.map(h=>({...h,kind:'home',h:80}))];
  for(const b of buildings){
    const x=toScreen(b.x),y=ground-6;
    g.fillStyle='#14261a55';g.beginPath();g.ellipse(x,y+2,b.h*.48,5,0,0,Math.PI*2);g.fill();
    if(!sm?.draw?.(g,`building_${b.kind}_${b.level}`,['idle'],x,y,1,b.h,0)){
      g.fillStyle='#9b7b4c';g.fillRect(x-24,y-40,48,40);g.fillStyle='#645431';g.fillRect(x-30,y-48,60,12);
    }
    // Doors glow at night; smoke drifts above occupied roofs.
    if(shadow > .08){const glow=g.createRadialGradient(x,y-8,1,x,y-8,30);glow.addColorStop(0,color([224,168,77],shadow*.42));glow.addColorStop(1,'#e0a84d00');g.fillStyle=glow;g.fillRect(x-30,y-38,60,60);}
    for(let i=0;i<3;i++){const phase=reduceMotion?i/3:(time*.14+i/3)%1;g.globalAlpha=(1-phase)*.16;g.fillStyle=color(blend([229,213,186],[185,188,167],shadow));g.beginPath();g.ellipse(x+18+phase*10,y-b.h*.64-phase*27,3+phase*7,2+phase*5,0,0,Math.PI*2);g.fill();}g.globalAlpha=1;
    // Pottery, planted beds and timber piles give every building a lived-in edge.
    g.fillStyle='#815234';g.fillRect(x+b.h*.37,y-9,8,9);g.fillStyle='#c18c5a';g.fillRect(x+b.h*.37-1,y-9,10,2);
    g.fillStyle='#6d8b4d';for(let k=0;k<3;k++)g.fillRect(x+b.h*.37+2+k*2,y-17+k%2*2,2,8);
    g.fillStyle='#69452f';for(let k=0;k<3;k++)g.fillRect(x-b.h*.4+k*3,y-4-k%2*3,14,3);
  }
  const rack = toScreen(-29);
  g.fillStyle='#3d3022';g.fillRect(rack-12,ground-28,24,25);
  g.fillStyle='#9b7444';g.fillRect(rack-13,ground-27,26,2);g.fillRect(rack-13,ground-5,26,2);
  for (let weapon = 0; weapon < armyTier; weapon++) {
    const x = rack - 8 + weapon * 8;
    g.fillStyle = '#a87843'; g.fillRect(x, ground - 28, 2, 21);
    g.fillStyle = ['#a5b2a5', '#d0d7b6', '#e4c271'][weapon];
    g.fillRect(x - 1, ground - 35, 4, 8); g.fillRect(x, ground - 37, 2, 2);
  }
  if (armyTier > 1) {
    g.fillStyle=armyTier===3?'#d4ad62':'#adbaa5';g.fillRect(rack+4,ground-23,7,8);g.fillRect(rack+5,ground-15,5,2);
    g.fillStyle='#50574a';g.fillRect(rack+6,ground-20,3,4);
  }
  if(sm?.draw?.(g,'landmark_fire',['idle'],toScreen(70),ground,1,16,0))return;
  const x=toScreen(70);g.fillStyle='#5b402a';g.fillRect(x-7,ground-5,14,4);
  g.fillStyle='#d29a50';g.fillRect(x-4,ground-12,8,7);g.fillStyle='#e9c77e';g.fillRect(x-2,ground-16-(reduceMotion?0:Math.round(Math.sin(time*4))),4,9);
}

export function drawConstructionSites(g, toScreen, ground, width, projects) {
  const sizes = { hq: [118, 108], home: [78, 64], wall: [36, 48], farm: [57, 32], rack: [45, 55], altar: [49, 64] };
  for (const job of projects) {
    const x = toScreen(job.x);
    if (x < -80 || x > width + 80) continue;
    const [w, h] = sizes[job.kind];
    if (job.kind !== 'rack') {
      for (const dx of [-w / 2, w / 2]) {
        g.fillStyle = '#624629'; g.fillRect(x + dx - 1, ground - h, 4, h);
        g.fillStyle = '#d2ac6b'; g.fillRect(x + dx, ground - h, 1, h);
        for (let y = 15; y < h; y += 20) { g.fillStyle = '#efe0ae'; g.fillRect(x + dx - 2, ground - y, 5, 2); }
      }
      g.fillStyle = '#a77f49'; g.fillRect(x - w / 2 - 3, ground - h + 7, w + 6, 3);
    }
    g.fillStyle = '#12241d'; g.fillRect(x - 24, ground - h - 12, 48, 5);
    g.fillStyle = '#dbb879'; g.fillRect(x - 23, ground - h - 11, 46 * job.progress, 3);
    g.fillStyle = '#efdcac'; g.font = '7px monospace'; g.textAlign = 'center';
    g.fillText(job.kind === 'rack' ? 'FORJANDO' : 'EN OBRA', x, ground - h - 17);
  }
}

export function drawToolStand(g,x,ground,rack,tier){
  if(window.SpriteManager?.has('station_'+rack.role)){
    g.fillStyle='#0c1f1755';g.beginPath();g.ellipse(x,ground+1,25,3,0,0,Math.PI*2);g.fill();
    window.SpriteManager.draw(g,'station_'+rack.role,['idle'],x,ground,1,54,0);
    if(tier>1){g.fillStyle=tier===3?'#d3b76c':'#67885b';g.fillRect(x+18,ground-40,4,13);}
    return;
  }
  g.fillStyle='#8b603c';g.fillRect(x-17,ground-32,3,32);g.fillRect(x+14,ground-32,3,32);g.fillRect(x-19,ground-31,38,4);
  g.fillStyle='#c09b67';g.fillRect(x-17,ground-31,1,29);g.fillRect(x-19,ground-31,38,1);
  g.fillStyle='#423829';g.fillRect(x-19,ground-6,38,3);g.fillStyle='#a98e5d';g.fillRect(x-19,ground-8,38,2);
  const metal=tier===3?'#d9ba67':tier===2?'#c5c9b7':'#9dafa7';
  for(let i=0;i<Math.min(4,rack.stock);i++){
    const tx=x-12+i*8;g.fillStyle='#c3a170';g.fillRect(tx,ground-25,2,24);g.fillStyle=metal;
    if(['LENADOR','CONSTRUCTOR','MINERO','AGRICULTOR'].includes(rack.role)){
      if(rack.role==='LENADOR'){g.fillRect(tx-4,ground-26,6,7);g.fillRect(tx-5,ground-24,2,4);}
      else if(rack.role==='CONSTRUCTOR'){g.fillRect(tx-4,ground-26,9,4);g.fillStyle='#6e7164';g.fillRect(tx-4,ground-26,2,4);}
      else if(rack.role==='MINERO'){g.fillRect(tx-5,ground-26,12,2);g.fillRect(tx-6,ground-25,2,3);g.fillRect(tx+5,ground-25,2,3);}
      else{g.fillRect(tx-4,ground-27,5,2);g.fillRect(tx-4,ground-27,2,5);}
    }else if(['ARQUERO','CAZADOR'].includes(rack.role)){
      g.strokeStyle='#d1b278';g.lineWidth=1;g.beginPath();g.moveTo(tx,ground-28);g.quadraticCurveTo(tx+10,ground-15,tx,ground-3);g.stroke();g.strokeStyle='#d1c9a0';g.beginPath();g.moveTo(tx,ground-28);g.lineTo(tx,ground-3);g.stroke();
    }else{g.beginPath();g.moveTo(tx-2,ground-25);g.lineTo(tx+1,ground-32);g.lineTo(tx+4,ground-25);g.fill();if(rack.role==='ESPADACHIN')g.fillRect(tx-2,ground-17,7,2);}
  }
  // An empty rack keeps its hooks, so depleted equipment remains legible.
  if(!rack.stock){g.fillStyle='#a1a190';for(const dx of [-10,0,10])g.fillRect(x+dx,ground-29,1,4);}
}

export function drawFortification(g,x,ground,wall,time){
  const cls=wall.hp<=0?'fortification_ruin':'fortification_'+wall.level;
  if(window.SpriteManager?.has(cls)){
    const h=wall.hp<=0?28:[0,54,64,70,76,86][wall.level];
    window.SpriteManager.draw(g,cls,['idle'],x,ground,1,h,0);
    if(wall.hp>0&&wall.hp<wall.maxHp){g.fillStyle='#15251d';g.fillRect(x-15,ground-h-7,30,3);g.fillStyle=wall.hp/wall.maxHp<.3?'#c48763':'#aebd7c';g.fillRect(x-14,ground-h-6,28*wall.hp/wall.maxHp,1);}
    return;
  }
  const h=28+wall.level*9,w=wall.level>=3?28:22,stone=wall.level>=4;
  if(stone||wall.level===3){
    g.fillStyle=stone?('#b5ad8c'):'#a18659';g.fillRect(x-w/2,ground-h,w,h);
    g.strokeStyle=stone?'#696850':'#7f6540';g.lineWidth=1;
    for(let y=8;y<h;y+=9){g.beginPath();g.moveTo(x-w/2,ground-y);g.lineTo(x+w/2,ground-y);g.stroke();for(let k=-1;k<=1;k++)g.fillRect(x+k*10+(y%2?0:4),ground-y,1,8);}
    g.fillStyle=stone?'#d1c29a':'#705137';for(let dx=-w/2;dx<w/2;dx+=9)g.fillRect(x+dx,ground-h-5,6,6);
  }else{
    for(let dx=-10;dx<=10;dx+=5){g.fillStyle='#976a3e';g.fillRect(x+dx,ground-h,4,h);g.fillStyle='#c09a60';g.fillRect(x+dx,ground-h,1,h);g.fillStyle='#bd9761';g.beginPath();g.moveTo(x+dx,ground-h);g.lineTo(x+dx+2,ground-h-5);g.lineTo(x+dx+4,ground-h);g.fill();}
    g.fillStyle='#4b3a2c';g.fillRect(x-12,ground-h+12,26,3);if(wall.level===2)g.fillRect(x-12,ground-13,26,3);
  }
  if(wall.level>=2){g.fillStyle='#ad9566';g.fillRect(x+9,ground-h-24,1,25);g.fillStyle=wall.level>=5?'#dec27d':'#3e735a';for(let k=0;k<4;k++)g.fillRect(x+10+k*3,ground-h-24+Math.round(Math.sin(time*2-k*.6)),3,9);}
  if(wall.hp/wall.maxHp<.6){g.strokeStyle='#3b332a';g.beginPath();g.moveTo(x-2,ground-h+8);g.lineTo(x+4,ground-h+20);g.lineTo(x-1,ground-h+30);g.stroke();}
}

export function drawHacienda(g, x, ground, destroyed) {
  if (destroyed) {
    g.fillStyle = '#382e29'; g.fillRect(x - 37, ground - 12, 74, 12);
    g.fillStyle = '#675343';
    for (let i = 0; i < 6; i++) g.fillRect(x - 35 + i * 12, ground - 7 - i % 3 * 5, 9, 6);
    g.fillStyle = '#91b28c'; g.fillRect(x - 2, ground - 31, 2, 25); g.fillRect(x, ground - 31, 18, 9);
    return;
  }
  const plaster = ['#c7a97b', '#e2c79a', '#a48259'];
  g.fillStyle = '#463b2b'; g.fillRect(x - 43, ground - 57, 88, 57);
  g.fillStyle = plaster[0]; g.fillRect(x - 41, ground - 57, 81, 52);
  for (let i = 0; i < 38; i++) {
    g.fillStyle = plaster[i % 3];
    g.fillRect(x - 39 + i * 17 % 78, ground - 50 + i * 11 % 46, 2 + i % 6, 1 + i % 2);
  }
  g.fillStyle = plaster[2]; g.fillRect(x - 42, ground - 54, 85, 4);
  const tiles = ['#ba784f', '#97573c', '#6f3e2f'];
  for (let row = 0; row < 6; row++) {
    const left = x - 49 + row * 3;
    const width = 101 - row * 6;
    const top = ground - 58 - row * 4;
    g.fillStyle = tiles[2]; g.fillRect(left, top, width, 5);
    for (let col = row % 2 * 3; col < width - 2; col += 6) {
      g.fillStyle = tiles[(col + row) % 3 === 0 ? 1 : 0];
      g.fillRect(left + col, top, Math.min(5, width - col), 3);
    }
  }
  g.fillStyle = '#4a3b2a'; g.fillRect(x - 44, ground - 55, 88, 3);
  for (const dx of [-26, 26]) {
    const sx = x + dx;
    g.fillStyle = plaster[1]; g.fillRect(sx - 8, ground - 49, 16, 17);
    g.fillStyle = '#302d24'; g.fillRect(sx - 6, ground - 47, 12, 13);
    g.fillStyle = '#856746'; g.fillRect(sx - 1, ground - 47, 2, 13); g.fillRect(sx - 6, ground - 43, 12, 1);
    g.fillStyle = '#6d5138'; g.fillRect(sx - 8, ground - 33, 16, 2);
  }
  g.fillStyle = plaster[1]; g.fillRect(x - 11, ground - 39, 22, 39);
  g.fillStyle = '#533e2a'; g.fillRect(x - 9, ground - 35, 18, 35);
  for (let i = -7; i < 9; i += 4) {
    g.fillStyle = '#785438'; g.fillRect(x + i, ground - 33, 2, 29);
  }
  for (let i = -43; i < 44; i += 9) {
    g.fillStyle = plaster[2]; g.fillRect(x + i, ground - 6, 8, 4);
    g.fillStyle = plaster[1]; g.fillRect(x + i, ground - 6, 6, 1);
  }
  g.fillStyle = '#6e573e'; g.fillRect(x + 29, ground - 94, 3, 31);
  g.fillStyle = '#b49b6d'; g.fillRect(x + 30, ground - 94, 1, 27);
  g.fillStyle = '#87574b'; g.fillRect(x + 32, ground - 92, 17, 11);
  g.fillStyle = '#d6ab70'; g.fillRect(x + 33, ground - 91, 14, 1); g.fillRect(x + 33, ground - 83, 14, 1);
}

export function drawMarker(g, x, ground, entity, enemy = false) {
  g.fillStyle = enemy ? '#8b4a3b88' : '#346d5688';
  g.fillRect(x - 9, ground - 1, 18, 2);
  if (enemy) {
    g.fillStyle = '#db9678'; g.fillRect(x - 2, ground + 2, 4, 2);
    if (entity.windupTimer > 0) {
      const progress = 1 - entity.windupTimer / (entity.windupTotal || 1);
      g.strokeStyle = '#e3a987'; g.lineWidth = 1;
      g.strokeRect(x - 18, ground - 5, 36, 5);
      g.fillStyle = '#cd7663'; g.fillRect(x - 17, ground - 4, 34 * progress, 3);
      g.fillStyle = '#f1cba0'; g.fillRect(x - 1, ground - (entity.isBoss ? 73 : 54), 2, 7);
      g.fillRect(x - 1, ground - (entity.isBoss ? 64 : 45), 2, 2);
    }
  }
  if (entity.hp < entity.maxHp) {
    const y = ground - (entity.isBoss ? 68 : 48);
    g.fillStyle = '#11201b'; g.fillRect(x - 12, y, 24, 3);
    g.fillStyle = enemy ? '#d18c72' : '#8ebe98'; g.fillRect(x - 12, y, Math.max(0, 24 * entity.hp / entity.maxHp), 2);
  }
}

export function drawRoadGate(g,x,ground,side,active=false){
  if(window.SpriteManager?.draw?.(g,'landmark_gate',['idle'],x,ground,1,89,0)){
    if(active){g.fillStyle='#d6b877';g.fillRect(x-2,ground-98,4,6);g.fillRect(x-2,ground-89,4,2);}return;
  }
  g.fillStyle='#6d5b43';g.fillRect(x-28,ground-64,10,64);g.fillRect(x+18,ground-64,10,64);
  g.fillStyle='#a28d61';g.fillRect(x-31,ground-68,62,9);
  g.fillStyle='#18231d';g.fillRect(x-18,ground-57,36,57);
  g.fillStyle='#776242';g.fillRect(x-12,ground-2,24,2);
  g.fillStyle=active?'#cf8460':'#8d947b';g.fillRect(x+side*29,ground-89,side*18,11);
  g.fillStyle='#ad9c70';g.fillRect(x+side*28,ground-91,2,29);
  g.fillStyle='#8f8a6a';g.font='6px monospace';g.textAlign='center';g.fillText(side<0?'A CARTAGENA':'CAMINO ORIENTAL',x,ground-75);
}

export function drawPersonStory(g,x,ground,unit,showSpeech=false){
  const colors={strength:'#d4a575',endurance:'#a4bd85',perception:'#91b9b0',dexterity:'#b7a4ce',cultivation:'#89b87b'};
  g.fillStyle=colors[unit.gift]??'#b1b69b';g.fillRect(x-1,ground+2,3,2);
  if(unit.tier>1){g.fillStyle=unit.tier===3?'#e6c486':'#b5c4c2';g.fillRect(x-3,ground+5,6,1);}
  if(showSpeech&&unit.speechTimer>0){
    const line=unit.speech.slice(0,38),width=Math.min(220,g.measureText(line).width+12);
    g.fillStyle='#0c1b17ed';g.fillRect(x-width/2,ground-72,width,16);
    g.fillStyle='#d5c6a3';g.font='7px monospace';g.textAlign='center';g.fillText(line,x,ground-61);
  }else if(showSpeech&&unit.name){
    g.fillStyle='#e2d3b0';g.font='7px monospace';g.textAlign='center';g.fillText(unit.name,x,ground-52);
  }
}

export function drawStreams(g,toScreen,ground,streams,time,reduceMotion=false){
  const sm=window.SpriteManager;
  for(const [index,creek]of streams.entries()){
    const x=toScreen(creek.x);
    sm?.draw?.(g,index?'habitat_bridge':'habitat_cascade',['idle'],x,ground+5,1,84,0);
    sm?.draw?.(g,'habitat_fishing',['idle'],x+37,ground+9,1,35,0);
    sm?.draw?.(g,'habitat_log',['idle'],x-75,ground,1,31,0);
    sm?.draw?.(g,'habitat_fruit',['idle'],x+110,ground,1,39,0);
    g.fillStyle='#285f64';g.fillRect(x-8,ground+6,18,16);g.fillStyle='#3e9391';g.fillRect(x-6,ground+7,12,16);
    for(let i=0;i<11;i++){
      const flow=reduceMotion?i*2:(time*19+i*5)%23;
      g.fillStyle=i%2?'#9acdc0':'#70b9ac';g.fillRect(Math.round(x-6+(i*7)%12),Math.round(ground+flow),2+i%3,1);
    }
    for(let i=0;i<creek.fishStock;i++){
      const fx=x-13+Math.sin(time*.9+i*2)*10,fy=ground-4+i*3;
      g.fillStyle='#184f57';g.fillRect(Math.round(fx),Math.round(fy),4,1);g.fillRect(Math.round(fx-1),Math.round(fy-1),1,3);
    }
  }
}
