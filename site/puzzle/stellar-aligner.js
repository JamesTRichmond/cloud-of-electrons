/**
 * Interactive Celestial Stellar Aligner & Coronal Resonance Mechanics
 * Module: site/puzzle/stellar-aligner.js
 * 
 * Provides interactive raycasting, 3D celestial anchor tracking,
 * Solfeggio harmonic frequency resonance synthesis, and screen-space reticle projection.
 */

(function(global) {
  'use strict';

  // 3 Displaced Coronal Anchor Nodes centered around the Jamestellation coordinates [-1.94, 21.6, -1850]
  const ANCHOR_NODES = [
    {
      id: 'crown',
      sector: 'crown',
      name: 'Coronal Filament Anchor',
      pos: [-1.94, 38.0, -1830],
      radius: 14.0,
      frequency: 432,
      color: '#ffcc66',
      prompt: 'Stabilize outer solar flares & coronal breathing loops'
    },
    {
      id: 'heart',
      sector: 'heart',
      name: 'Core Resonance Anchor',
      pos: [-1.94, 10.0, -1840],
      radius: 16.0,
      frequency: 528,
      color: '#66ccff',
      prompt: 'Coalesce meditative posture & chest stardust'
    },
    {
      id: 'ajna',
      sector: 'ajna',
      name: 'Third Eye Ajna Focus',
      pos: [-1.94, 21.6, -1850],
      radius: 12.0,
      frequency: 963,
      color: '#ffffff',
      prompt: 'Ignite diamond star & awaken return wormhole'
    }
  ];

  class StellarAligner {
    constructor(gameInstance) {
      this.game = gameInstance || (typeof window !== 'undefined' ? window.COE_PUZZLE?.game : null);
      this.anchors = ANCHOR_NODES;
      this.cameraPos = [0, 0, 0];
      this.yaw = 0;
      this.pitch = 0;
      this.activeAnchor = null;
      this.channelProgress = 0; // 0.0 to 1.0
      this.audioCtx = null;
      this.oscillator = null;
      this.gainNode = null;
      this.isAudioActive = false;

      this.bindEvents();
    }

    /**
     * Updates camera position and orientation. Supports (pos, heading) or (pos, yaw, pitch).
     */
    updateCamera(pos, yaw = 0, pitch = 0) {
      this.cameraPos = pos || [0, 0, 0];
      this.yaw = yaw || 0;
      this.pitch = pitch || 0;
    }

    /**
     * Binds flight tick and input events for continuous resonance checking.
     */
    bindEvents() {
      if (typeof window === 'undefined') return;

      const onFlightTick = (e) => {
        if (!e.detail) return;
        const pos = e.detail.pos || [0, 0, 0];
        const yaw = e.detail.yaw || 0;
        const pitch = e.detail.pitch || 0;
        this.updateCamera(pos, yaw, pitch);
      };

      if (window.COE_EVENTS && typeof window.COE_EVENTS.on === 'function') {
        window.COE_EVENTS.on('coe:flight-tick', onFlightTick);
      } else if (window.addEventListener) {
        window.addEventListener('coe:flight-tick', onFlightTick);
      }

      // Channeling keyboard interaction [Space] or [E]
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'KeyE') {
          this.startChanneling();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.code === 'KeyE') {
          this.stopChanneling();
        }
      });
    }

    /**
     * Checks if camera position and look direction align with an unsolved anchor node.
     */
    checkAlignment(pointerX = 0, pointerY = 0, viewWidth = 1920, viewHeight = 1080) {
      if (!this.game) return null;
      const state = this.game.getState();
      if (state.state === 'RESTORED') return null;

      const aspect = viewWidth / (viewHeight || 1);
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);

      // Camera rotation matrix (matches drawVoid)
      const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
      const Rx = [[1, 0, 0], [0, cp, sp], [0, -sp, cp]];
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          for (let k = 0; k < 3; k++) {
            M[i][j] += Rx[i][k] * Ry[k][j];
          }
        }
      }

      // Camera forward vector
      const fwd = [-sy * cp, sp, -cy * cp];

      let nearestTarget = null;
      let minDistance = Infinity;

      for (const anchor of this.anchors) {
        if (state.solvedSectors.includes(anchor.sector)) continue;

        const dx = anchor.pos[0] - this.cameraPos[0];
        const dy = anchor.pos[1] - this.cameraPos[1];
        const dz = anchor.pos[2] - this.cameraPos[2];
        const dist = Math.hypot(dx, dy, dz);

        // Proximity detection window: within 250 units
        if (dist < 250) {
          // Alignment dot product with forward view vector
          const dot = (dx * fwd[0] + dy * fwd[1] + dz * fwd[2]) / (dist || 1);

          // Project to screen space
          const v = [
            M[0][0] * dx + M[0][1] * dy + M[0][2] * dz,
            M[1][0] * dx + M[1][1] * dy + M[1][2] * dz,
            M[2][0] * dx + M[2][1] * dy + M[2][2] * dz
          ];

          let screenPos = null;
          let screenRadius = 0;
          if (v[2] < -1) {
            const sx = (v[0] * 2.0503 / aspect / (-v[2]) * 0.5 + 0.5) * viewWidth;
            const sy2 = (0.5 - v[1] * 2.0503 / (-v[2]) * 0.5) * viewHeight;
            screenRadius = Math.max(16, (anchor.radius * 2.0503 * viewHeight / 2) / (-v[2]));
            screenPos = [sx, sy2];
          }

          if (dist < minDistance) {
            minDistance = dist;
            nearestTarget = {
              anchor,
              distance: dist,
              dot,
              screenPos,
              screenRadius,
              canAlign: true,
              isFocused: dot > 0.85
            };
          }
        }
      }

      this.activeAnchor = nearestTarget ? nearestTarget.anchor : null;
      return nearestTarget;
    }

    /**
     * Channels resonance energy to harmonize the target anchor node.
     */
    channelEnergy(deltaSeconds = 0.016) {
      if (!this.activeAnchor || !this.game) return;

      this.channelProgress = Math.min(1.0, this.channelProgress + deltaSeconds / 1.2);
      this.updateResonanceAudio(this.activeAnchor.frequency, this.channelProgress);

      if (this.channelProgress >= 1.0) {
        this.triggerAlignment(this.activeAnchor.id);
        this.channelProgress = 0;
        this.playHarmonicChime(this.activeAnchor.frequency);
      }
    }

    startChanneling() {
      if (this.activeAnchor) {
        this.startResonanceAudio(this.activeAnchor.frequency);
      }
    }

    stopChanneling() {
      this.channelProgress = 0;
      this.stopResonanceAudio();
    }

    /**
     * Solves and aligns a specific anchor node.
     */
    triggerAlignment(anchorId) {
      const anchor = this.anchors.find(a => a.id === anchorId);
      if (!anchor || !this.game) return false;

      return this.game.advanceSector(anchor.sector);
    }

    // ==========================================
    // Web Audio Solfeggio Harmonic Synthesizer
    // ==========================================

    ensureAudioContext() {
      if (typeof window === 'undefined') return null;
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    startResonanceAudio(frequency) {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;

      try {
        this.stopResonanceAudio();
        this.oscillator = ctx.createOscillator();
        this.gainNode = ctx.createGain();

        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        this.gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        this.gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.15);

        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(ctx.destination);

        this.oscillator.start();
        this.isAudioActive = true;
      } catch (e) {
        // Safe fallback in restricted environments
      }
    }

    updateResonanceAudio(frequency, progress) {
      if (!this.isAudioActive || !this.gainNode || !this.audioCtx) return;
      try {
        const gainVal = 0.05 + progress * 0.18;
        this.gainNode.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      } catch (e) {}
    }

    stopResonanceAudio() {
      if (this.oscillator) {
        try {
          this.oscillator.stop();
          this.oscillator.disconnect();
        } catch (e) {}
        this.oscillator = null;
      }
      if (this.gainNode) {
        try {
          this.gainNode.disconnect();
        } catch (e) {}
        this.gainNode = null;
      }
      this.isAudioActive = false;
    }

    playHarmonicChime(frequency) {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const freqs = [frequency, frequency * 1.25, frequency * 1.5]; // Major triad harmonic

        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.03);

          gain.gain.setValueAtTime(0.12 / (i + 1), now + i * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + i * 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.03);
          osc.stop(now + 2.0);
        });
      } catch (e) {}
    }
  }

  global.COEStellarAligner = StellarAligner;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StellarAligner, ANCHOR_NODES };
  }
})(typeof window !== 'undefined' ? window : globalThis);
