/**
 * Jamestellation Restoration Puzzle Manager
 * Module: site/puzzle/restoration-game.js
 * 
 * Controls constellation puzzle state and smoothly drives `window.coeJamestellationIntegrity`
 * from 0.25 (dormant/corrupted) to 1.00 (fully reconstituted).
 */

(function(global) {
  'use strict';

  const SECTORS = [
    { id: 'crown', name: 'Coronal Filament Anchor', targetIntegrity: 0.50, description: 'Stabilize outer stellar flares' },
    { id: 'heart', name: 'Core Resonance Anchor', targetIntegrity: 0.75, description: 'Coalesce anatomical chest and posture' },
    { id: 'ajna',  name: 'Third Eye Ajna Focus',  targetIntegrity: 1.00, description: 'Ignite diamond star and open wormhole' }
  ];

  class JamestellationRestorationGame {
    constructor() {
      this.state = 'UNINITIALIZED'; // UNINITIALIZED, ACTIVE, RESTORED
      this.currentIntegrity = 1.0;
      this.targetIntegrity = 1.0;
      this.solvedSectors = new Set();
      this.animId = null;
      this.isAutoTriggered = false;
      this.initialIntegrity = 0.25;
    }

    init(options = {}) {
      if (options.initialIntegrity !== undefined) {
        this.initialIntegrity = options.initialIntegrity;
      }
      
      this.solvedSectors.clear();
      this.state = 'DORMANT';
      this.targetIntegrity = this.initialIntegrity;
      this.currentIntegrity = this.initialIntegrity;
      
      this.applyIntegrity(this.currentIntegrity);
      this.startInterpolationLoop();

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('coe:puzzle-init', {
          detail: { initialIntegrity: this.initialIntegrity, sectors: SECTORS }
        }));
      }

      this.bindFlightTick();
    }

    bindFlightTick() {
      if (typeof window === 'undefined' || !window.addEventListener) return;

      window.addEventListener('coe:flight-tick', (e) => {
        if (!e.detail || !e.detail.pos) return;
        const [x, y, z] = e.detail.pos;
        
        // When approaching deep void where Jamestellation resides (Z < -1400)
        if (z < -1400 && this.state === 'UNINITIALIZED' && !this.isAutoTriggered) {
          this.isAutoTriggered = true;
          this.init();
        }
      });
    }

    advanceSector(sectorId) {
      const sector = SECTORS.find(s => s.id === sectorId);
      if (!sector) return false;
      if (this.solvedSectors.has(sectorId)) return true;

      this.solvedSectors.add(sectorId);
      this.targetIntegrity = sector.targetIntegrity;
      this.state = this.solvedSectors.size === SECTORS.length ? 'RESTORED' : 'ATTUNING';

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('coe:puzzle-progress', {
          detail: {
            sectorId,
            sectorName: sector.name,
            targetIntegrity: sector.targetIntegrity,
            solvedCount: this.solvedSectors.size,
            totalSectors: SECTORS.length
          }
        }));

        if (this.state === 'RESTORED') {
          window.dispatchEvent(new CustomEvent('coe:puzzle-complete', {
            detail: { integrity: 1.00 }
          }));

          // Unlock return wormhole at Third Eye coordinates
          window.dispatchEvent(new CustomEvent('coe:wormhole-unlocked', {
            detail: {
              ready: true,
              targetPos: [-1.94, 21.6, -1850],
              message: 'Ajna star ignited. Third Eye wormhole active.'
            }
          }));
        }
      }

      return true;
    }

    startInterpolationLoop() {
      const step = () => {
        const diff = this.targetIntegrity - this.currentIntegrity;
        if (Math.abs(diff) > 0.001) {
          this.currentIntegrity += diff * 0.08;
          this.applyIntegrity(this.currentIntegrity);
        } else if (this.currentIntegrity !== this.targetIntegrity) {
          this.currentIntegrity = this.targetIntegrity;
          this.applyIntegrity(this.currentIntegrity);
        }

        if (typeof requestAnimationFrame !== 'undefined') {
          this.animId = requestAnimationFrame(step);
        }
      };

      if (typeof requestAnimationFrame !== 'undefined') {
        this.animId = requestAnimationFrame(step);
      }
    }

    applyIntegrity(val) {
      if (typeof window !== 'undefined') {
        window.coeJamestellationIntegrity = val;
      }
    }

    getState() {
      return {
        state: this.state,
        currentIntegrity: this.currentIntegrity,
        targetIntegrity: this.targetIntegrity,
        solvedSectors: Array.from(this.solvedSectors),
        totalSectors: SECTORS.length,
        isWormholeUnlocked: this.solvedSectors.size === SECTORS.length
      };
    }

    reset() {
      if (typeof cancelAnimationFrame !== 'undefined' && this.animId) {
        cancelAnimationFrame(this.animId);
      }
      this.solvedSectors.clear();
      this.state = 'UNINITIALIZED';
      this.targetIntegrity = 1.0;
      this.currentIntegrity = 1.0;
      this.applyIntegrity(1.0);
    }
  }

  const game = new JamestellationRestorationGame();
  global.COEJamestellationPuzzle = game;

  if (typeof window !== 'undefined') {
    window.COE_PUZZLE = {
      game,
      SECTORS,
      init: (opts) => game.init(opts),
      advanceSector: (id) => game.advanceSector(id),
      getState: () => game.getState(),
      reset: () => game.reset()
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JamestellationRestorationGame, SECTORS };
  }
})(typeof window !== 'undefined' ? window : globalThis);
