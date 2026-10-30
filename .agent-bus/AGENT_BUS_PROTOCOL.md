# 🚌 AGENT BUS INTER-SESSION ORCHESTRATION PROTOCOL (OPTION B)

**System Architecture:** In-Repo File/Branch Dispatch Bus  
**Location:** `.agent-bus/` (accessible from repository root and all child worktrees)  
**Primary Daemon:** `node .agent-bus/bus-watcher.js`  
**Primary CLI:** `node .agent-bus/bus-cli.js`  

---

## 1. Overview & Objective
This system completely eliminates human copy-paste bottlenecks between parallel Antigravity sessions and subagents. Instead of the user manually copying prompts and diffs across chat windows:
1. **Lead Architect (Session 0)** dispatches structured task payloads into `.agent-bus/queue/`.
2. **Worker Sessions (Sessions 1–7)** claim tasks via CLI or file-polling, execute their work in their isolated worktree, and report results to `.agent-bus/completed/`.
3. **The File-Watcher Daemon (`bus-watcher.js`)** detects changes atomically, logs telemetry to `.agent-bus/logs/`, and dispatches OS notifications.

---

## 2. Directory Layout
```
.agent-bus/
  ├── queue/               # Incoming task manifests (task_<id>.json)
  ├── in-progress/         # Currently active / claimed tasks
  ├── completed/           # Finished results & verification reports
  ├── logs/                # Timestamped telemetry audit logs
  ├── bus-cli.js           # CLI tool for dispatching, listing, claiming, completing
  ├── bus-watcher.js       # Background live event watcher
  └── AGENT_BUS_PROTOCOL.md# This protocol specification
```

---

## 3. Worker Session CLI Commands

### 3.1 Check Active Queue & Status
```bash
node .agent-bus/bus-cli.js list
```

### 3.2 Claim Next Task for Your Session
```bash
# Atomically claims the oldest task targeted to your session (or 'all'):
node .agent-bus/bus-cli.js claim --session session-4-controls
```
*Output: Returns full JSON task manifest with directive, owned files, and verification commands.*

### 3.3 Report Task Completion
```bash
node .agent-bus/bus-cli.js complete \
  --task task_1793310279926_twlto \
  --session session-4-controls \
  --status SUCCESS \
  --summary "Yaw sign inverted and orbital tidal locking verified with 100% test pass" \
  --files "site/controls/flight-controller.js"
```

---

## 4. Lead Architect CLI Commands (Dispatching Unscheduled Needs)

### 4.1 Dispatch a New Task
```bash
node .agent-bus/bus-cli.js dispatch \
  --to session-2-audio \
  --priority HIGH \
  --directive "Tune Solfeggio 528 Hz harmonic resonance in spatial panner" \
  --files "site/audio/synth.js" \
  --verify "node test_audio_engine.js"
```

### 4.2 Start Background File-Watcher Loop
```bash
node .agent-bus/bus-cli.js watch
```
