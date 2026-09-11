// ============================================================
// GAME ROOM — Arena of Heroes
// Lógica de sala: estado del juego, game loop, física, combate,
// Torres defensivas, IA de Bots y Habilidades Definitivas [R]
// ============================================================

const HERO_STATS = require('./HeroStats');

const MAP_W = 2000;
const MAP_H = 2000;
const TICK_MS = 50;         // 20 ticks por segundo
const MAX_PLAYERS = 6;

// Posiciones del Nexus
const NEXUS_DEFS = {
  team1: { x: 190, y: 190, hp: 1500, maxHp: 1500, radius: 70 },
  team2: { x: 1810, y: 1810, hp: 1500, maxHp: 1500, radius: 70 }
};

// Definición de Torres de Defensa
const TOWER_DEFS = {
  t1_tower1: { id: 't1_tower1', team: 1, x: 650, y: 650, hp: 1000, maxHp: 1000, radius: 45, attackRange: 280, damage: 65, cooldown: 0, maxCooldown: 1000 },
  t1_tower2: { id: 't1_tower2', team: 1, x: 420, y: 420, hp: 1000, maxHp: 1000, radius: 45, attackRange: 280, damage: 65, cooldown: 0, maxCooldown: 1000 },
  t2_tower1: { id: 't2_tower1', team: 2, x: 1350, y: 1350, hp: 1000, maxHp: 1000, radius: 45, attackRange: 280, damage: 65, cooldown: 0, maxCooldown: 1000 },
  t2_tower2: { id: 't2_tower2', team: 2, x: 1580, y: 1580, hp: 1000, maxHp: 1000, radius: 45, attackRange: 280, damage: 65, cooldown: 0, maxCooldown: 1000 }
};

const BOT_NAMES = ['Bot Alpha', 'Bot Shadow', 'Bot Titan', 'Bot Ignis', 'Bot Lyra', 'Bot Vex'];
const HERO_KEYS = Object.keys(HERO_STATS);

let _projId = 0;
let _botIdCounter = 0;

class GameRoom {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = {};    // socketId/botId -> playerObj
    this.projectiles = [];
    this.effects = [];
    this.nexus = {
      team1: { ...NEXUS_DEFS.team1 },
      team2: { ...NEXUS_DEFS.team2 }
    };
    this.towers = JSON.parse(JSON.stringify(TOWER_DEFS));
    this.phase = 'lobby';
    this.winner = null;
    this.gameLoop = null;
    this.hostId = null;
    this.tick = 0;
    this.startTime = null;
  }

  // ─── Gestión de jugadores ──────────────────────────────────

  addPlayer(socketId, playerName) {
    const team = this._assignTeam();
    const spawnPos = this._spawnPos(team);
    this.players[socketId] = {
      id: socketId,
      name: playerName.substring(0, 20),
      team,
      isBot: false,
      heroType: null,
      x: spawnPos.x,
      y: spawnPos.y,
      targetX: spawnPos.x,
      targetY: spawnPos.y,
      hp: 0,
      maxHp: 0,
      alive: true,
      respawnTimer: 0,
      abilityCooldown: 0,
      ultimateCooldown: 0,
      attackCooldown: 0,
      shielded: false,
      shieldTimer: 0,
      kills: 0,
      deaths: 0,
      ready: false
    };
    if (!this.hostId) this.hostId = socketId;
    return this.players[socketId];
  }

  fillWithBots() {
    // Asegurar 3 jugadores en equipo 1 y 3 en equipo 2
    for (let team = 1; team <= 2; team++) {
      const teamCount = Object.values(this.players).filter(p => p.team === team).length;
      const needed = 3 - teamCount;
      for (let i = 0; i < needed; i++) {
        const botId = `bot_${++_botIdCounter}`;
        const spawnPos = this._spawnPos(team);
        const randomHero = HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
        const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + ` (${botId.split('_')[1]})`;
        
        this.players[botId] = {
          id: botId,
          name: botName,
          team,
          isBot: true,
          heroType: randomHero,
          x: spawnPos.x,
          y: spawnPos.y,
          targetX: spawnPos.x,
          targetY: spawnPos.y,
          hp: HERO_STATS[randomHero].hp,
          maxHp: HERO_STATS[randomHero].hp,
          alive: true,
          respawnTimer: 0,
          abilityCooldown: 0,
          ultimateCooldown: 0,
          attackCooldown: 0,
          shielded: false,
          shieldTimer: 0,
          kills: 0,
          deaths: 0,
          ready: true
        };
      }
    }
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    if (this.hostId === socketId) {
      const ids = Object.keys(this.players).filter(id => !this.players[id].isBot);
      this.hostId = ids.length > 0 ? ids[0] : null;
    }
  }

  selectHero(socketId, heroType) {
    const p = this.players[socketId];
    if (!p || !HERO_STATS[heroType]) return false;
    const stats = HERO_STATS[heroType];
    p.heroType = heroType;
    p.hp = stats.hp;
    p.maxHp = stats.hp;
    p.ready = true;
    return true;
  }

  // ─── Inicio de partida ─────────────────────────────────────

  startGame() {
    // Si no hay 6 jugadores, rellenar automáticamente con bots
    if (Object.keys(this.players).length < 6) {
      this.fillWithBots();
    }

    this.phase = 'game';
    this.startTime = Date.now();
    this.nexus = JSON.parse(JSON.stringify(NEXUS_DEFS));
    this.towers = JSON.parse(JSON.stringify(TOWER_DEFS));
    this.projectiles = [];
    this.effects = [];
    this.winner = null;
    this.tick = 0;

    // Resetear posiciones y stats
    Object.values(this.players).forEach(p => {
      if (!p.heroType) {
        p.heroType = HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
      }
      const pos = this._spawnPos(p.team);
      p.x = pos.x + (Math.random() - 0.5) * 80;
      p.y = pos.y + (Math.random() - 0.5) * 80;
      p.targetX = p.x;
      p.targetY = p.y;
      p.alive = true;
      p.kills = 0;
      p.deaths = 0;
      p.abilityCooldown = 0;
      p.ultimateCooldown = 0;
      p.attackCooldown = 0;
      p.shielded = false;
      p.shieldTimer = 0;
      const stats = HERO_STATS[p.heroType];
      p.hp = stats.hp;
      p.maxHp = stats.hp;
    });

    this.gameLoop = setInterval(() => this._tick(), TICK_MS);
  }

  stopGame() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  // ─── Comandos de combate ──────────────────────────────────

  handleMove(socketId, tx, ty) {
    const p = this.players[socketId];
    if (!p || !p.alive || this.phase !== 'game' || p.isBot) return;
    p.targetX = Math.max(30, Math.min(MAP_W - 30, tx));
    p.targetY = Math.max(30, Math.min(MAP_H - 30, ty));
  }

  handleAttack(socketId, targetId) {
    const attacker = this.players[socketId];
    if (!attacker || !attacker.alive || this.phase !== 'game') return;
    if (attacker.attackCooldown > 0) return;

    const stats = HERO_STATS[attacker.heroType];

    // 1. Ataque a Nexus
    if (targetId === 'nexus_t1' || targetId === 'nexus_t2') {
      const nexusTeam = targetId === 'nexus_t1' ? 'team1' : 'team2';
      if ((nexusTeam === 'team1') === (attacker.team === 1)) return;
      const nex = this.nexus[nexusTeam];
      if (this._dist(attacker, nex) > stats.attackRange + nex.radius) return;

      nex.hp -= stats.damage;
      attacker.attackCooldown = stats.attackCooldown;

      if (nex.hp <= 0) {
        nex.hp = 0;
        this._endGame(attacker.team);
      }
      return;
    }

    // 2. Ataque a Torre
    if (this.towers[targetId]) {
      const tower = this.towers[targetId];
      if (tower.team === attacker.team || tower.hp <= 0) return;
      if (this._dist(attacker, tower) > stats.attackRange + tower.radius) return;

      tower.hp = Math.max(0, tower.hp - stats.damage);
      attacker.attackCooldown = stats.attackCooldown;

      this.io.to(this.roomId).emit('attack_hit', {
        attackerId: socketId, targetId, damage: stats.damage, x: tower.x, y: tower.y
      });
      return;
    }

    // 3. Ataque a jugador/bot
    const target = this.players[targetId];
    if (!target || !target.alive || target.team === attacker.team) return;
    if (this._dist(attacker, target) > stats.attackRange) return;

    let dmg = stats.damage;
    if (target.shielded) {
      const tStats = HERO_STATS[target.heroType];
      if (tStats.ability.type === 'shield') {
        dmg = Math.floor(dmg * (1 - tStats.ability.damageReduction));
      }
    }
    target.hp = Math.max(0, target.hp - dmg);
    attacker.attackCooldown = stats.attackCooldown;

    this.io.to(this.roomId).emit('attack_hit', {
      attackerId: socketId, targetId, damage: dmg, x: target.x, y: target.y
    });

    if (target.hp <= 0) {
      this._killPlayer(target, attacker);
    }
  }

  handleAbility(socketId, targetX, targetY) {
    const caster = this.players[socketId];
    if (!caster || !caster.alive || this.phase !== 'game') return;
    if (caster.abilityCooldown > 0) return;

    const stats = HERO_STATS[caster.heroType];
    const ability = stats.ability;
    caster.abilityCooldown = ability.cooldown;

    this._executeAbility(caster, ability, targetX, targetY);
  }

  handleUltimate(socketId, targetX, targetY) {
    const caster = this.players[socketId];
    if (!caster || !caster.alive || this.phase !== 'game') return;
    if (caster.ultimateCooldown > 0) return;

    const stats = HERO_STATS[caster.heroType];
    const ult = stats.ultimate;
    if (!ult) return;

    caster.ultimateCooldown = ult.cooldown;

    switch (ult.type) {
      case 'meteor': {
        this.io.to(this.roomId).emit('ability_fired', {
          type: 'meteor', playerId: caster.id, x: targetX, y: targetY, radius: ult.aoeRadius
        });
        setTimeout(() => {
          Object.values(this.players).forEach(p => {
            if (p.team !== caster.team && p.alive && this._dist({ x: targetX, y: targetY }, p) < ult.aoeRadius) {
              p.hp = Math.max(0, p.hp - ult.damage);
              if (p.hp <= 0) this._killPlayer(p, caster);
            }
          });
        }, 600);
        break;
      }

      case 'arrow_barrage': {
        for (let i = -2; i <= 2; i++) {
          const angle = Math.atan2(targetY - caster.y, targetX - caster.x) + (i * 0.18);
          const proj = {
            id: ++_projId, ownerId: caster.id, ownerTeam: caster.team,
            x: caster.x, y: caster.y,
            vx: Math.cos(angle) * ult.projectileSpeed,
            vy: Math.sin(angle) * ult.projectileSpeed,
            damage: ult.damage, aoe: false, type: 'arrow',
            maxRange: ult.range, startX: caster.x, startY: caster.y, active: true
          };
          this.projectiles.push(proj);
        }
        this.io.to(this.roomId).emit('ability_fired', {
          type: 'arrow_barrage', playerId: caster.id, x: caster.x, y: caster.y, tx: targetX, ty: targetY
        });
        break;
      }

      case 'earthquake': {
        Object.values(this.players).forEach(p => {
          if (p.team !== caster.team && p.alive && this._dist(caster, p) < ult.aoeRadius) {
            p.hp = Math.max(0, p.hp - ult.damage);
            p.targetX = p.x; p.targetY = p.y; // Detener movimiento (stun)
            if (p.hp <= 0) this._killPlayer(p, caster);
          }
        });
        this.io.to(this.roomId).emit('ability_fired', {
          type: 'earthquake', playerId: caster.id, x: caster.x, y: caster.y, radius: ult.aoeRadius
        });
        break;
      }

      case 'shadow_strike': {
        // Encontrar enemigo vivo más cercano
        let target = null, minDist = ult.range;
        Object.values(this.players).forEach(p => {
          if (p.team !== caster.team && p.alive) {
            const d = this._dist(caster, p);
            if (d < minDist) { minDist = d; target = p; }
          }
        });
        if (target) {
          caster.x = target.x; caster.y = target.y;
          caster.targetX = target.x; caster.targetY = target.y;
          target.hp = Math.max(0, target.hp - ult.damage);
          this.io.to(this.roomId).emit('ability_fired', {
            type: 'shadow_strike', playerId: caster.id, x: target.x, y: target.y
          });
          if (target.hp <= 0) this._killPlayer(target, caster);
        }
        break;
      }

      case 'divine_blessing': {
        Object.values(this.players).forEach(p => {
          if (p.team === caster.team && p.alive) {
            p.hp = Math.min(p.maxHp, p.hp + ult.healAmount);
            p.shielded = true;
            p.shieldTimer = 5000;
          }
        });
        this.io.to(this.roomId).emit('ability_fired', {
          type: 'divine_blessing', playerId: caster.id, x: caster.x, y: caster.y, radius: ult.healRadius
        });
        break;
      }
    }
  }

  _executeAbility(caster, ability, targetX, targetY) {
    switch (ability.type) {
      case 'fireball':
      case 'arrow': {
        const dx = targetX - caster.x, dy = targetY - caster.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const proj = {
          id: ++_projId, ownerId: caster.id, ownerTeam: caster.team,
          x: caster.x, y: caster.y,
          vx: (dx / len) * ability.projectileSpeed,
          vy: (dy / len) * ability.projectileSpeed,
          damage: ability.damage, aoe: ability.aoe || false,
          aoeRadius: ability.aoeRadius || 0, type: ability.type,
          maxRange: ability.range, startX: caster.x, startY: caster.y, active: true
        };
        this.projectiles.push(proj);
        this.io.to(this.roomId).emit('ability_fired', {
          type: ability.type, playerId: caster.id, x: caster.x, y: caster.y, tx: targetX, ty: targetY
        });
        break;
      }
      case 'shield': {
        caster.shielded = true;
        caster.shieldTimer = ability.shieldDuration;
        this.io.to(this.roomId).emit('ability_fired', {
          type: 'shield', playerId: caster.id, x: caster.x, y: caster.y
        });
        break;
      }
      case 'dash': {
        const dx = targetX - caster.x, dy = targetY - caster.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const newX = Math.max(30, Math.min(MAP_W - 30, caster.x + (dx / len) * ability.dashRange));
        const newY = Math.max(30, Math.min(MAP_H - 30, caster.y + (dy / len) * ability.dashRange));
        caster.x = newX; caster.y = newY;
        caster.targetX = newX; caster.targetY = newY;
        Object.values(this.players).forEach(p => {
          if (p.id !== caster.id && p.team !== caster.team && p.alive) {
            if (this._dist(caster, p) < ability.aoeRadius) {
              p.hp = Math.max(0, p.hp - ability.damage);
              if (p.hp <= 0) this._killPlayer(p, caster);
            }
          }
        });
        this.io.to(this.roomId).emit('ability_fired', {
          type: 'dash', playerId: caster.id, x: caster.x, y: caster.y
        });
        break;
      }
      case 'heal': {
        Object.values(this.players).forEach(p => {
          if (p.team === caster.team && p.alive && this._dist(caster, p) < ability.healRadius) {
            p.hp = Math.min(p.maxHp, p.hp + ability.healAmount);
          }
        });
        this.io.to(this.roomId).emit('ability_fired', {
          type: 'heal', playerId: caster.id, x: caster.x, y: caster.y, radius: ability.healRadius
        });
        break;
      }
    }
  }

  // ─── Game Loop (20fps) ─────────────────────────────────────

  _tick() {
    this.tick++;
    const dt = TICK_MS;
    const dtSec = dt / 1000;

    // 1. Actualizar IA de los Bots
    this._tickBots(dt);

    // 2. Actualizar Jugadores & Cooldowns
    Object.values(this.players).forEach(p => {
      if (!p.alive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.alive = true;
          const pos = this._spawnPos(p.team);
          p.x = pos.x; p.y = pos.y;
          p.targetX = pos.x; p.targetY = pos.y;
          const stats = HERO_STATS[p.heroType];
          p.hp = stats.hp;
          this.io.to(this.roomId).emit('player_respawn', { id: p.id, x: p.x, y: p.y, hp: p.hp });
        }
        return;
      }

      // Movimiento hacia targetX, targetY
      const stats = HERO_STATS[p.heroType];
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4) {
        const step = Math.min(stats.speed * dtSec, dist);
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      }

      if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - dt);
      if (p.abilityCooldown > 0) p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
      if (p.ultimateCooldown > 0) p.ultimateCooldown = Math.max(0, p.ultimateCooldown - dt);
      if (p.shielded) {
        p.shieldTimer -= dt;
        if (p.shieldTimer <= 0) { p.shielded = false; p.shieldTimer = 0; }
      }
    });

    // 3. Actualizar Torres Defensivas (Ataque automático)
    Object.values(this.towers).forEach(tower => {
      if (tower.hp <= 0) return;
      if (tower.cooldown > 0) tower.cooldown -= dt;

      if (tower.cooldown <= 0) {
        // Encontrar enemigo vivo más cercano en rango
        let nearestTarget = null, minDist = tower.attackRange;
        Object.values(this.players).forEach(p => {
          if (p.alive && p.team !== tower.team) {
            const d = this._dist(tower, p);
            if (d < minDist) { minDist = d; nearestTarget = p; }
          }
        });

        if (nearestTarget) {
          tower.cooldown = tower.maxCooldown;
          let dmg = tower.damage;
          if (nearestTarget.shielded) dmg = Math.floor(dmg * 0.4);
          nearestTarget.hp = Math.max(0, nearestTarget.hp - dmg);
          this.io.to(this.roomId).emit('attack_hit', {
            attackerId: tower.id, targetId: nearestTarget.id, damage: dmg, x: nearestTarget.x, y: nearestTarget.y
          });
          if (nearestTarget.hp <= 0) this._killPlayer(nearestTarget, null);
        }
      }
    });

    // 4. Actualizar Proyectiles
    this.projectiles = this.projectiles.filter(proj => {
      if (!proj.active) return false;
      proj.x += proj.vx * dtSec;
      proj.y += proj.vy * dtSec;

      if (proj.x < 0 || proj.x > MAP_W || proj.y < 0 || proj.y > MAP_H) return false;
      if (this._dist(proj, { x: proj.startX, y: proj.startY }) > proj.maxRange) return false;

      for (const target of Object.values(this.players)) {
        if (!target.alive || target.id === proj.ownerId || target.team === proj.ownerTeam) continue;
        if (this._dist(proj, target) < 32) {
          this._projectileHit(proj, target);
          proj.active = false;
          return false;
        }
      }
      return true;
    });

    // Emitir estado
    this.io.to(this.roomId).emit('game_state', this._snapshot());
  }

  // ─── Lógica de Inteligencia Artificial (Bots) ───────────────

  _tickBots(dt) {
    Object.values(this.players).forEach(bot => {
      if (!bot.isBot || !bot.alive) return;
      const stats = HERO_STATS[bot.heroType];

      // 1. Poca vida (< 25%): Retroceder a la base a regenerar vida
      if (bot.hp < bot.maxHp * 0.25) {
        const home = this._spawnPos(bot.team);
        bot.targetX = home.x; bot.targetY = home.y;
        if (this._dist(bot, home) < 100) {
          bot.hp = Math.min(bot.maxHp, bot.hp + (bot.maxHp * 0.08));
        }
        return;
      }

      // 2. Buscar enemigo más cercano (Jugador o Torre o Nexus)
      let enemyTarget = null;
      let minDist = 9999;

      // Buscar jugadores enemigos
      Object.values(this.players).forEach(p => {
        if (p.alive && p.team !== bot.team) {
          const d = this._dist(bot, p);
          if (d < minDist) { minDist = d; enemyTarget = p; }
        }
      });

      // Buscar torres enemigas
      Object.values(this.towers).forEach(t => {
        if (t.hp > 0 && t.team !== bot.team) {
          const d = this._dist(bot, t);
          if (d < minDist) { minDist = d; enemyTarget = t; }
        }
      });

      // Nexus enemigo
      const enemyNexusTeam = bot.team === 1 ? 'team2' : 'team1';
      const enemyNexus = this.nexus[enemyNexusTeam];
      if (enemyNexus.hp > 0) {
        const d = this._dist(bot, enemyNexus);
        if (d < minDist) { minDist = d; enemyTarget = enemyNexus; }
      }

      if (enemyTarget) {
        const dist = this._dist(bot, enemyTarget);
        if (dist > stats.attackRange * 0.85) {
          // Moverse hacia el objetivo
          bot.targetX = enemyTarget.x;
          bot.targetY = enemyTarget.y;
        } else {
          bot.targetX = bot.x; bot.targetY = bot.y; // Detenerse a disparar

          // Ataque básico
          if (bot.attackCooldown <= 0) {
            const tId = enemyTarget.id || (bot.team === 1 ? 'nexus_t2' : 'nexus_t1');
            this.handleAttack(bot.id, tId);
          }

          // Uso inteligente de Q y R
          if (bot.abilityCooldown <= 0) {
            this.handleAbility(bot.id, enemyTarget.x, enemyTarget.y);
          } else if (bot.ultimateCooldown <= 0) {
            this.handleUltimate(bot.id, enemyTarget.x, enemyTarget.y);
          }
        }
      }
    });
  }

  _projectileHit(proj, directTarget) {
    const hitX = proj.x, hitY = proj.y;
    if (proj.aoe) {
      Object.values(this.players).forEach(p => {
        if (p.team !== proj.ownerTeam && p.alive && this._dist(proj, p) < proj.aoeRadius) {
          p.hp = Math.max(0, p.hp - proj.damage);
          if (p.hp <= 0) this._killPlayer(p, this.players[proj.ownerId]);
        }
      });
    } else {
      let dmg = proj.damage;
      if (directTarget.shielded) dmg = Math.floor(dmg * 0.3);
      directTarget.hp = Math.max(0, directTarget.hp - dmg);
      if (directTarget.hp <= 0) this._killPlayer(directTarget, this.players[proj.ownerId]);
    }

    this.io.to(this.roomId).emit('projectile_hit', {
      id: proj.id, x: hitX, y: hitY, type: proj.type, aoe: proj.aoe, aoeRadius: proj.aoeRadius
    });
  }

  _killPlayer(target, killer) {
    target.alive = false;
    target.hp = 0;
    target.respawnTimer = 6000;
    target.deaths++;
    if (killer) killer.kills++;
    this.io.to(this.roomId).emit('player_killed', {
      killedId: target.id, killedName: target.name,
      killerId: killer ? killer.id : null, killerName: killer ? killer.name : 'Torre'
    });
  }

  _endGame(winningTeam) {
    this.winner = winningTeam;
    this.phase = 'game_over';
    this.stopGame();
    this.io.to(this.roomId).emit('game_over', {
      winnerTeam: winningTeam,
      players: Object.values(this.players).map(p => ({
        name: p.name, team: p.team, kills: p.kills, deaths: p.deaths
      }))
    });
  }

  _snapshot() {
    const pSnap = {};
    Object.values(this.players).forEach(p => {
      pSnap[p.id] = {
        id: p.id, name: p.name, team: p.team, isBot: p.isBot,
        heroType: p.heroType,
        x: Math.round(p.x), y: Math.round(p.y),
        hp: Math.round(p.hp), maxHp: p.maxHp,
        alive: p.alive,
        respawnTimer: p.respawnTimer,
        abilityCooldown: p.abilityCooldown,
        ultimateCooldown: p.ultimateCooldown,
        attackCooldown: p.attackCooldown,
        shielded: p.shielded,
        kills: p.kills, deaths: p.deaths
      };
    });
    return {
      tick: this.tick,
      players: pSnap,
      towers: this.towers,
      projectiles: this.projectiles.filter(p => p.active).map(p => ({
        id: p.id, x: Math.round(p.x), y: Math.round(p.y),
        type: p.type, ownerTeam: p.ownerTeam, aoe: p.aoe
      })),
      nexus: {
        team1: { hp: this.nexus.team1.hp, maxHp: this.nexus.team1.maxHp },
        team2: { hp: this.nexus.team2.hp, maxHp: this.nexus.team2.maxHp }
      }
    };
  }

  _assignTeam() {
    const pList = Object.values(this.players);
    const t1 = pList.filter(p => p.team === 1).length;
    const t2 = pList.filter(p => p.team === 2).length;
    return t1 <= t2 ? 1 : 2;
  }

  _spawnPos(team) {
    return team === 1 ? { x: 220, y: 220 } : { x: 1780, y: 1780 };
  }

  _dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  getRoomInfo() {
    return {
      roomId: this.roomId,
      phase: this.phase,
      playerCount: this.getPlayerCount(),
      hostId: this.hostId,
      players: Object.values(this.players).map(p => ({
        id: p.id, name: p.name, team: p.team, isBot: p.isBot,
        heroType: p.heroType, ready: p.ready
      }))
    };
  }
}

module.exports = GameRoom;
