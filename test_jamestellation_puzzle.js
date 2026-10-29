/**
 * Automated Verification for Jamestellation Restoration Puzzle
 * Module: test_jamestellation_puzzle.js
 */

const { JamestellationRestorationGame, SECTORS, WORMHOLE_COORDINATES } = require('./site/puzzle/restoration-game.js');
const { StellarAligner, ANCHOR_NODES } = require('./site/puzzle/stellar-aligner.js');
const { JamestellationPuzzleHUD } = require('./site/puzzle/puzzle-hud.js');

console.log('Verifying Jamestellation Restoration Puzzle mechanics...');

// Mock window, document, and CustomEvent for Node environment
const eventsDispatched = [];
const eventListeners = {};

global.window = {
  coeJamestellationIntegrity: 1.0,
  dispatchEvent: (event) => {
    eventsDispatched.push(event);
    if (eventListeners[event.type]) {
      eventListeners[event.type].forEach(fn => fn(event));
    }
  },
  addEventListener: (name, fn) => {
    eventListeners[name] = eventListeners[name] || [];
    eventListeners[name].push(fn);
  },
  removeEventListener: (name, fn) => {
    if (eventListeners[name]) {
      eventListeners[name] = eventListeners[name].filter(f => f !== fn);
    }
  }
};

global.CustomEvent = class {
  constructor(type, params) {
    this.type = type;
    this.detail = params?.detail;
  }
};

// Mock minimal DOM for HUD testing
global.document = {
  createElement: (tag) => {
    return {
      tagName: tag,
      id: '',
      className: '',
      style: {},
      innerHTML: '',
      querySelector: (sel) => ({
        style: {},
        textContent: '',
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        }
      }),
      querySelectorAll: () => [],
      setAttribute: () => {},
      appendChild: () => {},
      removeChild: () => {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      }
    };
  },
  getElementById: (id) => null,
  head: {
    appendChild: () => {}
  },
  body: {
    appendChild: () => {}
  }
};

const game = new JamestellationRestorationGame();

// Test 1: Initialization
game.init({ initialIntegrity: 0.25 });
let state = game.getState();
if (state.state !== 'DORMANT' || state.targetIntegrity !== 0.25) {
  console.error('FAIL: Expected initial state DORMANT with integrity 0.25, got:', state);
  process.exit(1);
}
console.log('✓ Initialized at DORMANT state with 0.25 integrity');

// Test 2: Advance Crown Sector
game.advanceSector('crown');
state = game.getState();
if (state.targetIntegrity !== 0.50 || !state.solvedSectors.includes('crown')) {
  console.error('FAIL: Expected Crown sector to bring integrity to 0.50, got:', state);
  process.exit(1);
}
console.log('✓ Sector 1 (Crown) solved -> integrity 0.50');

// Test 3: Advance Heart Sector
game.advanceSector('heart');
state = game.getState();
if (state.targetIntegrity !== 0.75 || !state.solvedSectors.includes('heart')) {
  console.error('FAIL: Expected Heart sector to bring integrity to 0.75, got:', state);
  process.exit(1);
}
console.log('✓ Sector 2 (Heart) solved -> integrity 0.75');

// Test 4: Advance Ajna / Third Eye Sector (Completion)
game.advanceSector('ajna');
state = game.getState();
if (state.targetIntegrity !== 1.00 || state.state !== 'RESTORED' || !state.isWormholeUnlocked) {
  console.error('FAIL: Expected full restoration at 1.00 with wormhole unlocked, got:', state);
  process.exit(1);
}
console.log('✓ Sector 3 (Ajna) solved -> full 1.00 restoration & wormhole unlocked');

// Test 5: Verify Event Dispatches
const wormholeEvent = eventsDispatched.find(e => e.type === 'coe:wormhole-unlocked');
if (!wormholeEvent || !wormholeEvent.detail || !wormholeEvent.detail.ready) {
  console.error('FAIL: coe:wormhole-unlocked event was not dispatched correctly:', eventsDispatched);
  process.exit(1);
}
console.log('✓ Event bus dispatched coe:wormhole-unlocked with target coordinates');

const completeEvent = eventsDispatched.find(e => e.type === 'coe:puzzle-complete');
if (!completeEvent || completeEvent.detail.integrity !== 1.0) {
  console.error('FAIL: coe:puzzle-complete was not dispatched correctly:', completeEvent);
  process.exit(1);
}
console.log('✓ Event bus dispatched coe:puzzle-complete');

const laughEvent = eventsDispatched.find(e => e.type === 'coe:celestial-laugh');
if (!laughEvent) {
  console.error('FAIL: coe:celestial-laugh was not dispatched on awakening');
  process.exit(1);
}
console.log('✓ Event bus dispatched coe:celestial-laugh');

const glintEvent = eventsDispatched.find(e => e.type === 'coe:diamond-glint');
if (!glintEvent) {
  console.error('FAIL: coe:diamond-glint was not dispatched on awakening');
  process.exit(1);
}
console.log('✓ Event bus dispatched coe:diamond-glint');

// Test 6: Stellar Aligner Proximity & Node Match
const aligner = new StellarAligner(game);
game.init({ initialIntegrity: 0.25 }); // reset for aligner test
aligner.updateCamera([-1.94, 30.0, -1800], 0);
const match = aligner.checkAlignment(0, 0, 1920, 1080);
if (!match || match.anchor.id !== 'crown') {
  console.error('FAIL: Expected aligner to target nearest crown anchor, got:', match);
  process.exit(1);
}
console.log('✓ Stellar Aligner raycasting correctly identified crown anchor node');

// Test 7: Solfeggio Harmonic Frequency Mapping
const crownNode = ANCHOR_NODES.find(n => n.id === 'crown');
const heartNode = ANCHOR_NODES.find(n => n.id === 'heart');
const ajnaNode = ANCHOR_NODES.find(n => n.id === 'ajna');
if (crownNode.frequency !== 432 || heartNode.frequency !== 528 || ajnaNode.frequency !== 963) {
  console.error('FAIL: Anchor node frequencies incorrect:', { crown: crownNode.frequency, heart: heartNode.frequency, ajna: ajnaNode.frequency });
  process.exit(1);
}
console.log('✓ Solfeggio harmonic frequencies verified (432 Hz, 528 Hz, 963 Hz)');

// Test 8: Sealed Wormhole Defense & Deflection
game.init({ initialIntegrity: 0.25 });
const isDeflectedWhileSealed = game.checkWormholeDeflection([-1.94, 21.6, -1845]);
if (!isDeflectedWhileSealed) {
  console.error('FAIL: Expected sealed wormhole to deflect ship when integrity < 1.00');
  process.exit(1);
}
const sealedEvent = eventsDispatched.find(e => e.type === 'coe:wormhole-sealed');
if (!sealedEvent) {
  console.error('FAIL: coe:wormhole-sealed event was not dispatched during deflection');
  process.exit(1);
}
console.log('✓ Sealed wormhole defense prevents premature entry and dispatches coe:wormhole-sealed');

// Test 9: Deep Void Arrival Flight Tick Trigger (Z < -1400)
game.reset();
if (game.state !== 'UNINITIALIZED') {
  console.error('FAIL: Expected game to reset to UNINITIALIZED, got:', game.state);
  process.exit(1);
}
window.dispatchEvent(new CustomEvent('coe:flight-tick', {
  detail: { pos: [0, 0, -1450], yaw: 0, pitch: 0 }
}));
if (game.state !== 'DORMANT' || game.currentIntegrity !== 0.25) {
  console.error('FAIL: Flight tick at Z < -1400 did not trigger DORMANT state:', game.getState());
  process.exit(1);
}
console.log('✓ Flight tick at Z < -1400 automatically triggers dormant puzzle state');

// Test 10: Shader Coupling Verification
if (window.coeJamestellationIntegrity !== 0.25) {
  console.error('FAIL: Shader hook window.coeJamestellationIntegrity not coupled to 0.25:', window.coeJamestellationIntegrity);
  process.exit(1);
}
game.advanceSector('crown');
if (window.coeJamestellationIntegrity !== 0.50) {
  console.error('FAIL: Shader hook window.coeJamestellationIntegrity not updated to 0.50:', window.coeJamestellationIntegrity);
  process.exit(1);
}
console.log('✓ WebGL shader uniform hook window.coeJamestellationIntegrity correctly modulated (0.25 -> 0.50)');

// Test 11: HUD Mounting and Update Verification
const hud = new JamestellationPuzzleHUD();
hud.mount(document.body);
hud.update(0.75, 'SECTOR 2 RESTORED');
if (hud.currentIntegrity !== 0.75) {
  console.error('FAIL: HUD currentIntegrity expected 0.75, got:', hud.currentIntegrity);
  process.exit(1);
}
console.log('✓ Jamestellation Puzzle HUD mounts and updates successfully');

// Test 12: Force Restoration & Reset
game.forceRestore();
if (game.getState().state !== 'RESTORED' || game.getState().targetIntegrity !== 1.00) {
  console.error('FAIL: forceRestore did not fully restore puzzle:', game.getState());
  process.exit(1);
}
game.reset();
if (game.getState().state !== 'UNINITIALIZED' || window.coeJamestellationIntegrity !== 1.00) {
  console.error('FAIL: reset did not restore state to UNINITIALIZED with 1.0 integrity:', game.getState());
  process.exit(1);
}
console.log('✓ forceRestore and reset functions verified');

console.log('\nAll 12 Jamestellation Restoration Puzzle verification assertions PASSED!');
