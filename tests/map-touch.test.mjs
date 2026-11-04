import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// The browser module has no dependencies. Import its exact bytes without
// changing the repository's CommonJS defaults or adding a package manifest.
const moduleSource = await readFile(new URL('../site/map-touch.js', import.meta.url), 'utf8');
const { mountMapTouch } = await import('data:text/javascript;base64,' + Buffer.from(moduleSource).toString('base64'));
const point = (x, y, identifier = 1) => ({ clientX: x, clientY: y, identifier });

function fixture() {
  const listeners = new Map();
  const options = new Map();
  const deltas = [];
  const canvas = {
    style: { touchAction: 'auto' },
    addEventListener(type, listener, option) { listeners.set(type, listener); options.set(type, option); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  const api = mountMapTouch(canvas, (dx, dy) => deltas.push([dx, dy]));
  function send(type, touches = []) {
    const event = { touches, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    listeners.get(type)?.(event);
    return event;
  }
  return { api, canvas, listeners, options, deltas, send };
}

test('tap jitter retains default selection behavior and does not rotate the map', () => {
  const f = fixture();
  assert.equal(f.send('touchstart', [point(20, 30)]).defaultPrevented, false);
  assert.equal(f.send('touchmove', [point(23, 34)]).defaultPrevented, false);
  assert.equal(f.send('touchend').defaultPrevented, false);
  assert.deepEqual(f.deltas, []);
});

test('a deliberate drag uses accumulated then incremental deltas and prevents drag defaults', () => {
  const f = fixture();
  f.send('touchstart', [point(20, 30)]);
  f.send('touchmove', [point(23, 34)]);
  assert.equal(f.send('touchmove', [point(30, 40)]).defaultPrevented, true);
  f.send('touchmove', [point(35, 34)]);
  assert.deepEqual(f.deltas, [[10, 10], [5, -6]]);
  assert.equal(f.send('touchend').defaultPrevented, true);
  f.send('touchstart', [point(80, 90)]);
  assert.equal(f.send('touchend').defaultPrevented, false);
});

test('an extra finger cancels map rotation until every finger is lifted', () => {
  const f = fixture();
  f.send('touchstart', [point(0, 0)]);
  assert.equal(f.send('touchstart', [point(0, 0), point(30, 30, 2)]).defaultPrevented, false);
  assert.equal(f.send('touchmove', [point(10, 10), point(40, 40, 2)]).defaultPrevented, false);
  f.send('touchend', [point(40, 40, 2)]);
  f.send('touchmove', [point(80, 80, 2)]);
  assert.deepEqual(f.deltas, []);
  f.send('touchend');
  f.send('touchstart', [point(0, 0, 3)]);
  f.send('touchmove', [point(10, 12, 3)]);
  assert.deepEqual(f.deltas, [[10, 12]]);
});

test('a fresh gesture recovers when the outside finger ends without a canvas event', () => {
  for (const dragFirst of [false, true]) {
    const f = fixture();
    f.send('touchstart', [point(0, 0)]);
    if (dragFirst) f.send('touchmove', [point(20, 20)]);
    // An outside finger is visible in touches, but its own events do not
    // bubble through the canvas. The canvas finger lifts first.
    f.send('touchmove', [point(20, 20), point(40, 40, 2)]);
    f.send('touchend', [point(40, 40, 2)]);
    // No canvas touchend arrives when the outside finger lifts.
    const before = f.deltas.length;
    f.send('touchstart', [point(0, 0, 3)]);
    f.send('touchmove', [point(12, 14, 3)]);
    assert.deepEqual(f.deltas.slice(before), [[12, 14]]);
    assert.equal(f.send('touchend').defaultPrevented, true);
    f.send('touchstart', [point(50, 50, 4)]);
    assert.equal(f.send('touchend').defaultPrevented, false);
  }
});

test('a drag remains consumed when a second finger arrives before lift', () => {
  const f = fixture();
  f.send('touchstart', [point(0, 0)]);
  f.send('touchmove', [point(20, 20)]);
  f.send('touchstart', [point(20, 20), point(30, 30, 2)]);
  assert.equal(f.send('touchend', [point(30, 30, 2)]).defaultPrevented, true);
  assert.equal(f.send('touchend').defaultPrevented, true);
  assert.deepEqual(f.deltas, [[20, 20]]);
});

test('unknown touch identifiers cannot move a tracked gesture', () => {
  const f = fixture();
  f.send('touchstart', [point(0, 0)]);
  f.send('touchmove', [point(90, 90, 2)]);
  assert.deepEqual(f.deltas, []);
});

test('touch cancellation and map-close cancellation allow a fresh gesture', () => {
  for (const cancel of [f => f.send('touchcancel'), f => f.api.cancel()]) {
    const f = fixture();
    f.send('touchstart', [point(0, 0)]);
    f.send('touchmove', [point(15, 15)]);
    cancel(f);
    f.send('touchmove', [point(100, 100)]);
    f.send('touchstart', [point(100, 100, 2)]);
    f.send('touchmove', [point(115, 110, 2)]);
    assert.deepEqual(f.deltas, [[15, 15], [15, 10]]);
  }
});

test('touch listeners remain separate from mouse input and request browser pinch zoom', () => {
  const f = fixture();
  assert.equal(f.canvas.style.touchAction, 'pinch-zoom');
  assert.equal(f.listeners.has('mousedown'), false);
  assert.equal(f.listeners.has('mousemove'), false);
  assert.equal(f.listeners.has('click'), false);
  assert.equal(f.options.get('touchmove').passive, false);
  assert.equal(f.options.get('touchend').passive, false);
});

test('dispose removes listeners and restores the prior canvas gesture policy', () => {
  const f = fixture();
  f.send('touchstart', [point(0, 0)]);
  f.api.destroy();
  f.api.destroy();
  f.send('touchmove', [point(100, 100)]);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.canvas.style.touchAction, 'auto');
  assert.deepEqual(f.deltas, []);
});

const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');

test('actual map wiring matches mouse rotation scale and elevation limits; closed or zero-size maps do not move', () => {
  const begin = html.indexOf(' mapTouch=mountMapTouch(');
  assert.ok(begin >= 0);
  const end = html.indexOf(" cv.addEventListener('mousedown'", begin);
  let drag;
  const state = { open: true, az: 0.26, el: -0.92 };
  const canvas = { clientWidth: 400, clientHeight: 200 };
  vm.runInNewContext(html.slice(begin, end), {
    NMS_MAP: state, cv: canvas, mountMapTouch: (_, handler) => { drag = handler; return {}; },
  });
  drag(100, 20);
  assert.ok(Math.abs(state.az - 0.96) < 1e-12);
  assert.ok(Math.abs(state.el + 1.14) < 1e-12);
  drag(0, 1000);
  assert.equal(state.el, -1.45);
  drag(0, -1000);
  assert.equal(state.el, -0.15);
  state.open = false;
  drag(100, 100);
  assert.equal(state.az, 0.96);
  state.open = true;
  canvas.clientWidth = 0;
  drag(100, 100);
  assert.equal(state.az, 0.96);
});

test('closing the actual map clears an unfinished touch gesture', () => {
  const begin = html.indexOf('const closeMap=()=>{');
  const end = html.indexOf('const openMap=', begin);
  let cancelled = 0;
  const state = { open: true, rafId: null };
  vm.runInNewContext(html.slice(begin, end) + '\ncloseMap();', {
    mapTouch: { cancel() { cancelled++; } }, NMS_MAP: state,
    mapModal: { classList: { remove() {} } },
  });
  assert.equal(cancelled, 1);
  assert.equal(state.open, false);
});

test('existing HUD map row opens the map by click, Enter or Space without double-toggling the global shortcut', () => {
  const begin = html.indexOf("const mapControl=document.getElementById('hr-map');");
  assert.ok(begin >= 0);
  const end = html.indexOf('const AUTOPILOT=', begin);
  const control = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
  const state = { mode: 'fly' };
  let opened = 0, closed = 0;
  const mapState = { open: false };
  vm.runInNewContext(html.slice(begin, end), {
    document: { getElementById: id => { assert.equal(id, 'hr-map'); return control; } },
    VD: state, NMS_MAP: mapState, openMap() { opened++; mapState.open = true; },
    closeMap() { closed++; mapState.open = false; },
  });
  assert.equal(control.attributes.role, 'button');
  assert.equal(control.attributes['aria-label'], 'Open celestial map');
  assert.equal(control.tabIndex, 0);
  control.onclick();
  assert.equal(opened, 1);
  for (const key of ['Enter', ' ']) {
    let prevented = false, stopped = false;
    control.onkeydown({ key, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
    assert.equal(prevented, true);
    assert.equal(stopped, true);
  }
  assert.equal(opened, 2);
  assert.equal(closed, 1);
  control.onkeydown({ key: ' ', repeat: true, preventDefault() {}, stopPropagation() {} });
  assert.equal(opened, 2);
  assert.equal(closed, 1);
  control.onkeydown({ key: 'ArrowDown' });
  assert.equal(opened, 2);
  state.mode = 'orbit';
  control.onclick();
  assert.equal(opened, 2);
});
