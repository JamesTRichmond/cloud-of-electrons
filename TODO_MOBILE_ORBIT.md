# Tracked Task: Mobile Touch-to-Orbit & Virtual Flight HUD Support

**Priority:** Backlog (Future Mobile Milestone)  
**Status:** Open / Tracked Specification  
**Directives Referenced:** Master Agent Directive Section 2.2 & 3.2  

---

## 1. Objective
Currently, entering orbit around a galaxy is optimized for desktop pointers (`pointerdown` / `click`) and keyboard targeting (`[E]` key or `Enter`). When mobile / tablet viewports are officially supported, visitors must be able to tap directly on a galaxy in space to enter its Keplerian orbit, complemented by touch-based flight controls.

---

## 2. Technical Architecture & Implementation Plan

### A. Touch Raycasting (`pointerdown` / `touchend`)
- In `site/index.html` (or `site/controls/touch.js`):
  - Listen for touch events on the `#coe` canvas:
    ```javascript
    cv.addEventListener('touchend', (e) => {
      if (VD.mode !== 'fly') return;
      const touch = e.changedTouches[0];
      const mx = touch.clientX, my = touch.clientY;
      if (VD.screen && VD.screen.length) {
        for (let i = 0; i < VOID_WELLS.length; i++) {
          const scr = VD.screen[i];
          if (scr) {
            const [sx, sy, rp] = scr;
            // Generous touch target (44px min touch target per WCAG guidelines)
            const touchRadius = Math.max(44, rp * 1.6);
            if (Math.hypot(mx - sx, my - sy) < touchRadius) {
              enterOrbit(VOID_WELLS[i]);
              e.preventDefault();
              return;
            }
          }
        }
      }
    }, { passive: false });
    ```

### B. Mobile Flight Controls & Virtual Thumbsticks
- **Dual Virtual Thumbstick System:**
  - *Left Virtual Stick:* Pitch and Yaw steering (smooth analog rotation).
  - *Right Virtual Stick:* Throttle (forward/reverse) and lateral strafe.
  - *Warp Button:* Dedicated glowing touch button (`WARP`) holding lightspeed boost.
  - *Brake Button:* Instant inertial dampener stop (`STOP / HOVER`).

### C. Touch Targeting Reticle
- When a galaxy is within proximity range ($d < 190$), the `#galaxy-prompt` banner renders with a larger 48px touch-action button: `✦ TAP TO ENTER ORBIT`.

---

## 3. Verification Criteria
- [ ] Tapping anywhere within a 44px radius of an on-screen galaxy in mobile simulation engages orbit.
- [ ] No sticky touch states or scrolling gestures interfere with WebGL canvas rendering.
- [ ] Tested across iOS Safari (WebKit touch action: none) and Chrome for Android.
