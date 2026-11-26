// Keyboard and mouse input: arrows or WASD fly the stick, W and S work the
// throttle, G lowers the gear, and the mouse steers while it is held down.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_NEXT_MISSION = 8;
export const ACTION_PREV_MISSION = 16;

const KEYMAP = {
  ArrowUp: 'pitchUp',
  ArrowDown: 'pitchDown',
  ArrowLeft: 'rollLeft',
  ArrowRight: 'rollRight',
  KeyW: 'throttleUp',
  KeyS: 'throttleDown',
  KeyA: 'yawLeft',
  KeyD: 'yawRight',
};

/** Wire up listeners on the canvas and return the live input state. */
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, active: false, seen: false };
  let actions = 0;
  let throttleTarget = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    const mapped = KEYMAP[event.code];
    if (mapped) {
      keys.add(event.code);
      event.preventDefault();
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    }
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'KeyM' || event.code === 'Tab') actions |= ACTION_NEXT_MISSION;
    if (event.code === 'KeyG') {
      keys.add('KeyG');
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) / rect.width - 0.5;
    mouse.y = (event.clientY - rect.top) / rect.height - 0.5;
    mouse.seen = true;
  }

  function onMouseDown(event) {
    mouse.down = true;
    mouse.active = true;
    onMouseMove(event);
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onWheel(event) {
    throttleTarget = Math.max(0, Math.min(1, throttleTarget - Math.sign(event.deltaY) * 0.08));
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function axis(neg, pos) {
    let v = 0;
    if (keys.has(neg)) v -= 1;
    if (keys.has(pos)) v += 1;
    return v;
  }

  return {
    /** One-frame actions since the last call; reading clears them. */
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    /** True on the frame the G key was pressed; consumed by the caller. */
    takeGearToggle() {
      if (keys.has('KeyG')) {
        keys.delete('KeyG');
        return true;
      }
      return false;
    },
    /** Continuous stick input in [-1, 1] plus throttle, from keys or mouse. */
    read() {
      let pitch = axis('ArrowDown', 'ArrowUp');
      let roll = axis('ArrowLeft', 'ArrowRight');
      const yaw = axis('KeyA', 'KeyD');
      if (keys.has('KeyW')) throttleTarget = Math.min(1, throttleTarget + 0.008);
      if (keys.has('KeyS')) throttleTarget = Math.max(0, throttleTarget - 0.008);
      if (mouse.down && mouse.seen) {
        if (pitch === 0) pitch = Math.max(-1, Math.min(1, mouse.y * 2.4));
        if (roll === 0) roll = Math.max(-1, Math.min(1, mouse.x * 2.4));
      }
      return { pitch, roll, yaw, throttle: throttleTarget };
    },
    setThrottle(v) {
      throttleTarget = Math.max(0, Math.min(1, v));
    },
    get throttle() {
      return throttleTarget;
    },
  };
}
