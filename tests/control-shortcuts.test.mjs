import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const path = process.env.SITE_HTML || fileURLToPath(new URL('../site/index.html', import.meta.url));
const html = await readFile(path, 'utf8');
const start = html.indexOf("addEventListener('keydown',e=>{");
const end = html.indexOf("addEventListener('pointermove'", start);
assert.ok(start >= 0 && end > start);

// Minimal closest() doubles model control ancestry. Native selector matching
// and default keyboard actions require the separate browser smoke check.
function target(tag = '', role = '', editable = false) {
  return { closest(selector) {
    if (editable && selector.includes('[contenteditable]')) return this;
    if (tag && selector.split(',').includes(tag)) return this;
    if (tag === 'a' && selector.includes('a[href]')) return this;
    if (role && selector.includes(`[role="${role}"]`)) return this;
    return null;
  } };
}

function fixture() {
  const handlers = {};
  const keys = Object.fromEntries(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyX', 'Enter', 'Meta', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'Space'].map(key => [key, 0]));
  const state = { mode: 'fly', sp: 46, warp: 0 };
  const autopilot = { active: true };
  const calls = { hud: 0, open: 0, close: 0, orbit: 0 };
  let mapOpen = false;
  const listen = (name, handler) => { handlers[name] = handler; };
  vm.runInNewContext(html.slice(start, end), {
    addEventListener: listen, window: { addEventListener: listen },
    KEYS: keys, VD: state, AUTOPILOT: autopilot,
    lastTapXTime: 0, lightspeedEngaged: false, performance: { now: () => 1000 },
    hudShow() { calls.hud++; },
    mapModal: { classList: { contains: () => mapOpen } },
    openMap() { mapOpen = true; calls.open++; },
    closeMap() { mapOpen = false; calls.close++; },
    breakOrbit() { calls.orbit++; },
  });
  const press = (code, focused = target(), extra = {}) => {
    const event = { code, key: code === 'Space' ? ' ' : code, target: focused,
      defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    handlers.keydown(event);
    return event;
  };
  return { keys, state, autopilot, calls, handlers, press };
}

for (const tag of ['input', 'textarea', 'select']) {
  test(`${tag} keyboard input does not steer, brake, open the map, or lose default handling`, () => {
    const f = fixture();
    for (const code of ['ArrowDown', 'ArrowRight', 'KeyX', 'Enter', 'Space']) {
      const e = f.press(code, target(tag), { metaKey: code === 'KeyX' });
      assert.equal(e.defaultPrevented, false);
    }
    assert.ok(Object.values(f.keys).every(value => value === 0));
    assert.equal(f.state.sp, 46);
    assert.equal(f.autopilot.active, true);
    assert.deepEqual(f.calls, { hud: 0, open: 0, close: 0, orbit: 0 });
  });
}

test('nested contenteditable descendants retain their editing keys', () => {
  const f = fixture();
  const e = f.press('KeyX', target('span', '', true), { metaKey: true });
  assert.equal(e.defaultPrevented, false);
  assert.equal(f.state.sp, 46);
  assert.equal(f.keys.KeyX, 0);
});

for (const [name, focused] of [['button', target('button')], ['link', target('a')], ['ARIA button', target('span', 'button')], ['ARIA radio', target('span', 'radio')], ['ARIA link', target('span', 'link')]]) {
  test(`${name} activation keys bypass flight handling`, () => {
    const f = fixture();
    f.state.mode = 'orbit';
    for (const code of ['Enter', 'Space']) assert.equal(f.press(code, focused).defaultPrevented, false);
    assert.equal(f.keys.Enter, 0);
    assert.equal(f.keys.Space, 0);
    assert.equal(f.calls.open, 0);
    assert.equal(f.calls.orbit, 0);
  });
}

test('a widget-handled event is respected even after focus has moved', () => {
  const f = fixture();
  f.press('Enter', target(), { defaultPrevented: true });
  assert.equal(f.calls.open, 0);
  assert.equal(f.keys.Enter, 0);
});

test('flight arrows remain available outside editing controls, including focused galaxy buttons', () => {
  const f = fixture();
  f.press('ArrowLeft', target('button'));
  assert.equal(f.keys.ArrowLeft, 1);
  assert.equal(f.calls.hud, 1);
});

test('ordinary canvas Enter still toggles the map and orbit Space still exits orbit', () => {
  const f = fixture();
  assert.equal(f.press('Enter', target('canvas')).defaultPrevented, true);
  assert.equal(f.calls.open, 1);
  f.press('Enter', target('canvas'));
  assert.equal(f.calls.close, 1);
  f.state.mode = 'orbit';
  assert.equal(f.press('Space', target('canvas')).defaultPrevented, true);
  assert.equal(f.calls.orbit, 1);
});

test('flight brake remains available outside controls', () => {
  const f = fixture();
  assert.equal(f.press('KeyX', target('canvas'), { metaKey: true }).defaultPrevented, true);
  assert.equal(f.state.sp, 0);
  assert.equal(f.autopilot.active, false);
});

test('keyup over a control releases a flight key pressed before focus moved', () => {
  const f = fixture();
  f.press('ArrowLeft', target('canvas'));
  f.handlers.keyup({ code: 'ArrowLeft', key: 'ArrowLeft', target: target('input') });
  assert.equal(f.keys.ArrowLeft, 0);
});

test('window blur still releases every held flight key', () => {
  const f = fixture();
  f.press('ArrowLeft');
  f.press('KeyX');
  f.handlers.blur();
  assert.ok(Object.values(f.keys).every(value => value === 0));
});
