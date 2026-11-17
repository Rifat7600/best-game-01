// Voidlight Arena — entry point. Owns the animation loop, the fixed-step
// simulation and the screen-to-screen transitions. The rules live in
// world.js, the drawing in render.js, the sound in audio.js.

import { FIELD, KEYS, STEP } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { makeRng } from './rng.js';
import { stagedWorld } from './shots.js';
import { continueEndless, createWorld, startRun, updatePlaying } from './world.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const audio = createAudio();
const input = createInput(canvas);
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

// A staged world is frozen for screenshots; a normal game starts at the title.
const staged = shotName ? stagedWorld(shotName) : null;
const world = staged ?? createWorld(makeRng((Math.random() * 0xffffffff) >>> 0));
let lastState = world.state;

function setStatus() {
  if (!statusEl || world.state === lastState) return;
  lastState = world.state;
  const lines = {
    title: 'Voidlight Arena. Press Enter to play.',
    playing: `Wave ${world.wave}. Score ${world.score}. Hull ${Math.ceil(world.player.hp)}.`,
    paused: 'Paused.',
    gameover: `Game over. Score ${world.score}, wave ${world.wave}. Press R to play again.`,
    victory: `Arena Champion. Score ${world.score}. Press C to keep going, R to play again.`,
  };
  statusEl.textContent = lines[world.state] ?? '';
}

function beginRun() {
  audio.unlock();
  audio.startMusic();
  startRun(world);
}

function handlePresses() {
  if (input.wasPressed(KEYS.mute)) {
    const muted = audio.toggleMute();
    if (statusEl) statusEl.textContent = muted ? 'Sound muted.' : 'Sound on.';
  }
  if (world.state === 'title') {
    if (input.wasPressed(KEYS.start)) beginRun();
  } else if (world.state === 'playing') {
    if (input.wasPressed(KEYS.pause)) world.state = 'paused';
    else if (input.wasPressed(KEYS.restart)) beginRun();
  } else if (world.state === 'paused') {
    if (input.wasPressed(KEYS.pause)) world.state = 'playing';
    else if (input.wasPressed(KEYS.restart)) beginRun();
  } else if (world.state === 'gameover') {
    if (input.wasPressed(KEYS.restart)) beginRun();
  } else if (world.state === 'victory') {
    if (input.wasPressed(['KeyC'])) continueEndless(world);
    else if (input.wasPressed(KEYS.restart)) beginRun();
  }
}

canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  audio.unlock();
  if (world.state === 'title') beginRun();
  else if (world.state === 'gameover') beginRun();
  else if (world.state === 'victory') beginRun();
});

window.addEventListener('blur', () => {
  if (world.state === 'playing') world.state = 'paused';
});

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (staged) {
    render(ctx, world, world.rng, world.time);
    requestAnimationFrame(frame);
    return;
  }
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    handlePresses();
    if (world.state === 'playing') updatePlaying(world, input, audio, STEP);
    input.endStep();
    acc -= STEP;
    steps += 1;
  }
  if (steps === 5) acc = 0;
  setStatus();
  render(ctx, world, world.rng, world.time);
  requestAnimationFrame(frame);
}

// A tiny handle for automated play-tests; the game never reads it.
window.__voidlight = {
  world,
  state: () => world.state,
  start: () => beginRun(),
};

requestAnimationFrame(frame);
