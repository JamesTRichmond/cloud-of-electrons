#!/usr/bin/env node
/**
 * ============================================================================
 * AGENT BUS FILE-WATCHER DAEMON
 * ============================================================================
 * Watches .agent-bus/queue and .agent-bus/completed for atomic file events.
 * Provides instant live telemetry and notification for multi-session dispatch.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUS_ROOT = path.resolve(__dirname);
const QUEUE_DIR = path.join(BUS_ROOT, 'queue');
const COMPLETED_DIR = path.join(BUS_ROOT, 'completed');

console.log('================================================================');
console.log('   AGENT BUS LIGHTWEIGHT FILE-WATCHER ACTIVE                    ');
console.log('================================================================');
console.log(`Watching Queue:     ${QUEUE_DIR}`);
console.log(`Watching Completed: ${COMPLETED_DIR}`);
console.log('Press Ctrl+C to terminate watcher daemon.\n');

function notifyOS(title, message) {
  try {
    if (process.platform === 'darwin') {
      const cleanTitle = title.replace(/"/g, '\\"');
      const cleanMsg = message.replace(/"/g, '\\"');
      execSync(`osascript -e 'display notification "${cleanMsg}" with title "${cleanTitle}"'`, { stdio: 'ignore' });
    }
  } catch (e) {}
}

const seenFiles = new Set();

fs.watch(QUEUE_DIR, (eventType, filename) => {
  if (!filename || !filename.endsWith('.json')) return;
  const fullPath = path.join(QUEUE_DIR, filename);
  if (!fs.existsSync(fullPath)) return;

  if (seenFiles.has(`queue:${filename}`)) return;
  seenFiles.add(`queue:${filename}`);
  setTimeout(() => seenFiles.delete(`queue:${filename}`), 2000);

  try {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`\n⚡ [NEW TASK ENQUEUED]: [${data.taskId}]`);
    console.log(`   Target:    ${data.targetSession}`);
    console.log(`   Priority:  ${data.priority}`);
    console.log(`   Directive: ${data.directive}`);
    console.log(`   Files:     ${(data.filesOwned || []).join(', ') || 'N/A'}`);
    notifyOS(`Agent Bus: Task for ${data.targetSession}`, data.directive);
  } catch (e) {}
});

fs.watch(COMPLETED_DIR, (eventType, filename) => {
  if (!filename || !filename.endsWith('.json')) return;
  const fullPath = path.join(COMPLETED_DIR, filename);
  if (!fs.existsSync(fullPath)) return;

  if (seenFiles.has(`comp:${filename}`)) return;
  seenFiles.add(`comp:${filename}`);
  setTimeout(() => seenFiles.delete(`comp:${filename}`), 2000);

  try {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`\n✅ [TASK COMPLETED]: [${data.taskId}]`);
    console.log(`   Session:   ${data.completedBy || data.session}`);
    console.log(`   Status:    ${data.status}`);
    console.log(`   Summary:   ${data.summary}`);
    notifyOS(`Agent Bus: Task Done [${data.status}]`, data.summary || data.taskId);
  } catch (e) {}
});

// Keep process alive
setInterval(() => {}, 10000);
