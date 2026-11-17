// Enemy kinds and how each one moves. An enemy is a plain object; world.js
// owns the lists, the spawning and the collisions, this file only builds
// enemies and steers them.

import { ENEMIES, FIELD } from './config.js';
import { intRange, range } from './rng.js';

let nextId = 1;

function edgeSpawn(rng) {
  const side = intRange(rng, 0, 3);
  const m = 30;
  if (side === 0) return { x: range(rng, m, FIELD.width - m), y: -m };
  if (side === 1) return { x: range(rng, m, FIELD.width - m), y: FIELD.height + m };
  if (side === 2) return { x: -m, y: range(rng, m, FIELD.height - m) };
  return { x: FIELD.width + m, y: range(rng, m, FIELD.height - m) };
}

/** Build one enemy of `kind` for `wave`, at an arena edge. */
export function spawnEnemy(rng, kind, wave) {
  const def = ENEMIES[kind];
  const at = edgeSpawn(rng);
  const hpScale = 1 + Math.max(0, wave - 4) * 0.12;
  const speedScale = 1 + Math.min(0.6, (wave - 1) * 0.04);
  return {
    id: nextId,
    kind,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp: Math.max(1, Math.round(def.hp * hpScale)),
    maxHp: Math.max(1, Math.round(def.hp * hpScale)),
    speed: def.speed * speedScale * range(rng, 0.9, 1.1),
    score: def.score,
    touch: def.touch,
    color: def.color,
    phase: rng() * Math.PI * 2,
    fireTimer: range(rng, 1.2, 2.4),
    flash: 0,
  };
}

/** Which kinds a wave may use, and their weights. */
export function waveComposition(wave) {
  const kinds = [{ kind: 'wisp', weight: 10 }];
  if (wave >= 2) kinds.push({ kind: 'weaver', weight: 6 });
  if (wave >= 3) kinds.push({ kind: 'spitter', weight: 5 });
  if (wave >= 4) kinds.push({ kind: 'splitter', weight: 4 });
  if (wave >= 5) kinds.push({ kind: 'brute', weight: 2 });
  return kinds;
}

export function pickKind(rng, wave) {
  const kinds = waveComposition(wave);
  const total = kinds.reduce((sum, k) => sum + k.weight, 0);
  let roll = rng() * total;
  for (const k of kinds) {
    roll -= k.weight;
    if (roll <= 0) return k.kind;
  }
  return 'wisp';
}

/**
 * Steer one enemy for `dt` seconds toward the player at (px, py).
 * Returns 'shoot' when a spitter fires this step (world.js spawns the orb).
 */
export function updateEnemy(e, dt, px, py, time) {
  const dx = px - e.x;
  const dy = py - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  if (e.kind === 'wisp' || e.kind === 'mini') {
    e.vx = ux * e.speed;
    e.vy = uy * e.speed;
  } else if (e.kind === 'weaver') {
    // Swoops toward the player while weaving side to side.
    const wobble = Math.sin(time * 4 + e.phase) * 0.9;
    e.vx = ux * e.speed + -uy * wobble * e.speed;
    e.vy = uy * e.speed + ux * wobble * e.speed;
  } else if (e.kind === 'spitter') {
    // Keeps its distance: closes in until ~260 away, then strafes and fires.
    if (dist > 280) {
      e.vx = ux * e.speed;
      e.vy = uy * e.speed;
    } else {
      e.vx = -uy * e.speed * 0.6;
      e.vy = ux * e.speed * 0.6;
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && dist < 520) {
      e.fireTimer = 2.4;
      return 'shoot';
    }
  } else if (e.kind === 'brute') {
    e.vx = ux * e.speed;
    e.vy = uy * e.speed;
  }

  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.flash > 0) e.flash -= dt;
  return null;
}

/** Split a dying splitter into two minis at its position. */
export function splitIntoMinis(rng, e) {
  const minis = [];
  for (let i = 0; i < 2; i += 1) {
    const def = ENEMIES.mini;
    minis.push({
      id: nextId,
      kind: 'mini',
      x: e.x + (i === 0 ? -14 : 14),
      y: e.y,
      vx: 0,
      vy: 0,
      radius: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed * range(rng, 0.9, 1.1),
      score: def.score,
      touch: def.touch,
      color: def.color,
      phase: rng() * Math.PI * 2,
      fireTimer: 0,
      flash: 0,
    });
  }
  return minis;
}
