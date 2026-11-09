import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('function updateHudAccess(dt)'), html.indexOf('\nconst AUTOPILOT='));

function fixture() {
  const events = {};
  const classes = new Set();
  const document = { activeElement: null };
  const mapControl = { inert: true, tabIndex: -1, contains: e => e === mapControl, setAttribute() {} };
  const hudEl = {
    contains: e => e === mapControl,
    classList: { contains: c => classes.has(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c) },
    addEventListener: (k, f) => { events['hud:' + k] = f; },
  };
  const cv = { focus() { document.activeElement = cv; }, addEventListener(k, f) { events[k] = f; } };
  const VD = { mode: 'front', hudTimer: 4, hudHover: false };
  const hudShow = () => { VD.hudTimer = 4; classes.add('active'); };
  const context = vm.createContext({ document, VD, hudEl, mapControl, cv, hudShow });
  vm.runInContext(source, context);
  return { VD, cv, document, mapControl, classes, hudShow, events, tick: context.updateHudAccess };
}

test('map entry is excluded before flight and after HUD expiry', () => {
  const f = fixture();
  f.tick(1);
  assert.equal(f.mapControl.tabIndex, -1);
  assert.equal(f.mapControl.inert, true);
  f.VD.mode = 'fly'; f.hudShow(); f.tick(0);
  assert.equal(f.mapControl.tabIndex, 0);
  f.tick(4.1);
  assert.equal(f.classes.has('active'), false);
  assert.equal(f.mapControl.tabIndex, -1);
  assert.equal(f.mapControl.inert, true);
});

test('HUD stays visible while focused and resumes its existing timeout afterward', () => {
  const f = fixture();
  f.VD.mode = 'fly'; f.hudShow(); f.tick(0);
  f.document.activeElement = f.mapControl;
  f.events['hud:focusin']();
  f.tick(10);
  assert.equal(f.classes.has('active'), true);
  assert.equal(f.VD.hudTimer, 4);
  f.document.activeElement = f.cv;
  f.tick(4.1);
  assert.equal(f.classes.has('active'), false);
});

test('leaving flight removes stale HUD focus before making map entry inert', () => {
  const f = fixture();
  f.VD.mode = 'fly'; f.hudShow(); f.tick(0);
  f.document.activeElement = f.mapControl;
  f.VD.mode = 'orbit'; f.tick(0);
  assert.equal(f.document.activeElement, f.cv);
  assert.equal(f.mapControl.inert, true);
  assert.equal(f.mapControl.tabIndex, -1);
});

test('touch wakes expired flight HUD without consuming the event or opening the map', () => {
  const f = fixture();
  f.VD.mode = 'fly'; f.tick(5);
  f.events.pointerdown({ pointerType: 'touch', preventDefault() { assert.fail('touch consumed'); } });
  f.tick(0);
  assert.equal(f.classes.has('active'), true);
  assert.equal(f.mapControl.tabIndex, 0);
  assert.equal(f.VD.hudTimer, 4);
});

test('mouse input and touches outside flight do not reset the HUD timer', () => {
  const f = fixture();
  f.VD.hudTimer = 0;
  f.events.pointerdown({ pointerType: 'touch' });
  assert.equal(f.VD.hudTimer, 0);
  f.VD.mode = 'fly';
  f.events.pointerdown({ pointerType: 'mouse' });
  assert.equal(f.VD.hudTimer, 0);
});

test('inactive map entry leaves Space unhandled; flight activation remains single-shot', () => {
  const VD = { mode: 'orbit' }; let clicks = 0;
  const mapControl = { onclick() { clicks++; } };
  const handler = html.match(/mapControl.onkeydown=e=>\{([\s\S]*?)\n\};/)[1];
  const context = vm.createContext({ VD, mapControl });
  vm.runInContext('function key(e){' + handler + '}', context);
  const e = { key: ' ', repeat: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
  context.key(e);
  assert.equal(e.prevented, undefined); assert.equal(clicks, 0);
  VD.mode = 'fly'; context.key(e);
  assert.equal(e.prevented, true); assert.equal(e.stopped, true); assert.equal(clicks, 1);
});

test('HUD availability is updated on every scene tick, including non-flight modes', () => {
  assert.match(html, /function voidTick\(t,dt\)\{updateHudAccess\(dt\);/);
});
