# Improvement 10.29.6: Guided Meditation Interval Engine (Tier 3 Semantic DAG)

## Mission Directive
Solve the 10-minute meditation density problem without live LLMs!
Some travelers prefer instructions in tighter intervals (e.g. 12–18s silence), beginners need tighter guidance (6–10s silence), standard meditators prefer 20–30s silence, and experienced meditators prefer 40–60s deep silence.

To hit the exact 10:00 (600s) target duration across all densities, this engine implements a **Semantic Directed Acyclic Graph (DAG)**.
- In **Tighter** and **Beginner** modes, the scheduler draws extra instructional/contemplative nodes from the graph (such as the extended `*-long-*.mp3` recordings already in `site/voices/hugh/`) along thematic pathways (grounding -> sensory focus -> open awareness -> return).
- In **Standard** and **Experienced** modes, the scheduler selects the core foundational nodes (`*-short-*.mp3`) and allows the natural spacious silence to expand while maintaining harmonic timing.

## Absolute Rules & Constraints
1. **LOCKED FEATURES (STRICT ZERO REGRESSION):**
   - The opening Open Field ripple effect shader must remain 100% untouched.
   - The reader's vocal profile, pitch, and brown noise mixer must remain untouched.
   - DO NOT edit WebGL shaders in `site/index.html`.
2. **Deterministic Time Guarantee:**
   - $\sum (\text{audioDuration}_i + \text{gap}_i) = 600.0\text{ seconds}$ ($\pm 0.5\text{s}$) across all 4 modes.
3. **Decoupled Architecture:**
   - Expose `window.COE_MEDITATION`.
   - Listen to and dispatch events via `window.COE_EVENTS` (`coe:meditation-pacing-change`, `coe:meditation-start`, `coe:meditation-end`).

## File Map
- `site/meditation/dag-scheduler.js`: Graph traversal, mode density math, timeline calculation.
- `site/meditation/interval-ui.js`: Luxury glass HUD selector for pacing modes.
- `site/meditation/script-graph.json`: Structured node DAG with exact audio durations.
- `site/meditation/audio-player.js`: Web Audio buffer scheduler connecting to audio context.
- `tools/elevenlabs_generator.py`: Standalone CLI tool for generating or slicing ElevenLabs clips if needed.
- `test_meditation_scheduler.js`: Verification test asserting exact 600s timing across all modes.
