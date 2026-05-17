import type { EquipmentSlot, InventoryItem, ItemEffect, ItemSpec } from "./types";

export const maxItemLevel = 100;

export function getItemLevel(item?: Partial<InventoryItem>): number {
  return Math.max(1, Math.min(maxItemLevel, Math.floor(Number(item?.level ?? 1))));
}

export function getItemLevelMultiplier(item?: Partial<InventoryItem>): number {
  return 1 + (getItemLevel(item) - 1) * 0.01;
}

export function getItemSellValue(spec: ItemSpec, item?: Partial<InventoryItem>): number {
  return Math.floor(spec.value * getItemLevel(item));
}

export function getLeveledItemEffects(spec: ItemSpec, item?: Partial<InventoryItem>): ItemEffect[] {
  const levelMultiplier = getItemLevelMultiplier(item);
  const effects = spec.effects.map((effect) => ({
    ...effect,
    value: roundEffect(effect.value * levelMultiplier)
  }));

  if (getItemLevel(item) >= maxItemLevel) {
    effects.push(getItemMasteryEffect(spec));
  }

  return effects;
}

export function getItemGearScore(spec: ItemSpec, item?: Partial<InventoryItem>): number {
  const baseScore = spec.tier * 18 + getRarityScoreBonus(spec.rarity);
  const effectScore = spec.effects.reduce((total, effect) => total + getEffectScore(effect), 0);
  const levelMultiplier = getItemLevelMultiplier(item);
  const masteryScore = getItemLevel(item) >= maxItemLevel ? getEffectScore(getItemMasteryEffect(spec)) : 0;

  return Math.max(1, Math.round((baseScore + effectScore) * levelMultiplier + masteryScore));
}

export function getItemGearScoreTotal(items: InventoryItem[], specs: ItemSpec[], equipped: Partial<Record<EquipmentSlot, string>>): number {
  return Object.values(equipped).reduce((total, instanceId) => {
    const item = items.find((entry) => entry.instanceId === instanceId);
    const spec = item ? specs.find((entry) => entry.id === item.itemId) : undefined;

    return spec ? total + getItemGearScore(spec, item) : total;
  }, 0);
}

export function getItemMasteryLabel(spec: ItemSpec): string {
  const effect = getItemMasteryEffect(spec);

  if (effect.stat === "critChance") {
    return "+5% crit chance";
  }

  if (effect.stat === "recoveryRate") {
    return "+12% recovery";
  }

  if (effect.stat === "materialFind") {
    return "+15% materials";
  }

  return "+1 luck";
}

function getRarityScoreBonus(rarity: ItemSpec["rarity"]): number {
  if (rarity === "rare") {
    return 36;
  }

  if (rarity === "uncommon") {
    return 18;
  }

  return 6;
}

function getEffectScore(effect: ItemEffect): number {
  const magnitude = Math.abs(effect.value);

  if (effect.mode === "percent") {
    return magnitude * getPercentStatWeight(effect.stat);
  }

  if (effect.stat === "health") {
    return magnitude * 0.35;
  }

  if (effect.stat === "attack") {
    return magnitude * 3.6;
  }

  if (effect.stat === "defence") {
    return magnitude * 4.2;
  }

  if (effect.stat === "speed") {
    return magnitude * 180;
  }

  if (effect.stat === "critChance") {
    return magnitude * 520;
  }

  if (effect.stat === "luck") {
    return magnitude * 22;
  }

  if (effect.stat === "recoveryRate") {
    return magnitude * 520;
  }

  return magnitude * 120;
}

function getPercentStatWeight(stat: ItemEffect["stat"]): number {
  if (stat === "attack" || stat === "defence" || stat === "health") {
    return 185;
  }

  if (stat === "speed") {
    return 260;
  }

  if (stat === "critChance") {
    return 520;
  }

  if (stat === "recoveryRate") {
    return 180;
  }

  return 95;
}

function getItemMasteryEffect(spec: ItemSpec): ItemEffect {
  if (spec.slot === "weapon") {
    return { stat: "critChance", mode: "flat", value: 0.05 };
  }

  if (spec.slot === "armor") {
    return { stat: "recoveryRate", mode: "percent", value: 0.12 };
  }

  if (spec.slot === "charm") {
    return { stat: "materialFind", mode: "percent", value: 0.15 };
  }

  return { stat: "luck", mode: "flat", value: 1 };
}

function roundEffect(value: number): number {
  return Math.round(value * 10000) / 10000;
}
