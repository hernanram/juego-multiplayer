// ============================================================
// ARENA OF HEROES — game.js
// Phaser 3 + Socket.io client — MOBA multijugador completo
// ============================================================

'use strict';

// ════════════════════════════════════════════════════════════
// CONSTANTES Y DEFINICIONES DE HÉROES (cliente)
// ════════════════════════════════════════════════════════════

const MAP_W = 2000, MAP_H = 2000;
const NEXUS_POS = {
  team1: { x: 190, y: 190, radius: 70 },
  team2: { x: 1810, y: 1810, radius: 70 }
};

const HEROES = {
  ignis: {
    name: 'Ignis', role: 'Mago', emoji: '🔥',
    color: 0xFF4500, colorHex: '#FF4500',
    description: 'Maestro del fuego. Su Bola de Fuego explota en área, dañando a todos los enemigos cercanos.',
    hp: 450, speed: 140, damage: 55, attackRange: 260,
    ability: { name: 'Bola de Fuego', cooldown: 3, desc: 'Proyectil explosivo de área (radio 110)' },
    ultimate: { name: 'Meteoro Gigante', cooldown: 12, desc: 'Meteoro masivo de 220 daño de área' }
  },
  vex: {
    name: 'Vex', role: 'DPS', emoji: '🏹',
    color: 0x00BFFF, colorHex: '#00BFFF',
    description: 'Arquera de élite. Su Flecha Rápida viaja a gran velocidad con alcance extraordinario.',
    hp: 400, speed: 180, damage: 48, attackRange: 350,
    ability: { name: 'Flecha Rápida', cooldown: 3, desc: 'Proyectil de altísima velocidad y largo alcance' },
    ultimate: { name: 'Ráfaga Perforante', cooldown: 10, desc: 'Lanza 5 flechas perforantes en abanico' }
  },
  titan: {
    name: 'Titan', role: 'Tank', emoji: '🛡️',
    color: 0xA0A0A0, colorHex: '#A0A0A0',
    description: 'Coloso indestructible. Su Escudo Divino reduce el daño recibido un 70% durante 3.5 segundos.',
    hp: 850, speed: 120, damage: 65, attackRange: 110,
    ability: { name: 'Escudo Divino', cooldown: 3, desc: 'Reduce daño recibido 70% por 3 segundos' },
    ultimate: { name: 'Sismo Colosal', cooldown: 14, desc: 'Terremoto de área que aturde a enemigos' }
  },
  shado: {
    name: 'Shado', role: 'Asesino', emoji: '⚡',
    color: 0xBB44FF, colorHex: '#BB44FF',
    description: 'Sombra letal. Su Salto Oscuro lo teletransporta y daña a todos los enemigos en el punto de aterrizaje.',
    hp: 380, speed: 200, damage: 82, attackRange: 90,
    ability: { name: 'Salto Oscuro', cooldown: 3, desc: 'Dash instantáneo + daño AoE al aterrizar' },
    ultimate: { name: 'Marca Sombría', cooldown: 12, desc: 'Teletransporte crítico al enemigo más débil' }
  },
  lyra: {
    name: 'Lyra', role: 'Support', emoji: '✨',
    color: 0xFFD700, colorHex: '#FFD700',
    description: 'Sacerdotisa de la luz. Su Aura Sagrada cura instantáneamente a todos los aliados cercanos.',
    hp: 430, speed: 155, damage: 38, attackRange: 210,
    ability: { name: 'Aura Sagrada', cooldown: 3, desc: 'Cura +160 HP a aliados en radio de 260' },
    ultimate: { name: 'Bendición Celestial', cooldown: 15, desc: 'Escudo de 300 HP + cura masiva a aliados' }
  }
};

const HERO_KEYS = Object.keys(HEROES);
const ROLE_COLORS = { Mago: '#FF8844', DPS: '#44CCFF', Tank: '#CCCCCC', Asesino: '#CC66FF', Support: '#FFDD44' };

// ════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ════════════════════════════════════════════════════════════

const GS = {
  socket: null,
  playerId: '',
  playerName: '',
  roomId: '',
  team: 1,
  heroType: '',
  isHost: false,
  selectedHero: null,      // en hero select
  confirmedHero: false,
  gameStartTime: null,
  currentState: null,      // último game_state del servidor
  phaserScene: null,
  timerInterval: null
};

// ════════════════════════════════════════════════════════════
// SONIDO — Web Audio API procedural
// ════════════════════════════════════════════════════════════

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(ctx.destination);

    const configs = {
      attack:   [{ freq: 220, dur: 0.08, type: 'sawtooth', gain: 0.4 }],
      hit:      [{ freq: 140, dur: 0.12, type: 'square', gain: 0.3 }],
      fireball: [{ freq: 300, dur: 0.25, type: 'sawtooth', gain: 0.5 }, { freq: 200, dur: 0.3, type: 'sine', gain: 0.3 }],
      arrow:    [{ freq: 800, dur: 0.06, type: 'sawtooth', gain: 0.2 }, { freq: 400, dur: 0.08, type: 'sine', gain: 0.2 }],
      explosion:[{ freq: 80, dur: 0.4, type: 'sawtooth', gain: 0.6 }, { freq: 120, dur: 0.3, type: 'square', gain: 0.4 }],
      shield:   [{ freq: 660, dur: 0.3, type: 'sine', gain: 0.3 }, { freq: 880, dur: 0.2, type: 'sine', gain: 0.2 }],
      dash:     [{ freq: 440, dur: 0.15, type: 'sawtooth', gain: 0.4 }, { freq: 600, dur: 0.1, type: 'sine', gain: 0.3 }],
      heal:     [{ freq: 523, dur: 0.3, type: 'sine', gain: 0.2 }, { freq: 659, dur: 0.4, type: 'sine', gain: 0.2 }, { freq: 783, dur: 0.35, type: 'sine', gain: 0.15 }],
      kill:     [{ freq: 200, dur: 0.2, type: 'sawtooth', gain: 0.5 }, { freq: 150, dur: 0.3, type: 'square', gain: 0.4 }, { freq: 100, dur: 0.4, type: 'sine', gain: 0.3 }],
      victory:  [{ freq: 523, dur: 0.3, type: 'sine', gain: 0.3 }, { freq: 659, dur: 0.3, type: 'sine', gain: 0.3 }, { freq: 784, dur: 0.6, type: 'sine', gain: 0.4 }],
      defeat:   [{ freq: 220, dur: 0.5, type: 'sine', gain: 0.4 }, { freq: 185, dur: 0.7, type: 'sine', gain: 0.3 }],
      move:     [{ freq: 600, dur: 0.04, type: 'sine', gain: 0.05 }],
      nexusHit: [{ freq: 100, dur: 0.3, type: 'square', gain: 0.5 }],
      ui:       [{ freq: 740, dur: 0.08, type: 'sine', gain: 0.15 }]
    };

    const layers = configs[type] || configs.hit;
    let delayOffset = 0;
    layers.forEach((cfg, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = cfg.type;
      osc.frequency.setValueAtTime(cfg.freq, now + delayOffset);
      osc.frequency.exponentialRampToValueAtTime(cfg.freq * 0.4, now + delayOffset + cfg.dur);

      gain.gain.setValueAtTime(cfg.gain, now + delayOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delayOffset + cfg.dur);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + delayOffset);
      osc.stop(now + delayOffset + cfg.dur + 0.05);
      delayOffset += 0.05 * i;
    });
  } catch(e) { /* ignore audio errors */ }
}

let musicPlaying = false;
let musicInterval = null;

function toggleMusic() {
  musicPlaying = !musicPlaying;
  const btn = document.getElementById('btn-music-toggle');
  if (musicPlaying) {
    if (btn) btn.textContent = '🔊';
    startMusic();
  } else {
    if (btn) btn.textContent = '🔇';
    stopMusic();
  }
}

function startMusic() {
  if (musicInterval) clearInterval(musicInterval);
  const ctx = getAudioCtx();

  // Escala D Menor Épica (D, F, G, A, C)
  const bassNotes = [73.42, 73.42, 87.31, 98.00, 73.42, 73.42, 110.00, 98.00]; // D2, F2, G2, A2
  const chordRoots = [146.83, 174.61, 196.00, 220.00]; // D3, F3, G3, A3
  let step = 0;

  musicInterval = setInterval(() => {
    if (!musicPlaying) return;
    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, now);
      masterGain.connect(ctx.destination);

      // 1. TAMBOR / KICK & SNARE (Ritmo de Batalla)
      if (step % 2 === 0) {
        // Kick drum
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.frequency.setValueAtTime(120, now);
        kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        kickGain.gain.setValueAtTime(0.4, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        kickOsc.connect(kickGain);
        kickGain.connect(masterGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.15);
      }
      if (step % 4 === 2) {
        // Snare drum
        const snareOsc = ctx.createOscillator();
        const snareGain = ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(240, now);
        snareGain.gain.setValueAtTime(0.25, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        snareOsc.connect(snareGain);
        snareGain.connect(masterGain);
        snareOsc.start(now);
        snareOsc.stop(now + 0.12);
      }

      // 2. BAJO ÉPICO (Sawtooth arpegiado)
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      const bFreq = bassNotes[step % bassNotes.length];
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bFreq, now);
      bassGain.gain.setValueAtTime(0.25, now);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.2);

      // 3. ACORDES HÉROES / BRASS (Cada 4 pasos)
      if (step % 4 === 0) {
        const root = chordRoots[(step / 4) % chordRoots.length];
        [root, root * 1.2, root * 1.5].forEach((freq, idx) => {
          const chordOsc = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chordOsc.type = 'triangle';
          chordOsc.frequency.setValueAtTime(freq, now);
          chordGain.gain.setValueAtTime(0.12, now);
          chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          chordOsc.connect(chordGain);
          chordGain.connect(masterGain);
          chordOsc.start(now);
          chordOsc.stop(now + 0.42);
        });
      }

      step++;
    } catch(e) {}
  }, 180); // Tempo rápido de batalla (~166 BPM)
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

// ════════════════════════════════════════════════════════════
// SOCKET.IO INIT
// ════════════════════════════════════════════════════════════

function initSocket() {
  GS.socket = io();

  GS.socket.on('connect', () => {
    console.log('🔌 Conectado al servidor de juego, socket ID:', GS.socket.id);
  });

  GS.socket.on('error', (data) => {
    showError(data.message || 'Error de conexión');
  });

  GS.socket.on('room_created', (data) => {
    GS.roomId = data.roomId;
    GS.playerId = data.player.id;
    GS.team = data.player.team;
    GS.isHost = true;
    renderLobby(data.room);
    showScreen('lobby-screen');
  });

  GS.socket.on('room_joined', (data) => {
    GS.roomId = data.roomId;
    GS.playerId = data.player.id;
    GS.team = data.player.team;
    GS.isHost = false;
    renderLobby(data.room);
    showScreen('lobby-screen');
  });

  GS.socket.on('player_joined', (data) => {
    renderLobby(data.room);
  });

  GS.socket.on('hero_selected', (data) => {
    renderLobby(data.room);
  });

  GS.socket.on('player_left', (data) => {
    renderLobby(data.room);
  });

  GS.socket.on('game_started', (data) => {
    GS.gameStartTime = Date.now();
    showScreen('game-hud');
    addChatMsg('Sistema', 0, '⚔️ ¡La partida ha comenzado! Destruye el Nexus enemigo.', true);
    if (!musicPlaying) toggleMusic();
  });

  GS.socket.on('game_state', (state) => {
    GS.currentState = state;
  });

  GS.socket.on('chat_msg', (data) => {
    addChatMsg(data.name, data.team, data.message);
  });

  GS.socket.on('player_killed', (data) => {
    addKillEvent(data.killerName, data.killedName);
    playSound('kill');
  });

  GS.socket.on('game_over', (data) => {
    showScreen('gameover-screen');
    const vic = document.getElementById('victory-text');
    const team = document.getElementById('gameover-team');
    if (vic) vic.textContent = data.winnerTeam === GS.team ? 'VICTORIA' : 'DERROTA';
    if (team) team.textContent = `Equipo ${data.winnerTeam === 1 ? 'Rojo' : 'Azul'} ha ganado`;
    playSound(data.winnerTeam === GS.team ? 'victory' : 'defeat');
  });
}

// ════════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════════

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function showError(msg) {
  const el = document.getElementById('menu-error');
  if (el) { el.textContent = msg; setTimeout(() => el.textContent = '', 4000); }
}

function spawnParticles() {
  const container = document.getElementById('menu-particles');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left:${Math.random()*100}%;
      --dur:${4 + Math.random()*8}s;
      --delay:${-Math.random()*10}s;
      width:${1 + Math.random()*4}px;
      height:${1 + Math.random()*4}px;
      opacity:${0.3 + Math.random()*0.5};
      background: ${Math.random() > 0.5 ? '#c8952a' : '#4488ff'};
    `;
    container.appendChild(p);
  }
}

function showDamageNumber(x, y, dmg, color = '#ffdd44') {
  // Convierte coordenadas del mundo a coordenadas de pantalla
  const scene = GS.phaserScene;
  if (!scene) return;
  const cam = scene.cameras.main;
  const sx = (x - cam.scrollX) * cam.zoom;
  const sy = (y - cam.scrollY) * cam.zoom;

  const el = document.createElement('div');
  el.className = 'dmg-number';
  el.textContent = '-' + Math.round(dmg);
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function addChatMsg(name, team, message, isSystem = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${isSystem ? 'system' : 'team-' + team}`;
  div.innerHTML = `<span class="msg-name">${escHtml(name)}:</span> ${escHtml(message)}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  // Limitar a 50 mensajes
  while (container.children.length > 50) container.removeChild(container.firstChild);
}

function addKillEvent(killerName, killedName) {
  const feed = document.getElementById('kill-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = 'kill-event';
  div.innerHTML = `<b>${escHtml(killerName)}</b> ⚔️ <span style="color:#ff6666">${escHtml(killedName)}</span>`;
  feed.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ════════════════════════════════════════════════════════════
// LOBBY UI
// ════════════════════════════════════════════════════════════

function renderLobby(roomInfo) {
  document.getElementById('display-room-code').textContent = roomInfo.roomId;

  const t1 = document.getElementById('team1-players');
  const t2 = document.getElementById('team2-players');
  t1.innerHTML = '';
  t2.innerHTML = '';

  roomInfo.players.forEach(p => {
    const hero = p.heroType ? HEROES[p.heroType] : null;
    const div = document.createElement('div');
    div.className = 'player-slot';
    div.innerHTML = `
      <div class="slot-avatar t${p.team}">${p.name[0].toUpperCase()}</div>
      <div>
        <div class="slot-name">${escHtml(p.name)} ${p.id === GS.playerId ? '<small style="color:var(--accent)">(tú)</small>' : ''}</div>
        <div class="slot-hero">${hero ? hero.emoji + ' ' + hero.name : '⏳ Sin héroe'}</div>
      </div>
      ${p.ready ? '<span class="slot-badge">✅</span>' : ''}
      ${p.id === roomInfo.hostId ? '<span class="slot-badge" style="color:#ffdd44">👑</span>' : ''}
    `;
    (p.team === 1 ? t1 : t2).appendChild(div);
  });

  // Mostrar botón de inicio solo al host
  const btnStart = document.getElementById('btn-start');
  const btnHero = document.getElementById('btn-select-hero');
  if (GS.isHost) {
    const allReady = roomInfo.players.length > 0 && roomInfo.players.every(p => p.ready);
    btnStart.style.display = allReady ? 'flex' : 'none';
  } else {
    btnStart.style.display = 'none';
  }

  const me = roomInfo.players.find(p => p.id === GS.playerId);
  if (me && me.heroType) {
    btnHero.textContent = `🔄 Cambiar Héroe (${HEROES[me.heroType].name})`;
  }

  const status = document.getElementById('lobby-status');
  const allReady = roomInfo.players.length > 0 && roomInfo.players.every(p => p.ready);
  if (allReady && !GS.isHost) {
    status.textContent = '✅ Todos listos — esperando que el host inicie la partida...';
  } else if (!allReady) {
    const notReady = roomInfo.players.filter(p => !p.ready).length;
    status.textContent = `⏳ ${notReady} jugador(es) sin seleccionar héroe`;
  } else if (GS.isHost) {
    status.textContent = '✅ ¡Todos listos! Puedes iniciar la partida.';
  }
}

// ════════════════════════════════════════════════════════════
// HERO SELECT UI
// ════════════════════════════════════════════════════════════

function buildHeroSelectUI() {
  const grid = document.getElementById('heroes-grid');
  grid.innerHTML = '';

  HERO_KEYS.forEach(key => {
    const h = HEROES[key];
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.id = 'hero-card-' + key;
    card.innerHTML = `
      <div class="hero-avatar" style="background:${h.colorHex}22;border:2px solid ${h.colorHex}">
        <span style="font-size:32px">${h.emoji}</span>
      </div>
      <div class="hero-name">${h.name}</div>
      <div class="hero-role" style="color:${ROLE_COLORS[h.role] || '#aaa'}">${h.role}</div>
    `;
    card.addEventListener('click', () => selectHeroCard(key));
    grid.appendChild(card);
  });
}

function selectHeroCard(key) {
  playSound('ui');
  GS.selectedHero = key;
  document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('hero-card-' + key);
  if (card) card.classList.add('selected');
  document.getElementById('btn-confirm-hero').disabled = false;
  renderHeroInfo(key);
}

function renderHeroInfo(key) {
  const h = HEROES[key];
  const panel = document.getElementById('hero-info-panel');
  panel.innerHTML = `
    <div class="info-header">
      <div class="info-dot" style="background:${h.colorHex};box-shadow:0 0 10px ${h.colorHex}"></div>
      <div class="info-title">${h.name}</div>
      <div class="info-role-badge" style="color:${ROLE_COLORS[h.role]}">${h.role}</div>
    </div>
    <div class="info-desc">${h.description}</div>
    <div class="info-stats">
      <div class="info-stat">
        <span class="info-stat-label">❤️ Vida</span>
        <span class="info-stat-val">${h.hp}</span>
      </div>
      <div class="info-stat">
        <span class="info-stat-label">⚡ Velocidad</span>
        <span class="info-stat-val">${h.speed}</span>
      </div>
      <div class="info-stat">
        <span class="info-stat-label">⚔️ Daño</span>
        <span class="info-stat-val">${h.damage}</span>
      </div>
      <div class="info-stat">
        <span class="info-stat-label">📏 Alcance</span>
        <span class="info-stat-val">${h.attackRange}</span>
      </div>
    </div>
    <div class="info-ability">
      <div class="info-ability-name">🔮 [Q] ${h.ability.name} <small style="color:var(--text-dim)">CD: ${h.ability.cooldown}s</small></div>
      <div class="info-ability-desc">${h.ability.desc}</div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// GAME HUD UPDATES
// ════════════════════════════════════════════════════════════

function updateHUD(state) {
  if (!state) return;
  const me = state.players[GS.playerId];

  // Nexus HP
  const n1 = state.nexus.team1, n2 = state.nexus.team2;
  const n1pct = Math.max(0, (n1.hp / n1.maxHp) * 100);
  const n2pct = Math.max(0, (n2.hp / n2.maxHp) * 100);
  const nb1 = document.getElementById('nexus1-bar');
  const nb2 = document.getElementById('nexus2-bar');
  if (nb1) nb1.style.width = n1pct + '%';
  if (nb2) nb2.style.width = n2pct + '%';
  const nt1 = document.getElementById('nexus1-hp-text');
  const nt2 = document.getElementById('nexus2-hp-text');
  if (nt1) nt1.textContent = `${n1.hp}/${n1.maxHp}`;
  if (nt2) nt2.textContent = `${n2.hp}/${n2.maxHp}`;

  if (!me) return;

  // Player HP
  const hpPct = Math.max(0, (me.hp / me.maxHp) * 100);
  const hpBar = document.getElementById('player-hp-bar');
  if (hpBar) {
    hpBar.style.width = hpPct + '%';
    // Color por porcentaje
    if (hpPct > 60) hpBar.style.background = 'linear-gradient(90deg,#33cc66,#66ff99)';
    else if (hpPct > 30) hpBar.style.background = 'linear-gradient(90deg,#cc9900,#ffcc00)';
    else hpBar.style.background = 'linear-gradient(90deg,#cc3333,#ff5555)';
  }
  const hpTxt = document.getElementById('player-hp-text');
  if (hpTxt) hpTxt.textContent = `${Math.max(0,me.hp)}/${me.maxHp}`;

  // Ability & Ultimate cooldown
  const hero = HEROES[GS.heroType];
  if (hero) {
    // Q
    const cdFill = document.getElementById('q-cd-fill');
    const cdTxt = document.getElementById('q-cd-text');
    if (me.abilityCooldown > 0 && hero.ability.cooldown > 0) {
      const pct = (me.abilityCooldown / (hero.ability.cooldown * 1000)) * 100;
      if (cdFill) cdFill.style.height = Math.min(100, pct) + '%';
      if (cdTxt) cdTxt.textContent = Math.ceil(me.abilityCooldown / 1000) + 's';
    } else {
      if (cdFill) cdFill.style.height = '0%';
      if (cdTxt) cdTxt.textContent = '';
    }
    const slot = document.getElementById('slot-q');
    if (slot) slot.classList.toggle('on-cooldown', me.abilityCooldown > 0);

    // R (Ultimate)
    const rFill = document.getElementById('r-cd-fill');
    const rTxt = document.getElementById('r-cd-text');
    const rName = document.getElementById('r-name');
    if (rName && hero.ultimate) rName.textContent = hero.ultimate.name.split(' ')[0];
    if (me.ultimateCooldown > 0 && hero.ultimate && hero.ultimate.cooldown > 0) {
      const pct = (me.ultimateCooldown / (hero.ultimate.cooldown * 1000)) * 100;
      if (rFill) rFill.style.height = Math.min(100, pct) + '%';
      if (rTxt) rTxt.textContent = Math.ceil(me.ultimateCooldown / 1000) + 's';
    } else {
      if (rFill) rFill.style.height = '0%';
      if (rTxt) rTxt.textContent = '';
    }
    const slotR = document.getElementById('slot-r');
    if (slotR) slotR.classList.toggle('on-cooldown', me.ultimateCooldown > 0);
  }

  // KDA
  const kills = document.getElementById('hud-kills');
  const deaths = document.getElementById('hud-deaths');
  if (kills) kills.textContent = me.kills || 0;
  if (deaths) deaths.textContent = me.deaths || 0;

  // Respawn
  const respawnEl = document.getElementById('respawn-overlay');
  const respawnTimer = document.getElementById('respawn-timer');
  if (respawnEl) {
    if (!me.alive && me.respawnTimer > 0) {
      respawnEl.style.display = 'flex';
      if (respawnTimer) respawnTimer.textContent = Math.ceil(me.respawnTimer / 1000);
    } else {
      respawnEl.style.display = 'none';
    }
  }
}

function updateTimer() {
  if (!GS.gameStartTime) return;
  const elapsed = Math.floor((Date.now() - GS.gameStartTime) / 1000);
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  const el = document.getElementById('game-timer');
  if (el) el.textContent = `${m}:${s}`;
}

// ════════════════════════════════════════════════════════════
// MINIMAP
// ════════════════════════════════════════════════════════════

function updateMinimap(state) {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const scaleX = W / MAP_W, scaleY = H / MAP_H;

  // Fondo
  ctx.fillStyle = '#0a1a0a';
  ctx.fillRect(0, 0, W, H);

  // Lanes
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(0, 0, W * 0.12, H * 0.12);  // Base 1
  ctx.fillRect(W * 0.88, H * 0.88, W * 0.12, H * 0.12);  // Base 2
  ctx.fillStyle = '#224422';
  ctx.fillRect(0, H * 0.06, W, 10);         // Top lane
  ctx.fillRect(0, H * 0.94 - 10, W, 10);   // Bot lane
  // Mid lane diagonal
  ctx.save();
  ctx.strokeStyle = '#224422';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W, H);
  ctx.stroke();
  ctx.restore();

  // Nexus
  ctx.beginPath();
  ctx.arc(NEXUS_POS.team1.x * scaleX, NEXUS_POS.team1.y * scaleY, 5, 0, Math.PI*2);
  ctx.fillStyle = '#ff4444';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(NEXUS_POS.team2.x * scaleX, NEXUS_POS.team2.y * scaleY, 5, 0, Math.PI*2);
  ctx.fillStyle = '#4488ff';
  ctx.fill();

  // Torres
  if (state && state.towers) {
    Object.values(state.towers).forEach(t => {
      if (t.hp <= 0) return;
      ctx.beginPath();
      ctx.arc(t.x * scaleX, t.y * scaleY, 4, 0, Math.PI * 2);
      ctx.fillStyle = t.team === 1 ? '#ff6666' : '#66aaff';
      ctx.fill();
    });
  }

  // Jugadores
  if (state && state.players) {
    Object.values(state.players).forEach(p => {
      if (!p.alive) return;
      const mx = p.x * scaleX;
      const my = p.y * scaleY;
      ctx.beginPath();
      ctx.arc(mx, my, p.id === GS.playerId ? 5 : 4, 0, Math.PI*2);
      ctx.fillStyle = p.id === GS.playerId ? '#ffffff' : (p.team === 1 ? '#ff4444' : '#4488ff');
      if (p.id === GS.playerId) ctx.shadowBlur = 8, ctx.shadowColor = '#fff';
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // Borde
  ctx.strokeStyle = 'rgba(200,149,42,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, W, H);
}

// ════════════════════════════════════════════════════════════
// PHASER — GAME SCENE
// ════════════════════════════════════════════════════════════

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.heroSprites = {};       // playerId -> { container, circle, hpBg, hpFill, nameText, shieldRing }
    this.projGraphics = {};      // projId -> graphics object
    this.abilityEffects = [];    // efectos temporales
    this.attackCursors = {};     // parpadeantes de ataque
    this.prevState = null;
    this.moveIndicator = null;
    this.groundGraphics = null;
    this.HERO_RADIUS = 22;
  }

  create() {
    GS.phaserScene = this;

    // Cámara
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setBackgroundColor('#0a1a0a');

    // Dibujar mapa
    this.drawMap();

    // Indicador de movimiento (anillo que aparece al hacer click)
    this.moveIndicator = this.add.graphics();

    // Input: movimiento y ataque
    this.input.on('pointerdown', this.onPointerDown, this);

    // Tecla Q para habilidad
    this.input.keyboard.on('keydown-Q', this.onAbilityKey, this);

    // Tecla R para habilidad definitiva
    this.input.keyboard.on('keydown-R', this.onUltimateKey, this);

    // Tecla Enter para abrir chat
    this.input.keyboard.on('keydown-ENTER', () => {
      const chatInput = document.getElementById('chat-input');
      if (chatInput && document.activeElement !== chatInput) {
        chatInput.focus();
      }
    });

    // Zoom con rueda del mouse
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.4, 1.5);
      this.cameras.main.setZoom(newZoom);
    });

    console.log('[GameScene] created');
  }

  // ─── Dibujar mapa ──────────────────────────────────────

  drawMap() {
    const g = this.add.graphics();
    this.groundGraphics = g;

    // Fondo base
    g.fillStyle(0x0d1f0d);
    g.fillRect(0, 0, MAP_W, MAP_H);

    // Jungle patches (oscuros)
    g.fillStyle(0x091409);
    [[500,500,600,600],[1400,900,500,500],[800,1400,600,500],[1200,200,400,300]].forEach(([x,y,w,h]) => {
      g.fillRect(x, y, w, h);
    });

    // Top lane
    g.fillStyle(0x2a4a2a);
    g.fillRect(100, 100, MAP_W - 200, 120);

    // Bot lane
    g.fillStyle(0x2a4a2a);
    g.fillRect(100, MAP_H - 220, MAP_W - 200, 120);

    // Mid lane (diagonal simulada con rectángulos)
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const x = t * MAP_W - 60;
      const y = t * MAP_H - 60;
      g.fillStyle(0x2a4a2a);
      g.fillRect(x, y, 140, 140);
    }

    // Árboles decorativos en la jungla
    this.drawTrees(g);

    // Base Equipo 1 (esquina superior izquierda) — glow azul/morado
    g.fillStyle(0x1a1a3a);
    g.fillCircle(200, 200, 180);
    g.lineStyle(3, 0x4444cc, 0.6);
    g.strokeCircle(200, 200, 180);

    // Base Equipo 2 (esquina inferior derecha) — glow rojo/naranja
    g.fillStyle(0x3a1a1a);
    g.fillCircle(1800, 1800, 180);
    g.lineStyle(3, 0xcc4444, 0.6);
    g.strokeCircle(1800, 1800, 180);

    // Paredes del mapa (bordes)
    g.lineStyle(8, 0x445544, 1);
    g.strokeRect(4, 4, MAP_W - 8, MAP_H - 8);

    // Dibujar Nexus
    this.drawNexus(g);

    // Grid sutil
    g.lineStyle(1, 0x1a2a1a, 0.3);
    for (let x = 0; x < MAP_W; x += 200) {
      g.lineBetween(x, 0, x, MAP_H);
    }
    for (let y = 0; y < MAP_H; y += 200) {
      g.lineBetween(0, y, MAP_W, y);
    }
  }

  drawTrees(g) {
    const treePositions = [
      // Jungla superior-izquierda
      [350,320],[400,360],[420,300],[380,290],
      [300,450],[350,480],[280,460],
      // Jungla superior-derecha
      [1600,400],[1650,360],[1700,420],[1620,450],
      // Jungla inferior-izquierda
      [300,1600],[350,1650],[280,1700],[400,1620],
      // Jungla inferior-derecha
      [1600,1600],[1650,1650],[1700,1600],[1620,1700],
      // Central
      [900,950],[1000,1000],[950,900],[1050,1050],
      [850,1100],[1150,900],
    ];
    treePositions.forEach(([tx, ty]) => {
      // Sombra
      g.fillStyle(0x050d05, 0.5);
      g.fillCircle(tx + 6, ty + 6, 24);
      // Tronco
      g.fillStyle(0x3d2b10);
      g.fillRect(tx - 5, ty + 8, 10, 20);
      // Copa
      g.fillStyle(0x0d3010);
      g.fillCircle(tx, ty, 28);
      g.fillStyle(0x144020);
      g.fillCircle(tx - 6, ty - 6, 20);
      g.fillStyle(0x1a5528);
      g.fillCircle(tx + 4, ty - 10, 16);
    });
  }

  drawNexus(g) {
    const drawHex = (cx, cy, r, color, strokeColor) => {
      g.fillStyle(color);
      g.lineStyle(3, strokeColor, 1);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    };

    // Nexus Equipo 1 (rojo, esquina top-left)
    drawHex(190, 190, 58, 0x330a0a, 0xff4444);
    g.fillStyle(0xff2222);
    g.fillCircle(190, 190, 20);
    this.add.text(190, 190, '🔴', { fontSize: '28px' }).setOrigin(0.5);

    // Nexus Equipo 2 (azul, esquina bottom-right)
    drawHex(1810, 1810, 58, 0x0a0a33, 0x4488ff);
    g.fillStyle(0x2244ff);
    g.fillCircle(1810, 1810, 20);
    this.add.text(1810, 1810, '🔵', { fontSize: '28px' }).setOrigin(0.5);

    // Labels
    this.add.text(190, 270, 'NEXUS T1', {
      fontSize: '12px', color: '#ff4444', fontFamily: 'Cinzel'
    }).setOrigin(0.5);
    this.add.text(1810, 1730, 'NEXUS T2', {
      fontSize: '12px', color: '#4488ff', fontFamily: 'Cinzel'
    }).setOrigin(0.5);
  }

  // ─── Input handlers ─────────────────────────────────────

  onPointerDown(pointer) {
    if (!GS.currentState) return;
    const me = GS.currentState.players[GS.playerId];
    if (!me || !me.alive) return;

    // Click derecho (o Ctrl+Click) = atacar
    // Click izquierdo = mover / atacar si hay objetivo
    const wx = pointer.worldX;
    const wy = pointer.worldY;

    // Verificar si se hizo click en un enemigo o nexus
    let clickedTarget = null;

    // Verificar nexus enemigo
    const myTeam = me.team;
    const enemyNexus = myTeam === 1 ? 'nexus_t2' : 'nexus_t1';
    const enemyNexusPos = myTeam === 1 ? NEXUS_POS.team2 : NEXUS_POS.team1;
    const nexusDist = Math.hypot(wx - enemyNexusPos.x, wy - enemyNexusPos.y);
    if (nexusDist < enemyNexusPos.radius + 10) {
      clickedTarget = enemyNexus;
    }

    // Verificar jugadores enemigos
    if (!clickedTarget) {
      Object.values(GS.currentState.players).forEach(p => {
        if (p.id === GS.playerId || p.team === myTeam || !p.alive) return;
        const dist = Math.hypot(wx - p.x, wy - p.y);
        if (dist < this.HERO_RADIUS + 10) {
          clickedTarget = p.id;
        }
      });
    }

    if (clickedTarget) {
      // Atacar
      playSound('attack');
      GS.socket.emit('attack_cmd', { targetId: clickedTarget });
      this.showAttackEffect(wx, wy);
    } else {
      // Mover
      playSound('move');
      GS.socket.emit('move_cmd', { tx: wx, ty: wy });
      this.showMoveIndicator(wx, wy);
    }
  }

  onAbilityKey() {
    if (!GS.currentState) return;
    const me = GS.currentState.players[GS.playerId];
    if (!me || !me.alive || me.abilityCooldown > 0) return;

    const pointer = this.input.activePointer;
    const tx = pointer.worldX;
    const ty = pointer.worldY;

    const hero = HEROES[GS.heroType];
    if (hero) {
      playSound(hero.ability.name.toLowerCase().includes('fuego') ? 'fireball' :
               hero.ability.name.toLowerCase().includes('flecha') ? 'arrow' :
               hero.ability.name.toLowerCase().includes('escudo') ? 'shield' :
               hero.ability.name.toLowerCase().includes('salto') ? 'dash' : 'heal');
    }
    GS.socket.emit('ability_cmd', { tx, ty });
  }

  onUltimateKey() {
    if (!GS.currentState) return;
    const me = GS.currentState.players[GS.playerId];
    if (!me || !me.alive || me.ultimateCooldown > 0) return;

    const pointer = this.input.activePointer;
    const tx = pointer.worldX;
    const ty = pointer.worldY;

    playSound('explosion');
    GS.socket.emit('ultimate_cmd', { tx, ty });
  }

  showMoveIndicator(x, y) {
    const g = this.moveIndicator;
    g.clear();
    g.lineStyle(2, 0x44ff88, 0.8);
    g.strokeCircle(x, y, 18);
    g.lineStyle(1, 0x44ff88, 0.5);
    g.strokeCircle(x, y, 10);
    // Desaparecer
    this.tweens.add({
      targets: { alpha: 1 },
      alpha: 0,
      duration: 600,
      onUpdate: (tween) => {
        g.clear();
        const a = tween.getValue();
        if (a > 0.05) {
          g.lineStyle(2, 0x44ff88, a * 0.8);
          g.strokeCircle(x, y, 18 + (1 - a) * 10);
        }
      },
      onComplete: () => g.clear()
    });
  }

  showAttackEffect(x, y) {
    const g = this.add.graphics();
    g.lineStyle(2, 0xff4444, 1);
    g.strokeCircle(x, y, 20);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 2, scaleY: 2,
      duration: 400,
      onComplete: () => g.destroy()
    });
  }

  // ─── Actualización de entidades ─────────────────────────

  update() {
    const state = GS.currentState;
    if (!state) return;

    // Actualizar héroes
    Object.values(state.players).forEach(p => {
      this.updateHeroSprite(p);
    });

    // Actualizar torres
    if (state.towers) {
      this.updateTowers(state.towers);
    }

    // Limpiar héroes que ya no están
    Object.keys(this.heroSprites).forEach(id => {
      if (!state.players[id]) {
        this.heroSprites[id].container.destroy();
        delete this.heroSprites[id];
      }
    });

    // Actualizar proyectiles
    this.updateProjectiles(state.projectiles || []);

    // Limpiar efectos expirados
    this.abilityEffects = this.abilityEffects.filter(e => e.active);

    // Cámara sigue al jugador local
    const me = state.players[GS.playerId];
    if (me && me.alive) {
      this.cameras.main.centerOn(me.x, me.y);
    }

    // Actualizar HUD
    updateHUD(state);
    updateTimer();
    updateMinimap(state);
  }

  updateTowers(towers) {
    if (!this.towerGraphicsMap) this.towerGraphicsMap = {};

    Object.values(towers).forEach(t => {
      let g = this.towerGraphicsMap[t.id];
      if (!g) {
        g = this.add.graphics().setDepth(200);
        this.towerGraphicsMap[t.id] = g;
      }
      g.clear();
      if (t.hp <= 0) return;

      const isTeam1 = t.team === 1;
      const baseColor = isTeam1 ? 0xaa2222 : 0x2255aa;
      const gemColor = isTeam1 ? 0xff4444 : 0x4488ff;

      // Base 3D de piedra
      g.fillStyle(0x33333d, 1);
      g.fillCircle(t.x, t.y, 38);
      g.fillStyle(baseColor, 0.8);
      g.fillCircle(t.x, t.y, 30);

      // Gema brillante flotante
      g.fillStyle(gemColor, 0.9);
      g.fillCircle(t.x, t.y - 4, 14);
      g.lineStyle(3, 0xffffff, 0.8);
      g.strokeCircle(t.x, t.y - 4, 14);

      // Barra de vida
      const pct = Math.max(0, t.hp / t.maxHp);
      g.fillStyle(0x000000, 0.6);
      g.fillRect(t.x - 24, t.y - 48, 48, 6);
      g.fillStyle(gemColor, 1);
      g.fillRect(t.x - 24, t.y - 48, Math.floor(48 * pct), 6);
    });
  }

  updateHeroSprite(p) {
    const hero = HEROES[p.heroType];
    if (!hero) return;

    let s = this.heroSprites[p.id];

    if (!s) {
      // Crear sprite nuevo
      const container = this.add.container(p.x, p.y);

      // Sombra
      const shadow = this.add.ellipse(0, 18, 44, 14, 0x000000, 0.4);

      // Cuerpo principal del héroe
      const circle = this.add.graphics();
      this.drawHeroBody(circle, hero, p.id === GS.playerId);

      // Ring de escudo
      const shieldRing = this.add.graphics();

      // Barra de vida — fondo
      const hpBg = this.add.graphics();
      hpBg.fillStyle(0x220000);
      hpBg.fillRect(-22, -36, 44, 7);

      // Barra de vida — fill
      const hpFill = this.add.graphics();

      // Nombre
      const nameText = this.add.text(0, -46, p.name, {
        fontSize: '10px',
        color: p.team === 1 ? '#ff8888' : '#88aaff',
        fontFamily: 'Inter',
        stroke: '#000',
        strokeThickness: 3
      }).setOrigin(0.5, 1);

      // Indicador "YOU"
      let youText = null;
      if (p.id === GS.playerId) {
        youText = this.add.text(0, 28, '▲', {
          fontSize: '12px',
          color: '#ffffff',
          fontFamily: 'Inter'
        }).setOrigin(0.5, 0);
      }

      // Emoji del héroe y detalles visuales únicos
      const emojiText = this.add.text(0, -1, hero.emoji, {
        fontSize: '18px'
      }).setOrigin(0.5);

      container.add([shadow, circle, shieldRing, hpBg, hpFill, nameText, emojiText]);
      if (youText) container.add(youText);

      s = { container, circle, shieldRing, hpBg, hpFill, nameText, emojiText };
      this.heroSprites[p.id] = s;
    }

    s.container.setPosition(p.x, p.y);
    s.container.setVisible(p.alive);
    s.container.setAlpha(p.alive ? 1 : 0.3);

    const hpPct = Math.max(0, p.hp / p.maxHp);
    s.hpFill.clear();
    const hpColor = hpPct > 0.6 ? 0x44cc66 : hpPct > 0.3 ? 0xddaa00 : 0xcc3333;
    s.hpFill.fillStyle(hpColor);
    s.hpFill.fillRect(-22, -36, Math.floor(44 * hpPct), 7);

    s.shieldRing.clear();
    if (p.shielded) {
      s.shieldRing.lineStyle(4, 0xaaddff, 0.85);
      s.shieldRing.strokeCircle(0, 0, this.HERO_RADIUS + 10);
    }

    s.container.setDepth(p.y + (p.id === GS.playerId ? 100 : 0));
  }

  drawHeroBody(g, hero, isLocal) {
    g.clear();
    const r = this.HERO_RADIUS;

    // 1. Halo / Glow Exterior según el Héroe
    g.fillStyle(hero.color, 0.3);
    g.fillCircle(0, 0, r + 10);

    // 2. Detalles Específicos de Diseño por Personaje
    if (hero.name === 'Ignis') {
      // Magma y Fuego (Anillos de fuego)
      g.lineStyle(3, 0xffbb00, 0.8);
      g.strokeCircle(0, 0, r + 5);
      g.fillStyle(0xff4500, 1);
      g.fillCircle(0, 0, r);
      g.fillStyle(0xffaa00, 0.7);
      g.fillCircle(-4, -4, r * 0.5);
    } else if (hero.name === 'Vex') {
      // Arquera de Hielo/Luz (Aura de cristal)
      g.lineStyle(2, 0x88eeff, 0.9);
      g.strokeRect(-r-3, -r-3, (r+3)*2, (r+3)*2);
      g.fillStyle(0x00bfff, 1);
      g.fillCircle(0, 0, r);
      g.fillStyle(0xaaddff, 0.7);
      g.fillCircle(-5, -5, r * 0.45);
    } else if (hero.name === 'Titan') {
      // Coloso Blindado (Armadura de metal con placas)
      g.fillStyle(0x555566, 1);
      g.fillCircle(0, 0, r + 4);
      g.lineStyle(4, 0xcccccc, 1);
      g.strokeCircle(0, 0, r + 4);
      g.fillStyle(0xa0a0a0, 1);
      g.fillCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(-6, -6, r * 0.4);
    } else if (hero.name === 'Shado') {
      // Asesino de Sombras (Púrpura y rayos)
      g.fillStyle(0x660099, 0.4);
      g.fillCircle(0, 0, r + 12);
      g.lineStyle(3, 0xdd44ff, 0.9);
      g.strokeCircle(0, 0, r + 6);
      g.fillStyle(0xbb44ff, 1);
      g.fillCircle(0, 0, r);
      g.fillStyle(0xffccff, 0.6);
      g.fillCircle(-4, -4, r * 0.4);
    } else if (hero.name === 'Lyra') {
      // Sacerdotisa de Luz (Aureola dorada de ángel)
      g.lineStyle(4, 0xffdd44, 0.9);
      g.strokeCircle(0, -r - 4, r * 0.5); // Aureola arriba
      g.fillStyle(0xffd700, 1);
      g.fillCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(-5, -5, r * 0.5);
    } else {
      g.fillStyle(hero.color, 1);
      g.fillCircle(0, 0, r);
    }

    // Borde local (Jugador principal)
    g.lineStyle(isLocal ? 3 : 2, isLocal ? 0xffffff : 0x000000, isLocal ? 1 : 0.6);
    g.strokeCircle(0, 0, r);
  }

  updateProjectiles(serverProjs) {
    const activeIds = new Set(serverProjs.map(p => p.id));

    // Eliminar proyectiles que ya no existen
    Object.keys(this.projGraphics).forEach(id => {
      if (!activeIds.has(parseInt(id))) {
        this.projGraphics[id].destroy();
        delete this.projGraphics[id];
      }
    });

    // Actualizar/crear proyectiles
    serverProjs.forEach(proj => {
      let g = this.projGraphics[proj.id];
      if (!g) {
        g = this.add.graphics();
        g.setDepth(500);
        this.projGraphics[proj.id] = g;
      }
      g.clear();

      if (proj.type === 'fireball') {
        g.fillStyle(0xff4400, 0.25); g.fillCircle(proj.x, proj.y, 26);
        g.fillStyle(0xff6600, 0.8);  g.fillCircle(proj.x, proj.y, 16);
        g.fillStyle(0xffaa00, 0.95); g.fillCircle(proj.x, proj.y, 10);
        g.fillStyle(0xffffff, 0.9);  g.fillCircle(proj.x-3, proj.y-3, 4.5);
        for (let i = 1; i <= 4; i++) {
          g.fillStyle(0xff4400, 0.2 / i);
          g.fillCircle(proj.x - i*7, proj.y - i*4, 11 - i*1.5);
        }
      } else if (proj.type === 'arrow' || proj.type === 'arrow_barrage') {
        g.fillStyle(0x0055ff, 0.2);  g.fillCircle(proj.x, proj.y, 16);
        g.fillStyle(0x44aaff, 0.95); g.fillCircle(proj.x, proj.y, 8);
        g.fillStyle(0xaaddff, 0.9);  g.fillCircle(proj.x-2, proj.y-2, 4);
        g.lineStyle(4, 0x0088ff, 0.8);
        g.lineBetween(proj.x, proj.y, proj.x-24, proj.y-6);
      } else if (proj.type === 'dash') {
        g.fillStyle(0xaa22ff, 0.3);  g.fillCircle(proj.x, proj.y, 20);
        g.fillStyle(0xcc44ff, 0.95); g.fillCircle(proj.x, proj.y, 12);
        g.fillStyle(0xffccff, 0.9);  g.fillCircle(proj.x-2, proj.y-2, 5);
        g.lineStyle(3, 0xdd44ff, 0.8);
        g.lineBetween(proj.x, proj.y, proj.x-20, proj.y-5);
      } else {
        g.fillStyle(0xffcc00, 0.3);  g.fillCircle(proj.x, proj.y, 22);
        g.fillStyle(0xffdd44, 0.95); g.fillCircle(proj.x, proj.y, 12);
        g.fillStyle(0xffffff, 0.9);  g.fillCircle(proj.x-2, proj.y-2, 5);
      }
    });
  }

  showExplosion(x, y, color, radius) {
    this.cameras.main.shake(220, 0.016);
    const ptKey = (color === 0xff4400 || color === 0xff6600) ? 'ptcl_fire' : 'ptcl_blue';
    const burst = this.add.particles(x, y, ptKey, {
      speed: { min: radius*0.35, max: radius*1.1 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 650,
      quantity: 28,
      stopAfter: 28
    }).setDepth(650);
    const sparks = this.add.particles(x, y, 'ptcl_spark', {
      speed: { min: radius*0.5, max: radius*1.5 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 500,
      quantity: 15,
      stopAfter: 15
    }).setDepth(651);
    const ring = this.add.graphics().setDepth(649);
    this.tweens.add({
      targets: { r: 0, a: 0.9 }, r: radius, a: 0, duration: 420,
      onUpdate: (tw, t) => {
        ring.clear();
        ring.lineStyle(5, color, t.a);
        ring.strokeCircle(x, y, t.r);
        ring.fillStyle(color, t.a * 0.08);
        ring.fillCircle(x, y, t.r);
      },
      onComplete: () => { ring.destroy(); burst.destroy(); sparks.destroy(); }
    });
  }

  showHealEffect(x, y, radius) {
    this.cameras.main.shake(100, 0.006);
    const burst = this.add.particles(x, y, 'ptcl_heal', {
      speed: { min: 20, max: radius*0.55 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 1100,
      quantity: 24,
      stopAfter: 24
    }).setDepth(650);
    const ring = this.add.graphics().setDepth(649);
    this.tweens.add({
      targets: { r: 0, a: 0.8 }, r: radius, a: 0, duration: 900,
      onUpdate: (tw, t) => {
        ring.clear();
        ring.lineStyle(4, 0x33ee66, t.a);
        ring.strokeCircle(x, y, t.r);
        ring.fillStyle(0x33ee66, t.a * 0.05);
        ring.fillCircle(x, y, t.r);
      },
      onComplete: () => { ring.destroy(); burst.destroy(); }
    });
  }

  showDashTrail(fromX, fromY, toX, toY) {
    this.cameras.main.shake(180, 0.012);
    const trail = this.add.graphics().setDepth(450);
    trail.lineStyle(9, 0xbb44ff, 0.75);
    trail.lineBetween(fromX || toX, fromY || toY, toX, toY);
    const burst = this.add.particles(toX, toY, 'ptcl_purple', {
      speed: { min: 40, max: 110 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 0.85, end: 0 },
      lifespan: 550,
      quantity: 20,
      stopAfter: 20
    }).setDepth(451);
    const zone = this.add.graphics().setDepth(449);
    zone.fillStyle(0xbb44ff, 0.3);
    zone.fillCircle(toX, toY, 36);
    this.tweens.add({
      targets: zone, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 350,
      onComplete: () => zone.destroy()
    });
    this.tweens.add({
      targets: trail, alpha: 0, duration: 450,
      onComplete: () => { trail.destroy(); burst.destroy(); }
    });
  }

  showShieldEffect(x, y) {
    const shield = this.add.graphics().setDepth(449);
    shield.lineStyle(4, 0x44ccff, 0.85);
    shield.strokeCircle(x, y, 35);
    this.tweens.add({
      targets: shield, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500,
      onComplete: () => shield.destroy()
    });
  }
}

// ════════════════════════════════════════════════════════════
// UI EVENT SETUP
// ════════════════════════════════════════════════════════════

function setupMenuUI() {
  const btnCreate = document.getElementById('btn-create');
  const btnJoin = document.getElementById('btn-join');
  const nameInput = document.getElementById('player-name');
  const roomInput = document.getElementById('room-code');

  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      const name = nameInput ? (nameInput.value.trim() || 'Invocador') : 'Invocador';
      GS.playerName = name;
      GS.socket.emit('create_room', { playerName: name });
      playSound('ui');
    });
  }

  if (btnJoin) {
    btnJoin.addEventListener('click', () => {
      const name = nameInput ? (nameInput.value.trim() || 'Invocador') : 'Invocador';
      const room = roomInput ? roomInput.value.trim().toUpperCase() : '';
      if (!room) {
        showError('Ingresa un código de sala válido');
        return;
      }
      GS.playerName = name;
      GS.socket.emit('join_room', { roomId: room, playerName: name });
      playSound('ui');
    });
  }

  spawnParticles();
}

function setupLobbyUI() {
  const btnSelectHero = document.getElementById('btn-select-hero');
  const btnAddBots = document.getElementById('btn-add-bots');
  const btnStart = document.getElementById('btn-start');
  const btnCopy = document.getElementById('btn-copy-code');

  if (btnSelectHero) {
    btnSelectHero.addEventListener('click', () => {
      buildHeroSelectUI();
      showScreen('hero-select-screen');
      playSound('ui');
    });
  }

  if (btnAddBots) {
    btnAddBots.addEventListener('click', () => {
      GS.socket.emit('add_bots');
      playSound('ui');
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      GS.socket.emit('start_game');
      playSound('ui');
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (GS.roomId) {
        navigator.clipboard.writeText(GS.roomId);
        btnCopy.textContent = '✅';
        setTimeout(() => btnCopy.textContent = '📋', 2000);
      }
    });
  }
}

function setupHeroSelectUI() {
  const btnBack = document.getElementById('btn-back-lobby');
  const btnConfirm = document.getElementById('btn-confirm-hero');

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      showScreen('lobby-screen');
      playSound('ui');
    });
  }

  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      if (!GS.selectedHero) return;
      GS.heroType = GS.selectedHero;
      GS.socket.emit('select_hero', { heroType: GS.selectedHero });

      const portrait = document.getElementById('player-portrait');
      if (portrait) portrait.textContent = HEROES[GS.selectedHero].emoji;
      const qName = document.getElementById('q-name');
      if (qName) qName.textContent = HEROES[GS.selectedHero].ability.name.split(' ')[0];
      const rName = document.getElementById('r-name');
      if (rName && HEROES[GS.selectedHero].ultimate) rName.textContent = HEROES[GS.selectedHero].ultimate.name.split(' ')[0];

      showScreen('lobby-screen');
      addChatMsg('Sistema', GS.team, `Elegiste a ${HEROES[GS.selectedHero].name}`, true);
      playSound('ui');
    });
  }
}

function setupGameHUD() {
  const btnMusic = document.getElementById('btn-music-toggle');
  if (btnMusic) {
    btnMusic.addEventListener('click', () => {
      toggleMusic();
    });
  }

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const msg = chatInput.value.trim();
        if (msg) {
          GS.socket.emit('chat_msg', { message: msg });
          chatInput.value = '';
        }
        chatInput.blur();
        e.stopPropagation();
      }
      if (e.key === 'Escape') {
        chatInput.blur();
      }
    });
    chatInput.addEventListener('keydown', e => e.stopPropagation());
  }
}

function setupGameOverUI() {
  const btnAgain = document.getElementById('btn-play-again');
  if (btnAgain) {
    btnAgain.addEventListener('click', () => {
      location.reload();
    });
  }
}

// ════════════════════════════════════════════════════════════
// PHASER INIT
// ════════════════════════════════════════════════════════════

function initPhaser() {
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0a1a0a',
    scene: [GameScene],
    parent: document.body,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true
    },
    render: {
      antialias: true,
      pixelArt: false
    },
    fps: {
      target: 60,
      forceSetTimeOut: false
    }
  };

  const game = new Phaser.Game(config);

  // Asegurar que el canvas esté detrás de la UI
  setTimeout(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.zIndex = '1';
    }
  }, 100);

  // Resize
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });

  return game;
}

// ════════════════════════════════════════════════════════════
// ARRANQUE
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 Arena of Heroes — cargando...');

  initPhaser();
  initSocket();
  setupMenuUI();
  setupLobbyUI();
  setupHeroSelectUI();
  setupGameHUD();
  setupGameOverUI();

  // Mostrar pantalla inicial
  showScreen('menu-screen');

  console.log('✅ Arena of Heroes listo!');
});
