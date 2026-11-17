// Voidlight Arena — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Clear wave 10 to win the Arena; after that the waves keep coming, endless. */
export const WIN_WAVE = 10;

export const PLAYER = {
  radius: 16,
  speed: 340,
  maxHp: 100,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletRadius: 5,
  bulletDamage: 1,
  hurtInvulnerable: 1.0,
  pickupRadius: 26,
};

export const WAVES = {
  /** enemies in a wave: base + perWave * wave, capped by the spawn budget below */
  baseCount: 5,
  perWave: 3,
  maxCount: 42,
  /** seconds between spawns inside a wave */
  spawnInterval: 0.55,
  /** seconds of calm after a wave is cleared */
  breather: 3.0,
  clearBonus: 250,
};

/** Enemy kinds. hp and speed grow a little with the wave; see enemies.js. */
export const ENEMIES = {
  wisp: { radius: 15, speed: 95, hp: 1, score: 100, color: '#ff5d8f', touch: 10 },
  weaver: { radius: 14, speed: 130, hp: 2, score: 150, color: '#ffb020', touch: 12 },
  spitter: { radius: 17, speed: 70, hp: 3, score: 200, color: '#b678ff', touch: 12 },
  splitter: { radius: 19, speed: 80, hp: 2, score: 150, color: '#3fd2c0', touch: 12 },
  mini: { radius: 9, speed: 150, hp: 1, score: 50, color: '#3fd2c0', touch: 8 },
  brute: { radius: 34, speed: 45, hp: 18, score: 1000, color: '#ff4d4d', touch: 22 },
};

export const POWERUPS = {
  dropChance: 0.12,
  kinds: ['heart', 'rapid', 'spread', 'shield'],
  heartHeal: 25,
  rapidSeconds: 8,
  spreadSeconds: 8,
  shieldSeconds: 5,
  radius: 13,
  lifetime: 9,
};

/** Kills chained inside this many seconds raise the combo multiplier. */
export const COMBO_WINDOW = 2.5;
export const COMBO_MAX = 5;

export const PALETTE = {
  background: '#070a18',
  arenaEdge: '#1c2450',
  grid: '#121832',
  player: '#ffe9a8',
  playerCore: '#fff7d6',
  bullet: '#ffe9a8',
  enemyBullet: '#ff7ab8',
  text: '#e8ecff',
  dimText: '#9aa3c7',
  accent: '#7ab8ff',
  heart: '#ff5d7a',
  shield: '#7ab8ff',
  rapid: '#ffb020',
  spread: '#b678ff',
};

export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  fire: ['Space'],
  pause: ['KeyP', 'Escape'],
  restart: ['KeyR'],
  mute: ['KeyM'],
  start: ['Enter', 'Space'],
};
