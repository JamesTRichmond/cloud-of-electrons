/**
 * Jamestellation Restoration Puzzle HUD
 * Module: site/puzzle/puzzle-hud.js
 * 
 * Minimalist celestial starlight HUD displaying corruption status,
 * integrity percentage, and wormhole awakening alerts.
 */

(function(global) {
  'use strict';

  class JamestellationPuzzleHUD {
    constructor() {
      this.el = null;
      this.meterFill = null;
      this.percentText = null;
      this.statusText = null;
    }

    mount(parentEl = document.body) {
      if (document.getElementById('coe-puzzle-hud')) return;

      const hud = document.createElement('div');
      hud.id = 'coe-puzzle-hud';
      hud.setAttribute('role', 'status');
      hud.setAttribute('aria-live', 'polite');

      hud.innerHTML = `
        <div class="coe-puzzle-card">
          <div class="coe-puzzle-header">
            <span class="coe-puzzle-glyph">✦</span>
            <span class="coe-puzzle-title">JAMESTELLATION CORONAL INTEGRITY</span>
            <span class="coe-puzzle-pct" id="coe-puzzle-pct">25%</span>
          </div>
          <div class="coe-puzzle-track">
            <div class="coe-puzzle-bar" id="coe-puzzle-bar" style="width: 25%;"></div>
          </div>
          <div class="coe-puzzle-status" id="coe-puzzle-status">
            DORMANT STARDUST STATE — ALIGN CORONAL NODES
          </div>
        </div>
      `;

      this.injectStyles();
      parentEl.appendChild(hud);
      this.el = hud;

      this.meterFill = hud.querySelector('#coe-puzzle-bar');
      this.percentText = hud.querySelector('#coe-puzzle-pct');
      this.statusText = hud.querySelector('#coe-puzzle-status');

      this.bindEvents();
    }

    injectStyles() {
      if (document.getElementById('coe-puzzle-styles')) return;
      const s = document.createElement('style');
      s.id = 'coe-puzzle-styles';
      s.textContent = `
        #coe-puzzle-hud {
          position: fixed;
          top: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          pointer-events: none;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: opacity 0.5s ease;
        }
        .coe-puzzle-card {
          background: rgba(12, 16, 26, 0.84);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 16px;
          padding: 10px 20px;
          min-width: 380px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .coe-puzzle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          letter-spacing: 0.14em;
          color: rgba(237, 230, 214, 0.9);
          font-weight: 600;
        }
        .coe-puzzle-glyph {
          color: #ffcc66;
          margin-right: 6px;
        }
        .coe-puzzle-pct {
          font-family: monospace;
          color: #ffcc66;
        }
        .coe-puzzle-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .coe-puzzle-bar {
          height: 100%;
          background: linear-gradient(90deg, #ff9933, #ffcc66, #ffffff);
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 10px rgba(255, 204, 102, 0.5);
        }
        .coe-puzzle-status {
          font-size: 9px;
          letter-spacing: 0.1em;
          color: rgba(237, 230, 214, 0.6);
          text-align: center;
          text-transform: uppercase;
        }
        .coe-puzzle-restored .coe-puzzle-bar {
          background: linear-gradient(90deg, #66ccff, #ffffff);
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.8);
        }
      `;
      document.head.appendChild(s);
    }

    bindEvents() {
      if (typeof window === 'undefined') return;

      window.addEventListener('coe:puzzle-init', (e) => {
        this.update(e.detail.initialIntegrity, 'DORMANT STARDUST STATE — ALIGN CORONAL NODES');
        this.show();
      });

      window.addEventListener('coe:puzzle-progress', (e) => {
        const pct = Math.round(e.detail.targetIntegrity * 100);
        this.update(e.detail.targetIntegrity, `SECTOR RESTORED: ${e.detail.sectorName.toUpperCase()}`);
      });

      window.addEventListener('coe:wormhole-unlocked', (e) => {
        this.update(1.0, '✦ CONSTELLATION RESTORED — THIRD EYE WORMHOLE ACTIVE ✦');
        if (this.el) this.el.classList.add('coe-puzzle-restored');
      });
    }

    update(integrity, statusMsg) {
      const pct = Math.min(100, Math.max(0, Math.round(integrity * 100)));
      if (this.meterFill) this.meterFill.style.width = `${pct}%`;
      if (this.percentText) this.percentText.textContent = `${pct}%`;
      if (statusMsg && this.statusText) this.statusText.textContent = statusMsg;
    }

    show() {
      if (this.el) this.el.style.display = 'block';
    }

    hide() {
      if (this.el) this.el.style.display = 'none';
    }
  }

  global.JamestellationPuzzleHUD = JamestellationPuzzleHUD;
})(typeof window !== 'undefined' ? window : globalThis);
