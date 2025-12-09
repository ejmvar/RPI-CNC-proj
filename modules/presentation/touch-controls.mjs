// Lightweight touch controls helper (no DOM required in tests)
export function createTouchControls({ onPan, onPinch } = {}) {
  // returns a stubbed object for integration with front-end
  let isAttached = false;
  return {
    attach: (el) => { isAttached = true; return true; },
    detach: () => { isAttached = false; return true; },
    isAttached: () => isAttached,
    simulatePan: (dx, dy) => { if (onPan) onPan(dx, dy); },
    simulatePinch: (scale) => { if (onPinch) onPinch(scale); }
  };
}

export default { createTouchControls };
