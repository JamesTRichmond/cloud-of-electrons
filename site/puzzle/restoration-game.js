/**
 * Jamestellation Restoration Puzzle Manager
 * Module: site/puzzle/restoration-game.js
 * 
 * Controls constellation puzzle state and smoothly drives `window.coeJamestellationIntegrity`
 * from 0.25 (dormant/corrupted) to 1.00 (fully reconstituted).
 * 
 * Environmental Gameplay Mechanics:
 * - On arrival at deep void coordinates (Z < -1400), Jamestellation is found in a dormant,
 *   dispersed stardust state (integrity = 0.25) with the Third Eye return wormhole sealed.
 * - Solving coronal resonance anchors progressively reconstitutes the 28,000 particles:
 *     Sector 1 (Crown Filament Anchor): Integrity -> 0.50 (Coronal flares stabilize)
 *     Sector 2 (Heart Core Resonance):  Integrity -> 0.75 (Meditative posture particles coalesce)
 *     Sector 3 (Ajna / Third Eye Focus): Integrity -> 1.00 (Volumetric majesty restored!)
 * - At 1.00, celestial laughter bursts forth, the Ajna star ignites with diamond glint,
 *   and the return wormhole awakens via `coe:wormhole-unlocked`.
 */

(function(global) {
  'use strict';

  // Ensure global event bus fallback exists
  if (typeof window !== 'undefined') {
    window.COE_EVENTS = window.COE_EVENTS || {
      dispatch(name, detail = {}) {
        try {
          window.dispatchEvent(new CustomEvent(name, { detail }));
        } catch(e) {
          console.warn('[COE_EVENTS] Dispatch error:', e);
        }
      },
      on(name, handler) {
        window.addEventListener(name, handler);
      },
      off(name, handler) {
        window.removeEventListener(name, handler);
      }
    };
  }

  const SECTORS = [
    {
      id: 'crown',
      name: 'Coronal Filament Anchor',
      targetIntegrity: 0.50,
      frequency: 432,
      description: 'Stabilize outer stellar flares and coronal breathing loops',
      lore: 'The solar halo of the Jamestellation settles into calm harmonic rhythm.'
    },
    {
      id: 'heart',
      name: 'Core Resonance Anchor',
      targetIntegrity: 0.75,
      frequency: 528,
      description: 'Coalesce anatomical chest, neck, and meditative posture particles',
      lore: 'The 28,000 stardust particles gather inward, forming the serene seated figure.'
    },
    {
      id: 'ajna',
      name: 'Third Eye Ajna Focus',
      targetIntegrity: 1.00,
      frequency: 963,
      description: 'Ignite diamond star, bloom full volumetric majesty, awaken wormhole',
      lore: 'The diamond star at the pineal center blazes into life. The way back opens.'
    }
  ];

  const WORMHOLE_COORDINATES = [-1.94, 21.6, -1850];
  const WORMHOLE_RADIUS = 32.0;

  class JamestellationRestorationGame {
    constructor() {
      this.state = 'UNINITIALIZED'; // UNINITIALIZED, DORMANT, ATTUNING, RESTORING_SECTOR, RESTORED
      this.currentIntegrity = 1.0;
      this.targetIntegrity = 1.0;
      this.initialIntegrity = 0.25;
      this.solvedSectors = new Set();
      this.animId = null;
      this.isAutoTriggered = false;
      this.wormholeTarget = WORMHOLE_COORDINATES;
      this.wormholeRadius = WORMHOLE_RADIUS;
      this.isWormholeUnlocked = false;
      this.laughAudio = null;
      this.audioAttempted = false;

      this.bindFlightTick();
    }

    /**
     * Initializes or resets the puzzle to its dormant starting state.
     */
    init(options = {}) {
      if (options.initialIntegrity !== undefined) {
        this.initialIntegrity = options.initialIntegrity;
      }
      
      this.solvedSectors.clear();
      this.state = 'DORMANT';
      this.isWormholeUnlocked = false;
      this.targetIntegrity = this.initialIntegrity;
      this.currentIntegrity = this.initialIntegrity;
      
      this.applyIntegrity(this.currentIntegrity);
      this.startInterpolationLoop();

      this.dispatch('coe:puzzle-init', {
        initialIntegrity: this.initialIntegrity,
        sectors: SECTORS,
        state: this.state,
        wormholeLocked: true
      });
    }

    /**
     * Dispatches custom events using the global bus or standard DOM events.
     */
    dispatch(name, detail = {}) {
      if (typeof window !== 'undefined') {
        if (window.COE_EVENTS && typeof window.COE_EVENTS.dispatch === 'function') {
          window.COE_EVENTS.dispatch(name, detail);
        } else if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent(name, { detail }));
        }
      }
    }

    /**
     * Binds to the flight engine event bus to trigger puzzle upon deep void entry.
     */
    bindFlightTick() {
      if (typeof window === 'undefined') return;

      const onFlightTick = (e) => {
        if (!e.detail || !e.detail.pos) return;
        const [x, y, z] = e.detail.pos;
        
        // Deep cosmic void arrival trigger (Z < -1400)
        if (z < -1400) {
          if (this.state === 'UNINITIALIZED' && !this.isAutoTriggered) {
            this.isAutoTriggered = true;
            this.init();
          }

          // Check sealed wormhole proximity defense
          if (!this.isWormholeUnlocked) {
            this.checkWormholeDeflection([x, y, z]);
          }
        }
      };

      if (window.COE_EVENTS && typeof window.COE_EVENTS.on === 'function') {
        window.COE_EVENTS.on('coe:flight-tick', onFlightTick);
      } else if (window.addEventListener) {
        window.addEventListener('coe:flight-tick', onFlightTick);
      }
    }

    /**
     * Deflects or warns travelers if they attempt to enter the sealed Third Eye
     * wormhole before restoring coronal integrity to 1.00.
     */
    checkWormholeDeflection(pos) {
      const [x, y, z] = pos;
      const [wx, wy, wz] = this.wormholeTarget;
      const dist = Math.hypot(x - wx, y - wy, z - wz);

      if (dist < this.wormholeRadius + 15 && z <= wz + 10) {
        this.dispatch('coe:wormhole-sealed', {
          pos,
          dist,
          message: 'Third Eye wormhole sealed. Align coronal nodes to restore constellation integrity.',
          integrity: this.currentIntegrity
        });
        return true;
      }
      return false;
    }

    /**
     * Advances the puzzle by solving a corrupted sector.
     * Progresses integrity:
     *   crown -> 0.50
     *   heart -> 0.75
     *   ajna  -> 1.00 (Awakening & wormhole unlock)
     */
    advanceSector(sectorId) {
      const sector = SECTORS.find(s => s.id === sectorId);
      if (!sector) return false;
      if (this.solvedSectors.has(sectorId)) return true;

      this.solvedSectors.add(sectorId);
      this.targetIntegrity = sector.targetIntegrity;
      const isComplete = this.solvedSectors.size === SECTORS.length;
      this.state = isComplete ? 'RESTORED' : 'ATTUNING';
      this.isWormholeUnlocked = isComplete;

      // In headless/test environment without requestAnimationFrame, immediately apply target integrity
      if (typeof requestAnimationFrame === 'undefined') {
        this.currentIntegrity = this.targetIntegrity;
        this.applyIntegrity(this.currentIntegrity);
      }

      // Dispatch progress event
      this.dispatch('coe:puzzle-progress', {
        sector: sectorId,
        sectorId,
        sectorName: sector.name,
        targetIntegrity: sector.targetIntegrity,
        integrity: sector.targetIntegrity,
        frequency: sector.frequency,
        solvedCount: this.solvedSectors.size,
        totalSectors: SECTORS.length,
        lore: sector.lore
      });

      if (isComplete) {
        this.triggerAwakening();
      }

      return true;
    }

    /**
     * Convenience alias for advanceSector.
     */
    solveSector(sectorId) {
      return this.advanceSector(sectorId);
    }

    /**
     * Triggers the grand awakening sequence once all 3 sectors are restored.
     */
    triggerAwakening() {
      // 1. Dispatch puzzle complete
      this.dispatch('coe:puzzle-complete', {
        integrity: 1.00,
        solvedSectors: Array.from(this.solvedSectors),
        message: 'Jamestellation fully reconstituted in volumetric 3D majesty.'
      });

      // 2. Play celestial laughter audio
      this.playCelestialLaughter();

      // 3. Dispatch diamond star glint
      this.dispatch('coe:diamond-glint', {
        pos: this.wormholeTarget,
        intensity: 1.0
      });

      // 4. Unlock return wormhole
      this.dispatch('coe:wormhole-unlocked', {
        ready: true,
        targetPos: this.wormholeTarget,
        message: 'Ajna star ignited. Third Eye wormhole active. Enter to return.'
      });
    }

    /**
     * Plays the celestial laughter sound clip (`site/jamestellation-laugh.mp3`).
     */
    playCelestialLaughter() {
      if (typeof window === 'undefined') return;

      try {
        if (!this.laughAudio) {
          this.laughAudio = new Audio('jamestellation-laugh.mp3');
          this.laughAudio.volume = 0.85;
        }
        this.laughAudio.currentTime = 0;
        const playPromise = this.laughAudio.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(() => {
            // Audio autoplay policy fallback
          });
        }
      } catch (e) {
        // Fallback gracefully in headless/restricted environments
      }

      this.dispatch('coe:celestial-laugh', { volume: 0.85 });
    }

    /**
     * Interpolates integrity towards target integrity every frame for smooth particle animation.
     */
    startInterpolationLoop() {
      if (typeof requestAnimationFrame === 'undefined') {
        // Headless environment: snap directly to target
        this.currentIntegrity = this.targetIntegrity;
        this.applyIntegrity(this.currentIntegrity);
        return;
      }

      const step = () => {
        const diff = this.targetIntegrity - this.currentIntegrity;
        if (Math.abs(diff) > 0.001) {
          this.currentIntegrity += diff * 0.08;
          this.applyIntegrity(this.currentIntegrity);
        } else if (this.currentIntegrity !== this.targetIntegrity) {
          this.currentIntegrity = this.targetIntegrity;
          this.applyIntegrity(this.currentIntegrity);
        }

        if (this.animId !== null) {
          this.animId = requestAnimationFrame(step);
        }
      };

      if (this.animId === null) {
        this.animId = requestAnimationFrame(step);
      }
    }

    /**
     * Sets the global shader hook `window.coeJamestellationIntegrity`.
     */
    applyIntegrity(val) {
      if (typeof window !== 'undefined') {
        window.coeJamestellationIntegrity = val;
      }
    }

    /**
     * Returns full snapshot of puzzle state.
     */
    getState() {
      return {
        state: this.state,
        currentIntegrity: this.currentIntegrity,
        targetIntegrity: this.targetIntegrity,
        solvedSectors: Array.from(this.solvedSectors),
        unsolvedSectors: SECTORS.map(s => s.id).filter(id => !this.solvedSectors.has(id)),
        totalSectors: SECTORS.length,
        isWormholeUnlocked: this.isWormholeUnlocked,
        wormholeTarget: this.wormholeTarget
      };
    }

    /**
     * Forces immediate restoration for testing or shortcuts.
     */
    forceRestore() {
      for (const s of SECTORS) {
        this.advanceSector(s.id);
      }
    }

    /**
     * Resets puzzle to original state.
     */
    reset() {
      if (typeof cancelAnimationFrame !== 'undefined' && this.animId !== null) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      this.solvedSectors.clear();
      this.state = 'UNINITIALIZED';
      this.isAutoTriggered = false;
      this.isWormholeUnlocked = false;
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
      WORMHOLE_COORDINATES,
      init: (opts) => game.init(opts),
      advanceSector: (id) => game.advanceSector(id),
      solveSector: (id) => game.advanceSector(id),
      getState: () => game.getState(),
      reset: () => game.reset(),
      forceRestore: () => game.forceRestore()
    };

    if (window.COE_EXTENSIONS) {
      window.COE_EXTENSIONS.puzzle = window.COE_PUZZLE;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JamestellationRestorationGame, SECTORS, WORMHOLE_COORDINATES };
  }
})(typeof window !== 'undefined' ? window : globalThis);
