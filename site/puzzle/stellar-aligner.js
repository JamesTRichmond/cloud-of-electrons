/**
 * Interactive Celestial Stellar Aligner
 * Module: site/puzzle/stellar-aligner.js
 * 
 * Provides interactive raycasting / targeting of coronal resonance nodes
 * positioned around the dormant Jamestellation in 3D void space.
 */

(function(global) {
  'use strict';

  // Anchors placed relative to the Jamestellation origin [-1.94, 21.6, -1850]
  const ANCHOR_NODES = [
    {
      id: 'crown',
      sector: 'crown',
      name: 'Coronal Filament Anchor',
      pos: [-1.94, 38.0, -1830],
      radius: 12.0,
      frequency: 432,
      color: '#ffcc66'
    },
    {
      id: 'heart',
      sector: 'heart',
      name: 'Core Resonance Anchor',
      pos: [-1.94, 10.0, -1840],
      radius: 14.0,
      frequency: 528,
      color: '#66ccff'
    },
    {
      id: 'ajna',
      sector: 'ajna',
      name: 'Third Eye Ajna Focus',
      pos: [-1.94, 21.6, -1850],
      radius: 10.0,
      frequency: 963,
      color: '#ffffff'
    }
  ];

  class StellarAligner {
    constructor(gameInstance) {
      this.game = gameInstance || (typeof window !== 'undefined' ? window.COE_PUZZLE?.game : null);
      this.anchors = ANCHOR_NODES;
      this.activeAnchor = null;
      this.currentHeading = 0;
      this.cameraPos = [0, 0, 0];
    }

    updateCamera(pos, heading) {
      this.cameraPos = pos;
      this.currentHeading = heading;
    }

    /**
     * Checks if a raycast or target direction aligns with an unsolved anchor node.
     */
    checkAlignment(pointerX, pointerY, viewWidth, viewHeight) {
      if (!this.game) return null;
      const state = this.game.getState();
      if (state.state === 'RESTORED') return null;

      // Find nearest unsolved anchor
      for (const anchor of this.anchors) {
        if (state.solvedSectors.includes(anchor.sector)) continue;

        // Vector from camera to anchor
        const dx = anchor.pos[0] - this.cameraPos[0];
        const dy = anchor.pos[1] - this.cameraPos[1];
        const dz = anchor.pos[2] - this.cameraPos[2];
        const dist = Math.hypot(dx, dy, dz);

        // Proximity window: within 250 units
        if (dist < 250) {
          return {
            anchor,
            distance: dist,
            canAlign: true
          };
        }
      }

      return null;
    }

    triggerAlignment(anchorId) {
      const anchor = this.anchors.find(a => a.id === anchorId);
      if (!anchor || !this.game) return false;

      return this.game.advanceSector(anchor.sector);
    }
  }

  global.COEStellarAligner = StellarAligner;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StellarAligner, ANCHOR_NODES };
  }
})(typeof window !== 'undefined' ? window : globalThis);
