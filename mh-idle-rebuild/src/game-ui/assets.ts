const assetRoot = "/assets/temp/images";

export const hunterPortraitAsset = `${assetRoot}/player/player-avatar-01.png`;

const monsterAssets: Record<string, string> = {
  "mossfang-stalker": `${assetRoot}/monsters/monster-wolf-basic.png`,
  "bramble-whelp": `${assetRoot}/monsters/monster-large-rat.png`,
  "ashen-razorbeak": `${assetRoot}/monsters/monster-wolf-basic.png`,
  "elder-bramblemaw": `${assetRoot}/monsters/monster-treant-basic.png`,
  "ironhide-tusker": `${assetRoot}/monsters/monster-large-rat.png`,
  "cinderback-lurker": `${assetRoot}/monsters/monster-slime-basic.png`,
  "stonebound-matriarch": `${assetRoot}/monsters/monster-treant-basic.png`,
  "hollowscale-serpent": `${assetRoot}/monsters/monster-slime-basic.png`,
  "ruin-wight": `${assetRoot}/monsters/monster-treant-basic.png`,
  "moonvein-colossus": `${assetRoot}/monsters/monster-treant-basic.png`
};

const itemAssets: Record<string, string> = {
  "scuffed-hunter-blade": `${assetRoot}/equipment/equipment-t1-weapon-crackedsword.png`,
  "bramblemaw-cleaver": `${assetRoot}/equipment/equipment-t1-weapon-crackedsword.png`,
  "cinderfang-axe": `${assetRoot}/equipment/equipment-bg-weapon2.png`,
  "mossguard-vest": `${assetRoot}/equipment/equipment-t1-chest-wornpaddedchest.png`,
  "ironroot-hauberk": `${assetRoot}/equipment/equipment-bg-chest.png`,
  "colossus-heartguard": `${assetRoot}/equipment/equipment-bg-chest.png`,
  "mossfang-charm": `${assetRoot}/equipment/equipment-bg-neck.png`,
  "matriarch-signet": `${assetRoot}/equipment/equipment-bg-finger.png`,
  "moonfen-spellthread": `${assetRoot}/equipment/equipment-bg-neck.png`
};

const resourceAssets: Record<string, string> = {
  "green-herb": `${assetRoot}/resources/resource_charstone.png`,
  "bramble-hide": `${assetRoot}/resources/resource_forge_flux.png`,
  "monster-bone": `${assetRoot}/resources/resource_clear_quartz.png`,
  "iron-shard": `${assetRoot}/resources/resource_raw_ore.png`,
  "cinder-gland": `${assetRoot}/resources/resource_copper_bar.png`,
  "moonlit-scale": `${assetRoot}/resources/resource_steel_ingot.png`,
  "ancient-relic": `${assetRoot}/resources/resource_clear_quartz.png`
};

const areaAssets: Record<string, string> = {
  "emberfall-woods": `${assetRoot}/backgrounds/background-main.png`,
  "ironroot-basin": `${assetRoot}/backgrounds/background2-main.png`,
  "moonfen-ruins": `${assetRoot}/backgrounds/background3-main.png`
};

export function getAreaAsset(areaId?: string): string | undefined {
  return areaId ? areaAssets[areaId] : undefined;
}

export function getMonsterAsset(monsterId?: string): string | undefined {
  return monsterId ? monsterAssets[monsterId] : undefined;
}

export function getItemAsset(itemId?: string): string | undefined {
  return itemId ? itemAssets[itemId] : undefined;
}

export function getResourceAsset(resourceId?: string): string | undefined {
  return resourceId ? resourceAssets[resourceId] : undefined;
}
