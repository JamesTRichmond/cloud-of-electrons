import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const gpuSrc = await readFile(new URL('../site/gpu-sim.js', import.meta.url), 'utf8');
const perfSrc = await readFile(new URL('../site/perf.js', import.meta.url), 'utf8');
const { KERNEL } = await import('../site/gpu-sim.js');

const flagLine = html.split('\n').find(l => l.startsWith('const SIM_GPU='));
const simGpu = search => {
  const FILL = [{ name: 'near', count: 100 }, { name: 'far', count: 100 }];
  const ctx = vm.createContext({ QS: new URLSearchParams(search), FILL });
  vm.runInContext(flagLine.replace('const SIM_GPU=', 'var SIM_GPU='), ctx);
  return { on: ctx.SIM_GPU, counts: FILL.map(L => L.count) };
};

test('?sim=gpu is off by default, on only for sim=gpu, and ?fix keeps the CPU path', () => {
  assert.equal(simGpu('').on, false);
  assert.equal(simGpu('?sim=cpu').on, false);
  assert.equal(simGpu('?sim=gpu').on, true);
  assert.equal(simGpu('?sim=gpu&fix').on, false);
});

test('?simscale changes dot counts only together with ?sim=gpu', () => {
  assert.deepEqual(simGpu('?simscale=3').counts, [100, 100]);
  assert.deepEqual(simGpu('?sim=gpu&simscale=3').counts, [300, 300]);
  assert.deepEqual(simGpu('?sim=gpu').counts, [100, 100]);
});

test('gpu-sim.js and perf.js are only imported behind their flags', () => {
  const g = html.split('\n').filter(l => l.includes("import('./gpu-sim.js')"));
  assert.equal(g.length, 1);
  assert.match(g[0], /^let GPU=null,gpuActive=null;if\(SIM_GPU\)\{try\{GPU=\(await import\('\.\/gpu-sim\.js'\)\)/);
  const p = html.split('\n').filter(l => l.includes("import('./perf.js')"));
  assert.equal(p.length, 1);
  assert.match(p[0], /^if\(QS\.has\('perf'\)\)import\('\.\/perf\.js'\)/);
  assert.ok(!/<script[^>]+(gpu-sim|perf)\.js/.test(html), 'no static script tag for either module');
});

test('every GPU call in index.html is guarded or inside gpuStep (which only runs when GPU is set)', () => {
  const body = html.replace(/function gpuStep\([\s\S]*?\n GPU\.step\(u\)\}/, '');
  assert.ok(html.includes('if(GPU)gpuStep('), 'gpuStep is only called behind if(GPU)');
  const lines = body.split('\n').filter(l => /GPU\.(pull|push|step|setMarks)\(/.test(l));
  for (const l of lines) {
    for (const m of l.matchAll(/GPU\.(pull|push|step|setMarks)\(/g)) {
      const before = l.slice(0, m.index);
      const guarded = /if\(GPU\)$/.test(before) || /if\(GPU\)\{[^}]*$/.test(before) || /if\(SIM_GPU\)\{try\{/.test(before) || /window\.coeDrift=\(\)=>\{$/.test(before);
      assert.ok(guarded, 'unguarded GPU call: ' + l.slice(Math.max(0, m.index - 60), m.index + 30));
    }
  }
});

test('kernel spec and the WebGL2 shader declare the same uniforms', () => {
  const vs = gpuSrc.slice(gpuSrc.indexOf('const VS = `'), gpuSrc.indexOf('const FS = `'));
  const declared = new Set();
  for (const m of vs.matchAll(/uniform\s+\w+\s+([^;]+);/g)) for (const n of m[1].split(',')) declared.add(n.trim().replace(/\[\d+\]$/, ''));
  assert.deepEqual([...declared].sort(), Object.keys(KERNEL.uniforms).sort());
  assert.deepEqual(Object.keys(KERNEL.state), ['posPm', 'velRk', 'colE']);
  assert.match(vs, /out vec4 oPP;out vec4 oVR;out vec4 oCE;/);
});

test('the kernel covers every layer in cloud-fill.js', async () => {
  const src = await readFile(new URL('../site/cloud-fill.js', import.meta.url), 'utf8');
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(src, ctx);
  assert.ok(ctx.window.COE_FILL.length <= KERNEL.maxLayers);
});

test('perf overlay exposes coePerfTrace with the fields James pastes back', () => {
  for (const k of ['userAgent', 'renderer', 'backend', 'dots', 'frameMs', 'summary', 'p95', "'Copy trace'"]) assert.ok(perfSrc.includes(k), k);
  assert.match(perfSrc, /window\.coePerfTrace = trace/);
});
