# The Antigravity Masterpiece Playbook: Principles & Architecture

This document distills the methodology, debugging mechanics, and architectural patterns established during the development and refinement of James Richmond's *Cloud of Electrons* ([cloud-of-electrons](https://github.com/JamesTRichmond/cloud-of-electrons)). 

Use this playbook in any AI coding session to maintain the highest level of rigor, visual artistry, and engineering precision.

---

## 1. Core Operating Philosophy

### A. Ground-Truth Telemetry Over Guesswork
Never diagnose playback stalls, rendering hitches, or visual anomalies from static code inspection alone. Always instrument and inspect live runtime metrics:
- **Frame Delta Timing**: Measure `performance.now()` deltas across consecutive `requestAnimationFrame` cycles to catch micro-stutters ($>16.7\text{ms}$) and render stalls.
- **Audio Clocks & Seekability**: Query `audio.currentTime`, `audio.buffered`, and `audio.seekable` directly. Static HTTP servers often lack HTTP 206 Partial Content (byte-range) support, causing seeking on streaming MP3s to fail silently and reset `currentTime` to `0.0s`.
- **Automated Headless CDP Probing**: Run targeted Chrome DevTools Protocol (CDP) scripts to trace state transitions, capture high-resolution frame screenshots, and verify console errors ($0$ tolerance).

### B. The Audio-as-Conductor Architecture
When choreographing visuals (particles, text, cameras, lighting) to spoken-word or musical performances:
- **Audio Never Pauses for Visuals**: A master recitation is an organic, continuous human performance. Visual particles must synchronize and dance to the audio clock (`audio.currentTime`), never the reverse. Pausing audio between visual phrases creates unnatural dead silence that shatters immersion.
- **Micro-Timelines (Context-Aware Lifecycles)**:
  - *Ambient / Passive Mode*: Slow gather ($2.4\text{s}$), contemplative hold ($15\text{s}$), drifting scatter ($5.0\text{s}$), random resting gap ($20\text{s} - 60\text{s}$).
  - *Spoken-Word Performance (`segTL`)*: Swift gather ($0.5\text{s}$), duration locked to audio speech $(e - s)$, gentle starlight sublimation ($0.35\text{s}$), zero gap ($0\text{ms}$) into the next stanza. Transition time matches natural breathing cadence ($\sim 0.45\text{s}$).

### C. In-Memory Decoupling (Blob URLs & Web Audio)
- **Eliminate Streaming Range Dependencies**: Fetch audio master recordings as `ArrayBuffer`/`Blob` once, and initialize with `URL.createObjectURL(blob)`.
- **Guaranteed Instant Seeking**: An in-memory blob is $100\%$ buffered on load. `audio.seekable` is `[0, duration]` from millisecond zero, enabling instant seeking with zero latency, zero range-request drops, and zero server configuration dependencies.

### D. Zero-Obstruction Visual Harmonization
- **Natural Depth Integration**: Never overlay dense, opaque point sprites or unmodulated billboards directly over facial features or key focal planes.
- **Shader-Driven Vignettes & Luminescence**: Blend 3D textured portals using smooth Gaussian falloffs (`exp(-r * r * k)`), starlight luminance modulation, and depth-based camera fogging (`smoothstep(near, far, vDist)`). Cosmic depth must feel continuous, without rectangular borders or artificial bounding frames.

---

## 2. High-Performance Particle Choreography

### A. Sub-Millisecond Particle Recruitment ($O(1)$ Spatial Hash)
Recruiting thousands of dots out of a 240,000-particle cloud must never stall the UI thread:
- **Perimeter Search ($R \le 4$)**: Use a spatial hash grid (`Map<key, bucket>`) with bucket size $G \approx 0.14$. Restrict ring searching to $R \in [0, 4]$.
- **Execution Budget**: Keep particle recruitment under $1.5\text{ms}$ per phrase, completely avoiding $O(N \cdot R^2)$ combinatorial traps that freeze rendering frames.

### B. Continuous Momentum Blending (No Hard Halts)
- When recruiting particles into glyphs, never abruptly zero angular momentum or orbital rotation.
- Ease velocities via cubic Hermite polynomials:
  $$\text{rotF} = \max(0, 1 - w_t \cdot 1.2)$$
  $$v_{\text{ease}} = w_t^2 (3 - 2w_t) \cdot 0.45 \cdot dt \cdot 60$$
  This preserves the illusion of infinite cosmic momentum even as letters crystallize.

---

## 3. Verified Verification Protocol (Checklist)

Before opening any Pull Request or staging code for deployment:
1. **Console Error Free**: Zero 404s, zero unhandled promise rejections, zero WebGL warnings.
2. **Visual Proof**: Capture before/after high-resolution screenshots rendered from the actual WebGL canvas and compare directly.
3. **Audio Integrity**: Verify authentic custom voice IDs (e.g., ElevenLabs Deacon Hugh `4cY3czg0tgLP4TfI4JqZ`), never falling back to generic browser `speechSynthesis`.
4. **Transition Continuity**: Confirm that phrase transitions never pause the master stream and that time advances monotonically across all segments.
