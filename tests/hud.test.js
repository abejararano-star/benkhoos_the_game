import test from 'node:test';
import assert from 'node:assert/strict';
import { createHud } from '../js/hud.js';

function setup(t, storedMode) {
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, {
        dataset: {}, textContent: '', addEventListener() {},
        classList: { contains: key => classes.has(key), toggle(key, on) { if (on) classes.add(key); else classes.delete(key); } },
        setAttribute(key, value) { this[key] = value; }
      });
    }
    return nodes.get(id);
  };
  const storage = new Map([['benkhoos.hudMode', storedMode]]);
  globalThis.window = { localStorage: { getItem: key => storage.get(key), setItem: (key, val) => storage.set(key, val) } };
  globalThis.document = { getElementById: get, body: get('body') };
  t.after(() => { delete globalThis.window; delete globalThis.document; });
  const session = { mode: 'playing' };
  const state = { benkos: { x: 0 }, resources: {}, campaign: { orders: [] }, enemies: [] };
  const hud = createHud({ state, session, actions: {}, resume() { session.mode = 'playing'; } });
  return { hud, session, get, storage };
}

test('HUD defaults to minimal and persists the three selectable views', t => {
  const { hud, get, storage } = setup(t, 'invalid');
  for (const expected of ['minimal', 'full', 'clean']) {
    assert.equal(hud.mode(), expected);
    hud.update();
    assert.equal(get('hudExitHint').textContent.includes('Pulsa H'), expected === 'clean');
    hud.cycle();
  }
  hud.update();
  assert.equal(get('hudExitHint').textContent, '');
  assert.equal(storage.get('benkhoos.hudMode'), 'minimal');
});

test('photo mode explains how to resume and preserves the selected HUD', t => {
  const { hud, session, get } = setup(t, 'full');
  hud.photo();
  assert.equal(session.mode, 'photo');
  assert.match(get('hudExitHint').textContent, /P o Esc/);
  hud.photo();
  assert.equal(session.mode, 'playing');
  assert.equal(hud.isPhoto(), false);
  assert.equal(get('hudExitHint').textContent, '');
  assert.equal(hud.mode(), 'full');
});

test('holding and releasing the objective updates its accessible expanded state', t => {
  const { hud, get } = setup(t);
  hud.hold(true);
  assert.equal(get('btnObjective')['aria-expanded'], 'true');
  hud.hold(false);
  assert.equal(get('btnObjective')['aria-expanded'], 'false');
});
