#!/usr/bin/env node
/**
 * ============================================================================
 * AGENT BUS CLI & INTER-SESSION ORCHESTRATION DISPATCHER
 * ============================================================================
 * Repository: JamesTRichmond/cloud-of-electrons
 * System: Autonomous In-Repo File/Branch Dispatch Bus (Option B)
 * 
 * Usage:
 *   node bus-cli.js dispatch --to <session> --directive "<task>" [--files <f1,f2>] [--verify "<cmd>"]
 *   node bus-cli.js list
 *   node bus-cli.js claim --session <session> [--task <taskId>]
 *   node bus-cli.js complete --task <taskId> --session <session> --status SUCCESS|FAILED --summary "<text>"
 *   node bus-cli.js watch
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUS_ROOT = path.resolve(__dirname);
const QUEUE_DIR = path.join(BUS_ROOT, 'queue');
const PROGRESS_DIR = path.join(BUS_ROOT, 'in-progress');
const COMPLETED_DIR = path.join(BUS_ROOT, 'completed');
const LOGS_DIR = path.join(BUS_ROOT, 'logs');

// Ensure directories exist
[QUEUE_DIR, PROGRESS_DIR, COMPLETED_DIR, LOGS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      parsed[key] = val;
    } else {
      parsed._.push(arg);
    }
  }
  return parsed;
}

function notifyOS(title, message) {
  try {
    if (process.platform === 'darwin') {
      const cleanTitle = title.replace(/"/g, '\\"');
      const cleanMsg = message.replace(/"/g, '\\"');
      execSync(`osascript -e 'display notification "${cleanMsg}" with title "${cleanTitle}"'`, { stdio: 'ignore' });
    }
  } catch (e) {
    // Ignore notification failure in headless environments
  }
}

function logEvent(action, payload) {
  const line = `[${new Date().toISOString()}] [${action}] ${JSON.stringify(payload)}\n`;
  const logFile = path.join(LOGS_DIR, `bus_${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFileSync(logFile, line);
}

// ----------------------------------------------------------------------------
// COMMAND: dispatch
// ----------------------------------------------------------------------------
function cmdDispatch(args) {
  const to = args.to || 'all';
  const directive = args.directive;
  if (!directive) {
    console.error('Error: --directive "<task description>" is required.');
    process.exit(1);
  }

  const taskId = args.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const task = {
    taskId,
    targetSession: to,
    priority: args.priority || 'HIGH',
    createdAt: new Date().toISOString(),
    directive,
    filesOwned: args.files ? args.files.split(',').map(s => s.trim()) : [],
    workingDirectory: args.dir || '',
    verificationCommand: args.verify || '',
    context: args.context ? JSON.parse(args.context) : {},
    status: 'QUEUED'
  };

  const filePath = path.join(QUEUE_DIR, `${taskId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(task, null, 2));

  logEvent('DISPATCH', { taskId, to, directive });
  notifyOS('Agent Bus: Task Dispatched', `Task ${taskId} assigned to ${to}`);

  console.log(`\n✦ TASK DISPATCHED SUCCESSFULLY ✦`);
  console.log(`  Task ID:         ${taskId}`);
  console.log(`  Target Session:  ${to}`);
  console.log(`  Priority:        ${task.priority}`);
  console.log(`  Directive:       ${directive}`);
  console.log(`  Location:        ${filePath}\n`);
}

// ----------------------------------------------------------------------------
// COMMAND: list
// ----------------------------------------------------------------------------
function cmdList() {
  console.log('\n================================================================');
  console.log('   AGENT BUS DISPATCH QUEUE & SESSION TELEMETRY                 ');
  console.log('================================================================\n');

  const readDirTasks = (dir, statusLabel) => {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        return { file: f, status: statusLabel, ...data };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  };

  const queued = readDirTasks(QUEUE_DIR, 'QUEUED');
  const inProgress = readDirTasks(PROGRESS_DIR, 'IN_PROGRESS');
  const completed = readDirTasks(COMPLETED_DIR, 'COMPLETED');

  console.log(`[QUEUED TASKS (${queued.length})]:`);
  if (queued.length === 0) console.log('  (Queue empty)');
  queued.forEach(t => {
    console.log(`  • [${t.taskId}] -> Target: ${t.targetSession} | Priority: ${t.priority}`);
    console.log(`    Directive: "${t.directive.slice(0, 80)}${t.directive.length > 80 ? '...' : ''}"`);
  });

  console.log(`\n[IN-PROGRESS TASKS (${inProgress.length})]:`);
  if (inProgress.length === 0) console.log('  (None running)');
  inProgress.forEach(t => {
    console.log(`  • [${t.taskId}] -> Claimed by: ${t.claimedBy || t.targetSession} at ${t.claimedAt}`);
    console.log(`    Directive: "${t.directive.slice(0, 80)}"`);
  });

  console.log(`\n[COMPLETED TASKS (${completed.length})]:`);
  if (completed.length === 0) console.log('  (None completed yet)');
  completed.slice(-5).forEach(t => {
    console.log(`  • [${t.taskId}] -> Status: ${t.status || 'DONE'} | Completed by: ${t.completedBy || t.session}`);
    console.log(`    Summary: "${(t.summary || '').slice(0, 80)}"`);
  });
  console.log('\n================================================================\n');
}

// ----------------------------------------------------------------------------
// COMMAND: claim
// ----------------------------------------------------------------------------
function cmdClaim(args) {
  const session = args.session;
  if (!session) {
    console.error('Error: --session <sessionId> is required to claim a task.');
    process.exit(1);
  }

  const files = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json'));
  let targetFile = null;
  let targetTask = null;

  if (args.task) {
    targetFile = `${args.task}.json`;
    if (!fs.existsSync(path.join(QUEUE_DIR, targetFile))) {
      console.error(`Error: Task ${args.task} not found in queue.`);
      process.exit(1);
    }
    targetTask = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, targetFile), 'utf8'));
  } else {
    // Claim first matching task for this session or 'all'
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), 'utf8'));
      if (data.targetSession === session || data.targetSession === 'all') {
        targetFile = f;
        targetTask = data;
        break;
      }
    }
  }

  if (!targetTask) {
    console.log(`No pending tasks found for session "${session}".`);
    process.exit(0);
  }

  // Atomically move from queue to in-progress
  const srcPath = path.join(QUEUE_DIR, targetFile);
  const dstPath = path.join(PROGRESS_DIR, targetFile);
  
  targetTask.status = 'IN_PROGRESS';
  targetTask.claimedBy = session;
  targetTask.claimedAt = new Date().toISOString();

  fs.writeFileSync(dstPath, JSON.stringify(targetTask, null, 2));
  try { fs.unlinkSync(srcPath); } catch (e) {}

  logEvent('CLAIM', { taskId: targetTask.taskId, session });
  console.log(JSON.stringify(targetTask, null, 2));
}

// ----------------------------------------------------------------------------
// COMMAND: complete
// ----------------------------------------------------------------------------
function cmdComplete(args) {
  const taskId = args.task;
  const session = args.session || 'unknown';
  const status = args.status || 'SUCCESS';
  const summary = args.summary || 'Task completed successfully.';

  if (!taskId) {
    console.error('Error: --task <taskId> is required.');
    process.exit(1);
  }

  const progPath = path.join(PROGRESS_DIR, `${taskId}.json`);
  let task = {};
  if (fs.existsSync(progPath)) {
    task = JSON.parse(fs.readFileSync(progPath, 'utf8'));
  }

  const resultManifest = {
    ...task,
    taskId,
    completedBy: session,
    completedAt: new Date().toISOString(),
    status,
    summary,
    filesModified: args.files ? args.files.split(',').map(s => s.trim()) : task.filesOwned || [],
    verificationResults: args.results ? JSON.parse(args.results) : {}
  };

  const compPath = path.join(COMPLETED_DIR, `${taskId}.json`);
  fs.writeFileSync(compPath, JSON.stringify(resultManifest, null, 2));
  if (fs.existsSync(progPath)) fs.unlinkSync(progPath);

  logEvent('COMPLETE', { taskId, session, status, summary });
  notifyOS('Agent Bus: Task Complete', `Task ${taskId} completed by ${session} [${status}]`);

  console.log(`\n✦ TASK COMPLETED & REPORTED ✦`);
  console.log(`  Task ID:   ${taskId}`);
  console.log(`  Session:   ${session}`);
  console.log(`  Status:    ${status}`);
  console.log(`  Summary:   ${summary}\n`);
}

// ----------------------------------------------------------------------------
// Main CLI Switch
// ----------------------------------------------------------------------------
const argv = process.argv.slice(2);
const parsed = parseArgs(argv);
const cmd = parsed._[0] || 'list';

switch (cmd) {
  case 'dispatch':
    cmdDispatch(parsed);
    break;
  case 'list':
  case 'status':
    cmdList();
    break;
  case 'claim':
    cmdClaim(parsed);
    break;
  case 'complete':
  case 'report':
    cmdComplete(parsed);
    break;
  case 'watch':
    require('./bus-watcher.js');
    break;
  default:
    console.log(`Unknown command: ${cmd}. Available: dispatch, list, claim, complete, watch`);
    process.exit(1);
}
