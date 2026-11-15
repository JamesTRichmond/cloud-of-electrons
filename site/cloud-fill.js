// Cloud fill layers for v24 Living Cosmos. Distances are measured from the camera.
// Multi-tier deep manifolds provide infinite depth when foreground gathers.
// Dedicated synaptic layer forms dendritic arborizations and heat lightning across negative space.
window.COE_FILL = [
  { name: "near",     count: 12000,  inner: 0.15, outer: 0.8,   size: 1.6, brightness: 0.6,  swirl: 0.4 },
  { name: "mid",      count: 90000,  inner: 0.8,  outer: 2.2,   size: 1.0, brightness: 1.6,  swirl: 1.0 },
  { name: "far",      count: 90000,  inner: 2.2,  outer: 5.5,   size: 0.6, brightness: 1.0,  swirl: 1.0 },
  { name: "deep",     count: 40000,  inner: 5.5,  outer: 45.0,  size: 0.5, brightness: 0.85, swirl: 0.35 },
  { name: "abyss",    count: 25000,  inner: 45.0, outer: 350.0, size: 0.55, brightness: 0.75, swirl: 0.18 },
  { name: "infinite", count: 20000,  inner: 350.0, outer: 1600.0, size: 0.85, brightness: 0.9, swirl: 0.08 },
  { name: "synapse",  count: 20000,  inner: 2.5,   outer: 16.0,   size: 0.85, brightness: 1.0, swirl: 0.0 }
];

// Density tiers. "full" is the table above. "lite" keeps near and mid at full size, because poems
// recruit their letter dots from those two layers, so letter supply and recruitment are unchanged;
// the background shells and the synapse layer are halved (297,000 -> 199,500 particles).
//
// How the tier is chosen, first match wins:
//   1. ?fill=lite or ?fill=full in the URL (also saved, so the choice sticks).
//   2. A tier saved on this device by an earlier visit.
//   3. Otherwise full.
// After load, a short frame-time probe runs while the cloud animates. If the median frame takes
// longer than SLOW_MS, the device is marked "lite" for its next visit. The current visit is never
// rebuilt mid-poem. Nothing here touches timing, stanza delays or recruitment.
(function () {
  const KEY = "coe_fill_tier", SLOW_MS = 24, PROBE_DELAY_MS = 4000, PROBE_FRAMES = 120;
  let tier = "full", source = "default", store = null;
  try { store = window.localStorage; } catch (e) { store = null; }
  try {
    const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("fill") : null;
    if (q === "lite" || q === "full") { tier = q; source = "url"; if (store) store.setItem(KEY, q); }
    else if (store) { const saved = store.getItem(KEY); if (saved === "lite" || saved === "full") { tier = saved; source = "saved"; } }
  } catch (e) { tier = "full"; source = "default"; }

  if (tier === "lite") {
    const KEEP = { near: 1, mid: 1 };
    window.COE_FILL = window.COE_FILL.map(l => ({ ...l, count: KEEP[l.name] ? l.count : Math.round(l.count / 2) }));
  }
  window.COE_FILL_TIER = tier;
  window.COE_FILL_TIER_SOURCE = source;

  // Probe only when nothing was chosen yet, so a saved or URL choice is never overridden.
  if (source !== "default" || !store || typeof requestAnimationFrame !== "function") return;
  setTimeout(function () {
    const gaps = []; let last = 0;
    function tick(t) {
      if (last) gaps.push(t - last);
      last = t;
      if (typeof document !== "undefined" && document.hidden) return; // background tabs throttle; skip
      if (gaps.length < PROBE_FRAMES) { requestAnimationFrame(tick); return; }
      gaps.sort((a, b) => a - b);
      const median = gaps[gaps.length >> 1];
      window.COE_FILL_PROBE_MS = median;
      try { store.setItem(KEY, median > SLOW_MS ? "lite" : "full"); } catch (e) {}
    }
    requestAnimationFrame(tick);
  }, PROBE_DELAY_MS);
})();
