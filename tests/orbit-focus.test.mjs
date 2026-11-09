import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const helper = html.slice(html.indexOf('function setFlightControlAvailable('), html.indexOf('const obBanner='));
const orbit = html.slice(html.indexOf('function enterOrbit(W)'), html.indexOf('window.coeBreakOrbit='));
const keys = html.slice(html.indexOf("addEventListener('keydown',e=>{", html.indexOf('const KEYS=')), html.indexOf("addEventListener('keyup'", html.indexOf('const KEYS=')));

function fixture() {
  const document = { activeElement: null, getElementById: id => nodes[id] };
  const control = () => { const b = { contains: e => e === b, inert: false, tabIndex: 0, closest: () => b }; return b; };
  const galaxy = control(), eject = control();
  const nodes = { 'ob-eject': eject, 'ob-title': {}, 'orbit-banner': { classList: { add() {}, remove() {} } } };
  const cv = { closest: () => null, focus() { document.activeElement = cv; } };
  const VD = { mode: 'fly', pos: [0, 0, 110], sp: 46 };
  const KEYS = { Enter: 0, Space: 0 };
  let onKey, mapOpens = 0;
  const context = vm.createContext({ document, cv, VD, KEYS, AUTOPILOT: {}, labels: [galaxy], performance: { now: () => 1000 },
    window: {}, hudShow() {}, mapModal: { classList: { contains: () => false } },
    openMap() { mapOpens++; }, closeMap() {}, addEventListener(k, f) { onKey = f; } });
  vm.runInContext(helper + orbit + keys, context);
  const key = code => onKey({ code, key: code === 'Space' ? ' ' : code, target: document.activeElement, preventDefault() {} });
  const W = { id: 'test', name: 'Test', pos: [0, 0, -100], radius: 20 };
  return { context, document, cv, galaxy, eject, VD, key, W, mapOpens: () => mapOpens };
}

test('hidden controls leave focus on the flight surface and become untabbable', () => {
  const f = fixture(); f.document.activeElement = f.galaxy;
  f.context.setFlightControlAvailable(f.galaxy, false);
  assert.equal(f.document.activeElement, f.cv);
  assert.equal(f.cv.tabIndex, -1);
  assert.equal(f.galaxy.inert, true); assert.equal(f.galaxy.tabIndex, -1);
  f.context.setFlightControlAvailable(f.galaxy, true);
  assert.equal(f.galaxy.inert, false); assert.equal(f.galaxy.tabIndex, 0);
});

test('entering orbit clears focused galaxy label so Space still exits orbit', () => {
  const f = fixture(); f.document.activeElement = f.galaxy;
  f.context.enterOrbit(f.W);
  assert.equal(f.document.activeElement, f.cv);
  assert.equal(f.galaxy.inert, true); assert.equal(f.eject.inert, false);
  assert.equal(f.VD.mode, 'orbit');
  f.key('Space');
  assert.equal(f.VD.mode, 'fly');
  assert.equal(f.eject.inert, true);
});

test('ejecting clears hidden button focus so Enter still opens the map', () => {
  const f = fixture(); f.context.enterOrbit(f.W);
  f.document.activeElement = f.eject;
  f.context.breakOrbit();
  assert.equal(f.document.activeElement, f.cv);
  assert.equal(f.eject.inert, true); assert.equal(f.eject.tabIndex, -1);
  f.key('Enter'); assert.equal(f.mapOpens(), 1);
});

test('available native buttons retain activation keys without triggering flight shortcuts', () => {
  const f = fixture(); f.document.activeElement = f.galaxy;
  f.key('Enter'); assert.equal(f.mapOpens(), 0);
});

test('availability follows the existing label hit threshold with no opacity change', () => {
  assert.match(html, /setFlightControlAvailable\(b,op>\.45\);b.style.opacity=op.toFixed\(3\);b.style.pointerEvents=op>\.45\?'auto':'none'/);
  assert.match(html, /b.className='vlabel';setFlightControlAvailable\(b,false\);/);
  assert.match(html, /setFlightControlAvailable\(document.getElementById\('ob-eject'\),false\);/);
});
