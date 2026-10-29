/**
 * Guided Meditation Semantic DAG Scheduler
 * Module: site/meditation/dag-scheduler.js
 * 
 * Solves the 10-minute density problem without live LLMs!
 * Dynamically traverses the instruction graph to match user pacing preference
 * while guaranteeing exact 600.0s session completion.
 */

(function(global) {
  'use strict';

  const PRESETS = {
    beginner: {
      id: 'beginner',
      label: 'Beginner',
      description: 'Frequent gentle check-ins & grounding cues',
      targetGap: 8,
      minGap: 5,
      maxGap: 12,
      useLongPool: true
    },
    tighter: {
      id: 'tighter',
      label: 'Tighter (Prompter Choice)',
      description: 'Engaged rhythm with shorter silences between guidance',
      targetGap: 15,
      minGap: 10,
      maxGap: 20,
      useLongPool: true
    },
    standard: {
      id: 'standard',
      label: 'Standard',
      description: 'Balanced contemplative space',
      targetGap: 25,
      minGap: 18,
      maxGap: 35,
      useLongPool: false
    },
    experienced: {
      id: 'experienced',
      label: 'Experienced',
      description: 'Expansive silence with minimal spoken guidance',
      targetGap: 50,
      minGap: 35,
      maxGap: 75,
      useLongPool: false
    }
  };

  const MED_LEAD = 4.0;    // Settling lead silence in seconds
  const MED_QUIET = 12.0;  // Pre-bell silence in seconds
  const MED_RING = 18.0;   // Singing bowl resonance tail in seconds

  class DAGScheduler {
    constructor() {
      this.graph = null;
      this.currentMode = 'tighter';
      this.isLoaded = false;
    }

    async init(graphDataOrUrl) {
      if (typeof graphDataOrUrl === 'string') {
        try {
          const res = await fetch(graphDataOrUrl);
          this.graph = await res.json();
          this.isLoaded = true;
        } catch (e) {
          console.warn('[COE_MEDITATION] Failed to fetch graph, waiting for injection', e);
        }
      } else if (typeof graphDataOrUrl === 'object') {
        this.graph = graphDataOrUrl;
        this.isLoaded = true;
      }
    }

    setPacingMode(mode) {
      if (PRESETS[mode]) {
        this.currentMode = mode;
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('coe:meditation-pacing-change', {
            detail: { mode, preset: PRESETS[mode] }
          }));
        }
      }
    }

    getPacingMode() {
      return this.currentMode;
    }

    getPractices() {
      if (!this.graph || !this.graph.practices) return [];
      return Object.keys(this.graph.practices);
    }

    /**
     * Synthesizes an exact-duration meditation schedule for a given practice and mode.
     * Guaranteed sum of all spoken clips + silences = targetDuration (default 600.0s).
     */
    planSession(practiceName, mode = this.currentMode, targetDuration = 600.0) {
      if (!this.graph || !this.graph.practices) {
        throw new Error('Graph data not loaded. Call init() first.');
      }

      const pData = this.graph.practices[practiceName] || Object.values(this.graph.practices)[0];
      const preset = PRESETS[mode] || PRESETS.tighter;
      
      // Calculate available time budget for voice clips + variable gaps
      const fixedBookends = MED_LEAD + MED_QUIET + MED_RING;
      const budget = targetDuration - fixedBookends;

      // Select candidate nodes:
      // In tighter / beginner modes, merge short and long pools to increase node density
      let candidateNodes = [];
      if (preset.useLongPool && pData.longNodes && pData.longNodes.length > 0) {
        candidateNodes = [...pData.longNodes];
      } else {
        candidateNodes = [...pData.shortNodes];
      }

      // Calculate how many nodes fit comfortably given targetGap
      // Total duration ~ N * avgClipDuration + (N - 1) * targetGap
      const avgDuration = candidateNodes.reduce((acc, n) => acc + (n.duration || 4.5), 0) / (candidateNodes.length || 1);
      const estNodesNeeded = Math.round((budget + preset.targetGap) / (avgDuration + preset.targetGap));
      
      // Clamp node count between 4 and available candidate count
      const nodeCount = Math.max(4, Math.min(candidateNodes.length, estNodesNeeded));
      
      // Sub-sample or take nodes evenly from beginning to end
      const selectedNodes = [];
      const stepSize = (candidateNodes.length - 1) / (nodeCount - 1);
      for (let i = 0; i < nodeCount; i++) {
        const idx = Math.min(candidateNodes.length - 1, Math.round(i * stepSize));
        selectedNodes.push(candidateNodes[idx]);
      }

      const voiceDuration = selectedNodes.reduce((sum, n) => sum + (n.duration || 4.0), 0);
      const gapBudget = budget - voiceDuration;
      const gapCount = Math.max(1, selectedNodes.length - 1);

      // Distribute gap budget across intermediate intervals based on pauseFactor weights
      const pauseWeights = selectedNodes.slice(0, gapCount).map(n => Math.max(1, n.pauseFactor || 8));
      const totalWeight = pauseWeights.reduce((a, b) => a + b, 0);

      const gaps = pauseWeights.map(w => (w / totalWeight) * gapBudget);

      // Construct absolute time offsets
      const offsets = [];
      let currentOffset = MED_LEAD;

      for (let i = 0; i < selectedNodes.length; i++) {
        offsets.push(currentOffset);
        const nodeDur = selectedNodes[i].duration || 4.0;
        currentOffset += nodeDur;
        if (i < gapCount) {
          currentOffset += gaps[i];
        }
      }

      const lastNodeEnd = offsets[selectedNodes.length - 1] + (selectedNodes[selectedNodes.length - 1].duration || 4.0);
      const bellStrikeTime = lastNodeEnd + MED_QUIET;
      const computedTotal = bellStrikeTime + MED_RING;

      return {
        practiceName: pData.name,
        mode: preset.id,
        preset,
        targetDuration,
        totalDuration: computedTotal,
        nodeCount: selectedNodes.length,
        nodes: selectedNodes,
        offsets,
        gaps,
        durations: selectedNodes.map(n => n.duration || 4.0),
        bellStrikeTime,
        leadDuration: MED_LEAD,
        quietDuration: MED_QUIET,
        ringDuration: MED_RING
      };
    }
  }

  const scheduler = new DAGScheduler();
  global.COEMeditationDAG = scheduler;

  if (typeof window !== 'undefined') {
    window.COE_MEDITATION = {
      scheduler,
      PRESETS,
      planSession: (name, mode, dur) => scheduler.planSession(name, mode, dur),
      setPacingMode: (mode) => scheduler.setPacingMode(mode),
      getPacingMode: () => scheduler.getPacingMode(),
      getPractices: () => scheduler.getPractices()
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DAGScheduler, PRESETS };
  }
})(typeof window !== 'undefined' ? window : globalThis);
