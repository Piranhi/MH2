import type { GameContent } from "../types";

export const gameContent: GameContent = {
  areas: [
    {
      id: "emberfall-woods",
      name: "Emberfall Woods",
      tier: 1,
      powerBand: [90, 220],
      progressRequired: 150,
      monsterIds: ["mossfang-stalker", "bramble-whelp", "ashen-razorbeak"],
      bossId: "elder-bramblemaw",
      unlocksAreaId: "ironroot-basin"
    },
    {
      id: "ironroot-basin",
      name: "Ironroot Basin",
      tier: 2,
      powerBand: [360, 680],
      progressRequired: 320,
      monsterIds: ["ironhide-tusker", "cinderback-lurker"],
      bossId: "stonebound-matriarch",
      unlocksAreaId: "moonfen-ruins"
    },
    {
      id: "moonfen-ruins",
      name: "Moonfen Ruins",
      tier: 3,
      powerBand: [760, 1300],
      progressRequired: 420,
      monsterIds: ["hollowscale-serpent", "ruin-wight"],
      bossId: "moonvein-colossus"
    }
  ],
  monsters: [
    {
      id: "mossfang-stalker",
      name: "Mossfang Stalker",
      areaId: "emberfall-woods",
      role: "regular",
      tier: 1,
      power: 72,
      threat: 80,
      xp: 22,
      gold: 12,
      renown: 1,
      progress: 3,
      loot: [
        { type: "resource", resourceId: "green-herb", chance: 0.9, min: 1, max: 3 },
        { type: "resource", resourceId: "bramble-hide", chance: 0.55, min: 1, max: 2 },
        { type: "item", itemId: "mossfang-charm", chance: 0.16 }
      ]
    },
    {
      id: "bramble-whelp",
      name: "Bramble Whelp",
      areaId: "emberfall-woods",
      role: "regular",
      tier: 1,
      power: 96,
      threat: 105,
      xp: 28,
      gold: 15,
      renown: 1,
      progress: 4,
      loot: [
        { type: "resource", resourceId: "bramble-hide", chance: 0.8, min: 1, max: 3 },
        { type: "resource", resourceId: "monster-bone", chance: 0.35, min: 1, max: 1 },
        { type: "item", itemId: "mossguard-vest", chance: 0.12 }
      ]
    },
    {
      id: "ashen-razorbeak",
      name: "Ashen Razorbeak",
      areaId: "emberfall-woods",
      role: "regular",
      tier: 1,
      power: 118,
      threat: 128,
      xp: 34,
      gold: 18,
      renown: 2,
      progress: 5,
      loot: [
        { type: "resource", resourceId: "monster-bone", chance: 0.7, min: 1, max: 2 },
        { type: "item", itemId: "scuffed-hunter-blade", chance: 0.14 }
      ]
    },
    {
      id: "elder-bramblemaw",
      name: "Elder Bramblemaw",
      areaId: "emberfall-woods",
      role: "boss",
      tier: 1,
      power: 320,
      threat: 380,
      xp: 160,
      gold: 95,
      renown: 14,
      progress: 0,
      loot: [
        { type: "resource", resourceId: "bramble-hide", chance: 1, min: 4, max: 6 },
        { type: "item", itemId: "bramblemaw-cleaver", chance: 1 }
      ]
    },
    {
      id: "ironhide-tusker",
      name: "Ironhide Tusker",
      areaId: "ironroot-basin",
      role: "regular",
      tier: 2,
      power: 360,
      threat: 400,
      xp: 92,
      gold: 52,
      renown: 3,
      progress: 5,
      loot: [
        { type: "resource", resourceId: "iron-shard", chance: 0.85, min: 1, max: 3 },
        { type: "item", itemId: "ironroot-hauberk", chance: 0.1 }
      ]
    },
    {
      id: "cinderback-lurker",
      name: "Cinderback Lurker",
      areaId: "ironroot-basin",
      role: "regular",
      tier: 2,
      power: 460,
      threat: 520,
      xp: 112,
      gold: 64,
      renown: 4,
      progress: 6,
      loot: [
        { type: "resource", resourceId: "iron-shard", chance: 0.75, min: 2, max: 4 },
        { type: "resource", resourceId: "cinder-gland", chance: 0.42, min: 1, max: 2 },
        { type: "item", itemId: "cinderfang-axe", chance: 0.1 }
      ]
    },
    {
      id: "stonebound-matriarch",
      name: "Stonebound Matriarch",
      areaId: "ironroot-basin",
      role: "boss",
      tier: 2,
      power: 760,
      threat: 900,
      xp: 420,
      gold: 260,
      renown: 32,
      progress: 0,
      loot: [
        { type: "resource", resourceId: "iron-shard", chance: 1, min: 6, max: 10 },
        { type: "item", itemId: "matriarch-signet", chance: 1 }
      ]
    },
    {
      id: "hollowscale-serpent",
      name: "Hollowscale Serpent",
      areaId: "moonfen-ruins",
      role: "regular",
      tier: 3,
      power: 850,
      threat: 930,
      xp: 250,
      gold: 130,
      renown: 10,
      progress: 5,
      loot: [
        { type: "resource", resourceId: "moonlit-scale", chance: 0.78, min: 1, max: 3 },
        { type: "item", itemId: "moonfen-spellthread", chance: 0.08 }
      ]
    },
    {
      id: "ruin-wight",
      name: "Ruin Wight",
      areaId: "moonfen-ruins",
      role: "regular",
      tier: 3,
      power: 1020,
      threat: 1120,
      xp: 310,
      gold: 155,
      renown: 12,
      progress: 6,
      loot: [
        { type: "resource", resourceId: "moonlit-scale", chance: 0.72, min: 2, max: 4 },
        { type: "resource", resourceId: "ancient-relic", chance: 0.28, min: 1, max: 1 }
      ]
    },
    {
      id: "moonvein-colossus",
      name: "Moonvein Colossus",
      areaId: "moonfen-ruins",
      role: "boss",
      tier: 3,
      power: 1650,
      threat: 1900,
      xp: 1250,
      gold: 780,
      renown: 90,
      progress: 0,
      loot: [
        { type: "resource", resourceId: "ancient-relic", chance: 1, min: 3, max: 5 },
        { type: "item", itemId: "colossus-heartguard", chance: 1 }
      ]
    }
  ],
  items: [
    {
      id: "scuffed-hunter-blade",
      name: "Scuffed Hunter Blade",
      slot: "weapon",
      tier: 1,
      rarity: "common",
      value: 30,
      tags: ["weapon", "attack", "emberfall"],
      description: "A field blade with a clean edge and a history of close calls.",
      effects: [{ stat: "attack", mode: "flat", value: 7 }]
    },
    {
      id: "mossguard-vest",
      name: "Mossguard Vest",
      slot: "armor",
      tier: 1,
      rarity: "common",
      value: 28,
      tags: ["armor", "health", "emberfall"],
      description: "Layered hide and waxed moss that turn glancing blows aside.",
      effects: [
        { stat: "health", mode: "flat", value: 35 },
        { stat: "defence", mode: "flat", value: 3 },
        { stat: "recoveryRate", mode: "percent", value: 0.1 }
      ]
    },
    {
      id: "mossfang-charm",
      name: "Mossfang Charm",
      slot: "charm",
      tier: 1,
      rarity: "uncommon",
      value: 42,
      tags: ["charm", "crit", "gold", "emberfall"],
      description: "A charm worn by hunters who prefer the first strike to be final.",
      effects: [
        { stat: "critChance", mode: "flat", value: 0.025 },
        { stat: "goldFind", mode: "percent", value: 0.06 }
      ]
    },
    {
      id: "bramblemaw-cleaver",
      name: "Bramblemaw Cleaver",
      slot: "weapon",
      tier: 1,
      rarity: "rare",
      value: 95,
      tags: ["weapon", "boss", "attack", "emberfall"],
      description: "A heavy cleaver cut from the boss's hardened jaw plate.",
      effects: [
        { stat: "attack", mode: "flat", value: 24 },
        { stat: "critChance", mode: "flat", value: 0.02 }
      ]
    },
    {
      id: "ironroot-hauberk",
      name: "Ironroot Hauberk",
      slot: "armor",
      tier: 2,
      rarity: "uncommon",
      value: 110,
      tags: ["armor", "defence", "ironroot"],
      description: "Flexible plates threaded through black root fiber.",
      effects: [
        { stat: "health", mode: "flat", value: 120 },
        { stat: "defence", mode: "flat", value: 14 }
      ]
    },
    {
      id: "cinderfang-axe",
      name: "Cinderfang Axe",
      slot: "weapon",
      tier: 2,
      rarity: "uncommon",
      value: 130,
      tags: ["weapon", "attack", "ironroot"],
      description: "The head stays warm long after the hunt is over.",
      effects: [
        { stat: "attack", mode: "flat", value: 36 },
        { stat: "speed", mode: "percent", value: -0.03 }
      ]
    },
    {
      id: "matriarch-signet",
      name: "Matriarch Signet",
      slot: "charm",
      tier: 2,
      rarity: "rare",
      value: 210,
      tags: ["charm", "boss", "renown", "ironroot"],
      description: "A ring of dark stone that makes old oaths feel close.",
      effects: [
        { stat: "health", mode: "percent", value: 0.08 },
        { stat: "defence", mode: "percent", value: 0.12 },
        { stat: "recoveryRate", mode: "percent", value: 0.18 },
        { stat: "xpGain", mode: "percent", value: 0.1 }
      ]
    },
    {
      id: "moonfen-spellthread",
      name: "Moonfen Spellthread",
      slot: "charm",
      tier: 3,
      rarity: "rare",
      value: 340,
      tags: ["charm", "speed", "moonfen"],
      description: "Silver thread that tightens when danger is near.",
      effects: [
        { stat: "speed", mode: "percent", value: 0.16 },
        { stat: "luck", mode: "flat", value: 2 }
      ]
    },
    {
      id: "colossus-heartguard",
      name: "Colossus Heartguard",
      slot: "armor",
      tier: 3,
      rarity: "rare",
      value: 620,
      tags: ["armor", "boss", "moonfen"],
      description: "A breastplate that hums with patient, impossible weight.",
      effects: [
        { stat: "health", mode: "percent", value: 0.18 },
        { stat: "defence", mode: "flat", value: 22 },
        { stat: "recoveryRate", mode: "percent", value: 0.28 }
      ]
    }
  ],
  resources: [
    { id: "green-herb", name: "Green Herb", tier: 1, value: 2, tags: ["plant", "emberfall"] },
    { id: "bramble-hide", name: "Bramble Hide", tier: 1, value: 5, tags: ["hide", "emberfall"] },
    { id: "monster-bone", name: "Monster Bone", tier: 1, value: 8, tags: ["bone"] },
    { id: "iron-shard", name: "Iron Shard", tier: 2, value: 13, tags: ["ore", "ironroot"] },
    { id: "cinder-gland", name: "Cinder Gland", tier: 2, value: 19, tags: ["organ", "ironroot"] },
    { id: "moonlit-scale", name: "Moonlit Scale", tier: 3, value: 32, tags: ["scale", "moonfen"] },
    { id: "ancient-relic", name: "Ancient Relic", tier: 3, value: 55, tags: ["relic", "moonfen"] }
  ]
};
