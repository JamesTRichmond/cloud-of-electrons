# Tracked Task: Spatial Poetry 3D Text Angle & Camera-Facing Billboard Polish

**Priority:** P3 (Low Priority Polish / Deferred Backlog)  
**Status:** Deferred by Instruction (Preserve Perfect Cadence & Timing)  
**Directives Referenced:** Master Agent Directive Section 1.5, 2.1 & 3.2  

---

## 1. Context & Feedback
In User Feedback (2026-10-29):
> *"The poems are being read well and the timing and cadence are PERFECT! i cant ask for more. the only issue is the text is hard to read due to the angle at which it appears. its an extremely minor issue and it does not need to be fixed now bc i am super happy with that feature overall."*

The vocal delivery, audio timing, and stanza formation cadence have reached the locked golden standard. Do **not** alter the audio timeline, stanza delays, or recruitment math.

---

## 2. Technical Root Cause & Future Solution Plan

### Current Text Angle Origin
- In `site/index.html` (lines 790-805), during poetry display:
  - Text particles form along target positions `T[j]` transformed by:
    ```javascript
    const ang = active && active.cap ? (reduced ? 0 : t * 0.04) : active ? (reduced ? 0 : t * 0.04) : 0;
    const ca0 = Math.cos(ang), sa0 = Math.sin(ang);
    const lx = active.ox + ux * ct - uy * st + dx;
    const ly = active.oy + ux * st + uy * ct + dy;
    x += (lx * ca0 - x) * s;
    y += (ly - y) * s;
    z += (-lx * sa0 - z) * s;
    ```
  - The rotation angle `ang = t * 0.04` and scene camera orbit introduce a perspective oblique tilt (`-lx * sa0` in Z), causing lines to appear angled sharply away from the camera plane at certain moments in the orbit.

### Future Implementation Plan (When Scheduled)
- **True Screen-Aligned Billboard Facing:**
  - In `textTargets()` or in the vertex shader, orient the text plane normal $\vec{n}_{text}$ directly opposite the camera ray $\vec{d}_{cam}$ so that the text plane is always parallel to the view frustum plane ($XY$).
  - Maintain gentle 3D depth curvature without extreme perspective foreshortening.
  - Zero changes to audio playback, speech timing, or recruitment count.
