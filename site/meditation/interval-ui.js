/**
 * Guided Meditation Interval Pacing UI
 * Module: site/meditation/interval-ui.js
 * 
 * Minimalist obsidian & starlight glass pacing selector for Open Field.
 */

(function(global) {
  'use strict';

  class MeditationIntervalUI {
    constructor() {
      this.container = null;
      this.activeMode = 'tighter';
    }

    mount(parentEl = document.body) {
      if (document.getElementById('coe-pacing-console')) return;

      const consoleEl = document.createElement('div');
      consoleEl.id = 'coe-pacing-console';
      consoleEl.setAttribute('role', 'region');
      consoleEl.setAttribute('aria-label', 'Meditation Pacing Controls');
      
      consoleEl.innerHTML = `
        <div class="coe-pacing-wrap">
          <div class="coe-pacing-label">
            <span class="coe-pacing-title">INSTRUCTION CADENCE</span>
            <span class="coe-pacing-desc" id="coe-pacing-desc">Engaged rhythm with shorter silences</span>
          </div>
          <div class="coe-pacing-pills" role="radiogroup" aria-label="Pacing Density">
            <button class="coe-pill-btn" data-mode="beginner" role="radio" aria-checked="false">Beginner (6–10s)</button>
            <button class="coe-pill-btn active" data-mode="tighter" role="radio" aria-checked="true">Tighter (12–18s)</button>
            <button class="coe-pill-btn" data-mode="standard" role="radio" aria-checked="false">Standard (20–30s)</button>
            <button class="coe-pill-btn" data-mode="experienced" role="radio" aria-checked="false">Experienced (40–60s)</button>
          </div>
        </div>
      `;

      this.injectStyles();
      parentEl.appendChild(consoleEl);
      this.container = consoleEl;

      this.bindEvents();
    }

    injectStyles() {
      if (document.getElementById('coe-pacing-styles')) return;
      const s = document.createElement('style');
      s.id = 'coe-pacing-styles';
      s.textContent = `
        #coe-pacing-console {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          pointer-events: auto;
          transition: opacity 0.4s ease;
        }
        .coe-pacing-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: rgba(14, 18, 28, 0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 20px;
          padding: 8px 16px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
        }
        .coe-pacing-label {
          display: flex;
          gap: 12px;
          align-items: baseline;
        }
        .coe-pacing-title {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(237, 230, 214, 0.85);
          font-weight: 600;
        }
        .coe-pacing-desc {
          font-size: 10px;
          color: rgba(237, 230, 214, 0.55);
          font-style: italic;
        }
        .coe-pacing-pills {
          display: flex;
          gap: 6px;
        }
        .coe-pill-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(237, 230, 214, 0.7);
          font-size: 11px;
          padding: 5px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .coe-pill-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.25);
        }
        .coe-pill-btn.active {
          background: rgba(237, 230, 214, 0.95);
          color: #0b0f19;
          font-weight: 600;
          border-color: #ede6d6;
          box-shadow: 0 0 14px rgba(237, 230, 214, 0.35);
        }
      `;
      document.head.appendChild(s);
    }

    bindEvents() {
      const pills = this.container.querySelectorAll('.coe-pill-btn');
      const desc = this.container.querySelector('#coe-pacing-desc');

      pills.forEach(pill => {
        pill.onclick = () => {
          const mode = pill.getAttribute('data-mode');
          this.setMode(mode);
        };
      });

      if (typeof window !== 'undefined') {
        window.addEventListener('coe:meditation-pacing-change', (e) => {
          if (e.detail && e.detail.mode) {
            this.updateActivePill(e.detail.mode);
          }
        });
      }
    }

    setMode(mode) {
      this.activeMode = mode;
      this.updateActivePill(mode);
      if (global.COEMeditationDAG) {
        global.COEMeditationDAG.setPacingMode(mode);
      }
    }

    updateActivePill(mode) {
      if (!this.container) return;
      const pills = this.container.querySelectorAll('.coe-pill-btn');
      const desc = this.container.querySelector('#coe-pacing-desc');
      const presets = global.COEMeditationDAG ? global.COEMeditationDAG.PRESETS || {} : {};

      pills.forEach(pill => {
        const isTarget = pill.getAttribute('data-mode') === mode;
        pill.classList.toggle('active', isTarget);
        pill.setAttribute('aria-checked', isTarget ? 'true' : 'false');
      });

      if (desc && presets[mode]) {
        desc.textContent = presets[mode].description;
      }
    }

    show() {
      if (this.container) this.container.style.display = 'block';
    }

    hide() {
      if (this.container) this.container.style.display = 'none';
    }
  }

  global.MeditationIntervalUI = MeditationIntervalUI;
})(typeof window !== 'undefined' ? window : globalThis);
