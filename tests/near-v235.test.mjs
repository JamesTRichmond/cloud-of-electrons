import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const fillPath = fileURLToPath(new URL('../site/cloud-fill.js', import.meta.url));
const htmlPath = fileURLToPath(new URL('../site/index.html', import.meta.url));
const src = await readFile(fillPath, 'utf8');
const html = await readFile(htmlPath, 'utf8');

function loadFill(search = '') {
  const ctx = { window: {}, location: { search } };
  vm.runInNewContext(src, ctx);
  return ctx.window.COE_FILL;
}

function layer(fill, name) {
  return fill.find(l => l.name === name);
}

test('flag off keeps main near/mid brightness and does not call Math.random', () => {
  const fill = loadFill('');
  assert.equal(layer(fill, 'near').brightness, 0.6);
  assert.equal(layer(fill, 'mid').brightness, 1.6);
  const hook = src.slice(src.indexOf('applyNearV235'));
  assert.equal((hook.match(/Math\.random/g) || []).length, 0);
});

test('?near=v235 restores v23.5 near .35 and mid .8', () => {
  const fill = loadFill('?near=v235');
  assert.equal(layer(fill, 'near').brightness, 0.35);
  assert.equal(layer(fill, 'mid').brightness, 0.8);
  assert.equal(layer(fill, 'far').brightness, 1.0);
});

test('array literals in cloud-fill.js stay at main values so a missing hook cannot change default brightness', () => {
  assert.match(src, /name:\s*"near"[\s\S]*?brightness:\s*0\.6/);
  assert.match(src, /name:\s*"mid"[\s\S]*?brightness:\s*1\.6/);
});

test('index.html inline FILL fallback still lists main near .6 and mid 1.6', () => {
  const m = html.match(/const FILL=\(window\.COE_FILL\|\|\[([\s\S]*?)\]\)/);
  assert.ok(m, 'inline FILL fallback');
  assert.match(m[1], /name:'near'[^\n]*brightness:\.6/);
  assert.match(m[1], /name:'mid'[^\n]*brightness:1\.6/);
});
