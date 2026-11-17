// Everything drawn on the canvas: the arena, the player, the enemies, the
// bullets, the power-ups, the particles and the HUD, plus the title, pause,
// game-over and victory screens. It reads the world and never changes it.

import { FIELD, PALETTE, PLAYER, POWERUPS, WIN_WAVE } from './config.js';

let stars = null;

function makeStars(rng) {
  const list = [];
  for (let i = 0; i < 90; i += 1) {
    list.push({
      x: rng() * FIELD.width,
      y: rng() * FIELD.height,
      r: 0.6 + rng() * 1.6,
      tw: rng() * Math.PI * 2,
    });
  }
  return list;
}

function drawBackground(ctx, rng, time) {
  if (!stars) stars = makeStars(rng);
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= FIELD.width; x += 80) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
  }
  for (let y = 0; y <= FIELD.height; y += 80) {
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
  }
  ctx.stroke();

  for (const s of stars) {
    const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cdd7ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, FIELD.width - 8, FIELD.height - 8);
}

function drawPlayer(ctx, world, time) {
  const p = world.player;
  const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
  if (blink) return;
  ctx.save();
  ctx.translate(p.x, p.y);

  // Glow.
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
  glow.addColorStop(0, 'rgba(255, 233, 168, 0.5)');
  glow.addColorStop(1, 'rgba(255, 233, 168, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();

  // Aim line.
  const aim = Math.atan2(world.aimY - p.y, world.aimX - p.x);
  ctx.strokeStyle = 'rgba(255, 233, 168, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(aim) * 20, Math.sin(aim) * 20);
  ctx.lineTo(Math.cos(aim) * 34, Math.sin(aim) * 34);
  ctx.stroke();

  // Hull: a little lantern ship.
  ctx.rotate(aim);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Shield ring.
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(122, 184, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 9 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.flash > 0) {
    ctx.fillStyle = '#ffffff';
  } else {
    ctx.fillStyle = e.color;
  }
  if (e.kind === 'wisp' || e.kind === 'mini') {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(7, 10, 24, 0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'weaver') {
    ctx.rotate(Math.sin(time * 3 + e.phase) * 0.4);
    ctx.beginPath();
    ctx.moveTo(e.radius, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'spitter') {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + e.phase;
      const r = i % 2 === 0 ? e.radius : e.radius * 0.55;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(7, 10, 24, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'splitter') {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(7, 10, 24, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.6, 0);
    ctx.lineTo(e.radius * 0.6, 0);
    ctx.moveTo(0, -e.radius * 0.6);
    ctx.lineTo(0, e.radius * 0.6);
    ctx.stroke();
  } else if (e.kind === 'brute') {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-10, -6, 4, 0, Math.PI * 2);
    ctx.arc(10, -6, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Health bar for tough enemies.
  if (e.maxHp > 3 && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = '#ff5d7a';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, (w * e.hp) / e.maxHp, 5);
  }
}

function drawPowerup(ctx, u, time) {
  const bob = Math.sin(time * 3 + u.x) * 3;
  const colors = { heart: '#ff5d7a', rapid: '#ffb020', spread: '#b678ff', shield: '#7ab8ff' };
  const labels = { heart: '+', rapid: 'R', spread: 'S', shield: 'O' };
  ctx.save();
  ctx.translate(u.x, u.y + bob);
  ctx.globalAlpha = u.life < 3 ? 0.4 + 0.6 * Math.abs(Math.sin(time * 6)) : 1;
  ctx.fillStyle = colors[u.kind];
  ctx.beginPath();
  ctx.arc(0, 0, POWERUPS.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#070a18';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels[u.kind], 0, 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left: health bar.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(18, 16, 220, 20);
  ctx.fillStyle = p.hp > 50 ? '#3fd2a0' : p.hp > 25 ? '#ffb020' : '#ff5d7a';
  ctx.fillRect(20, 18, 216 * (p.hp / PLAYER.maxHp), 16);
  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 16, 220, 20);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HULL ${Math.ceil(p.hp)}`, 24, 31);

  // Top-centre: wave.
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} / ${WIN_WAVE}`, FIELD.width / 2, 34);
  const left = world.spawnQueue.length + world.enemies.length;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText(left > 0 ? `${left} hostiles remain` : 'wave clear!', FIELD.width / 2, 54);

  // Top-right: score and combo.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, FIELD.width - 20, 34);
  if (world.combo > 1) {
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`COMBO x${Math.min(world.combo, 5)}`, FIELD.width - 20, 56);
  }

  // Active power-up timers, bottom-left.
  const active = [];
  if (p.rapid > 0) active.push(`RAPID ${Math.ceil(p.rapid)}s`);
  if (p.spread > 0) active.push(`SPREAD ${Math.ceil(p.spread)}s`);
  if (p.shield > 0) active.push(`SHIELD ${Math.ceil(p.shield)}s`);
  if (active.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(active.join('   '), 20, FIELD.height - 18);
  }

  // Breather countdown.
  if (world.breather > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`Next wave in ${Math.ceil(world.breather)}…`, FIELD.width / 2, FIELD.height / 2 - 120);
  }
  ctx.restore();
}

function panel(ctx, title, lines, accent) {
  const w = 620;
  const h = 120 + lines.length * 34;
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  ctx.fillStyle = 'rgba(7, 10, 24, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, y + 58);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, y + 102 + i * 34);
  });
}

export function render(ctx, world, rng, time) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * world.shake,
      (Math.random() - 0.5) * world.shake,
    );
  }
  drawBackground(ctx, rng, time);

  if (world.state === 'title') {
    drawTitle(ctx, world);
    ctx.restore();
    return;
  }

  for (const u of world.powerups) drawPowerup(ctx, u, time);
  for (const e of world.enemies) drawEnemy(ctx, e, time);
  for (const b of world.bullets) {
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of world.enemyBullets) {
    ctx.fillStyle = PALETTE.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (world.state !== 'gameover') drawPlayer(ctx, world, time);
  drawHud(ctx, world);

  if (world.state === 'paused') {
    panel(ctx, 'PAUSED', ['Press P or Esc to keep playing', 'M mutes the sound'], PALETTE.accent);
  } else if (world.state === 'gameover') {
    panel(
      ctx,
      'THE LIGHT GOES OUT',
      [
        `Score ${world.score}   •   Wave ${world.wave}   •   ${world.kills} destroyed`,
        'Press R or click to play again',
      ],
      '#ff5d7a',
    );
  } else if (world.state === 'victory') {
    panel(
      ctx,
      'ARENA CHAMPION',
      [
        `You cleared all ${WIN_WAVE} waves!   Score ${world.score}`,
        'Press C to keep going, endless   •   R to play again',
      ],
      '#ffd34d',
    );
  }
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('VOIDLIGHT ARENA', FIELD.width / 2, 190);
  ctx.fillStyle = PALETTE.accent;
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Hold the light. Survive all 10 waves.', FIELD.width / 2, 232);

  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px system-ui, sans-serif';
  const lines = [
    'WASD or arrows — move      Mouse — aim      Click or Space — fire',
    'Wisps chase you. Weavers swoop. Spitters shoot. Splitters split.',
    'Chain kills for a combo multiplier. Grab hearts, rapid fire, spread shot and shields.',
    'Clear wave 10 to become Arena Champion — then the waves never stop.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 300 + i * 32));

  const pulse = 0.6 + 0.4 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('Click or press Enter to play', FIELD.width / 2, 480);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('P pauses  •  M mutes  •  R restarts', FIELD.width / 2, 520);
  ctx.restore();
}
