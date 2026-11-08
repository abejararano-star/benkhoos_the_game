export function bindInput({ keys, isPlaying, attack, interact, useSkill, toggleArmor, togglePause, save, load, toggleArmy, toggleFullscreen, rest, torch, inspectNpc, openSettlement, toggleMap, toggleArmory }) {
  const clear = () => { for (const key of Object.keys(keys)) delete keys[key]; };
  const down = e => {
    const globalKeys = ['F5', 'F9', 'F11', 'Escape'];
    if (globalKeys.includes(e.code)) e.preventDefault();
    if (e.repeat && !['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'KeyS', 'ArrowDown'].includes(e.code)) return;
    if (e.code === 'Escape') { togglePause(); return; }
    if (e.code === 'F5') { save(); return; }
    if (e.code === 'F9') { load(); return; }
    if (e.code === 'F11') { toggleFullscreen(); return; }
    if (e.code === 'KeyM' && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) && toggleMap?.(isPlaying())) { e.preventDefault(); return; }
    if (e.code === 'KeyG' && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) && toggleArmory?.(isPlaying())) { e.preventDefault(); return; }
    if (!isPlaying()) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)) return;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.code === 'Tab') { toggleArmy(); return; }
    keys[e.code] = true;
    if (['Space', 'KeyJ'].includes(e.code)) attack();
    if (['KeyE', 'KeyW', 'ArrowUp'].includes(e.code)) interact();
    if (e.code === 'KeyC') toggleArmor();
    if (e.code === 'KeyB') openSettlement?.();
    if (e.code === 'KeyF') inspectNpc?.();
    if (e.code === 'KeyR') rest();
    if (e.code === 'KeyT') torch();
    if (/^Digit[1-4]$/.test(e.code)) useSkill(['dash', 'ceiba', 'roar', 'jaguar'][Number(e.code.slice(-1)) - 1]);
  };
  const up = e => { delete keys[e.code]; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  const blur = () => { clear(); if (isPlaying()) togglePause(); };
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', () => { if (document.hidden) blur(); });
  return { clear };
}
