// Staged states for the entry's screenshots, driven by ?shot= in the URL.
// Only used for screenshots: the query is absent in normal play, and a staged
// world never advances — the frame is frozen exactly as set up here.
// Shots: start (title), play (wave 2 mid-action), wave (wave 7 with a
// brute), end (game over). Each uses its own fixed seed, so the frame is
// reproducible.

import { FIELD, PLAYER } from './config.js';
import { spawnEnemy } from './enemies.js';
import { makeRng, range } from './rng.js';
import { createWorld } from './world.js';

function placeEnemies(world, rng, kinds, wave) {
  for (const kind of kinds) {
    const e = spawnEnemy(rng, kind, wave);
    e.x = range(rng, 90, FIELD.width - 90);
    e.y = range(rng, 90, FIELD.height - 160);
    world.enemies.push(e);
  }
}

function scatterBullets(world, rng, n) {
  for (let i = 0; i < n; i += 1) {
    const a = rng() * Math.PI * 2;
    world.bullets.push({
      x: range(rng, 200, FIELD.width - 200),
      y: range(rng, 150, FIELD.height - 100),
      vx: Math.cos(a) * PLAYER.bulletSpeed,
      vy: Math.sin(a) * PLAYER.bulletSpeed,
      radius: PLAYER.bulletRadius,
      damage: 1,
    });
  }
}

function scatterParticles(world, rng, n, color) {
  for (let i = 0; i < n; i += 1) {
    world.particles.push({
      x: range(rng, 200, FIELD.width - 200),
      y: range(rng, 150, FIELD.height - 120),
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.7,
      color,
      size: range(rng, 2, 5),
    });
  }
}

/** Build a frozen world for the named shot, or null for an unknown name. */
export function stagedWorld(name) {
  const rng = makeRng(7);
  const world = createWorld(rng);
  world.time = 12.5;
  world.aimX = FIELD.width / 2 + 180;
  world.aimY = FIELD.height / 2 - 90;

  if (name === 'start') {
    world.state = 'title';
    return world;
  }

  if (name === 'play') {
    world.state = 'playing';
    world.wave = 2;
    world.score = 1250;
    world.combo = 3;
    world.comboTimer = 2.0;
    world.kills = 14;
    world.player.hp = 82;
    world.player.x = FIELD.width / 2 - 60;
    world.player.y = FIELD.height / 2 + 40;
    world.player.rapid = 4.2;
    placeEnemies(world, rng, ['wisp', 'wisp', 'weaver', 'weaver', 'spitter', 'splitter'], 2);
    world.spawnQueue = ['wisp', 'weaver', 'spitter'];
    scatterBullets(world, rng, 6);
    scatterParticles(world, rng, 16, '#ff5d8f');
    world.powerups.push({ x: FIELD.width / 2 + 240, y: FIELD.height / 2 - 140, kind: 'heart', t: 0, life: 8 });
    return world;
  }

  if (name === 'wave') {
    world.state = 'playing';
    world.wave = 7;
    world.score = 8450;
    world.combo = 5;
    world.comboTimer = 1.6;
    world.kills = 63;
    world.player.hp = 46;
    world.player.x = FIELD.width / 2 + 120;
    world.player.y = FIELD.height / 2 + 120;
    world.player.shield = 2.5;
    placeEnemies(
      world,
      rng,
      ['brute', 'wisp', 'wisp', 'weaver', 'weaver', 'spitter', 'spitter', 'splitter', 'splitter', 'mini', 'mini'],
      7,
    );
    world.spawnQueue = ['wisp', 'weaver', 'spitter', 'splitter', 'wisp'];
    scatterBullets(world, rng, 9);
    scatterParticles(world, rng, 26, '#ffb020');
    world.enemyBullets.push(
      { x: 420, y: 300, vx: 120, vy: 90, radius: 6, damage: 8 },
      { x: 700, y: 220, vx: -100, vy: 120, radius: 6, damage: 8 },
    );
    return world;
  }

  if (name === 'end') {
    world.state = 'gameover';
    world.wave = 6;
    world.score = 12340;
    world.kills = 87;
    world.player.hp = 0;
    world.player.x = FIELD.width / 2;
    world.player.y = FIELD.height / 2;
    placeEnemies(world, rng, ['wisp', 'weaver', 'spitter'], 6);
    scatterParticles(world, rng, 40, '#ffe9a8');
    return world;
  }

  return null;
}
