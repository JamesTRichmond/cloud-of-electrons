# Improvement 10.29.7: Jamestellation Restoration Puzzle & Wormhole Gameplay

## Mission Directive
Transform the accidental visual degradation of the Jamestellation into an intentional, captivating environmental gameplay puzzle!
When the traveler journeys into the deep cosmic void toward the Jamestellation coordinates ($Z < -1400$), they discover the constellation in a degraded, dormant stardust state with its particles scattered outward (`window.coeJamestellationIntegrity = 0.25`) and the Third Eye return wormhole sealed shut.

The visitor must solve the celestial resonance puzzle:
1. **Identify the Corrupted Sectors:** Three displaced celestial anchor nodes (Crown coronal ring, Heart core, and Third Eye Ajna focal point).
2. **Align Resonances:** Interacting with the nodes (via directional alignment, raycasting, or harmonic frequency tuning) progressively restores integrity:
   - Sector 1 (Crown Resonance): Integrity increases to **0.50** (CME coronal filaments stabilize and begin breathing).
   - Sector 2 (Heart Core): Integrity increases to **0.75** (Chest, neck, and meditative posture particles coalesce into 3D form).
   - Sector 3 (Ajna / Third Eye Focus): Integrity reaches **1.00**!
3. **The Awakening:**
   - At 1.00, the Jamestellation blooms into full, radiant 3D volumetric majesty.
   - The celestial laughter echoes across the void.
   - The Ajna star ignites with a diamond starlight glint.
   - The return wormhole awakens, allowing the ship to dive through the space between the eyes and return to the Open Field sanctuary!

## Absolute Rules & Constraints
1. **ZERO DIRECT SHADER EDITS:**
   - DO NOT edit core WebGL shaders in `site/index.html`.
   - All visual reconstitution is already wired to the shader uniform `uIntegrity` via the global hook `window.coeJamestellationIntegrity` ($0.25 \to 1.00$). Modulating this value smoothly pulls the 28,000 stardust particles into place.
2. **Decoupled Architecture:**
   - Expose `window.COE_PUZZLE`.
   - Dispatch events on `window.COE_EVENTS`:
     - `coe:puzzle-init`: `{ initialIntegrity: 0.25 }`
     - `coe:puzzle-progress`: `{ sector: 'crown' | 'heart' | 'ajna', integrity: number }`
     - `coe:puzzle-complete`: `{ integrity: 1.00 }`
     - `coe:wormhole-unlocked`: `{ ready: true, targetPos: [-1.94, 21.6, -1850] }`
3. **Proximity Trigger:**
   - Listen to `coe:flight-tick` to trigger when the visitor approaches $Z \approx -1400$ to $-1700$.

## File Map
- `site/puzzle/restoration-game.js`: State machine, integrity RAF driver, progress tracking.
- `site/puzzle/stellar-aligner.js`: Interactive celestial anchor raycasting and resonance alignment.
- `site/puzzle/puzzle-hud.js`: Minimalist obsidian/starlight status overlay and integrity meter.
- `test_jamestellation_puzzle.js`: Automated test script verifying integrity progression, event dispatching, and state transitions.
