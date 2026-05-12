import {
  balance,
  canDefeatBoss,
  getHunterCombatHealth,
  getHunterDamagePerSecond,
  getHunterStats,
  getMonsterDamagePerSecond,
  getMonsterMaxHealth
} from "./balance";
import { gameContent } from "./content/content";
import { getSnapshot } from "./game";
import type { AreaSpec, GameContent, GameState, MonsterSpec } from "./types";

export type RouteGuidanceAction = "hunt" | "train" | "inventory" | "boss" | "travel" | "prestige" | "farm";

export type RouteGuidanceTone = "neutral" | "warning" | "ready" | "boss";

export type RouteGuidance = {
  id: "progress" | "danger" | "boss-low" | "boss-risk" | "boss-ready" | "boss-active" | "travel" | "prestige" | "recovering" | "wounded";
  tone: RouteGuidanceTone;
  title: string;
  body: string;
  primaryAction: RouteGuidanceAction;
  secondaryAction?: RouteGuidanceAction;
  targetAreaId?: string;
  progressLabel: string;
  progressPercent: number;
  meterLabel: string;
  meterValue: string;
};

export function getRouteGuidance(state: GameState, content: GameContent = gameContent): RouteGuidance {
  const snapshot = getSnapshot(state, content);
  const area = snapshot.currentArea;
  const areaState = state.areas[area.id];
  const nextArea = area.unlocksAreaId ? getArea(content, area.unlocksAreaId) : undefined;
  const nextAreaUnlocked = Boolean(nextArea && state.areas[nextArea.id]?.unlocked);
  const bossFightActive = state.hunt.phase === "fighting" && state.hunt.targetMonsterId === snapshot.boss.id;
  const progressPercent = getAreaProgressPercent(area, areaState.progress);
  const readinessPercent = Math.round(Math.min(150, snapshot.bossReadiness * 100));
  const previousOpenArea = getPreviousOpenArea(content, state, area);

  if (snapshot.prestige.canPrestige) {
    return {
      id: "prestige",
      tone: "ready",
      title: "Legacy Rite ready",
      body: `Moonfen is cleared and this run can become +${snapshot.prestige.gain} permanent prestige power.`,
      primaryAction: "prestige",
      progressLabel: "Renown",
      progressPercent: 100,
      meterLabel: "Prestige Gain",
      meterValue: `+${snapshot.prestige.gain}`
    };
  }

  if (state.hunt.phase === "recovering") {
    return {
      id: "recovering",
      tone: "warning",
      title: "Hunter recovering",
      body: previousOpenArea
        ? `${area.name} is still biting back. Train up, equip drops, or farm ${previousOpenArea.name} for safer gold.`
        : "The hunter was driven back. Training and equipment will make the next fight safer.",
      primaryAction: "train",
      secondaryAction: previousOpenArea ? "farm" : "inventory",
      targetAreaId: previousOpenArea?.id,
      progressLabel: "Recovery",
      progressPercent: 35,
      meterLabel: "Area Safety",
      meterValue: getAreaSafetyLabel(state, area, content)
    };
  }

  if (snapshot.hunterHealthPercent < balance.minimumRecoveryHealthPercent * 100) {
    return {
      id: "wounded",
      tone: "warning",
      title: "Hunter needs recovery",
      body: "The next fight will wait until enough health returns. Recovery speed is now part of the power curve.",
      primaryAction: "train",
      secondaryAction: "inventory",
      progressLabel: "Hunter HP",
      progressPercent: snapshot.hunterHealthPercent,
      meterLabel: "Recovery Gate",
      meterValue: `${Math.round(balance.minimumRecoveryHealthPercent * 100)}%`
    };
  }

  if (bossFightActive) {
    return {
      id: "boss-active",
      tone: "boss",
      title: `${snapshot.boss.name} is engaged`,
      body: "This is the area gate. If the boss drops, the next hunting ground opens.",
      primaryAction: "hunt",
      progressLabel: "Boss HP",
      progressPercent: 100 - (snapshot.combat?.enemyHealthPercent ?? 100),
      meterLabel: "Readiness",
      meterValue: `${readinessPercent}%`
    };
  }

  if (areaState.bossDefeated && nextArea && nextAreaUnlocked) {
    return {
      id: "travel",
      tone: "ready",
      title: `${nextArea.name} is open`,
      body: "The local boss is cleared. Travel forward when you want the next power wall.",
      primaryAction: "travel",
      secondaryAction: "inventory",
      targetAreaId: nextArea.id,
      progressLabel: "Area Gate",
      progressPercent: 100,
      meterLabel: "Next Tier",
      meterValue: `T${nextArea.tier}`
    };
  }

  if (areaState.bossUnlocked && !areaState.bossDefeated) {
    if (snapshot.hunterHealthPercent < balance.bossAttemptHealthPercent * 100) {
      return {
        id: "wounded",
        tone: "warning",
        title: "Recover before the boss",
        body: "Boss attempts need a healthier hunter. Farm, wait through recovery, or improve Field Mending.",
        primaryAction: "train",
        secondaryAction: "inventory",
        progressLabel: "Hunter HP",
        progressPercent: snapshot.hunterHealthPercent,
        meterLabel: "Boss HP Gate",
        meterValue: `${Math.round(balance.bossAttemptHealthPercent * 100)}%`
      };
    }

    if (!canDefeatBoss(snapshot.stats, snapshot.boss)) {
      return {
        id: "boss-low",
        tone: "warning",
        title: "Boss revealed, but not safe",
        body: "Keep farming, train with gold, or equip drops until readiness gets closer to the clear line.",
        primaryAction: "train",
        secondaryAction: "inventory",
        progressLabel: "Readiness",
        progressPercent: Math.min(100, readinessPercent),
        meterLabel: "Clear Line",
        meterValue: "78%"
      };
    }

    if (snapshot.bossReadiness < 0.9) {
      return {
        id: "boss-risk",
        tone: "boss",
        title: "Boss is possible",
        body: "You can attempt now, or train a little longer to make the gate more comfortable.",
        primaryAction: "boss",
        secondaryAction: "train",
        progressLabel: "Readiness",
        progressPercent: Math.min(100, readinessPercent),
        meterLabel: "Auto-safe",
        meterValue: "90%"
      };
    }

    return {
      id: "boss-ready",
      tone: "ready",
      title: "Boss is ready",
      body: "The area gate should be clean enough to push. Defeating it opens the route forward.",
      primaryAction: "boss",
      secondaryAction: "inventory",
      progressLabel: "Readiness",
      progressPercent: 100,
      meterLabel: "Boss",
      meterValue: snapshot.boss.name
    };
  }

  if (area.tier > 1 && !canSustainArea(state, area, content)) {
    return {
      id: "danger",
      tone: "warning",
      title: `${area.name} is dangerous`,
      body: previousOpenArea
        ? `This tier is a wall right now. Farm ${previousOpenArea.name}, train, then come back stronger.`
        : "This tier is a wall right now. Training and gear will turn failed hunts into steady clears.",
      primaryAction: "train",
      secondaryAction: previousOpenArea ? "farm" : "inventory",
      targetAreaId: previousOpenArea?.id,
      progressLabel: "Area Progress",
      progressPercent,
      meterLabel: "Area Safety",
      meterValue: getAreaSafetyLabel(state, area, content)
    };
  }

  return {
    id: "progress",
    tone: "neutral",
    title: "Build area progress",
    body: "Regular hunts fill the boss reveal meter. When it reaches full, the area challenge becomes the next gate.",
    primaryAction: "hunt",
    secondaryAction: "train",
    progressLabel: "Boss Reveal",
    progressPercent,
    meterLabel: "Area Safety",
    meterValue: getAreaSafetyLabel(state, area, content)
  };
}

function canSustainArea(state: GameState, area: AreaSpec, content: GameContent): boolean {
  const stats = getHunterStats(state, content);
  return area.monsterIds.some((monsterId) => canSustainMonster(stats, getMonster(content, monsterId)));
}

function canSustainMonster(stats: ReturnType<typeof getHunterStats>, monster: MonsterSpec): boolean {
  const hunterDamagePerSecond = getHunterDamagePerSecond(stats, monster);
  const enemyDamagePerSecond = getMonsterDamagePerSecond(monster);
  const timeToEnemyDefeat = getMonsterMaxHealth(monster) / hunterDamagePerSecond;
  const timeToHunterDefeat = getHunterCombatHealth(stats) / enemyDamagePerSecond;

  return timeToEnemyDefeat <= timeToHunterDefeat;
}

function getAreaSafetyLabel(state: GameState, area: AreaSpec, content: GameContent): string {
  const stats = getHunterStats(state, content);
  const sustainableCount = area.monsterIds
    .map((monsterId) => getMonster(content, monsterId))
    .filter((monster) => canSustainMonster(stats, monster)).length;

  if (sustainableCount === area.monsterIds.length) {
    return "Stable";
  }

  if (sustainableCount > 0) {
    return "Risky";
  }

  return "Unsafe";
}

function getAreaProgressPercent(area: AreaSpec, progress: number): number {
  return Math.min(100, Math.max(0, (progress / area.progressRequired) * 100));
}

function getPreviousOpenArea(content: GameContent, state: GameState, currentArea: AreaSpec): AreaSpec | undefined {
  return [...content.areas]
    .reverse()
    .find((area) => area.tier < currentArea.tier && state.areas[area.id]?.unlocked);
}

function getArea(content: GameContent, areaId: string): AreaSpec | undefined {
  return content.areas.find((entry) => entry.id === areaId);
}

function getMonster(content: GameContent, monsterId: string): MonsterSpec {
  const monster = content.monsters.find((entry) => entry.id === monsterId);

  if (!monster) {
    throw new Error(`Missing monster ${monsterId}`);
  }

  return monster;
}
