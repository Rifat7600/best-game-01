// Keyboard and mouse state, in logical playfield coordinates.
// The game reads this every fixed step; nothing here knows about enemies,
// the score or any other game rule.

import { FIELD, KEYS } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2 - 120, down: false };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function onKeyDown(event) {
    if (KEYS.fire.includes(event.code) || KEYS.start.includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const p = toLogical(event);
    mouse.x = p.x;
    mouse.y = p.y;
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    const p = toLogical(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
  }

  function onMouseUp(event) {
    if (event.button !== 0) return;
    mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  function axis(negCodes, posCodes) {
    const neg = negCodes.some((c) => keys.has(c));
    const pos = posCodes.some((c) => keys.has(c));
    return (pos ? 1 : 0) - (neg ? 1 : 0);
  }

  return {
    mouse,
    moveX() {
      return axis(KEYS.left, KEYS.right);
    },
    moveY() {
      return axis(KEYS.up, KEYS.down);
    },
    firing() {
      return mouse.down || KEYS.fire.some((c) => keys.has(c));
    },
    /** true once for the frame the key went down; main.js clears it each step. */
    pressed,
    wasPressed(codes) {
      return codes.some((c) => pressed.has(c));
    },
    endStep() {
      pressed.clear();
    },
  };
}
