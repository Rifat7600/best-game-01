// All sound is synthesised with WebAudio: no audio files are shipped.
// The context is created on the first user gesture (a click or key), because
// browsers refuse to start audio before one.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;

  /** A quiet bass pulse that walks up the minor scale, one note per beat. */
  const BASS = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq, freqEnd, dur, type = 'sine', vol = 0.2, when = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur, vol = 0.2, when = 0, low = 400 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    /** Call from any click/key handler so audio is allowed to start. */
    unlock() {
      ensure();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() {
      tone({ freq: 880, freqEnd: 220, dur: 0.09, type: 'square', vol: 0.08 });
    },
    enemyHit() {
      noise({ dur: 0.08, vol: 0.12, low: 900 });
    },
    enemyDie() {
      tone({ freq: 320, freqEnd: 60, dur: 0.22, type: 'sawtooth', vol: 0.14 });
      noise({ dur: 0.18, vol: 0.14, low: 1400 });
    },
    hurt() {
      tone({ freq: 160, freqEnd: 50, dur: 0.3, type: 'sawtooth', vol: 0.22 });
      noise({ dur: 0.25, vol: 0.18, low: 500 });
    },
    powerup() {
      tone({ freq: 523, dur: 0.1, type: 'sine', vol: 0.16 });
      tone({ freq: 784, dur: 0.14, type: 'sine', vol: 0.16, when: 0.09 });
    },
    waveClear() {
      tone({ freq: 392, dur: 0.12, type: 'triangle', vol: 0.18 });
      tone({ freq: 523, dur: 0.12, type: 'triangle', vol: 0.18, when: 0.11 });
      tone({ freq: 659, dur: 0.2, type: 'triangle', vol: 0.18, when: 0.22 });
    },
    waveStart() {
      tone({ freq: 196, freqEnd: 392, dur: 0.25, type: 'triangle', vol: 0.16 });
    },
    gameOver() {
      tone({ freq: 330, freqEnd: 55, dur: 0.9, type: 'sawtooth', vol: 0.18 });
    },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.18, when: i * 0.14 }),
      );
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = window.setInterval(() => {
        if (muted || !ctx) return;
        const freq = BASS[musicStep % BASS.length];
        musicStep += 1;
        tone({ freq, dur: 0.42, type: 'triangle', vol: 0.07 });
      }, 460);
    },
    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
