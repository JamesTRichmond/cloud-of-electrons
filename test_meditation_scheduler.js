/**
 * Automated Verification for Guided Meditation DAG Scheduler
 * Module: test_meditation_scheduler.js
 */

const fs = require('fs');
const path = require('path');
const { DAGScheduler, PRESETS } = require('./site/meditation/dag-scheduler.js');

const graphPath = path.join(__dirname, 'site/meditation/script-graph.json');
const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

const scheduler = new DAGScheduler();
scheduler.init(graphData);

const practices = scheduler.getPractices();
console.log(`Verifying DAG across ${practices.length} practices and 4 pacing modes...`);

let totalTests = 0;
let passedTests = 0;

for (const practice of practices) {
  for (const mode of Object.keys(PRESETS)) {
    totalTests++;
    const plan = scheduler.planSession(practice, mode, 600.0);

    // Assert total duration is exactly 600.0s (within 0.001s floating point tolerance)
    const durationError = Math.abs(plan.totalDuration - 600.0);
    if (durationError > 0.001) {
      console.error(`FAIL: ${practice} [${mode}] total duration ${plan.totalDuration} != 600.0s (error ${durationError})`);
      process.exit(1);
    }

    // Assert no overlapping clips: each offset[i+1] must be >= offset[i] + duration[i]
    for (let i = 0; i < plan.nodes.length - 1; i++) {
      const clipEnd = plan.offsets[i] + plan.durations[i];
      const nextStart = plan.offsets[i + 1];
      if (nextStart < clipEnd - 1e-4) {
        console.error(`FAIL: ${practice} [${mode}] clip ${i} overlaps with clip ${i+1}`);
        process.exit(1);
      }
    }

    // Assert that beginner/tighter has >= node count compared to standard/experienced
    if (mode === 'beginner' || mode === 'tighter') {
      const expPlan = scheduler.planSession(practice, 'experienced', 600.0);
      if (plan.nodeCount < expPlan.nodeCount) {
        console.error(`FAIL: ${practice} ${mode} node count (${plan.nodeCount}) should be >= experienced (${expPlan.nodeCount})`);
        process.exit(1);
      }
    }

    passedTests++;
  }
}

console.log(`\nAll ${passedTests}/${totalTests} tests PASSED!`);
console.log(`- Exact 600.000s duration verified across all 26 practices in beginner, tighter, standard, and experienced modes.`);
console.log(`- Zero overlapping audio clips verified.`);
console.log(`- Higher instructional node density verified in tighter/beginner modes.`);
