/**
 * Jamestellation Restoration Puzzle HUD
 * Module: site/puzzle/puzzle-hud.js
 * 
 * Minimalist obsidian & celestial starlight HUD displaying corruption status,
 * coronal sector integrity (25% -> 50% -> 75% -> 100%), Solfeggio frequency indicators,
 * and the Third Eye return wormhole awakening sequence.
 */

(function(global) {
  'use strict';

  class JamestellationPuzzleHUD {
    constructor() {
      this.el = null;
      this.meterFill = null;
      this.percentText = null;
      this.statusText = null;
      this.sectorList = null;
      this.reticleEl = null;
      this.glintEl = null;
      this.isVisible = false;
      this.currentIntegrity = 0.25;

      // Auto-mount if document is available
      if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.mount());
        } else {
          this.mount();
        }
      }
    }

    mount(parentEl = (typeof document !== 'undefined' ? document.body : null)) {
      if (!parentEl || document.getElementById('coe-puzzle-hud')) return;

      this.injectStyles();

      const hud = document.createElement('div');
      hud.id = 'coe-puzzle-hud';
      hud.setAttribute('role', 'status');
      hud.setAttribute('aria-live', 'polite');
      hud.className = 'coe-puzzle-hidden';

      hud.innerHTML = `
        <div class="coe-puzzle-card">
          <div class="coe-puzzle-header">
            <div class="coe-puzzle-title-group">
              <span class="coe-puzzle-glyph" id="coe-puzzle-glyph">✦</span>
              <span class="coe-puzzle-title">JAMESTELLATION CORONAL INTEGRITY</span>
            </div>
            <span class="coe-puzzle-pct" id="coe-puzzle-pct">25%</span>
          </div>

          <div class="coe-puzzle-track">
            <div class="coe-puzzle-bar" id="coe-puzzle-bar" style="width: 25%;"></div>
            <div class="coe-puzzle-notch notch-50" title="Sector 1: Crown (50%)"></div>
            <div class="coe-puzzle-notch notch-75" title="Sector 2: Heart (75%)"></div>
            <div class="coe-puzzle-notch notch-100" title="Sector 3: Ajna (100%)"></div>
          </div>

          <div class="coe-puzzle-sectors" id="coe-puzzle-sectors">
            <span class="coe-sector-pill" id="sector-pill-crown">
              <span class="coe-pill-dot"></span> CROWN (432 Hz)
            </span>
            <span class="coe-sector-pill" id="sector-pill-heart">
              <span class="coe-pill-dot"></span> HEART (528 Hz)
            </span>
            <span class="coe-sector-pill" id="sector-pill-ajna">
              <span class="coe-pill-dot"></span> AJNA (963 Hz)
            </span>
          </div>

          <div class="coe-puzzle-status" id="coe-puzzle-status">
            DORMANT STARDUST STATE — ALIGN DISPLACED CORONAL NODES
          </div>

          <div class="coe-puzzle-hint" id="coe-puzzle-hint">
            AIM RETICLE AT RESONANCE NODES • HOLD [SPACE] OR CLICK TO HARMONIZE
          </div>

          <!-- Diamond Glint Sparkle Canvas/Element -->
          <div class="coe-puzzle-glint" id="coe-puzzle-glint"></div>
        </div>
      `;

      parentEl.appendChild(hud);
      this.el = hud;

      this.meterFill = hud.querySelector('#coe-puzzle-bar');
      this.percentText = hud.querySelector('#coe-puzzle-pct');
      this.statusText = hud.querySelector('#coe-puzzle-status');
      this.sectorList = hud.querySelector('#coe-puzzle-sectors');
      this.glintEl = hud.querySelector('#coe-puzzle-glint');

      this.bindEvents();
    }

    injectStyles() {
      if (document.getElementById('coe-puzzle-styles')) return;
      const s = document.createElement('style');
      s.id = 'coe-puzzle-styles';
      s.textContent = `
        #coe-puzzle-hud {
          position: fixed;
          top: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          pointer-events: none;
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #coe-puzzle-hud.coe-puzzle-hidden {
          opacity: 0;
          transform: translate(-50%, -18px);
          pointer-events: none;
        }
        .coe-puzzle-card {
          position: relative;
          background: rgba(10, 14, 24, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          padding: 14px 24px;
          min-width: 440px;
          max-width: 520px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 9px;
          overflow: hidden;
        }
        .coe-puzzle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .coe-puzzle-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .coe-puzzle-glyph {
          color: #ffcc66;
          font-size: 14px;
          display: inline-block;
          animation: coePulseGlyph 2.4s ease-in-out infinite;
        }
        @keyframes coePulseGlyph {
          0%, 100% { transform: scale(1.0); opacity: 0.85; filter: drop-shadow(0 0 3px #ffcc66); }
          50% { transform: scale(1.25); opacity: 1.0; filter: drop-shadow(0 0 9px #ffcc66); }
        }
        .coe-puzzle-title {
          font-size: 11px;
          letter-spacing: 0.16em;
          color: rgba(240, 235, 222, 0.95);
          font-weight: 600;
          text-transform: uppercase;
        }
        .coe-puzzle-pct {
          font-family: "SF Mono", Monaco, Consolas, monospace;
          font-size: 13px;
          font-weight: 700;
          color: #ffcc66;
          letter-spacing: 0.05em;
        }
        .coe-puzzle-track {
          position: relative;
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          overflow: visible;
        }
        .coe-puzzle-bar {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, #ff9933, #ffcc66, #ffffff);
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 14px rgba(255, 204, 102, 0.6);
        }
        .coe-puzzle-notch {
          position: absolute;
          top: -2px;
          width: 2px;
          height: 10px;
          background: rgba(255, 255, 255, 0.35);
          transform: translateX(-50%);
        }
        .coe-puzzle-notch.notch-50 { left: 50%; }
        .coe-puzzle-notch.notch-75 { left: 75%; }
        .coe-puzzle-notch.notch-100 { left: 100%; }
        
        .coe-puzzle-sectors {
          display: flex;
          justify-content: space-between;
          gap: 6px;
        }
        .coe-sector-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.04);
          padding: 3px 8px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.4s ease;
        }
        .coe-pill-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          transition: all 0.4s ease;
        }
        .coe-sector-pill.solved {
          color: #ffcc66;
          border-color: rgba(255, 204, 102, 0.4);
          background: rgba(255, 204, 102, 0.1);
        }
        .coe-sector-pill.solved .coe-pill-dot {
          background: #ffcc66;
          box-shadow: 0 0 6px #ffcc66;
        }
        .coe-sector-pill.active {
          color: #66ccff;
          border-color: rgba(102, 204, 255, 0.5);
          background: rgba(102, 204, 255, 0.12);
        }
        .coe-sector-pill.active .coe-pill-dot {
          background: #66ccff;
          box-shadow: 0 0 8px #66ccff;
          animation: coeBlinkDot 1s infinite alternate;
        }
        @keyframes coeBlinkDot {
          from { opacity: 0.4; }
          to { opacity: 1.0; }
        }

        .coe-puzzle-status {
          font-size: 10px;
          letter-spacing: 0.09em;
          color: rgba(240, 235, 222, 0.75);
          text-align: center;
          text-transform: uppercase;
          min-height: 14px;
        }
        .coe-puzzle-hint {
          font-size: 8.5px;
          letter-spacing: 0.12em;
          color: rgba(255, 204, 102, 0.65);
          text-align: center;
          text-transform: uppercase;
        }

        /* Restored 100% Bloom Majesty */
        .coe-puzzle-restored .coe-puzzle-bar {
          background: linear-gradient(90deg, #66ccff, #ffffff);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.9), 0 0 35px rgba(102, 204, 255, 0.8);
        }
        .coe-puzzle-restored .coe-puzzle-pct {
          color: #ffffff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        }
        .coe-puzzle-restored .coe-puzzle-status {
          color: #ffffff;
          font-weight: 600;
          text-shadow: 0 0 8px rgba(102, 204, 255, 0.7);
        }
        .coe-puzzle-restored .coe-sector-pill {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.5);
        }
        .coe-puzzle-restored .coe-pill-dot {
          background: #ffffff;
          box-shadow: 0 0 8px #ffffff;
        }

        /* Diamond Glint Sparkle Effect */
        .coe-puzzle-glint {
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(255, 255, 255, 0.45),
            rgba(255, 255, 255, 0.85),
            rgba(255, 255, 255, 0.45),
            transparent
          );
          transform: skewX(-25deg);
          pointer-events: none;
        }
        .coe-puzzle-glint.sparkle {
          animation: coeGlintSweep 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes coeGlintSweep {
          0% { left: -80%; opacity: 0; }
          40% { opacity: 1; }
          100% { left: 160%; opacity: 0; }
        }
      `;
      document.head.appendChild(s);
    }

    bindEvents() {
      if (typeof window === 'undefined') return;

      // Global flight proximity detection: display HUD when in Jamestellation deep void
      const onFlightTick = (e) => {
        if (!e.detail || !e.detail.pos) return;
        const z = e.detail.pos[2];
        if (z < -1400) {
          if (!this.isVisible) this.show();
        } else if (z > -1100) {
          if (this.isVisible) this.hide();
        }
      };

      if (window.COE_EVENTS && typeof window.COE_EVENTS.on === 'function') {
        window.COE_EVENTS.on('coe:flight-tick', onFlightTick);
      } else if (window.addEventListener) {
        window.addEventListener('coe:flight-tick', onFlightTick);
      }

      // Puzzle Events
      window.addEventListener('coe:puzzle-init', (e) => {
        const initIntegrity = e.detail?.initialIntegrity ?? 0.25;
        this.update(initIntegrity, 'DORMANT STARDUST STATE — ALIGN DISPLACED CORONAL NODES');
        this.resetPills();
        this.show();
      });

      window.addEventListener('coe:puzzle-progress', (e) => {
        const pct = e.detail?.targetIntegrity ?? e.detail?.integrity ?? 0.5;
        const sectorId = e.detail?.sector || e.detail?.sectorId;
        const name = e.detail?.sectorName || sectorId;

        this.markSectorSolved(sectorId);
        this.update(pct, `SECTOR RESTORED: ${name.toUpperCase()} [${Math.round(pct * 100)}%]`);
        this.show();
      });

      window.addEventListener('coe:diamond-glint', () => {
        this.triggerGlintAnimation();
      });

      window.addEventListener('coe:wormhole-unlocked', (e) => {
        this.update(1.0, '✦ VOLUMETRIC MAJESTY RESTORED — THIRD EYE WORMHOLE ACTIVE ✦');
        if (this.el) this.el.classList.add('coe-puzzle-restored');
        this.markSectorSolved('crown');
        this.markSectorSolved('heart');
        this.markSectorSolved('ajna');
        this.triggerGlintAnimation();
        this.show();
      });

      window.addEventListener('coe:wormhole-sealed', (e) => {
        this.flashStatus('⚠ THIRD EYE WORMHOLE SEALED — COMPLETE CORONAL RESTORATION FIRST ⚠');
      });
    }

    update(integrity, statusMsg) {
      this.currentIntegrity = integrity;
      const pct = Math.min(100, Math.max(0, Math.round(integrity * 100)));
      if (this.meterFill) this.meterFill.style.width = `${pct}%`;
      if (this.percentText) this.percentText.textContent = `${pct}%`;
      if (statusMsg && this.statusText) this.statusText.textContent = statusMsg;
    }

    markSectorSolved(sectorId) {
      if (!this.el) return;
      const pill = this.el.querySelector(`#sector-pill-${sectorId}`);
      if (pill) {
        pill.classList.remove('active');
        pill.classList.add('solved');
      }
    }

    resetPills() {
      if (!this.el) return;
      ['crown', 'heart', 'ajna'].forEach(id => {
        const pill = this.el.querySelector(`#sector-pill-${id}`);
        if (pill) {
          pill.classList.remove('solved');
          pill.classList.remove('active');
        }
      });
      if (this.el) this.el.classList.remove('coe-puzzle-restored');
    }

    triggerGlintAnimation() {
      if (!this.glintEl) return;
      this.glintEl.classList.remove('sparkle');
      void this.glintEl.offsetWidth; // force DOM reflow
      this.glintEl.classList.add('sparkle');
    }

    flashStatus(msg) {
      if (!this.statusText) return;
      const prev = this.statusText.textContent;
      this.statusText.textContent = msg;
      this.statusText.style.color = '#ff6666';
      setTimeout(() => {
        if (this.statusText) {
          this.statusText.textContent = prev;
          this.statusText.style.color = '';
        }
      }, 3000);
    }

    show() {
      if (this.el) {
        this.el.classList.remove('coe-puzzle-hidden');
        this.isVisible = true;
      }
    }

    hide() {
      if (this.el) {
        this.el.classList.add('coe-puzzle-hidden');
        this.isVisible = false;
      }
    }

    destroy() {
      if (this.el && this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    }
  }

  global.JamestellationPuzzleHUD = JamestellationPuzzleHUD;

  if (typeof window !== 'undefined') {
    window.JamestellationPuzzleHUD = JamestellationPuzzleHUD;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JamestellationPuzzleHUD };
  }
})(typeof window !== 'undefined' ? window : globalThis);
