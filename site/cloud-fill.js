// Cloud fill layers for v22.1. Distances are measured from the camera, in attractors.json units.
// Size and brightness are relative to today's v22 dots (1 = same as now). These are starting values to tune after the first render.
window.COE_FILL = [
  { name: "near", count: 12000, inner: 0.15, outer: 0.8, size: 1.6, brightness: 0.6, swirl: 0.4 },
  { name: "mid",  count: 90000, inner: 0.8,  outer: 2.2, size: 1.0, brightness: 1.6,  swirl: 1 },
  { name: "far",  count: 120000, inner: 2.2,  outer: 5.0, size: 0.5, brightness: 1.0, swirl: 1 }
];
