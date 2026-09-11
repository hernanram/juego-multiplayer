// ============================================================
// HERO STATS — Arena of Heroes
// Stats base de los 5 héroes del juego
// ============================================================

const HERO_STATS = {
  ignis: {
    name: 'Ignis',
    role: 'Mago',
    color: 0xFF4500,
    colorHex: '#FF4500',
    description: 'Maestro del fuego. Bola de fuego explosiva que daña en área.',
    hp: 450,
    speed: 140,
    damage: 55,
    attackRange: 260,
    attackCooldown: 1000,
    ability: {
      name: 'Bola de Fuego',
      key: 'Q',
      cooldown: 3000,
      damage: 130,
      aoe: true,
      aoeRadius: 110,
      projectileSpeed: 380,
      range: 600,
      type: 'fireball'
    },
    ultimate: {
      name: 'Meteoro Gigante',
      key: 'R',
      cooldown: 12000,
      damage: 220,
      aoeRadius: 160,
      type: 'meteor'
    }
  },

  vex: {
    name: 'Vex',
    role: 'DPS',
    color: 0x00BFFF,
    colorHex: '#00BFFF',
    description: 'Arquera veloz. Flecha rápida de largo alcance, difícil de esquivar.',
    hp: 400,
    speed: 180,
    damage: 48,
    attackRange: 350,
    attackCooldown: 800,
    ability: {
      name: 'Flecha Rápida',
      key: 'Q',
      cooldown: 3000,
      damage: 110,
      aoe: false,
      projectileSpeed: 650,
      range: 750,
      type: 'arrow'
    },
    ultimate: {
      name: 'Ráfaga Perforante',
      key: 'R',
      cooldown: 10000,
      damage: 50,
      count: 5,
      projectileSpeed: 700,
      range: 800,
      type: 'arrow_barrage'
    }
  },

  titan: {
    name: 'Titan',
    role: 'Tank',
    color: 0xA0A0A0,
    colorHex: '#A0A0A0',
    description: 'Guerrero indestructible. Su escudo reduce el daño recibido 70%.',
    hp: 850,
    speed: 120,
    damage: 65,
    attackRange: 110,
    attackCooldown: 1200,
    ability: {
      name: 'Escudo Divino',
      key: 'Q',
      cooldown: 3000,
      shieldDuration: 3000,
      damageReduction: 0.7,
      type: 'shield'
    },
    ultimate: {
      name: 'Sismo Colosal',
      key: 'R',
      cooldown: 14000,
      damage: 160,
      aoeRadius: 180,
      stunDuration: 2500,
      type: 'earthquake'
    }
  },

  shado: {
    name: 'Shado',
    role: 'Asesino',
    color: 0xBB44FF,
    colorHex: '#BB44FF',
    description: 'Asesino de las sombras. Dash instantáneo que daña a enemigos cercanos.',
    hp: 380,
    speed: 200,
    damage: 82,
    attackRange: 90,
    attackCooldown: 700,
    ability: {
      name: 'Salto Oscuro',
      key: 'Q',
      cooldown: 3000,
      damage: 95,
      dashRange: 220,
      aoe: true,
      aoeRadius: 90,
      type: 'dash'
    },
    ultimate: {
      name: 'Marca Sombría',
      key: 'R',
      cooldown: 12000,
      damage: 210,
      range: 450,
      type: 'shadow_strike'
    }
  },

  lyra: {
    name: 'Lyra',
    role: 'Support',
    color: 0xFFD700,
    colorHex: '#FFD700',
    description: 'Sacerdotisa de la luz. Cura a todos los aliados cercanos.',
    hp: 430,
    speed: 155,
    damage: 38,
    attackRange: 210,
    attackCooldown: 1000,
    ability: {
      name: 'Aura Sagrada',
      key: 'Q',
      cooldown: 3000,
      healAmount: 160,
      healRadius: 260,
      type: 'heal'
    },
    ultimate: {
      name: 'Bendición Celestial',
      key: 'R',
      cooldown: 15000,
      healAmount: 250,
      shieldAmount: 300,
      healRadius: 350,
      type: 'divine_blessing'
    }
  }
};

module.exports = HERO_STATS;
