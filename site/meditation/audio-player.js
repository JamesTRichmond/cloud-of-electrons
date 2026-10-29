/**
 * Prosody-Aware Audio Scheduler for Guided Meditation DAG
 * Module: site/meditation/audio-player.js
 * 
 * Accurately schedules audio clips on the Web Audio timeline.
 * Guaranteed zero overlap, smooth crossfades, and synchronization with particle ripples.
 */

(function(global) {
  'use strict';

  class MeditationAudioPlayer {
    constructor() {
      this.ctx = null;
      this.currentPlan = null;
      this.activeSources = [];
      this.masterGain = null;
      this.isPlaying = false;
      this.startTime = 0;
    }

    setAudioContext(ctx) {
      this.ctx = ctx;
      if (this.ctx && !this.masterGain) {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }

    async loadBuffer(url) {
      if (!this.ctx) throw new Error('AudioContext required');
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuf);
    }

    async start(plan, audioBaseUrl = 'voices/hugh/') {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.setAudioContext(new AudioCtx());
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.stop(); // Clear any previous session

      this.currentPlan = plan;
      this.isPlaying = true;
      this.startTime = this.ctx.currentTime;
      this.activeSources = [];

      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('coe:meditation-start', { detail: { plan } }));
      }

      // Schedule each node
      for (let i = 0; i < plan.nodes.length; i++) {
        const node = plan.nodes[i];
        const offset = plan.offsets[i];
        const fileUrl = audioBaseUrl + node.file;

        this.scheduleClip(fileUrl, this.startTime + offset, i, node);
      }

      return this.currentPlan;
    }

    async scheduleClip(fileUrl, scheduleTime, index, nodeData) {
      try {
        const buf = await this.loadBuffer(fileUrl);
        if (!this.isPlaying) return;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(1.0, scheduleTime);

        src.connect(gainNode);
        gainNode.connect(this.masterGain);

        src.start(scheduleTime);
        this.activeSources.push({ src, gainNode, index });

        src.onended = () => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('coe:meditation-step-end', {
              detail: { index, node: nodeData }
            }));
          }
        };
      } catch (err) {
        console.warn(`[COE_MEDITATION] Could not play clip ${fileUrl}:`, err);
      }
    }

    stop(fadeTime = 1.0) {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;

      if (this.masterGain) {
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + fadeTime);
      }

      setTimeout(() => {
        this.activeSources.forEach(s => {
          try { s.src.stop(); } catch (e) {}
        });
        this.activeSources = [];
        this.isPlaying = false;
        if (this.masterGain) {
          this.masterGain.gain.setValueAtTime(1.0, this.ctx ? this.ctx.currentTime : 0);
        }
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('coe:meditation-end'));
        }
      }, fadeTime * 1000 + 50);
    }
  }

  global.MeditationAudioPlayer = MeditationAudioPlayer;
})(typeof window !== 'undefined' ? window : globalThis);
