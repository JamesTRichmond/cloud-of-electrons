// ?perf overlay: frame-time readout + in-memory trace. index.html imports this only when ?perf is in the URL,
// so without the flag none of this code is fetched or run.
// window.coePerfTrace() returns the trace object; the "Copy trace" button copies it as JSON.
export function mountPerf({ gl, dots, backend }) {
  let renderer = null, vendor = null;
  try { const x = gl.getExtension('WEBGL_debug_renderer_info'); renderer = gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER); vendor = gl.getParameter(x ? x.UNMASKED_VENDOR_WEBGL : gl.VENDOR); } catch (e) { /* not exposed */ }
  const MAX = 36000, ms = new Float32Array(MAX), t0 = performance.now(); let n = 0, last = 0;
  const box = document.createElement('div');
  box.setAttribute('role', 'status'); box.setAttribute('aria-label', 'Performance readout');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;font:12px/1.35 ui-monospace,monospace;color:#e8edf5;background:rgba(8,12,22,.82);padding:8px 10px;border-radius:6px;max-width:min(92vw,420px);white-space:pre-wrap;pointer-events:auto';
  const txt = document.createElement('div'), btn = document.createElement('button');
  btn.type = 'button'; btn.textContent = 'Copy trace'; btn.style.cssText = 'margin-top:6px;font:inherit;padding:4px 10px;min-height:32px;cursor:pointer';
  box.append(txt, btn); document.body.append(box);
  const q = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
  const stats = (from = 0) => { const a = Array.from(ms.subarray(from, n)).sort((x, y) => x - y), sum = a.reduce((s, v) => s + v, 0);
    return { frames: a.length, fps: a.length ? +(1000 * a.length / sum).toFixed(1) : 0, p50: +q(a, .5).toFixed(2), p95: +q(a, .95).toFixed(2), max: +(a[a.length - 1] || 0).toFixed(2) }; };
  const trace = () => ({ kind: 'coe-perf-trace/1', capturedAt: new Date().toISOString(), seconds: +((performance.now() - t0) / 1000).toFixed(1),
    page: location.pathname + location.search, userAgent: navigator.userAgent, renderer, vendor, backend: backend(), dots: dots(),
    dpr: devicePixelRatio, canvas: [gl.canvas.width, gl.canvas.height], viewport: [innerWidth, innerHeight],
    simGpu: window.coeSimGpu || null, summary: stats(), last10s: stats(Math.max(0, n - 600)), frameMs: Array.from(ms.subarray(0, n), v => +v.toFixed(2)) });
  window.coePerfTrace = trace;
  btn.onclick = async () => { const s = JSON.stringify(trace()); try { await navigator.clipboard.writeText(s); btn.textContent = 'Copied ' + (s.length / 1024).toFixed(0) + ' KB'; }
    catch (e) { const ta = document.createElement('textarea'); ta.value = s; document.body.append(ta); ta.select(); try { document.execCommand('copy'); btn.textContent = 'Copied'; } catch (e2) { btn.textContent = 'Copy failed: see window.coePerfTrace()'; } ta.remove(); }
    setTimeout(() => { btn.textContent = 'Copy trace'; }, 2500); };
  let shown = 0;
  const tick = now => { if (last && n < MAX) ms[n++] = now - last; last = now;
    if (now - shown > 500) { shown = now; const s = stats(Math.max(0, n - 120));
      txt.textContent = `fps ${s.fps}  (last ${s.frames} frames)\nframe ms p50 ${s.p50}  p95 ${s.p95}  max ${s.max}\ndots ${dots().toLocaleString()}  sim ${backend()}\n${renderer || 'renderer not exposed'}\ntrace ${n} frames, ${((now - t0) / 1000).toFixed(0)} s`; }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return { trace };
}
