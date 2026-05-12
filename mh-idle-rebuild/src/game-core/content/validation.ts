import type { GameContent } from "../types";

export function validateContent(content: GameContent): string[] {
  const errors: string[] = [];
  const areaIds = uniqueIds(content.areas, "area", errors);
  const monsterIds = uniqueIds(content.monsters, "monster", errors);
  const itemIds = uniqueIds(content.items, "item", errors);
  const resourceIds = uniqueIds(content.resources, "resource", errors);

  for (const area of content.areas) {
    if (!monsterIds.has(area.bossId)) {
      errors.push(`Area ${area.id} references missing boss ${area.bossId}.`);
    }

    if (area.unlocksAreaId && !areaIds.has(area.unlocksAreaId)) {
      errors.push(`Area ${area.id} unlocks missing area ${area.unlocksAreaId}.`);
    }

    for (const monsterId of area.monsterIds) {
      const monster = content.monsters.find((entry) => entry.id === monsterId);
      if (!monster) {
        errors.push(`Area ${area.id} references missing monster ${monsterId}.`);
      } else if (monster.areaId !== area.id) {
        errors.push(`Monster ${monster.id} belongs to ${monster.areaId}, not ${area.id}.`);
      } else if (monster.role !== "regular") {
        errors.push(`Area ${area.id} includes non-regular monster ${monster.id}.`);
      }
    }
  }

  for (const monster of content.monsters) {
    if (!areaIds.has(monster.areaId)) {
      errors.push(`Monster ${monster.id} references missing area ${monster.areaId}.`);
    }

    for (const loot of monster.loot) {
      if (loot.type === "item" && !itemIds.has(loot.itemId)) {
        errors.push(`Monster ${monster.id} drops missing item ${loot.itemId}.`);
      }

      if (loot.type === "resource" && !resourceIds.has(loot.resourceId)) {
        errors.push(`Monster ${monster.id} drops missing resource ${loot.resourceId}.`);
      }
    }
  }

  for (const item of content.items) {
    for (const tag of item.tags) {
      if (tag.includes(",")) {
        errors.push(`Item ${item.id} has comma-packed tag "${tag}".`);
      }
    }
  }

  for (const resource of content.resources) {
    for (const tag of resource.tags) {
      if (tag.includes(",")) {
        errors.push(`Resource ${resource.id} has comma-packed tag "${tag}".`);
      }
    }
  }

  return errors;
}

function uniqueIds<T extends { id: string }>(entries: T[], label: string, errors: string[]): Set<string> {
  const ids = new Set<string>();

  for (const entry of entries) {
    if (ids.has(entry.id)) {
      errors.push(`Duplicate ${label} id ${entry.id}.`);
    }

    ids.add(entry.id);
  }

  return ids;
}
