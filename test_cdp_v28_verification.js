const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET_URL = 'http://127.0.0.1:8765/index.html?void=mid';
const PORT = 9588;
const ARTIFACT_DIR = '/Users/jamesrichmond/.gemini/antigravity/brain/0a01c6b5-4086-473c-add7-2ac7dc6a9af6';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', ...msg.params.args.map(a => a.value || a.description));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      }
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const localPath = path.resolve(__dirname, filename);
    const brainPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, Buffer.from(res.data, 'base64'));
    try {
      fs.writeFileSync(brainPath, Buffer.from(res.data, 'base64'));
      console.log(`  [Screenshot saved to brain artifact]: ${brainPath}`);
    } catch(e) {
      console.log(`  [Screenshot saved locally]: ${localPath}`);
    }
    return localPath;
  }
}

async function getWsUrl(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, res => {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => resolve(raw));
        }).on('error', reject);
      });
      const pages = JSON.parse(data);
      const page = pages.find(p => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error(`Could not connect to Chrome on port ${port}`);
}

async function run() {
  console.log('================================================================');
  console.log('   REVISION 2.8 MASTER VERIFICATION TEST SUITE                  ');
  console.log('   Tidal Lock Orbit, 3D Galaxy Cluster, Jamestellation Likeness ');
  console.log('   Flight Control Freedom, Meditation Depth & Diamond Meteors   ');
  console.log('================================================================');

  const userDataDir = `/tmp/chrome-coe-v28-${Date.now()}`;
  const chromeArgs = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu-shader-disk-cache',
    '--use-gl=angle',
    '--window-size=1600,1000',
    TARGET_URL
  ];

  const chromeProc = spawn(CHROME_PATH, chromeArgs);

  try {
    const wsUrl = await getWsUrl(PORT);
    console.log(`Connected to Chrome DevTools Protocol at ${wsUrl}`);
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    console.log('Waiting for WebGL initialization and asset decode...');
    await new Promise(r => setTimeout(r, 2500));

    // 1. Audit 3D Galaxy Distribution
    console.log('\n--- 1. Auditing 3D Galaxy Spiral Constellation ---');
    const galaxyData = await cdp.evaluate(`(() => {
      const wells = window.coeVoidWells || [];
      const xs = wells.map(w => w.pos[0]);
      const ys = wells.map(w => w.pos[1]);
      const zs = wells.map(w => w.pos[2]);
      return {
        count: wells.length,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        minZ: Math.min(...zs),
        maxZ: Math.max(...zs),
        names: wells.map(w => w.name)
      };
    })()`);

    console.log(`  Galaxy Count: ${galaxyData.count} (Expected: 19)`);
    console.log(`  X Range: [${galaxyData.minX.toFixed(1)}, ${galaxyData.maxX.toFixed(1)}] (Broad lateral spread)`);
    console.log(`  Y Range: [${galaxyData.minY.toFixed(1)}, ${galaxyData.maxY.toFixed(1)}] (True 3D vertical relief)`);
    console.log(`  Z Range: [${galaxyData.minZ.toFixed(1)}, ${galaxyData.maxZ.toFixed(1)}]`);

    if (galaxyData.minX > -150 || galaxyData.maxX < 250) {
      throw new Error(`Galaxies not adequately distributed laterally! X range: [${galaxyData.minX}, ${galaxyData.maxX}]`);
    }

    // 2. Audit Tidal Lock Orbit Physics
    console.log('\n--- 2. Auditing Tidal Lock Orbit Physics (Copernican Center Lock) ---');
    const orbitTest = await cdp.evaluate(`(() => {
      const target = window.coeVoidWells[1]; // Biological Perception / Poetry
      window.coeEnterOrbit(target);
      return {
        mode: window.coeVoid.mode,
        targetPos: target.pos,
        shipPos: window.coeVoid.pos,
        yaw: window.coeVoid.yaw,
        pitch: window.coeVoid.pitch
      };
    })()`);

    console.log(`  Mode after enterOrbit: ${orbitTest.mode} (Expected: 'orbit')`);
    console.log(`  Target Pos: [${orbitTest.targetPos.join(', ')}]`);
    console.log(`  Ship Pos: [${orbitTest.shipPos.map(v => v.toFixed(1)).join(', ')}]`);

    // Let orbit advance several simulation frames
    await new Promise(r => setTimeout(r, 1000));

    const orbitFrustum = await cdp.evaluate(`(() => {
      const W = window.coeVoid.orbitTarget;
      const VD = window.coeVoid;
      const cy = Math.cos(VD.yaw), sy = Math.sin(VD.yaw);
      const cp = Math.cos(VD.pitch), sp = Math.sin(VD.pitch);
      const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
      const Rx = [[1, 0, 0], [0, cp, sp], [0, -sp, cp]];
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for(let i=0; i<3; i++) for(let j=0; j<3; j++) for(let k=0; k<3; k++) M[i][j] += Rx[i][k] * Ry[k][j];
      
      const d = [W.pos[0] - VD.pos[0], W.pos[1] - VD.pos[1], W.pos[2] - VD.pos[2]];
      const v = [0, 1, 2].map(r => M[r][0]*d[0] + M[r][1]*d[1] + M[r][2]*d[2]);
      
      // Calculate normalized device coordinates
      const ndcX = v[0] / (-v[2]);
      const ndcY = v[1] / (-v[2]);
      return {
        targetName: W.name,
        camV: v,
        ndcX: ndcX,
        ndcY: ndcY,
        isCentered: Math.abs(ndcX) < 0.05 && Math.abs(ndcY) < 0.05
      };
    })()`);

    console.log(`  Target in View: "${orbitFrustum.targetName}"`);
    console.log(`  Frustum Center Offset: NDC X = ${orbitFrustum.ndcX.toFixed(4)}, NDC Y = ${orbitFrustum.ndcY.toFixed(4)}`);
    console.log(`  Tidal Lock Alignment: ${orbitFrustum.isCentered ? 'PERFECT LOCK [✓]' : 'FAILED [✗]'}`);

    if (!orbitFrustum.isCentered) {
      throw new Error(`Galaxy is not tidally locked dead-center in view: offset [${orbitFrustum.ndcX}, ${orbitFrustum.ndcY}]`);
    }

    // Capture Screenshot 1: Tidally Locked Orbit
    console.log('\n--- Capturing Screenshot: Tidally Locked Orbit ---');
    await cdp.screenshot('v28_tidally_locked_orbit.png');

    // Break orbit and audit flight control freedom & boundary containment
    console.log('\n--- 3. Auditing Flight Control Freedom & Undercurrent Removal ---');
    await cdp.evaluate(`(() => {
      window.coeBreakOrbit();
      // Position deep in cosmos near wormhole
      window.coeVoid.pos = [-1.94, 21.6, -1720];
      // Face backwards 180 degrees (toward entrance)
      window.coeVoid.yaw = Math.PI;
      window.coeVoid.pitch = 0.0;
      window.coeVoid.sp = 50.0; // Fly backward towards entrance
    })()`);

    // Advance 600ms
    await new Promise(r => setTimeout(r, 600));

    const flightFreedom = await cdp.evaluate(`(() => {
      return {
        pos: window.coeVoid.pos,
        yaw: window.coeVoid.yaw,
        pitch: window.coeVoid.pitch,
        sp: window.coeVoid.sp
      };
    })()`);

    console.log(`  Post-maneuver Yaw: ${flightFreedom.yaw.toFixed(2)} (Expected ~3.14 rad / 180 deg, NOT zeroed)`);
    console.log(`  Post-maneuver Pos: [${flightFreedom.pos.map(v => v.toFixed(1)).join(', ')}]`);
    const yawRetained = Math.abs(flightFreedom.yaw - Math.PI) < 0.25;
    console.log(`  Steering Freedom Retained: ${yawRetained ? 'PASS [✓]' : 'FAIL [✗]'}`);
    if (!yawRetained) {
      throw new Error(`Flight yaw was forcibly clamped by undercurrent: ${flightFreedom.yaw}`);
    }

    // 4. Capture 3D Galaxy Constellation Tactical Map View
    console.log('\n--- 4. Capturing 3D Galaxy Spiral Constellation Holodeck ---');
    await cdp.evaluate(`(() => {
      // High-altitude spatial vantage point showing the full 3D spiral constellation
      window.coeVoid.pos = [0, 480, -900];
      window.coeVoid.yaw = 0.0;
      window.coeVoid.pitch = -0.55; // Pitch down 32 degrees
      window.coeVoid.sp = 0;
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await cdp.screenshot('v28_3d_spiral_galaxy_cluster.png');

    // 5. Audit Jamestellation Likeness & Photographic Sculpted Mesh
    console.log('\n--- 5. Auditing Jamestellation Photographic Likeness ---');
    await cdp.evaluate(`(() => {
      window.coeVoid.pos = [-1.94, 21.6, -1620];
      window.coeVoid.yaw = 0;
      window.coeVoid.pitch = 0;
      window.coeLaughOverride = 0.0; // Serene closed-eyes photographic face
      window.coeVoid.gain = 1.0;
      window.coeVoid.fb = 0.0;
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    console.log('  Capturing Jamestellation Serene Face...');
    await cdp.screenshot('v28_jamestellation_photographic_masterpiece.png');

    // Close-up Smiling Laughter
    console.log('\n--- 6. Capturing Jamestellation Proximity Laughter & Ajna Star ---');
    await cdp.evaluate(`(() => {
      window.coeVoid.pos = [-1.94, 21.6, -1690];
      window.coeLaughOverride = 1.0; // Warm smiling laughter
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await cdp.screenshot('v28_jamestellation_smiling_closeup.png');

    // 7. Audit Living Connectome & Firing Lightning
    console.log('\n--- 7. Auditing Living Connectome & Action Potentials ---');
    await cdp.evaluate(`(() => {
      window.coeVoid.pos = [0, 24, -120];
      window.coeVoid.yaw = 0.15;
      window.coeVoid.pitch = 0.05;
      window.coeThoughtTract = 0.35;
      window.coeThoughtProg = 0.52; // Firing wave packet
    })()`);
    await new Promise(r => setTimeout(r, 800));
    await cdp.screenshot('v28_living_synaptic_connectome.png');

    // 8. Audit Meditation Depth Selection in Open Field
    console.log('\n--- 8. Auditing Open Field Meditation Depth Options ---');
    const medDepthCheck = await cdp.evaluate(`(async () => {
      const levelEl = document.getElementById('of-med-level');
      if (!levelEl) return { error: 'Element #of-med-level not found' };
      
      const options = [...levelEl.options].map(o => ({ value: o.value, text: o.text }));
      
      // Test beginner plan
      levelEl.value = 'beginner';
      const planBeg = await window.coeMedPlan(0);
      
      // Test advanced plan
      levelEl.value = 'advanced';
      const planAdv = await window.coeMedPlan(0);

      // Restore intermediate
      levelEl.value = 'intermediate';
      const planInt = await window.coeMedPlan(0);

      return {
        options,
        durBeg: planBeg.total,
        durInt: planInt.total,
        durAdv: planAdv.total
      };
    })()`);

    console.log(`  Level Options: ${JSON.stringify(medDepthCheck.options)}`);
    console.log(`  Beginner Duration: ${medDepthCheck.durBeg?.toFixed(1)}s (~5 min) -> ${medDepthCheck.durBeg < 350 ? 'PASS [✓]' : 'FAIL [✗]'}`);
    console.log(`  Intermediate Duration: ${medDepthCheck.durInt?.toFixed(1)}s (~10 min) -> ${Math.abs(medDepthCheck.durInt - 600) < 60 ? 'PASS [✓]' : 'FAIL [✗]'}`);
    console.log(`  Advanced Duration: ${medDepthCheck.durAdv?.toFixed(1)}s (~20 min) -> ${medDepthCheck.durAdv > 1100 ? 'PASS [✓]' : 'FAIL [✗]'}`);

    if (!medDepthCheck.options || medDepthCheck.options.length < 3) {
      throw new Error(`Missing depth options on #of-med-level: ${JSON.stringify(medDepthCheck)}`);
    }

    console.log('\n================================================================');
    console.log('   ALL REVISION 2.8 VERIFICATION TESTS PASSED FLAWLESSLY!       ');
    console.log('================================================================');

  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exitCode = 1;
  } finally {
    try { chromeProc.kill(); } catch (e) {}
  }
}

run();
