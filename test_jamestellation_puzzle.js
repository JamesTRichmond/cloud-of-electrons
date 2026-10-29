/**
 * Automated Verification for Jamestellation Restoration Puzzle
 * Module: test_jamestellation_puzzle.js
 */

const { JamestellationRestorationGame, SECTORS } = require('./site/puzzle/restoration-game.js');
const { StellarAligner, ANCHOR_NODES } = require('./site/puzzle/stellar-aligner.js');

console.log('Verifying Jamestellation Restoration Puzzle mechanics...');

// Mock window and CustomEvent for Node environment
const eventsDispatched = [];
global.window = {
  coeJamestellationIntegrity: 1.0,
  dispatchEvent: (event) => {
    eventsDispatched.push(event);
  }
};
global.CustomEvent = class {
  constructor(type, params) {
    this.type = type;
    this.detail = params?.detail;
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

console.log('\nAll Jamestellation Restoration Puzzle tests PASSED!');
