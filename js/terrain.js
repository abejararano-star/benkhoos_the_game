// Native pixel scenery shares the ochre/forest palette of the character atlases.
export function drawLandscape(g, width, ground, camera, night, time) {
  for (let layer = 0; layer < 3; layer++) {
    const span = 240 - layer * 35;
    const offset = ((camera * (.12 + layer * .12)) % span + span) % span;
    g.fillStyle = night ? ['#202f36','#263c3c','#29463f'][layer] : ['#8b9894','#6e8980','#4c7263'][layer];
    g.beginPath(); g.moveTo(-span, ground);
    for (let i = -2; i < Math.ceil(width / span) + 3; i++) {
      const x = i * span - offset;
      const h = 40 + layer * 13 + ((i * 17 + layer * 31) & 31);
      g.lineTo(x, ground - h); g.lineTo(x + span * .24, ground - h - 16);
      g.lineTo(x + span * .46, ground - h - 9); g.lineTo(x + span * .7, ground - h + 16);
    }
    g.lineTo(width + span, ground); g.closePath(); g.fill();
  }
  for (let i = -3; i < Math.ceil(width / 65) + 4; i++) {
    const x = Math.round(i * 65 - ((camera * .45) % 65 + 65) % 65);
    const h = 36 + ((i * 13) & 15);
    g.fillStyle = night ? '#17372f' : '#345e44';
    g.fillRect(x, ground - h, 3, h);
    for (let k = -2; k <= 2; k++) {
      g.fillRect(x - 20 + k * 5, ground - h - 4 + Math.abs(k) * 3, 30, 5);
    }
  }
  // Sparse fireflies are intentionally gentle, not strobing.
  if (night) {
    g.fillStyle = '#d6d793';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 137 - camera * .7 + Math.sin(time + i) * 12) % width + width) % width;
      g.globalAlpha = .25 + .3 * (1 + Math.sin(time * .7 + i)) / 2;
      g.fillRect(Math.round(x), ground - 20 - (i * 31 % 65), 1, 1);
    }
    g.globalAlpha = 1;
  }
}

export function drawVillage(g, toScreen, ground, night, time) {
  for (const [worldX, size] of [[-255,1],[185,.85],[420,.7]]) {
    const x = toScreen(worldX), w = Math.round(43 * size), h = Math.round(31 * size);
    g.fillStyle = night ? '#413826' : '#a27a48';
    g.fillRect(x - w / 2, ground - h, w, h);
    g.fillStyle = night ? '#272b20' : '#5b6c3d';
    for (let k = 0; k < 8; k++) g.fillRect(x - w / 2 - 6 + k * 2, ground - h - k * 2, w + 12 - k * 4, 3);
    g.fillStyle = '#332c20'; g.fillRect(x - 5, ground - 18 * size, 10, 18 * size);
    g.fillStyle = night ? '#d5a85e' : '#d8b77a';
    g.fillRect(x - w / 2 + 5, ground - h + 10, 6, 6);
    for (let k = 0; k < 4; k++) { g.fillStyle = '#87643c'; g.fillRect(x - w / 2 + k * 10, ground - 3, 7, 2); }
    g.fillStyle = '#65492d'; g.fillRect(x + w / 2 + 3, ground - 8, 7, 8);
    g.fillStyle = '#c5a266'; g.fillRect(x + w / 2 + 4, ground - 10, 5, 2);
  }
  // Warm altar fire with a pixel silhouette and restrained motion.
  const x = toScreen(0);
  g.fillStyle = '#5b402a'; g.fillRect(x - 7, ground - 5, 14, 4);
  g.fillStyle = '#d29a50'; g.fillRect(x - 4, ground - 12, 8, 7);
  g.fillStyle = '#e9c77e'; g.fillRect(x - 2, ground - 16 - Math.round(Math.sin(time * 4)), 4, 9);
}

export function drawHacienda(g, x, ground, destroyed, night) {
  if (destroyed) {
    g.fillStyle = '#382e29'; g.fillRect(x - 37, ground - 12, 74, 12);
    g.fillStyle = '#675343';
    for (let i = 0; i < 6; i++) g.fillRect(x - 35 + i * 12, ground - 7 - i % 3 * 5, 9, 6);
    g.fillStyle = '#91b28c'; g.fillRect(x - 2, ground - 31, 2, 25); g.fillRect(x, ground - 31, 18, 9);
    return;
  }
  g.fillStyle = night ? '#77695a' : '#d3bd94'; g.fillRect(x - 38, ground - 58, 76, 58);
  g.fillStyle = night ? '#633d35' : '#965440';
  for (let k = 0; k < 5; k++) g.fillRect(x - 43 + k * 4, ground - 62 - k * 3, 86 - k * 8, 4);
  g.fillStyle = '#443c2f'; g.fillRect(x - 7, ground - 28, 14, 28);
  for (const dx of [-27,-15,15,27]) {
    g.fillStyle = '#5b5946'; g.fillRect(x + dx - 3, ground - 47, 7, 12);
    g.fillStyle = '#c5a56e'; g.fillRect(x + dx, ground - 47, 1, 12);
  }
  g.fillStyle = '#aa926e'; g.fillRect(x - 38, ground - 8, 76, 3);
  g.fillStyle = '#af6953'; g.fillRect(x + 30, ground - 88, 15, 10);
  g.fillStyle = '#b5aa88'; g.fillRect(x + 29, ground - 90, 2, 30);
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
