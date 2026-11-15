import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// The particle layers are defined twice: site/cloud-fill.js sets window.COE_FILL,
// and site/index.html carries an inline fallback used when that script is missing.
// These checks keep the two copies identical and the depth shells well formed.
const fillSource = await readFile(new URL('../site/cloud-fill.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

const sandbox = { window: {} };
vm.runInNewContext(fillSource, sandbox);
const FILL = JSON.parse(JSON.stringify(sandbox.window.COE_FILL));

function inlineFallback() {
  const m = html.match(/window\.COE_FILL\|\|(\[[\s\S]*?\])\)\.map/);
  assert.ok(m, 'inline COE_FILL fallback not found in site/index.html');
  return JSON.parse(JSON.stringify(vm.runInNewContext(m[1])));
}

const SHELLS = ['near', 'mid', 'far', 'deep', 'abyss', 'infinite'];
const FIELDS = ['count', 'inner', 'outer', 'size', 'brightness', 'swirl'];

test('cloud-fill.js defines the seven expected layers', () => {
  assert.ok(Array.isArray(FILL));
  assert.deepEqual(FILL.map(l => l.name), [...SHELLS, 'synapse']);
});

test('every layer has sane numbers', () => {
  for (const l of FILL) {
    assert.ok(Number.isInteger(l.count) && l.count > 0, `${l.name}: count`);
    assert.ok(l.inner >= 0 && l.inner < l.outer, `${l.name}: inner < outer`);
    assert.ok(l.size > 0 && l.brightness > 0, `${l.name}: size and brightness`);
    assert.ok(l.swirl >= 0 && l.swirl <= 1, `${l.name}: swirl in [0,1]`);
  }
});

test('depth shells nest with no gaps or overlaps', () => {
  const shells = FILL.filter(l => SHELLS.includes(l.name));
  for (let i = 1; i < shells.length; i++) {
    assert.equal(shells[i].inner, shells[i - 1].outer, `${shells[i - 1].name} -> ${shells[i].name}`);
  }
});

test('the synapse layer sits inside the shells, past the near layer', () => {
  const syn = FILL.find(l => l.name === 'synapse');
  const near = FILL.find(l => l.name === 'near');
  const infinite = FILL.find(l => l.name === 'infinite');
  assert.ok(syn.inner >= near.outer && syn.outer <= infinite.inner);
});

test('the inline fallback in index.html matches cloud-fill.js exactly', () => {
  const inline = inlineFallback();
  assert.deepEqual(inline.map(l => l.name), FILL.map(l => l.name));
  inline.forEach((l, i) => {
    for (const f of FIELDS) assert.equal(l[f], FILL[i][f], `${l.name}.${f}`);
  });
});

test('README states the real particle total', () => {
  const total = FILL.reduce((s, l) => s + l.count, 0);
  assert.ok(readme.includes(total.toLocaleString('en-US')), `README should mention ${total.toLocaleString('en-US')} particles`);
});
