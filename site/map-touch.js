// One-finger map drag. Mouse input and tap selection remain with the map.
export function mountMapTouch(canvas, onDrag) {
  let touch = null;
  let dragged = false;
  let blocked = false;
  let disposed = false;
  const previousTouchAction = canvas.style.touchAction;
  // Reserve single-finger movement for the map; retain browser pinch zoom.
  canvas.style.touchAction = 'pinch-zoom';

  const start = event => {
    if (event.touches.length !== 1) {
      touch = null;
      blocked = true;
      return;
    }
    if (blocked || touch) return;
    const point = event.touches[0];
    dragged = false;
    touch = { id: point.identifier, x: point.clientX, y: point.clientY };
  };

  const move = event => {
    if (!touch || blocked) return;
    if (event.touches.length !== 1) {
      touch = null;
      blocked = true;
      return;
    }
    const point = [...event.touches].find(point => point.identifier === touch.id);
    if (!point) return;
    const dx = point.clientX - touch.x;
    const dy = point.clientY - touch.y;
    // Small finger jitter remains a normal tap rather than a map movement.
    if (!dragged && Math.hypot(dx, dy) <= 6) return;
    dragged = true;
    event.preventDefault();
    onDrag(dx, dy);
    touch.x = point.clientX;
    touch.y = point.clientY;
  };

  const end = event => {
    // Cancel compatibility mouse/click synthesis after a drag, never a tap.
    if (dragged) event.preventDefault();
    touch = null;
    blocked = event.touches.length !== 0;
    if (!blocked) dragged = false;
  };
  const cancel = () => { touch = null; blocked = false; dragged = false; };
  const listeners = { touchstart: start, touchmove: move, touchend: end, touchcancel: cancel };
  for (const [type, listener] of Object.entries(listeners)) {
    canvas.addEventListener(type, listener, { passive: false });
  }
  return {
    cancel,
    destroy() {
      if (disposed) return;
      disposed = true;
      cancel();
      for (const [type, listener] of Object.entries(listeners)) canvas.removeEventListener(type, listener);
      canvas.style.touchAction = previousTouchAction;
    },
  };
}
