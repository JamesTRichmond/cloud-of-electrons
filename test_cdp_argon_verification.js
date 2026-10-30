const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET_URL = 'http://127.0.0.1:8765/index.html?void=jamestellation';
const PORT = 9577;
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
    const buf = Buffer.from(res.data, 'base64');
    fs.writeFileSync(localPath, buf);
    fs.writeFileSync(brainPath, buf);
    console.log(`  [SCREENSHOT] Saved: ${localPath} and ${brainPath}`);
  }
}

async function run() {
  console.log('================================================================');
  console.log('   JAMESTELLATION VOLUMETRIC SHADER & CME CDP VERIFICATION     ');
  console.log('================================================================');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--window-size=1280,800',
    '--mute-audio',
    TARGET_URL
  ]);

  let cdp = null;

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const json = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${PORT}/json`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
          }).on('error', reject);
        });
        const pageTarget = json.find(t => t.type === 'page' && (t.url.includes('8765') || t.title.includes('Cloud')));
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
          wsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (!wsUrl) throw new Error('Failed to obtain Chrome CDP WebSocket URL');

    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('✓ Connected to Headless Chrome via CDP');

    await cdp.send('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 2000));

    // Wait for window.coeVoid to be initialized
    for (let i = 0; i < 40; i++) {
      const isReady = await cdp.evaluate(`typeof window.coeVoid !== 'undefined' && typeof window.jFaceCount !== 'undefined'`);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // 1. Audit Shader Linking & Buffer Counts
    console.log('\n--- 1. Auditing WebGL 2.0 Shaders & Buffers ---');
    const auditData = await cdp.evaluate(`(() => {
      return {
        jFaceCount: window.jFaceCount,
        jCMECount: window.jCMECount,
        mode: window.coeVoid ? window.coeVoid.mode : null,
        pos: window.coeVoid ? window.coeVoid.pos : null,
        gain: window.coeVoid ? window.coeVoid.gain : null
      };
    })()`);

    console.log(`  jFaceCount: ${auditData.jFaceCount} (Expected: 76801) -> ${auditData.jFaceCount === 76801 ? 'PASS [✓]' : 'FAIL [✗]'}`);
    console.log(`  jCMECount: ${auditData.jCMECount} (Expected: 32256) -> ${auditData.jCMECount === 32256 ? 'PASS [✓]' : 'FAIL [✗]'}`);
    console.log(`  Camera Pos: [${auditData.pos.map(v => v.toFixed(1)).join(', ')}], Mode: ${auditData.mode}`);

    if (auditData.jFaceCount !== 76801) throw new Error(`Unexpected jFaceCount: ${auditData.jFaceCount}`);
    if (auditData.jCMECount !== 32256) throw new Error(`Unexpected jCMECount: ${auditData.jCMECount}`);

    // Position camera for optimal front view of Jamestellation (distance ~270 LY)
    await cdp.evaluate(`(() => {
      window.coeVoid.pos = [-1.94, 21.6, -1580];
      window.coeVoid.yaw = 0;
      window.coeVoid.pitch = 0;
      window.coeVoid.gain = 1.0;
      window.coeVoid.mode = 'fly';
      window.coeVoid.fb = 0.0;
    })()`);

    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 1: Volumetric Masterpiece Front View
    console.log('\n--- 2. Capturing Volumetric Masterpiece Front View ---');
    await cdp.screenshot('v27_jamestellation_volumetric_masterpiece.png');

    // Screenshot 2: CME Helical Prominences Closeup
    console.log('\n--- 3. Capturing CME Helical Prominences Closeup ---');
    await cdp.evaluate(`(() => {
      window.coeVoid.pos = [-1.94, 48.0, -1640]; // Focused on upper crown prominence arches
      window.coeVoid.pitch = -0.15;
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await cdp.screenshot('v27_cme_helical_prominences.png');

    // Screenshot 3: 3D Fly-Around Parallax Angle
    console.log('\n--- 4. Capturing 3D Lateral Parallax View (Non-Planar Multi-Stratum) ---');
    await cdp.evaluate(`(() => {
      // Position camera offset to lateral starboard with yaw aimed inward at face
      window.coeVoid.pos = [65.0, 22.0, -1660];
      window.coeVoid.yaw = -0.32; // Rotate view port-ward toward center
      window.coeVoid.pitch = 0.02;
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await cdp.screenshot('v27_jamestellation_3d_parallax_angle.png');

    // Screenshot 4: Proximity Laughter Closeup with Video Blend
    console.log('\n--- 5. Capturing Proximity Laughter Morphing & Ajna Singularity ---');
    await cdp.evaluate(`(() => {
      window.coeVoid.pos = [-1.94, 21.6, -1680]; // Proximity threshold Z = -1680
      window.coeVoid.yaw = 0;
      window.coeVoid.pitch = 0;
      window.coeLaughOverride = 1.0; // Force full celestial laughter presence
    })()`);
    await new Promise(r => setTimeout(r, 1500));
    await cdp.screenshot('v27_jamestellation_laughter_closeup.png');

    console.log('\n================================================================');
    console.log('   ALL JAMESTELLATION VERIFICATION TESTS PASSED SUCCESSFULLY!  ');
    console.log('================================================================');

  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exitCode = 1;
  } finally {
    try { chromeProc.kill(); } catch (e) {}
  }
}

run();
