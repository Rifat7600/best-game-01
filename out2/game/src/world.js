// The simulation: the player, the enemies, the bullets, the waves, the
// score and the particles. It knows nothing about the canvas or the DOM;
// render.js draws whatever this file holds.

import {
  COMBO_MAX,
  COMBO_WINDOW,
  ENEMIES,
  FIELD,
  PLAYER,
  POWERUPS,
  WAVES,
  WIN_WAVE,
} from './config.js';
import { pickKind, spawnEnemy, splitIntoMinis, updateEnemy } from './enemies.js';
import { pick, range } from './rng.js';

export function createWorld(rng) {
  return {
    rng,
    state: 'title',
    time: 0,
    player: freshPlayer(),
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    floaters: [],
    score: 0,
    wave: 0,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    spawnQueue: [],
    spawnTimer: 0,
    breather: 0,
    endless: false,
    shake: 0,
    won: false,
    shotsFired: 0,
    shotsHit: 0,
  };
}

function freshPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    hp: PLAYER.maxHp,
    fireTimer: 0,
    invuln: 0,
    rapid: 0,
    spread: 0,
    shield: 0,
  };
}

/** Start a fresh run from the title screen. */
export function startRun(world) {
  world.player = freshPlayer();
  world.bullets = [];
  world.enemyBullets = [];
  world.enemies = [];
  world.powerups = [];
  world.particles = [];
  world.floaters = [];
  world.score = 0;
  world.wave = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.kills = 0;
  world.endless = false;
  world.won = false;
  world.shake = 0;
  world.shotsFired = 0;
  world.shotsHit = 0;
  world.state = 'playing';
  beginWave(world);
}

/** Keep playing past wave 10, endless, after the victory screen. */
export function continueEndless(world) {
  world.endless = true;
  world.state = 'playing';
  beginWave(world);
}

function beginWave(world) {
  world.wave += 1;
  const count = Math.min(
    WAVES.maxCount,
    WAVES.baseCount + WAVES.perWave * (world.wave - 1),
  );
  const queue = [];
  for (let i = 0; i < count; i += 1) queue.push(pickKind(world.rng, world.wave));
  if (world.wave >= 5 && world.wave % 5 === 0) queue[0] = 'brute';
  world.spawnQueue = queue;
  world.spawnTimer = 0.6;
  world.breather = 0;
}

function addParticles(world, x, y, color, n, speed = 160) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: range(world.rng, 0.3, 0.7),
      maxLife: 0.7,
      color,
      size: range(world.rng, 2, 5),
    });
  }
  if (world.particles.length > 420) world.particles.splice(0, world.particles.length - 420);
}

function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1.0 });
}

function hurtPlayer(world, audio, dmg) {
  const p = world.player;
  if (p.invuln > 0 || p.shield > 0 || world.state !== 'playing') return;
  p.hp -= dmg;
  p.invuln = PLAYER.hurtInvulnerable;
  world.shake = 14;
  world.combo = 0;
  world.comboTimer = 0;
  addParticles(world, p.x, p.y, '#ff5d7a', 18, 220);
  audio.hurt();
  if (p.hp <= 0) {
    p.hp = 0;
    world.state = 'gameover';
    addParticles(world, p.x, p.y, '#ffe9a8', 60, 320);
    audio.stopMusic();
    audio.gameOver();
  }
}

function killEnemy(world, audio, e) {
  world.kills += 1;
  world.combo += 1;
  world.comboTimer = COMBO_WINDOW;
  const mult = Math.min(world.combo, COMBO_MAX);
  const gained = e.score * mult;
  world.score += gained;
  addFloater(world, e.x, e.y, `+${gained}`, mult > 1 ? '#ffd34d' : '#e8ecff');
  addParticles(world, e.x, e.y, e.color, e.kind === 'brute' ? 40 : 14, 200);
  world.shake = Math.max(world.shake, e.kind === 'brute' ? 10 : 4);
  audio.enemyDie();
  if (e.kind === 'splitter') {
    for (const mini of splitIntoMinis(world.rng, e)) world.enemies.push(mini);
  }
  if (world.rng() < POWERUPS.dropChance) {
    world.powerups.push({
      x: e.x,
      y: e.y,
      kind: pick(world.rng, POWERUPS.kinds),
      t: 0,
      life: POWERUPS.lifetime,
    });
  }
}

function fireBullet(world, audio) {
  const p = world.player;
  const dx = world.aimX - p.x;
  const dy = world.aimY - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  const base = Math.atan2(dy, dx);
  const angles = p.spread > 0 ? [-0.18, 0, 0.18] : [0];
  for (const off of angles) {
    const a = base + off;
    world.bullets.push({
      x: p.x + Math.cos(a) * (PLAYER.radius + 6),
      y: p.y + Math.sin(a) * (PLAYER.radius + 6),
      vx: Math.cos(a) * PLAYER.bulletSpeed,
      vy: Math.sin(a) * PLAYER.bulletSpeed,
      radius: PLAYER.bulletRadius,
      damage: PLAYER.bulletDamage,
    });
  }
  world.shotsFired += 1;
  p.fireTimer = p.rapid > 0 ? PLAYER.fireInterval * 0.5 : PLAYER.fireInterval;
  audio.shoot();
}

function applyPowerup(world, audio, kind) {
  const p = world.player;
  if (kind === 'heart') {
    p.hp = Math.min(PLAYER.maxHp, p.hp + POWERUPS.heartHeal);
    addFloater(world, p.x, p.y - 24, `+${POWERUPS.heartHeal} HP`, '#ff5d7a');
  } else if (kind === 'rapid') {
    p.rapid = POWERUPS.rapidSeconds;
    addFloater(world, p.x, p.y - 24, 'RAPID FIRE', '#ffb020');
  } else if (kind === 'spread') {
    p.spread = POWERUPS.spreadSeconds;
    addFloater(world, p.x, p.y - 24, 'SPREAD SHOT', '#b678ff');
  } else if (kind === 'shield') {
    p.shield = POWERUPS.shieldSeconds;
    addFloater(world, p.x, p.y - 24, 'SHIELD', '#7ab8ff');
  }
  audio.powerup();
}

function clearWave(world, audio) {
  const bonus = WAVES.clearBonus * world.wave;
  world.score += bonus;
  addFloater(world, FIELD.width / 2, 200, `WAVE ${world.wave} CLEAR  +${bonus}`, '#7ab8ff');
  audio.waveClear();
  if (world.wave === WIN_WAVE && !world.endless) {
    world.won = true;
    world.state = 'victory';
    audio.victory();
    return;
  }
  world.breather = WAVES.breather;
}

/** One fixed step of the playing state. `input` is the input module's state. */
export function updatePlaying(world, input, audio, dt) {
  const p = world.player;
  world.time += dt;
  world.aimX = input.mouse.x;
  world.aimY = input.mouse.y;

  // --- player movement ---
  let mx = input.moveX();
  let my = input.moveY();
  const mag = Math.hypot(mx, my);
  if (mag > 0) {
    mx /= mag;
    my /= mag;
    p.x += mx * PLAYER.speed * dt;
    p.y += my * PLAYER.speed * dt;
  }
  p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, p.x));
  p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, p.y));
  if (p.invuln > 0) p.invuln -= dt;
  if (p.rapid > 0) p.rapid -= dt;
  if (p.spread > 0) p.spread -= dt;
  if (p.shield > 0) p.shield -= dt;

  // --- firing ---
  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) fireBullet(world, audio);

  // --- spawning ---
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const kind = world.spawnQueue.shift();
      world.enemies.push(spawnEnemy(world.rng, kind, world.wave));
      world.spawnTimer = Math.max(0.3, WAVES.spawnInterval - world.wave * 0.02);
    }
  }

  // --- enemies ---
  for (const e of world.enemies) {
    const shot = updateEnemy(e, dt, p.x, p.y, world.time);
    if (shot === 'shoot') {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      world.enemyBullets.push({
        x: e.x,
        y: e.y,
        vx: (dx / d) * 230,
        vy: (dy / d) * 230,
        radius: 6,
        damage: 8,
      });
    }
  }

  // --- player bullets ---
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  world.bullets = world.bullets.filter(
    (b) => b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20,
  );

  // --- enemy bullets ---
  for (const b of world.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  world.enemyBullets = world.enemyBullets.filter(
    (b) => b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20,
  );

  // --- bullet vs enemy ---
  for (const b of world.bullets) {
    for (const e of world.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy < (e.radius + b.radius) * (e.radius + b.radius)) {
        b.dead = true;
        e.hp -= b.damage;
        e.flash = 0.12;
        world.shotsHit += 1;
        audio.enemyHit();
        if (e.hp <= 0) killEnemy(world, audio, e);
        break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => !b.dead);
  world.enemies = world.enemies.filter((e) => e.hp > 0);

  // --- enemy vs player ---
  for (const e of world.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const rr = p.radius + e.radius;
    if (dx * dx + dy * dy < rr * rr) {
      if (p.shield > 0) {
        e.hp -= 2;
        e.flash = 0.12;
        const d = Math.hypot(dx, dy) || 1;
        e.x -= (dx / d) * 30;
        e.y -= (dy / d) * 30;
        if (e.hp <= 0) killEnemy(world, audio, e);
      } else {
        hurtPlayer(world, audio, e.touch);
        if (world.state !== 'playing') break;
      }
    }
  }
  world.enemies = world.enemies.filter((e) => e.hp > 0);

  // --- enemy bullets vs player ---
  for (const b of world.enemyBullets) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const rr = p.radius + b.radius;
    if (dx * dx + dy * dy < rr * rr) {
      b.dead = true;
      hurtPlayer(world, audio, b.damage);
      if (world.state !== 'playing') break;
    }
  }
  world.enemyBullets = world.enemyBullets.filter((b) => !b.dead);

  // --- power-ups ---
  for (const u of world.powerups) {
    u.t += dt;
    u.life -= dt;
    const dx = p.x - u.x;
    const dy = p.y - u.y;
    if (dx * dx + dy * dy < (PLAYER.pickupRadius + POWERUPS.radius) ** 2) {
      u.dead = true;
      applyPowerup(world, audio, u.kind);
    }
  }
  world.powerups = world.powerups.filter((u) => !u.dead && u.life > 0);

  // --- particles, floaters, combo, shake ---
  for (const pt of world.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const f of world.floaters) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 40);

  // --- wave progression ---
  if (world.state === 'playing' && world.spawnQueue.length === 0 && world.enemies.length === 0) {
    if (world.breather > 0) {
      world.breather -= dt;
      if (world.breather <= 0) {
        beginWave(world);
        audio.waveStart();
      }
    } else {
      clearWave(world, audio);
    }
  }
}

export { ENEMIES };
