import {
  Activity,
  Backpack,
  Bug,
  Castle,
  CircleDot,
  Clock3,
  Crown,
  Dumbbell,
  Footprints,
  Gem,
  Hammer,
  Hand,
  Home,
  Lock,
  Map,
  Medal,
  RefreshCw,
  Scroll,
  Shield,
  Shirt,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { abandonChallenge, advanceRealtime, attemptBoss, buyTimeUpgrade, canBuyTimeUpgrade, createGame, equipItem, getOfflineBankRate, getSettlementBonuses, getSnapshot, getTimeUpgradeCost, mergeItem, prestigeRun, selectArea, sellItem, setActiveTraining, setAutoSellDuplicates, setItemLocked, setTimeSpeed, spendBankedTime, startChallenge } from "../game-core/game";
import { gameContent } from "../game-core/content/content";
import { getRouteGuidance } from "../game-core/guidance";
import { achievementSpecs, isAchievementComplete } from "../game-core/achievements";
import { challengeSpecs, getChallengeElapsedSeconds, getChallengeRecord, getNextChallengeReward, isChallengeUnlocked } from "../game-core/challenges";
import { xpForNextLevel } from "../game-core/balance";
import { formatGameNumber, gameNumber, toFiniteNumber } from "../game-core/numbers";
import type { GameNumber } from "../game-core/numbers";
import { getItemGearScore, getItemLevel, getItemMasteryLabel, getItemSellValue, getLeveledItemEffects, maxItemLevel } from "../game-core/items";
import type { RouteGuidanceAction } from "../game-core/guidance";
import { getNextTrainingGain, getTrainingDuration, getTrainingProgressPercent, getTrainingRate, getTrainingSecondsRemaining, getTrainingMilestoneBonus, trainingSpecs } from "../game-core/training";
import type { EquipmentSlot, GameState, InventoryItem, ItemSpec, MonsterSpec, ResourceSpec, SpeedMultiplier, TimeUpgradeId, TrainingId } from "../game-core/types";
import { clearBrowserSave, loadBrowserSave, writeBrowserSave } from "../platform/browserSave";
import { getAreaAsset, getItemAsset, getMonsterAsset, getResourceAsset, hunterPortraitAsset } from "./assets";

const formatWhole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatOne = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

type AppView = "hunt" | "train" | "offline" | "inventory" | "prestige" | "challenges" | "achievements" | "settlement";
type InventoryFilter = "all" | "weapon" | "armor" | "charm" | "locked" | "upgradable";
type InventorySort = "recent" | "rarity" | "level" | "strongest" | "name";

type EquipmentSlotView = {
  id: EquipmentSlot;
  label: string;
  accepts: EquipmentSlot[];
  unlocked: boolean;
  icon: React.ReactNode;
};

const equipmentSlotViews: EquipmentSlotView[] = [
  { id: "weapon", label: "Weapon", accepts: ["weapon"], unlocked: true, icon: <Swords size={24} /> },
  { id: "helm", label: "Helm", accepts: ["helm"], unlocked: false, icon: <Crown size={24} /> },
  { id: "armor", label: "Armor", accepts: ["armor"], unlocked: true, icon: <Shirt size={24} /> },
  { id: "gloves", label: "Gloves", accepts: ["gloves"], unlocked: false, icon: <Hand size={24} /> },
  { id: "boots", label: "Boots", accepts: ["boots"], unlocked: false, icon: <Footprints size={24} /> },
  { id: "charm", label: "Charm", accepts: ["charm"], unlocked: true, icon: <Gem size={24} /> },
  { id: "ring", label: "Ring", accepts: ["ring"], unlocked: false, icon: <CircleDot size={24} /> },
  { id: "relic", label: "Relic", accepts: ["relic"], unlocked: false, icon: <Scroll size={24} /> }
];

const inventoryFilterOptions: { id: InventoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weapon", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "charm", label: "Charms" },
  { id: "upgradable", label: "Stackable" },
  { id: "locked", label: "Locked" }
];

const inventorySortOptions: { id: InventorySort; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "strongest", label: "Strongest" },
  { id: "level", label: "Level" },
  { id: "rarity", label: "Rarity" },
  { id: "name", label: "Name" }
];

export function App() {
  const [state, setState] = useState<GameState>(() => loadBrowserSave());
  const [view, setView] = useState<AppView>("hunt");
  const [debugOpen, setDebugOpen] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | undefined>(() => state.inventory.items[0]?.instanceId);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => advanceRealtime(current, 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    writeBrowserSave(state);
  }, [state]);

  const snapshot = useMemo(() => getSnapshot(state), [state]);
  const areaState = state.areas[snapshot.currentArea.id];
  const bossReady = areaState.bossUnlocked && !areaState.bossDefeated;
  const xpNeeded = xpForNextLevel(state.player.level);
  const xpPercent = Math.min(100, (toFiniteNumber(state.player.xp) / xpNeeded) * 100);
  const selectedInventoryItem = state.inventory.items.find((item) => item.instanceId === selectedInventoryItemId) ?? state.inventory.items[0];
  const visiblePanels = snapshot.features;
  const activeChallenge = state.challenges.active;
  const completedChallenges = Object.values(state.challenges.records).filter((record) => record.level > 0).length;
  const bagItemCount = state.inventory.items.filter((item) => !Object.values(state.inventory.equipped).includes(item.instanceId)).length;

  useEffect(() => {
    if (view === "settlement" && !visiblePanels.settlement) {
      setView("hunt");
    }
  }, [view, visiblePanels.settlement]);

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand-lockup">
          <div className="brand-mark"><Swords size={26} /></div>
          <div>
            <div className="brand-title">Hunter Idle</div>
            <div className="brand-subtitle">Rebuild Slice</div>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <NavRow icon={<Dumbbell size={18} />} label="Train" active={view === "train"} onClick={() => setView("train")} />
          <NavRow icon={<Swords size={18} />} label="Hunt" active={view === "hunt"} onClick={() => setView("hunt")} />
          <NavRow icon={<Clock3 size={18} />} label="Offline" active={view === "offline"} badge={formatDurationCompact(state.time.bankedSeconds)} onClick={() => setView("offline")} />
          <NavRow icon={<Sparkles size={18} />} label="Prestige" active={view === "prestige"} badge={snapshot.prestige.canPrestige ? `+${snapshot.prestige.gain}` : String(state.player.prestige)} onClick={() => setView("prestige")} />
          <NavRow icon={<Medal size={18} />} label="Achievements" active={view === "achievements"} badge={`${snapshot.achievements.visibleCompleted}/${snapshot.achievements.visibleTotal}`} onClick={() => setView("achievements")} />
          <NavRow icon={<Trophy size={18} />} label="Challenges" active={view === "challenges"} badge={activeChallenge ? "Active" : String(completedChallenges)} onClick={() => setView("challenges")} />
          {visiblePanels.settlement && (
            <>
              <NavRow icon={<Home size={18} />} label="Settlement" active={view === "settlement"} badge={`${state.settlement.seasonsPassed}`} onClick={() => setView("settlement")} />
              <NavRow icon={<Castle size={18} />} label="Outposts" badge="Soon" disabled child />
              <NavRow icon={<Hammer size={18} />} label="Blacksmith" badge="Later" disabled child />
            </>
          )}
          <NavRow icon={<Backpack size={18} />} label="Inventory" active={view === "inventory"} badge={String(bagItemCount)} onClick={() => setView("inventory")} />
          <NavRow icon={<Skull size={18} />} label="Bestiary" disabled />
        </nav>

        <button className="reset-button" onClick={() => setState(clearBrowserSave())}>
          <RefreshCw size={16} />
          Reset Slice
        </button>
      </aside>

      <main className="main-view">
        <TopBar snapshot={snapshot} state={state} xpPercent={xpPercent} />

        {view === "inventory" ? (
          <InventoryView
            snapshot={snapshot}
            state={state}
            selectedItem={selectedInventoryItem}
            onSelectItem={(item) => setSelectedInventoryItemId(item.instanceId)}
            onEquip={(item) => setState((current) => equipItem(current, item.instanceId))}
            onSell={(item) => {
              setState((current) => sellItem(current, item.instanceId));
              const nextItem = state.inventory.items.find((entry) => entry.instanceId !== item.instanceId);
              setSelectedInventoryItemId(nextItem?.instanceId);
            }}
            onSetItemLocked={(item, locked) => setState((current) => setItemLocked(current, item.instanceId, locked))}
            onMerge={(targetItem, sourceItem) => {
              setState((current) => mergeItem(current, targetItem.instanceId, sourceItem.instanceId));
              setSelectedInventoryItemId(targetItem.instanceId);
            }}
            onSetAutoSellDuplicates={(enabled) => setState((current) => setAutoSellDuplicates(current, enabled))}
          />
        ) : view === "prestige" ? (
          <PrestigePanel
            snapshot={snapshot}
            state={state}
            onPrestige={() => setState((current) => prestigeRun(current))}
            page
          />
        ) : view === "offline" ? (
          <OfflineView
            state={state}
            onSetSpeed={(speedMultiplier) => setState((current) => setTimeSpeed(current, speedMultiplier))}
            onWarp={(seconds) => setState((current) => spendBankedTime(current, seconds))}
            onBuyUpgrade={(upgradeId) => setState((current) => buyTimeUpgrade(current, upgradeId))}
          />
        ) : view === "challenges" ? (
          <ChallengesView
            snapshot={snapshot}
            state={state}
            onStartChallenge={(challengeId) => setState((current) => startChallenge(current, challengeId))}
            onAbandonChallenge={() => setState((current) => abandonChallenge(current))}
          />
        ) : view === "achievements" ? (
          <AchievementsView snapshot={snapshot} state={state} />
        ) : view === "settlement" && visiblePanels.settlement ? (
          <SettlementView snapshot={snapshot} state={state} />
        ) : view === "train" ? (
          <TrainingView
            snapshot={snapshot}
            state={state}
            trainingUnlocked={visiblePanels.training}
            onBackToHunt={() => setView("hunt")}
            onTrain={(trainingId) => setState((current) => setActiveTraining(current, trainingId))}
          />
        ) : (
          <HuntView
            snapshot={snapshot}
            state={state}
            xpPercent={xpPercent}
            bossReady={bossReady}
            onSelectArea={(areaId) => setState((current) => selectArea(current, areaId))}
            onAttemptBoss={() => setState((current) => attemptBoss(current))}
            onOpenTraining={() => setView("train")}
            onOpenInventory={() => setView("inventory")}
            onOpenPrestige={() => setView("prestige")}
          />
        )}
      </main>
      <button className={`debug-toggle ${debugOpen ? "active" : ""}`} type="button" onClick={() => setDebugOpen((open) => !open)}>
        <Bug size={16} />
        Debug
      </button>
      {debugOpen && (
        <DebugMenu
          snapshot={snapshot}
          state={state}
          onClose={() => setDebugOpen(false)}
          onSetState={(nextState, nextView) => {
            setState(nextState);
            if (nextView) {
              setView(nextView);
            }
          }}
          onMutateState={(mutator, nextView) => {
            setState((current) => {
              const nextState = mutator(advanceRealtime(current, 0));
              return advanceRealtime(nextState, 0);
            });
            if (nextView) {
              setView(nextView);
            }
          }}
        />
      )}
    </div>
  );
}

type DebugSkipId = "fresh" | "training" | "inventory" | "emberBoss" | "ironroot" | "prestigeReady" | "settlement";

const debugSkipPoints: { id: DebugSkipId; label: string; view: AppView; description: string }[] = [
  { id: "fresh", label: "Fresh Run", view: "hunt", description: "Clean level 1 save." },
  { id: "training", label: "Training Open", view: "train", description: "First hunt complete, training visible." },
  { id: "inventory", label: "Inventory Lab", view: "inventory", description: "Materials and varied gear drops." },
  { id: "emberBoss", label: "Ember Boss Ready", view: "hunt", description: "First boss revealed and safe to test." },
  { id: "ironroot", label: "Ironroot Open", view: "hunt", description: "Second area unlocked." },
  { id: "prestigeReady", label: "Prestige Ready", view: "prestige", description: "Capstone cleared with enough renown." },
  { id: "settlement", label: "Settlement Open", view: "settlement", description: "First prestige completed with seasons." }
];

function DebugMenu({
  snapshot,
  state,
  onClose,
  onSetState,
  onMutateState
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  onClose: () => void;
  onSetState: (state: GameState, view?: AppView) => void;
  onMutateState: (mutator: (state: GameState) => GameState, view?: AppView) => void;
}) {
  const allAreasOpen = gameContent.areas.every((area) => state.areas[area.id]?.unlocked);
  const handleSettlementUnlockedChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onMutateState((next) => setDebugSettlementUnlocked(next, checked), checked ? "settlement" : "hunt");
  };
  const handleAllAreasUnlockedChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onMutateState((next) => setDebugAllAreasUnlocked(next, checked));
  };
  const handleAutoBossChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onMutateState((next) => ({ ...next, unlocks: { ...next.unlocks, autoBoss: checked } }));
  };
  const handleAutoAdvanceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onMutateState((next) => ({ ...next, unlocks: { ...next.unlocks, autoAdvanceArea: checked } }));
  };
  const handleAutoSellChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onMutateState((next) => ({
      ...next,
      inventory: { ...next.inventory, autoSellDuplicates: checked ? next.inventory.autoSellDuplicates : false },
      unlocks: { ...next.unlocks, autoSellDuplicates: checked }
    }));
  };

  return (
    <aside className="debug-menu" aria-label="Debug menu">
      <div className="debug-menu-header">
        <div>
          <span className="eyebrow">Developer Tools</span>
          <h2>Debug Menu</h2>
        </div>
        <button type="button" onClick={onClose}>Close</button>
      </div>

      <div className="debug-section">
        <h3>Skip Points</h3>
        <div className="debug-skip-grid">
          {debugSkipPoints.map((skipPoint) => (
            <button
              type="button"
              key={skipPoint.id}
              onClick={() => onSetState(createDebugSkipState(state, skipPoint.id), skipPoint.view)}
            >
              <strong>{skipPoint.label}</strong>
              <span>{skipPoint.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="debug-section">
        <h3>Quick Grants</h3>
        <div className="debug-action-row">
          <button type="button" onClick={() => onMutateState((next) => grantDebugCurrency(next, "gold", 10000))}>+10K Gold</button>
          <button type="button" onClick={() => onMutateState((next) => grantDebugCurrency(next, "renown", 250))}>+250 Renown</button>
          <button type="button" onClick={() => onMutateState((next) => grantDebugBankedTime(next, 3600))}>+1h Banked</button>
          <button type="button" onClick={() => onMutateState(addDebugInventory, "inventory")}>Add Gear Set</button>
        </div>
      </div>

      <div className="debug-section">
        <h3>Toggles</h3>
        <div className="debug-toggle-list">
          <label>
            <input
              type="checkbox"
              checked={state.player.prestige > 0}
              onChange={handleSettlementUnlockedChange}
            />
            <span>Settlement unlocked</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={allAreasOpen}
              onChange={handleAllAreasUnlockedChange}
            />
            <span>All areas unlocked</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.unlocks.autoBoss}
              onChange={handleAutoBossChange}
            />
            <span>Auto boss unlocked</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.unlocks.autoAdvanceArea}
              onChange={handleAutoAdvanceChange}
            />
            <span>Auto area advance unlocked</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.unlocks.autoSellDuplicates}
              onChange={handleAutoSellChange}
            />
            <span>Auto-sell unlocked</span>
          </label>
        </div>
      </div>

      <div className="debug-section debug-state-readout">
        <h3>Current State</h3>
        <Row label="View power" value={formatWhole.format(snapshot.power)} />
        <Row label="Prestige" value={String(state.player.prestige)} />
        <Row label="Hunts" value={String(state.hunt.huntsCompleted)} />
        <Row label="Area" value={snapshot.currentArea.name} />
      </div>
    </aside>
  );
}

function SettlementView({ snapshot, state }: { snapshot: ReturnType<typeof getSnapshot>; state: GameState }) {
  const settlement = state.settlement;
  const bonuses = getSettlementBonuses(settlement);
  const seasonsToNext = Math.max(0, 3 - (settlement.seasonsPassed % 3 || 3));
  const foundedLabel = settlement.foundedAtPrestige ? `Legacy ${settlement.foundedAtPrestige}` : "Not founded";
  const districtCards = [
    {
      icon: <Home size={20} />,
      title: "Hunter Hearth",
      value: `${settlement.population}`,
      label: "Settlers",
      body: "The permanent camp that survives resets. Growth is counted when a legacy rite passes."
    },
    {
      icon: <Castle size={20} />,
      title: "Outpost Trails",
      value: `${settlement.outpostScouts}`,
      label: "Scout marks",
      body: "Future area automation and route memory will live here."
    },
    {
      icon: <Hammer size={20} />,
      title: "Blacksmith Yard",
      value: `${settlement.forgeHeat}`,
      label: "Forge heat",
      body: "Future item crafting, salvage, and duplicate handling will live here."
    }
  ];

  return (
    <section className="dashboard-panel settlement-page">
      <div className="panel-title"><Home size={15} /> Settlement</div>
      <div className="settlement-layout">
        <div className="settlement-hero">
          <span className="eyebrow">Long Game</span>
          <h2>Hunter Settlement</h2>
          <p>
            The settlement grows when prestige makes time pass. It stays quiet during a run, then gains seasons, settlers, stores, scout marks, and forge heat when a legacy rite is completed.
          </p>
          <div className="settlement-summary-grid">
            <div><span>Founded</span><strong>{foundedLabel}</strong></div>
            <div><span>Seasons</span><strong>{settlement.seasonsPassed}</strong></div>
            <div><span>Training</span><strong>x{formatOne.format(bonuses.trainingRate)}</strong></div>
            <div><span>Gold Find</span><strong>+{formatOne.format((bonuses.goldFind - 1) * 100)}%</strong></div>
            <div><span>Materials</span><strong>+{formatOne.format((bonuses.materialFind - 1) * 100)}%</strong></div>
          </div>
        </div>

        <div className="settlement-ledger">
          <span className="eyebrow">Permanent Track</span>
          <h3>Prestige-linked growth</h3>
          <Row label="Current prestige" value={String(state.player.prestige)} />
          <Row label="Prestige ready" value={snapshot.prestige.canPrestige ? `+${snapshot.prestige.gain}` : "No"} muted={!snapshot.prestige.canPrestige} />
          <Row label="Settlement age" value={`${settlement.seasonsPassed} seasons`} />
          <Row label="Camp stores" value={String(settlement.stores)} />
          <Row label="Next pulse" value={seasonsToNext === 0 ? "Next prestige" : `${seasonsToNext} seasons`} />
        </div>

        <div className="settlement-district-grid">
          {districtCards.map((district) => (
            <article className="settlement-district-card" key={district.title}>
              <div>
                {district.icon}
                <span>{district.label}</span>
              </div>
              <strong>{district.value}</strong>
              <h3>{district.title}</h3>
              <p>{district.body}</p>
            </article>
          ))}
        </div>

        <div className="settlement-roadmap">
          <span className="eyebrow">Locked Branches</span>
          <div className="settlement-roadmap-list">
            <article>
              <Castle size={18} />
              <div>
                <strong>Outposts</strong>
                <span>Unlocks after settlement growth starts producing route maps.</span>
              </div>
              <b>Soon</b>
            </article>
            <article>
              <Hammer size={18} />
              <div>
                <strong>Blacksmith</strong>
                <span>Unlocks when duplicate gear and salvage become a meaningful loop.</span>
              </div>
              <b>Later</b>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChallengesView({
  snapshot,
  state,
  onStartChallenge,
  onAbandonChallenge
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  onStartChallenge: (challengeId: string) => void;
  onAbandonChallenge: () => void;
}) {
  const activeChallenge = state.challenges.active;
  const activeSpec = activeChallenge ? challengeSpecs.find((challenge) => challenge.id === activeChallenge.challengeId) : undefined;
  const activeElapsed = getChallengeElapsedSeconds(state);
  const completedCount = Object.values(state.challenges.records).filter((record) => record.level > 0).length;

  const handleStart = (challengeId: string) => {
    if (window.confirm("Start this challenge? This performs a fresh challenge run reset.")) {
      onStartChallenge(challengeId);
    }
  };

  return (
    <section className="dashboard-panel challenges-page">
      <div className="panel-title"><Trophy size={15} /> Challenges</div>
      <div className="challenges-grid">
        <div className="challenge-summary">
          <span className="eyebrow">Challenge Board</span>
          <h2>{activeSpec ? "Active" : completedCount}</h2>
          <div className="training-summary-grid">
            <div><span>Status</span><strong>{activeSpec ? activeSpec.name : "Normal Run"}</strong></div>
            <div><span>Timer</span><strong>{activeSpec ? formatDuration(activeElapsed) : "--"}</strong></div>
            <div><span>Completed</span><strong>{completedCount}</strong></div>
            <div><span>Prestige</span><strong>{state.player.prestige}</strong></div>
          </div>
          {activeSpec && (
            <button type="button" className="challenge-exit-action" onClick={onAbandonChallenge}>
              {activeChallenge?.completedAt ? "Finish Challenge" : "Abandon Challenge"}
            </button>
          )}
        </div>
        <div className="challenge-slot-list">
          {challengeSpecs.map((challenge) => {
            const record = getChallengeRecord(state, challenge.id);
            const unlocked = isChallengeUnlocked(state, challenge);
            const active = activeChallenge?.challengeId === challenge.id && !activeChallenge.completedAt;
            const completed = record.level > 0;
            const nextReward = getNextChallengeReward(challenge, record);
            const currentReward = challenge.rewardLevels.find((rewardLevel) => rewardLevel.level === record.level)?.reward;
            const status = active
              ? "Active"
              : activeChallenge?.challengeId === challenge.id && activeChallenge.completedAt
                ? `Complete L${activeChallenge.completedLevel}`
                : completed
                  ? `Level ${record.level}`
                  : unlocked
                    ? "Open"
                    : "Locked";

            return (
              <article className={`challenge-slot-card ${active ? "active" : ""} ${completed ? "complete" : ""} ${!unlocked ? "locked" : ""}`} key={challenge.id}>
                <div className="boss-token"><Trophy size={24} /></div>
                <div className="challenge-card-body">
                  <div className="challenge-card-heading">
                    <span className="eyebrow">{challenge.chunk}</span>
                    <strong className={`challenge-status ${active || completed ? "ready" : ""}`}>{status}</strong>
                  </div>
                  <h3>{challenge.name}</h3>
                  <p>{challenge.summary}</p>
                  <div className="challenge-detail-grid">
                    <div><span>Goal</span><strong>{challenge.goalLabel}</strong></div>
                    <div><span>Level</span><strong>{record.level} / 5</strong></div>
                    <div><span>Best</span><strong>{record.bestSeconds === undefined ? "--" : formatDuration(record.bestSeconds)}</strong></div>
                    <div><span>Current Reward</span><strong>{currentReward ?? "None yet"}</strong></div>
                    <div><span>Next</span><strong>{nextReward?.label ?? "Maxed"}</strong></div>
                  </div>
                  <div className="challenge-rules-row">
                    <span>Allowed: {challenge.allowed.join(", ")}</span>
                    <span>Disabled: {challenge.disabled.join(", ")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="challenge-start-action"
                  disabled={!unlocked || Boolean(activeChallenge)}
                  onClick={() => handleStart(challenge.id)}
                >
                  {active ? "Active" : unlocked ? "Start" : <Lock size={16} />}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AchievementsView({
  snapshot,
  state
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
}) {
  const visibleAchievements = achievementSpecs.filter((achievement) => !achievement.secret);
  const secretAchievements = achievementSpecs.filter((achievement) => achievement.secret);

  return (
    <section className="dashboard-panel achievements-page">
      <div className="panel-title"><Medal size={15} /> Achievements</div>
      <div className="achievement-summary-grid">
        <div>
          <span className="eyebrow">Milestones</span>
          <h2>{snapshot.achievements.visibleCompleted} / {snapshot.achievements.visibleTotal}</h2>
        </div>
        <div>
          <span className="eyebrow">Secret</span>
          <h2>{snapshot.achievements.secretCompleted} / {snapshot.achievements.secretTotal}</h2>
        </div>
        <div>
          <span className="eyebrow">Tokens</span>
          <h2>{snapshot.achievements.secretTokens}</h2>
        </div>
        <div>
          <span className="eyebrow">Power</span>
          <h2>+{formatOne.format((snapshot.achievements.statMultiplier - 1) * 100)}%</h2>
        </div>
        <div>
          <span className="eyebrow">Rewards</span>
          <h2>+{formatOne.format((snapshot.achievements.rewardMultiplier - 1) * 100)}%</h2>
        </div>
      </div>
      <AchievementList title="Milestones" achievements={visibleAchievements} state={state} revealSecrets />
      <AchievementList title="Secret Achievements" achievements={secretAchievements} state={state} />
    </section>
  );
}

function AchievementList({
  title,
  achievements,
  state,
  revealSecrets = false
}: {
  title: string;
  achievements: typeof achievementSpecs;
  state: GameState;
  revealSecrets?: boolean;
}) {
  return (
    <div className="achievement-band">
      <div className="achievement-band-heading">
        <span className="eyebrow">{title}</span>
        <strong>{achievements.filter((achievement) => isAchievementComplete(state, achievement.id)).length} / {achievements.length}</strong>
      </div>
      <div className="achievement-card-grid">
        {achievements.map((achievement) => {
          const complete = isAchievementComplete(state, achievement.id);
          const hidden = achievement.secret && !complete && !revealSecrets;
          const rewardParts = [
            achievement.reward.statPercent ? `+${formatOne.format(achievement.reward.statPercent * 100)}% power` : undefined,
            achievement.reward.rewardPercent ? `+${formatOne.format(achievement.reward.rewardPercent * 100)}% rewards` : undefined,
            achievement.reward.bankedSeconds ? `${formatDurationCompact(achievement.reward.bankedSeconds)} banked` : undefined,
            achievement.reward.unlock ? `Unlock: ${formatUnlockReward(achievement.reward.unlock)}` : undefined,
            achievement.reward.shopCurrency ? `Secret token +${achievement.reward.shopCurrency}` : undefined
          ].filter(Boolean).join(" / ");

          return (
            <article className={`achievement-card ${complete ? "complete" : ""} ${hidden ? "hidden" : ""}`} key={achievement.id}>
              <div className="achievement-number">#{achievement.number}</div>
              <div className="achievement-body">
                <div className="achievement-title-row">
                  <h3>{hidden ? "Secret Achievement" : achievement.name}</h3>
                  <strong>{complete ? "Complete" : "Locked"}</strong>
                </div>
                <p>{hidden ? "Requirement hidden until discovered." : achievement.requirement}</p>
                <em>{hidden ? "Awards time and secret-shop currency." : rewardParts}</em>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function formatUnlockReward(unlock: "autoBoss" | "autoAdvanceArea" | "autoSellDuplicates"): string {
  if (unlock === "autoBoss") {
    return "Auto-Boss";
  }

  if (unlock === "autoAdvanceArea") {
    return "Auto-Advance";
  }

  return "Auto-Sell Duplicates";
}

function HuntView({
  snapshot,
  state,
  xpPercent,
  bossReady,
  onSelectArea,
  onAttemptBoss,
  onOpenTraining,
  onOpenInventory,
  onOpenPrestige
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  xpPercent: number;
  bossReady: boolean;
  onSelectArea: (areaId: string) => void;
  onAttemptBoss: () => void;
  onOpenTraining: () => void;
  onOpenInventory: () => void;
  onOpenPrestige: () => void;
}) {
  return (
    <>
        <section className="dashboard-panel battle-panel">
          <div className="panel-title">
            <Swords size={15} />
            Active Battle
          </div>
          <BattleStage snapshot={snapshot} xpPercent={xpPercent} />
        </section>

        <HuntLoopPanel
          snapshot={snapshot}
          state={state}
          onOpenTraining={onOpenTraining}
          onOpenInventory={onOpenInventory}
        />

        <section className="dashboard-panel area-panel">
          <div className="panel-title">
            <Map size={15} />
            Current Area
          </div>
          <div className="area-section-grid">
            <AreaCard snapshot={snapshot} state={state} onSelectArea={onSelectArea} />
            <AreaChallengePanel
              state={state}
              snapshot={snapshot}
              bossReady={bossReady}
              onSelectArea={onSelectArea}
              onAttempt={onAttemptBoss}
            />
            <RouteGuidancePanel
              state={state}
              onSelectArea={onSelectArea}
              onAttemptBoss={onAttemptBoss}
              onOpenTraining={onOpenTraining}
              onOpenInventory={onOpenInventory}
              onOpenPrestige={onOpenPrestige}
            />
          </div>
        </section>

        {snapshot.unlockNotices.length > 0 && <UnlockNoticePanel notices={snapshot.unlockNotices} />}
    </>
  );
}

function HuntLoopPanel({
  snapshot,
  state,
  onOpenTraining,
  onOpenInventory
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  onOpenTraining: () => void;
  onOpenInventory: () => void;
}) {
  const activeTraining = state.activeTrainingId ? trainingSpecs.find((training) => training.id === state.activeTrainingId) : undefined;
  const totalTrainingLevels = trainingSpecs.reduce((total, training) => total + (state.training[training.id]?.level ?? 0), 0);
  const activeTrainingProgress = activeTraining ? getTrainingProgressPercent(state, activeTraining.id) : 0;
  const activeTrainingRemaining = activeTraining ? getTrainingSecondsRemaining(state, activeTraining.id) : 0;
  const lastRewardItems = snapshot.lastReward?.itemIds.length ?? 0;
  const lastAutoSoldItems = snapshot.lastReward?.autoSoldItemIds.length ?? 0;
  const bagItems = state.inventory.items.filter((item) => !Object.values(state.inventory.equipped).includes(item.instanceId)).length;

  return (
    <section className="hunt-loop-strip" aria-label="Hunt loop progress">
      <article className="loop-card loop-training-card">
        <div>
          <span className="eyebrow">Training</span>
          <strong>{activeTraining ? activeTraining.name : "Idle"}</strong>
          <em>{activeTraining ? `Level ${state.training[activeTraining.id]?.level ?? 0} / ${formatDuration(activeTrainingRemaining)}` : "Pick a drill to keep gaining."}</em>
        </div>
        <div className="loop-progress">
          <div className="tiny-progress blue"><span style={{ width: `${activeTrainingProgress}%` }} /></div>
          <button type="button" onClick={onOpenTraining}>{activeTraining ? "Adjust" : "Start"}</button>
        </div>
      </article>

      <article className="loop-card">
        <span>Training Levels</span>
        <strong>{formatWhole.format(totalTrainingLevels)}</strong>
        <em>x{formatOne.format(getTrainingRate(state))} rate</em>
      </article>

      <article className="loop-card">
        <span>Hunt Rate</span>
        <strong>{formatOne.format(snapshot.rates.huntsPerHour)} / hr</strong>
        <em>{formatGameNumber(snapshot.rates.xpPerHour)} XP/hr</em>
      </article>

      <article className="loop-card">
        <span>Loot Flow</span>
        <strong>{formatGameNumber(snapshot.rates.goldPerHour)}g / hr</strong>
        <em>{formatGameNumber(snapshot.rates.materialsPerHour)} materials/hr</em>
      </article>

      <article className="loop-card loop-inventory-card">
        <span>Last Drop</span>
        <strong>{lastRewardItems > 0 ? `${lastRewardItems} item` : lastAutoSoldItems > 0 ? "Auto-sold" : "Materials"}</strong>
        <button type="button" onClick={onOpenInventory}>{bagItems} Bag</button>
      </article>
    </section>
  );
}

function RouteGuidancePanel({
  state,
  onSelectArea,
  onAttemptBoss,
  onOpenTraining,
  onOpenInventory,
  onOpenPrestige
}: {
  state: GameState;
  onSelectArea: (areaId: string) => void;
  onAttemptBoss: () => void;
  onOpenTraining: () => void;
  onOpenInventory: () => void;
  onOpenPrestige: () => void;
}) {
  const guidance = getRouteGuidance(state);
  const secondaryLabel = guidance.secondaryAction ? getGuidanceActionLabel(guidance.secondaryAction) : undefined;

  const runAction = (action: RouteGuidanceAction) => {
    if (action === "train") {
      onOpenTraining();
      return;
    }

    if (action === "inventory") {
      onOpenInventory();
      return;
    }

    if (action === "boss") {
      onAttemptBoss();
      return;
    }

    if (action === "travel" || action === "farm") {
      if (guidance.targetAreaId) {
        onSelectArea(guidance.targetAreaId);
      }
      return;
    }

    if (action === "prestige") {
      onOpenPrestige();
    }
  };

  return (
    <article className={`route-guidance-card ${guidance.tone}`}>
      <div className="route-guidance-copy">
        <span className="eyebrow">Current Goal</span>
        <h3>{guidance.title}</h3>
        <p>{guidance.body}</p>
      </div>
      <div className="route-guidance-meters">
        <div>
          <span>{guidance.progressLabel}</span>
          <strong>{formatWhole.format(guidance.progressPercent)}%</strong>
          <div className="tiny-progress blue"><span style={{ width: `${guidance.progressPercent}%` }} /></div>
        </div>
        <div>
          <span>{guidance.meterLabel}</span>
          <strong>{guidance.meterValue}</strong>
        </div>
      </div>
      <div className="route-guidance-actions">
        <button
          type="button"
          disabled={guidance.primaryAction === "hunt"}
          onClick={() => runAction(guidance.primaryAction)}
        >
          {getGuidanceActionLabel(guidance.primaryAction)}
        </button>
        {guidance.secondaryAction && secondaryLabel && (
          <button type="button" className="secondary-action" onClick={() => runAction(guidance.secondaryAction!)}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </article>
  );
}

function getGuidanceActionLabel(action: RouteGuidanceAction): string {
  switch (action) {
    case "train":
      return "Open Training";
    case "inventory":
      return "Check Gear";
    case "boss":
      return "Attempt Boss";
    case "travel":
      return "Travel Forward";
    case "prestige":
      return "Open Prestige";
    case "farm":
      return "Farm Safer Area";
    case "hunt":
    default:
      return "Hunting";
  }
}

function TrainingView({
  snapshot,
  state,
  trainingUnlocked,
  onBackToHunt,
  onTrain
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  trainingUnlocked: boolean;
  onBackToHunt: () => void;
  onTrain: (trainingId: TrainingId) => void;
}) {
  return (
    <>
      <section className="dashboard-panel training-page">
        <div className="panel-title"><Dumbbell size={15} /> Training Grounds</div>
        <div className="training-page-grid">
          <div className="training-summary">
            <span className="eyebrow">Hunter Power</span>
            <h2>{formatWhole.format(snapshot.power)}</h2>
            <p>Choose one discipline to train over time. Early levels complete quickly, while later levels stretch into longer idle goals.</p>
            <div className="training-summary-grid">
              <div><span>Active</span><strong>{state.activeTrainingId ? getTrainingSpecName(state.activeTrainingId) : "Idle"}</strong></div>
              <div><span>Boss Ready</span><strong>{formatWhole.format(Math.min(100, snapshot.bossReadiness * 100))}%</strong></div>
              <div><span>Attack</span><strong>{formatWhole.format(snapshot.stats.attack)}</strong></div>
              <div><span>Health</span><strong>{formatWhole.format(snapshot.stats.health)}</strong></div>
              <div><span>Recovery</span><strong>{formatOne.format(snapshot.recoveryPerSecond)} / sec</strong></div>
              <div><span>Training Rate</span><strong>x{formatOne.format(getTrainingRate(state))}</strong></div>
            </div>
          </div>
          {trainingUnlocked ? (
            <TrainingPanel
              state={state}
              onTrain={onTrain}
              bare
            />
          ) : (
            <div className="training-panel-bare training-locked-state">
              <div>
                <span className="eyebrow">Locked</span>
                <h3>Training opens after your first hunt.</h3>
                <p>The hunter needs field notes before these drills become useful.</p>
              </div>
              <button type="button" onClick={onBackToHunt}>
                Go Hunt
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function TopBar({ snapshot, state, xpPercent }: { snapshot: ReturnType<typeof getSnapshot>; state: GameState; xpPercent: number }) {
  return (
    <header className="top-hud">
      <div className="top-bar">
        <ResourcePill icon={<Zap size={20} />} label="Banked" value={formatDuration(state.time.bankedSeconds)} />
        <ResourcePill icon={<Medal size={20} />} label="Gold" value={formatGameNumber(state.player.gold)} />
        <ResourcePill icon={<Trophy size={20} />} label="Renown" value={formatGameNumber(state.player.renown)} />
        <div className="resource-pill level-pill">
          <Shield size={20} />
          <div>
            <span>Level</span>
            <strong>{state.player.level}</strong>
          </div>
          <div className="tiny-progress"><span style={{ width: `${xpPercent}%` }} /></div>
        </div>
        <ResourcePill icon={<Sparkles size={20} />} label="Prestige" value={String(state.player.prestige)} />
      </div>
      <div className="core-stat-bar" aria-label="Core stats">
        <div><span>Power</span><strong>{formatWhole.format(snapshot.power)}</strong></div>
        <div><span>Survival</span><strong>{formatWhole.format(snapshot.survival)}</strong></div>
        <div><span>Attack</span><strong>{formatWhole.format(snapshot.stats.attack)}</strong></div>
        <div><span>Defence</span><strong>{formatWhole.format(snapshot.stats.defence)}</strong></div>
        <div><span>Health</span><strong>{formatWhole.format(snapshot.stats.health)}</strong></div>
        <div><span>Recovery</span><strong>{formatOne.format(snapshot.recoveryPerSecond)}/s</strong></div>
        <div><span>Crit</span><strong>{formatOne.format(snapshot.stats.critChance * 100)}%</strong></div>
      </div>
    </header>
  );
}

function OfflineView({
  state,
  onSetSpeed,
  onWarp,
  onBuyUpgrade
}: {
  state: GameState;
  onSetSpeed: (speedMultiplier: SpeedMultiplier) => void;
  onWarp: (seconds: number) => void;
  onBuyUpgrade: (upgradeId: TimeUpgradeId) => void;
}) {
  const offlineRate = getOfflineBankRate(state);
  const nextRate = Math.min(1, offlineRate + 0.1);
  const upgradeCost = getTimeUpgradeCost(state, "offlineEfficiency");
  const canUpgrade = canBuyTimeUpgrade(state, "offlineEfficiency");
  const maxed = state.time.offlineEfficiencyLevel >= 5;

  return (
    <section className="dashboard-panel offline-page">
      <div className="panel-title"><Clock3 size={15} /> Offline Settings</div>
      <div className="offline-page-grid">
        <div className="offline-summary">
          <span className="eyebrow">Banked Time</span>
          <h2>{formatDuration(state.time.bankedSeconds)}</h2>
          <div className="offline-metric-grid">
            <div><span>Speed</span><strong>x{state.time.speedMultiplier}</strong></div>
            <div><span>Conversion</span><strong>{formatWhole.format(offlineRate * 100)}%</strong></div>
            <div><span>Last Away</span><strong>{formatDuration(state.time.lastOfflineSeconds)}</strong></div>
            <div><span>Last Banked</span><strong>{formatDuration(state.time.lastBankedSeconds)}</strong></div>
          </div>
        </div>

        <div className="offline-controls">
          <TimeBankControls
            state={state}
            onSetSpeed={onSetSpeed}
            onWarp={onWarp}
          />
          <article className="time-upgrade-card">
            <div>
              <span className="eyebrow">Upgrade</span>
              <h3>Offline Recovery</h3>
              <p>{maxed ? "Recovery efficiency is capped." : `${formatWhole.format(offlineRate * 100)}% -> ${formatWhole.format(nextRate * 100)}% offline time conversion.`}</p>
            </div>
            <div className="upgrade-progress-row">
              <span>Level</span>
              <strong>{state.time.offlineEfficiencyLevel} / 5</strong>
            </div>
            <button type="button" disabled={!canUpgrade || maxed} onClick={() => onBuyUpgrade("offlineEfficiency")}>
              {maxed ? "Maxed" : `${formatGameNumber(upgradeCost)}g`}
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

function InventoryView({
  snapshot,
  state,
  selectedItem,
  onSelectItem,
  onEquip,
  onSell,
  onSetItemLocked,
  onMerge,
  onSetAutoSellDuplicates
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  selectedItem?: InventoryItem;
  onSelectItem: (item: InventoryItem) => void;
  onEquip: (item: InventoryItem) => void;
  onSell: (item: InventoryItem) => void;
  onSetItemLocked: (item: InventoryItem, locked: boolean) => void;
  onMerge: (targetItem: InventoryItem, sourceItem: InventoryItem) => void;
  onSetAutoSellDuplicates: (enabled: boolean) => void;
}) {
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const [inventorySort, setInventorySort] = useState<InventorySort>("recent");
  const selectedSpec = selectedItem ? getItemSpec(selectedItem) : undefined;
  const equippedInstanceId = selectedSpec?.slot ? state.inventory.equipped[selectedSpec.slot] : undefined;
  const selectedIsEquipped = Boolean(selectedItem && selectedItem.instanceId === equippedInstanceId);
  const selectedSlotView = selectedSpec?.slot
    ? equipmentSlotViews.find((slot) => slot.accepts.includes(selectedSpec.slot!))
    : undefined;
  const selectedCanEquip = Boolean(selectedItem && selectedSpec?.slot && selectedSlotView?.unlocked && !selectedIsEquipped);
  const selectedCanSell = Boolean(selectedItem && selectedSpec && !selectedItem.locked && !selectedIsEquipped);
  const selectedSlotLabel = selectedSlotView?.label ?? selectedSpec?.slot ?? "Item";
  const equippedInstanceIds = Object.values(state.inventory.equipped);
  const bagItems = state.inventory.items.filter((item) => !equippedInstanceIds.includes(item.instanceId));
  const visibleBagItems = useMemo(() => {
    return bagItems
      .filter((item) => inventoryItemMatchesFilter(item, inventoryFilter, bagItems))
      .sort((left, right) => compareInventoryItems(left, right, inventorySort));
  }, [bagItems, inventoryFilter, inventorySort]);
  const resources = Object.entries(state.resources)
    .map(([resourceId, amount]) => ({
      amount,
      resource: gameContent.resources.find((entry) => entry.id === resourceId)
    }))
    .filter((entry): entry is { amount: GameNumber; resource: ResourceSpec } => Boolean(entry.resource));

  const handleItemDragStart = (event: React.DragEvent<HTMLButtonElement>, item: InventoryItem) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-hunter-item", item.instanceId);
    event.dataTransfer.setData("text/plain", item.instanceId);
    onSelectItem(item);
  };

  const handleSlotDragOver = (event: React.DragEvent<HTMLButtonElement>, slot: EquipmentSlotView) => {
    if (slot.unlocked) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const handleSlotDrop = (event: React.DragEvent<HTMLButtonElement>, slot: EquipmentSlotView) => {
    event.preventDefault();

    if (!slot.unlocked) {
      return;
    }

    const instanceId = event.dataTransfer.getData("application/x-hunter-item") || event.dataTransfer.getData("text/plain");
    const item = state.inventory.items.find((entry) => entry.instanceId === instanceId);
    const spec = getItemSpec(item);

    if (!item || !spec?.slot || !slot.accepts.includes(spec.slot)) {
      return;
    }

    const equipped = getEquippedItem(state, slot.id);
    const equippedSpec = getItemSpec(equipped);
    if (equipped && equippedSpec?.id === spec.id) {
      if (canMergeInventoryItems(equipped, item, equippedInstanceIds)) {
        onSelectItem(equipped);
        onMerge(equipped, item);
      }
      return;
    }

    onSelectItem(item);
    onEquip(item);
  };

  const handleItemDragOver = (event: React.DragEvent<HTMLButtonElement>, targetItem: InventoryItem) => {
    const sourceInstanceId = event.dataTransfer.getData("application/x-hunter-item") || event.dataTransfer.getData("text/plain");
    const sourceItem = state.inventory.items.find((entry) => entry.instanceId === sourceInstanceId);

    if (sourceItem && canMergeInventoryItems(targetItem, sourceItem, equippedInstanceIds)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const handleItemDrop = (event: React.DragEvent<HTMLButtonElement>, targetItem: InventoryItem) => {
    event.preventDefault();

    const sourceInstanceId = event.dataTransfer.getData("application/x-hunter-item") || event.dataTransfer.getData("text/plain");
    const sourceItem = state.inventory.items.find((entry) => entry.instanceId === sourceInstanceId);

    if (!sourceItem || !canMergeInventoryItems(targetItem, sourceItem, equippedInstanceIds)) {
      return;
    }

    onSelectItem(targetItem);
    onMerge(targetItem, sourceItem);
  };

  const handleInventoryItemClick = (event: React.MouseEvent<HTMLButtonElement>, item: InventoryItem) => {
    if (event.shiftKey) {
      event.preventDefault();
      onSetItemLocked(item, !item.locked);
      onSelectItem({ ...item, locked: !item.locked });
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (!item.locked) {
        onSell(item);
      } else {
        onSelectItem(item);
      }
      return;
    }

    onSelectItem(item);
  };

  return (
    <>
      <section className="dashboard-panel inventory-page">
        <div className="panel-title"><Backpack size={15} /> Inventory / Equipment</div>
        <div className="inventory-page-grid">
          <div className="inventory-equipment-column">
            <span className="eyebrow">Equipped</span>
            <h2>Hunter Kit</h2>
            <div className="equipment-socket-grid">
              <div className="equipment-body-map" aria-hidden="true" />
              {equipmentSlotViews.map((slot) => {
                const equipped = getEquippedItem(state, slot.id);
                const spec = equipped ? getItemSpec(equipped) : undefined;
                const compatible = Boolean(selectedSpec?.slot && slot.accepts.includes(selectedSpec.slot));
                const mergeTarget = Boolean(equipped && selectedItem && canMergeInventoryItems(equipped, selectedItem, equippedInstanceIds));
                const classes = [
                  "equipment-socket",
                  `equipment-socket-${slot.id}`,
                  spec ? `rarity-${spec.rarity}` : "",
                  slot.unlocked ? "unlocked" : "locked",
                  spec ? "filled" : "empty",
                  compatible ? "compatible" : "",
                  mergeTarget ? "merge-target" : ""
                ].filter(Boolean).join(" ");

                return (
                  <button
                    type="button"
                    key={slot.id}
                    className={classes}
                    aria-disabled={!slot.unlocked}
                    data-tooltip={spec ? `${spec.name} / Level ${getItemLevel(equipped)}` : slot.unlocked ? `${slot.label}: Empty` : `${slot.label}: Locked`}
                    onClick={() => equipped && onSelectItem(equipped)}
                    onDragOver={(event) => handleSlotDragOver(event, slot)}
                    onDrop={(event) => handleSlotDrop(event, slot)}
                  >
                    <span className="slot-icon" aria-hidden="true">
                      {spec ? <img src={getItemAsset(spec.id)} alt="" /> : slot.icon}
                      {!slot.unlocked && <Lock className="slot-lock-icon" size={13} />}
                    </span>
                    {spec && getItemLevel(equipped) > 1 && <span className="item-level-pill">{getItemLevel(equipped)}</span>}
                    <span className="sr-only">{spec ? `${slot.label}: ${spec.name}, level ${getItemLevel(equipped)}` : slot.unlocked ? `${slot.label}: Empty` : `${slot.label}: Locked`}</span>
                  </button>
                );
              })}
            </div>
            <div className="inventory-stat-strip">
              <div><span>Power</span><strong>{formatWhole.format(snapshot.power)}</strong></div>
              <div><span>Attack</span><strong>{formatWhole.format(snapshot.stats.attack)}</strong></div>
              <div><span>Defence</span><strong>{formatWhole.format(snapshot.stats.defence)}</strong></div>
            </div>
          </div>

          <div className="inventory-detail-column">
            {selectedSpec && selectedItem ? (
              <>
                <span className="eyebrow">{selectedSpec.rarity} {selectedSpec.slot ?? "item"} / Level {getItemLevel(selectedItem)} of {maxItemLevel}</span>
                <h2>{selectedSpec.name}</h2>
                <p>{selectedSpec.description}</p>
                <div className="stat-table inventory-effect-table">
                  {getLeveledItemEffects(selectedSpec, selectedItem).map((effect) => (
                    <Row
                      key={`${effect.stat}-${effect.value}-${effect.mode}`}
                      label={formatStatLabel(effect.stat)}
                      value={formatEffectValue(effect.mode, effect.value, effect.stat)}
                    />
                  ))}
                  {getItemLevel(selectedItem) < maxItemLevel && (
                    <Row
                      label="Level 100 Bonus"
                      value={getItemMasteryLabel(selectedSpec)}
                      muted
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="equip-action"
                  disabled={!selectedCanEquip}
                  onClick={() => onEquip(selectedItem)}
                >
              {selectedIsEquipped ? "Equipped" : selectedSlotView?.unlocked ? `Equip ${selectedSlotLabel}` : selectedSpec.slot ? "Slot Locked" : "Cannot Equip"}
                </button>
                <button
                  type="button"
                  className="sell-action"
                  disabled={!selectedCanSell}
                  onClick={() => onSell(selectedItem)}
                >
                  {selectedIsEquipped ? "Equipped items cannot be sold" : selectedItem.locked ? "Locked items cannot be sold" : `Sell for ${formatGameNumber(getItemSellValue(selectedSpec, selectedItem))}g`}
                </button>
              </>
            ) : (
              <div className="empty-state">No item selected.</div>
            )}
          </div>

          <div className="inventory-total-stats-column">
            <span className="eyebrow">Total Stats</span>
            <h2>Hunter Totals</h2>
            <div className="stat-table inventory-total-stat-table">
              <Row label="Power" value={formatWhole.format(snapshot.power)} />
              <Row label="Survival" value={formatWhole.format(snapshot.survival)} />
              <Row label="Attack" value={formatWhole.format(snapshot.stats.attack)} />
              <Row label="Defence" value={formatWhole.format(snapshot.stats.defence)} />
              <Row label="Health" value={formatWhole.format(snapshot.stats.health)} />
              <Row label="Recovery" value={`${formatOne.format(snapshot.recoveryPerSecond)} / sec`} />
              <Row label="Speed" value={formatOne.format(snapshot.stats.speed)} />
              <Row label="Crit Chance" value={`${formatOne.format(snapshot.stats.critChance * 100)}%`} />
            </div>
          </div>

          <div className="inventory-resource-strip">
            <div className="inventory-toolbar">
              <span className="eyebrow">Materials</span>
              <strong>{resources.length} Types</strong>
            </div>
            <div className="resource-mini-grid">
                {resources.slice(0, 10).map(({ resource, amount }) => (
                <div className="resource-mini-tile" key={resource.id} data-tooltip={resource.name}>
                  <AssetGlyph src={getResourceAsset(resource.id)} label={resource.name} fallback={resource.name.slice(0, 1)} />
                  <strong>{formatGameNumber(amount)}</strong>
                </div>
              ))}
              {resources.length === 0 && <div className="empty-state">No materials yet.</div>}
            </div>
          </div>

          <div className="inventory-bag-column">
            <div className="inventory-toolbar">
              <span className="eyebrow">Inventory</span>
              <strong>{visibleBagItems.length} / {bagItems.length} Items</strong>
            </div>
            <div className="inventory-controls">
              <div className="segmented-control" aria-label="Inventory filters">
                {inventoryFilterOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={inventoryFilter === option.id ? "active" : ""}
                    onClick={() => setInventoryFilter(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="inventory-sort-control">
                <span>Sort</span>
                <select value={inventorySort} onChange={(event) => setInventorySort(event.currentTarget.value as InventorySort)}>
                  {inventorySortOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className={`inventory-auto-sell ${state.unlocks.autoSellDuplicates ? "unlocked" : "locked"}`}>
              <input
                type="checkbox"
                disabled={!state.unlocks.autoSellDuplicates}
                checked={state.inventory.autoSellDuplicates}
                onChange={(event) => onSetAutoSellDuplicates(event.currentTarget.checked)}
              />
              <span>
                <strong>Auto-sell duplicate gear</strong>
                <em>{state.unlocks.autoSellDuplicates ? "Future duplicate item drops become gold." : "Unlock via achievement #11."}</em>
              </span>
            </label>
            <div className="inventory-list-grid" aria-label="Equipment and usable items">
              {visibleBagItems.map((item) => {
                const spec = getItemSpec(item);
                const mergeTarget = selectedItem && canMergeInventoryItems(item, selectedItem, equippedInstanceIds);

                return (
                  <button
                    type="button"
                    key={item.instanceId}
                    className={`inventory-list-item ${spec ? `rarity-${spec.rarity}` : ""} ${selectedItem?.instanceId === item.instanceId ? "active" : ""} ${mergeTarget ? "merge-target" : ""} ${item.locked ? "locked-item" : ""}`}
                    data-tooltip={spec ? `${spec.name} / Level ${getItemLevel(item)}${item.locked ? " / Locked" : ""}` : "Unknown Item"}
                    draggable={Boolean(spec?.slot)}
                    onDragStart={(event) => handleItemDragStart(event, item)}
                    onDragOver={(event) => handleItemDragOver(event, item)}
                    onDrop={(event) => handleItemDrop(event, item)}
                    onClick={(event) => handleInventoryItemClick(event, item)}
                  >
                    <AssetGlyph src={getItemAsset(spec?.id)} label={spec?.name} fallback={spec?.name.slice(0, 1) ?? "?"} />
                    {getItemLevel(item) > 1 && <span className="item-level-pill">{getItemLevel(item)}</span>}
                    {item.locked && <Lock className="item-lock-pill" size={12} aria-hidden="true" />}
                    <span className="sr-only">{spec ? `${spec.name}, ${spec.rarity}, tier ${spec.tier}, level ${getItemLevel(item)}` : "Unknown Item"}</span>
                  </button>
                );
              })}
              {visibleBagItems.length === 0 && <div className="empty-state inventory-empty-state">No matching items.</div>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function TimeBankControls({
  state,
  onSetSpeed,
  onWarp
}: {
  state: GameState;
  onSetSpeed: (speedMultiplier: SpeedMultiplier) => void;
  onWarp: (seconds: number) => void;
}) {
  const warpChunks = [
    { label: "1m", seconds: 60 },
    { label: "5m", seconds: 300 },
    { label: "30m", seconds: 1800 },
    { label: "1h", seconds: 3600 }
  ];

  return (
    <section className="time-bank-bar" aria-label="Banked time controls">
      <div className="time-bank-summary">
        <span>Banked Time</span>
        <strong>{formatDuration(state.time.bankedSeconds)}</strong>
        {state.time.lastBankedSeconds > 0 && <em>+{formatDuration(state.time.lastBankedSeconds)} offline</em>}
      </div>
      <div className="time-control-group">
        <span>Speed</span>
        {([1, 2, 3] as SpeedMultiplier[]).map((speedMultiplier) => (
          <button
            key={speedMultiplier}
            type="button"
            className={state.time.speedMultiplier === speedMultiplier ? "active" : ""}
            disabled={speedMultiplier > 1 && state.time.bankedSeconds <= 0}
            onClick={() => onSetSpeed(speedMultiplier)}
          >
            x{speedMultiplier}
          </button>
        ))}
      </div>
      <div className="time-control-group">
        <span>Warp</span>
        {warpChunks.map((chunk) => (
          <button
            key={chunk.seconds}
            type="button"
            disabled={state.time.bankedSeconds < chunk.seconds}
            onClick={() => onWarp(chunk.seconds)}
          >
            {chunk.label}
          </button>
        ))}
        <button
          type="button"
          disabled={state.time.bankedSeconds <= 0}
          onClick={() => onWarp(state.time.bankedSeconds)}
        >
          All
        </button>
      </div>
    </section>
  );
}

function BattleStage({ snapshot, xpPercent }: { snapshot: ReturnType<typeof getSnapshot>; xpPercent: number }) {
  const target = snapshot.currentTarget;
  const phase = snapshot.state.hunt.phase;
  const phaseLabel = snapshot.state.hunt.phase.charAt(0).toUpperCase() + snapshot.state.hunt.phase.slice(1);
  const threatPips = getThreatPips(target);
  const combat = snapshot.combat;
  const isDefeated = phase === "defeated";
  const isBoss = target?.role === "boss";
  const hunterHp = combat?.hunterHp ?? snapshot.hunterHp;
  const hunterMaxHp = combat?.hunterMaxHp ?? snapshot.survival;
  const enemyHp = target ? combat?.enemyHp ?? target.power : 0;
  const enemyMaxHp = target ? combat?.enemyMaxHp ?? target.power : 0;
  const hunterHealthPercent = combat?.hunterHealthPercent ?? snapshot.hunterHealthPercent;
  const enemyHealthPercent = target ? combat?.enemyHealthPercent ?? 100 : 0;
  const hunterDps = combat?.hunterDamagePerSecond ?? snapshot.power / 10;
  const enemyDps = target ? combat?.enemyDamagePerSecond ?? target.threat / 22.5 : 0;
  const recoveryPerSecond = combat?.hunterRecoveryPerSecond ?? snapshot.betweenBattleRecoveryPerSecond;
  const enemyName = target?.name ?? (phase === "recovering" ? "Recovering" : "Tracking Next Target");
  const enemyDownText = combat ? (isDefeated ? "Down" : formatDuration(combat.enemyTimeToDefeat)) : phase === "recovering" ? "Recovering" : "Tracking";
  const hunterHoldText = combat ? (isDefeated ? "Safe" : formatDuration(combat.hunterTimeToDefeat)) : "Ready";

  return (
    <div className={`battle-stage ${isBoss ? "boss-battle-stage" : ""}`}>
      <article className="combatant-card player-combatant">
        <div className="combatant-heading">
          <span className="eyebrow">Hunter</span>
          <h2>Level {snapshot.state.player.level}</h2>
        </div>
        <div className="battle-portrait hunter-portrait">
          <div className="portrait-backdrop" />
          <img className="portrait-image hunter-image" src={hunterPortraitAsset} alt="Hunter portrait" />
        </div>
        <div className="battle-bars">
          <BattleBar label="Hunter HP" value={`${formatWhole.format(Math.ceil(hunterHp))} / ${formatWhole.format(Math.ceil(hunterMaxHp))}`} percent={hunterHealthPercent} tone="green" />
          <BattleBar label="Strike" value={`${formatOne.format(hunterDps)} / sec`} percent={Math.min(100, hunterDps * 6)} tone="gold" />
          <BattleBar label="Recovery" value={`${formatOne.format(recoveryPerSecond)} / sec`} percent={Math.min(100, recoveryPerSecond * 12)} tone="blue" />
          <BattleBar label="Next Level" value={`${formatOne.format(xpPercent)}%`} percent={xpPercent} tone="blue" />
        </div>
        <div className="combatant-meta-grid">
          <div><span>Survival</span><strong>{formatWhole.format(snapshot.survival)}</strong></div>
          <div><span>Active</span><strong>{formatDuration(snapshot.state.hunt.activeSeconds)}</strong></div>
        </div>
      </article>

      <div className="battle-center">
        <div className="active-status"><Activity size={15} /> {phaseLabel}</div>
        <SpoilsCard reward={snapshot.lastReward} />
        <dl className="battle-rates">
          <div><dt>Enemy Down</dt><dd>{enemyDownText}</dd></div>
          <div><dt>Hunter Holds</dt><dd>{hunterHoldText}</dd></div>
          <div><dt>Hunts / Hr</dt><dd>{formatOne.format(snapshot.rates.huntsPerHour)}</dd></div>
          <div><dt>XP / Hr</dt><dd>{formatGameNumber(snapshot.rates.xpPerHour)}</dd></div>
          <div><dt>Gold / Hr</dt><dd>{formatGameNumber(snapshot.rates.goldPerHour)}</dd></div>
        </dl>
      </div>

      <article className={`combatant-card enemy-combatant ${isBoss ? "boss-combatant" : ""}`}>
        <div className="combatant-heading">
          <span className="eyebrow">{isBoss ? "Area Boss" : "Target Monster"}</span>
          <h2>{enemyName}</h2>
        </div>
        <div className={`battle-portrait enemy-portrait ${isBoss ? "enemy-portrait-boss" : ""} ${!target ? "enemy-portrait-empty" : ""} ${isDefeated ? "enemy-portrait-defeated" : ""}`}>
          {isBoss && <div className="boss-portrait-banner">Boss</div>}
          {target && getMonsterAsset(target.id) ? (
            <img className="portrait-image monster-image" src={getMonsterAsset(target.id)} alt={`${target.name} portrait`} />
          ) : target ? (
            <div className="monster-art battle-monster-art" aria-hidden="true">
              <div className="monster-tail" />
              <div className="monster-spine" />
              <div className="monster-fin fin-a" />
              <div className="monster-fin fin-b" />
              <div className="monster-fin fin-c" />
              <div className="monster-head" />
              <div className="monster-jaw" />
            </div>
          ) : (
            <div className="empty-target-mark" aria-hidden="true">?</div>
          )}
        </div>
        <div className="monster-meta">
          <span>{target ? target.role === "boss" ? "Boss Gate" : isDefeated ? "Defeated" : "Common Threat" : "No Threat"}</span>
          <strong>{target ? `Tier ${target.tier}` : "Standby"}</strong>
        </div>
        <div className="battle-bars enemy-battle-bars">
          <BattleBar label="Enemy HP" value={target ? `${formatWhole.format(Math.ceil(enemyHp))} / ${formatWhole.format(Math.ceil(enemyMaxHp))}` : "No target"} percent={enemyHealthPercent} tone="red" />
          <BattleBar label="Claw Damage" value={`${formatOne.format(enemyDps)} / sec`} percent={Math.min(100, enemyDps * 12)} tone="gold" />
        </div>
        <div className="threat-row battle-threat-row">
          <span>Threat Level</span>
          <div>
            {threatPips.map((filled, index) => (
              <i key={index} className={filled ? "filled" : ""} />
            ))}
          </div>
        </div>
        <div className="combatant-meta-grid">
          <div><span>Power</span><strong>{target ? formatWhole.format(target.power) : "--"}</strong></div>
          <div><span>Threat</span><strong>{target ? formatWhole.format(target.threat) : "--"}</strong></div>
        </div>
      </article>
    </div>
  );
}

function SpoilsCard({ reward }: { reward?: ReturnType<typeof getSnapshot>["lastReward"] }) {
  const resources = Object.entries(reward?.resources ?? {})
    .map(([resourceId, amount]) => ({
      amount,
      resource: gameContent.resources.find((entry) => entry.id === resourceId)
    }))
    .filter((entry): entry is { amount: GameNumber; resource: ResourceSpec } => Boolean(entry.resource));
  const items = (reward?.itemIds ?? [])
    .map((itemId) => gameContent.items.find((item) => item.id === itemId))
    .filter((item): item is (typeof gameContent.items)[number] => Boolean(item));
  const autoSoldItems = (reward?.autoSoldItemIds ?? [])
    .map((itemId) => gameContent.items.find((item) => item.id === itemId))
    .filter((item): item is (typeof gameContent.items)[number] => Boolean(item));

  return (
    <div className={`spoils-card ${reward ? "" : "spoils-card-empty"}`}>
      <span className="eyebrow">Spoils</span>
      <strong>{reward?.monsterName ?? "No spoils yet"}</strong>
      <div className="spoils-grid">
        <div><span>XP</span><b>{reward ? formatGameNumber(reward.xp) : "0"}</b></div>
        <div><span>Gold</span><b>{reward ? formatGameNumber(reward.gold) : "0"}</b></div>
        <div><span>Area</span><b>{reward ? `+${formatWhole.format(reward.progress)}` : "+0"}</b></div>
      </div>
      {(resources.length > 0 || items.length > 0 || autoSoldItems.length > 0) && (
        <div className="spoils-drops">
          {resources.slice(0, 2).map(({ resource, amount }) => (
            <em key={resource.id}>{formatGameNumber(amount)} {resource.name}</em>
          ))}
          {items.slice(0, 1).map((item) => (
            <em key={item.id}>{item.name}</em>
          ))}
          {autoSoldItems.slice(0, 1).map((item) => (
            <em key={`sold-${item.id}`}>Sold {item.name} +{formatGameNumber(reward?.autoSoldGold ?? 0)}g</em>
          ))}
        </div>
      )}
    </div>
  );
}

function BattleBar({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: "green" | "gold" | "blue" | "red" }) {
  return (
    <div className="battle-bar">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={`stat-line ${tone}`}><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function AreaCard({ snapshot, state, onSelectArea }: { snapshot: ReturnType<typeof getSnapshot>; state: GameState; onSelectArea: (areaId: string) => void }) {
  const areaState = state.areas[snapshot.currentArea.id];
  const progressPercent = (areaState.progress / snapshot.currentArea.progressRequired) * 100;
  const nextArea = gameContent.areas.find((area) => area.id === snapshot.currentArea.unlocksAreaId);
  const nextAreaState = nextArea ? state.areas[nextArea.id] : undefined;
  const areaAsset = getAreaAsset(snapshot.currentArea.id);

  return (
    <article className="area-card">
      <span className="eyebrow">Current Area</span>
      <h2>{snapshot.currentArea.name}</h2>
      <div className={`area-landscape ${areaAsset ? "area-landscape-image" : ""}`} style={areaAsset ? { backgroundImage: `url(${areaAsset})` } : undefined}>
        <div className="tree-line" />
        <div className="mist-line" />
      </div>
      <div className="area-progress-row">
        <span>Area Progress</span>
        <strong>{formatWhole.format(areaState.progress)} / {snapshot.currentArea.progressRequired}</strong>
      </div>
      <div className="tiny-progress blue"><span style={{ width: `${progressPercent}%` }} /></div>
      <div className="area-meta-grid">
        <div><span>Power Band</span><strong>{snapshot.currentArea.powerBand[0]}-{snapshot.currentArea.powerBand[1]}</strong></div>
        <div><span>Boss</span><strong>{areaState.bossUnlocked ? "Revealed" : "Hidden"}</strong></div>
      </div>
      <div className="area-next-card">
        <span>{nextArea ? "Next Area" : "Loop Exit"}</span>
        <strong>{nextArea?.name ?? "Prestige Route"}</strong>
        <em>{nextArea ? nextAreaState?.unlocked ? "Open" : "Boss gate" : "Spend renown for permanent power."}</em>
      </div>
      <div className="area-selector">
        {gameContent.areas.map((area) => {
          const selectableAreaState = state.areas[area.id];
          const visible = Boolean(selectableAreaState?.visible);
          const selectableProgress = Math.min(100, (selectableAreaState.progress / area.progressRequired) * 100);
          const active = area.id === snapshot.currentArea.id;
          const unlocked = selectableAreaState.unlocked;
          const outclassed = unlocked && !selectableAreaState.bossDefeated && snapshot.power < area.powerBand[0] * 0.78;
          const statusLabel = active
            ? "Exploring"
            : !visible
              ? "Unknown"
            : !unlocked
              ? "Locked"
              : selectableAreaState.bossDefeated
                ? "Cleared"
                : outclassed
                  ? "Hard"
                  : "Open";

          return (
            <button
              key={area.id}
              type="button"
              className={`area-select-card ${active ? "active" : ""} ${visible ? "visible" : "unknown"} ${unlocked ? "unlocked" : "locked"} ${outclassed ? "outclassed" : ""}`}
              disabled={!unlocked}
              onClick={() => onSelectArea(area.id)}
              data-tooltip={!visible ? "Unexplored area. Push deeper to reveal it." : unlocked ? area.name : "Defeat the previous boss to unlock this area."}
            >
              <span>{unlocked ? `T${area.tier}` : <Lock size={13} />}</span>
              <strong>{visible ? area.name : "?????"}</strong>
              <em>{statusLabel}</em>
              <div className="area-select-progress"><i style={{ width: `${selectableProgress}%` }} /></div>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function AreaChallengePanel({
  state,
  snapshot,
  bossReady,
  onSelectArea,
  onAttempt
}: {
  state: GameState;
  snapshot: ReturnType<typeof getSnapshot>;
  bossReady: boolean;
  onSelectArea: (areaId: string) => void;
  onAttempt: () => void;
}) {
  const boss = snapshot.boss;
  const areaState = state.areas[boss.areaId];
  const progressPercent = (areaState.progress / snapshot.currentArea.progressRequired) * 100;
  const readinessPercent = Math.min(100, snapshot.bossReadiness * 100);
  const challengeRevealed = snapshot.features.bossIdentity;
  const bossFightActive = state.hunt.phase === "fighting" && state.hunt.targetMonsterId === boss.id;
  const nextArea = gameContent.areas.find((area) => area.id === snapshot.currentArea.unlocksAreaId);
  const nextAreaUnlocked = Boolean(nextArea && state.areas[nextArea.id]?.unlocked);
  const canTravelNext = Boolean(areaState.bossDefeated && nextArea && nextAreaUnlocked);
  const status = bossFightActive ? "Fighting" : canTravelNext ? "Path Open" : areaState.bossDefeated ? "Cleared" : bossReady ? "Unlocked" : areaState.bossUnlocked ? "Revealed" : "Hidden";
  const copy = areaState.bossDefeated
    ? nextArea
      ? `${nextArea.name} is open. Travel when you are ready to push the next region.`
      : "The final boss in this route is defeated. Prestige can turn this run into permanent power."
    : bossFightActive
      ? "The boss fight is underway in the active battle."
    : bossReady
      ? "The boss is ready. Attempt it manually when you want to push the area gate."
      : "Build area progress to reveal this boss challenge.";

  return (
    <article className="area-challenge-card">
      <div className="challenge-heading">
        <div className="boss-token"><Skull size={28} /></div>
        <div>
          <span className="eyebrow">Area Challenge</span>
          <h3>{challengeRevealed ? boss.name : "Unknown Challenge"}</h3>
        </div>
        <strong className={`challenge-status ${bossReady || canTravelNext ? "ready" : ""}`}>{status}</strong>
      </div>
      <p>{copy}</p>
      <div className="challenge-progress-grid">
        <div>
          <span>Boss Reveal</span>
          <strong>{formatWhole.format(areaState.progress)} / {snapshot.currentArea.progressRequired}</strong>
          <div className="tiny-progress blue"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
        <div>
          <span>Readiness</span>
          <strong>{challengeRevealed ? `${formatWhole.format(readinessPercent)}%` : "Hidden"}</strong>
          <div className="tiny-progress"><span style={{ width: `${challengeRevealed ? readinessPercent : 0}%` }} /></div>
        </div>
      </div>
      <button
        className={`challenge-action ${canTravelNext ? "travel-action" : ""}`}
        disabled={bossFightActive || (!bossReady && !canTravelNext)}
        onClick={() => canTravelNext && nextArea ? onSelectArea(nextArea.id) : onAttempt()}
      >
        {bossFightActive ? "Boss Fight Active" : canTravelNext && nextArea ? `Travel to T${nextArea.tier}` : areaState.bossDefeated ? "Cleared" : "Attempt Boss"}
      </button>
    </article>
  );
}

function UnlockNoticePanel({ notices }: { notices: ReturnType<typeof getSnapshot>["unlockNotices"] }) {
  return (
    <section className="unlock-strip" aria-label="Unlocked systems">
      <div className="unlock-strip-title">
        <Sparkles size={16} />
        <span>Unlocked Systems</span>
      </div>
      <div className="unlock-strip-list">
        {notices.slice(-4).map((notice) => (
          <article key={notice.id}>
            <strong>{notice.title}</strong>
            <span>{notice.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function TrainingPanel({
  state,
  onTrain,
  bare = false
}: {
  state: GameState;
  onTrain: (trainingId: TrainingId) => void;
  bare?: boolean;
}) {
  const content = (
    <>
      <div className="training-list">
        {trainingSpecs.map((training) => {
          const level = state.training?.[training.id]?.level ?? 0;
          const progressPercent = getTrainingProgressPercent(state, training.id);
          const active = state.activeTrainingId === training.id;
          const nextGain = getNextTrainingGain(state, training.id);
          const milestoneBonus = getTrainingMilestoneBonus(level);
          const remaining = getTrainingSecondsRemaining(state, training.id);
          const duration = getTrainingDuration(state, training.id);

          return (
            <article className={`training-row ${active ? "active" : ""}`} key={training.id}>
              <div className="training-copy">
                <strong>{training.name}</strong>
                <span>{training.description}</span>
              </div>
              <div className="training-level">
                <span>Level</span>
                <strong>{formatWhole.format(level)}</strong>
              </div>
              <div className="training-level">
                <span>Next Gain</span>
                <strong>{formatTrainingGain(training.stat, nextGain)}</strong>
                {milestoneBonus > 0 && <em>+{formatOne.format(milestoneBonus * 100)}% milestone</em>}
              </div>
              <div className="training-progress-cell">
                <div className="training-progress-copy">
                  <span>{active ? "Training" : "Ready"}</span>
                  <strong>{active ? formatDuration(remaining) : formatDuration(duration / getTrainingRate(state))}</strong>
                </div>
                <div className="tiny-progress blue"><span style={{ width: `${progressPercent}%` }} /></div>
              </div>
              <button className={active ? "active" : ""} onClick={() => onTrain(training.id)}>
                {active ? "Active" : "Train"}
              </button>
            </article>
          );
        })}
      </div>
    </>
  );

  if (bare) {
    return <div className="training-panel-bare">{content}</div>;
  }

  return (
    <section className="dashboard-panel span-2">
      <div className="panel-title"><Dumbbell size={15} /> Training</div>
      {content}
    </section>
  );
}

function PerformancePanel({ snapshot }: { snapshot: ReturnType<typeof getSnapshot> }) {
  return (
    <section className="dashboard-panel span-2">
      <div className="panel-title"><Swords size={15} /> Idle Performance</div>
      <div className="metric-grid">
        <Metric icon={<Swords size={24} />} label="Hunts Completed" value={formatWhole.format(snapshot.state.hunt.huntsCompleted)} delta={`${formatOne.format(snapshot.rates.huntsPerHour)} / hr`} />
        <Metric icon={<Sparkles size={24} />} label="XP Rate" value={formatGameNumber(snapshot.rates.xpPerHour)} delta="per hour" />
        <Metric icon={<Medal size={24} />} label="Gold Rate" value={formatGameNumber(snapshot.rates.goldPerHour)} delta="per hour" />
        <Metric icon={<Gem size={24} />} label="Materials" value={formatGameNumber(snapshot.rates.materialsPerHour, 1)} delta="per hour" />
      </div>
    </section>
  );
}

function StatsPanel({ snapshot }: { snapshot: ReturnType<typeof getSnapshot> }) {
  return (
    <section className="dashboard-panel">
      <div className="panel-title"><Shield size={15} /> Combat Stats</div>
      <div className="stat-table">
        <Row label="Attack" value={formatWhole.format(snapshot.stats.attack)} />
        <Row label="Defence" value={formatWhole.format(snapshot.stats.defence)} />
        <Row label="Health" value={formatWhole.format(snapshot.stats.health)} />
        <Row label="Speed" value={formatOne.format(snapshot.stats.speed)} />
        <Row label="Crit Chance" value={`${formatOne.format(snapshot.stats.critChance * 100)}%`} />
        <Row label="Survival" value={formatWhole.format(snapshot.survival)} />
      </div>
    </section>
  );
}

function DropsPanel({ state, className = "" }: { state: GameState; className?: string }) {
  const resources = Object.entries(state.resources)
    .map(([resourceId, amount]) => ({
      amount,
      resource: gameContent.resources.find((entry) => entry.id === resourceId)
    }))
    .filter((entry): entry is { amount: GameNumber; resource: ResourceSpec } => Boolean(entry.resource));

  return (
    <section className={`dashboard-panel ${className}`}>
      <div className="panel-title"><Gem size={15} /> Drops / Materials</div>
      <div className="drop-grid">
        {resources.slice(0, 8).map(({ resource, amount }) => (
          <div className="drop-tile" key={resource.id}>
            <AssetGlyph src={getResourceAsset(resource.id)} label={resource.name} fallback={resource.name.slice(0, 1)} />
            <strong>{formatGameNumber(amount)}</strong>
            <span>{resource.name}</span>
          </div>
        ))}
        {resources.length === 0 && <div className="empty-state">No materials yet.</div>}
      </div>
    </section>
  );
}

function AssetGlyph({ src, label, fallback }: { src?: string; label?: string; fallback: string }) {
  return (
    <div className={`item-glyph ${src ? "item-glyph-image" : ""}`}>
      {src ? <img src={src} alt={label ?? ""} /> : fallback}
    </div>
  );
}

function PrestigePanel({ snapshot, state, onPrestige, page = false }: { snapshot: ReturnType<typeof getSnapshot>; state: GameState; onPrestige: () => void; page?: boolean }) {
  const currentRenown = toFiniteNumber(state.player.renown);
  const nextRenown = toFiniteNumber(snapshot.prestige.nextRenown);
  const progressPercent = nextRenown > 0 ? Math.min(100, (currentRenown / nextRenown) * 100) : 0;
  const statBonus = (snapshot.prestige.statMultiplier - 1) * 100;
  const rewardBonus = (snapshot.prestige.rewardMultiplier - 1) * 100;

  return (
    <section className={`dashboard-panel ${page ? "prestige-page" : "span-2"}`}>
      <div className="panel-title"><Sparkles size={15} /> Prestige</div>
      <div className="prestige-panel">
        <div className="prestige-rank-card">
          <span className="eyebrow">Rank</span>
          <strong>{state.player.prestige}</strong>
          <em>+{formatOne.format(statBonus)}% core stats</em>
        </div>
        <div className="prestige-track">
          <div className="area-progress-row">
            <span>Renown</span>
            <strong>{formatGameNumber(state.player.renown)} / {formatGameNumber(snapshot.prestige.nextRenown)}</strong>
          </div>
          <div className="tiny-progress"><span style={{ width: `${progressPercent}%` }} /></div>
          <div className="prestige-bonus-grid">
            <div><span>Gain</span><strong>+{snapshot.prestige.gain}</strong></div>
            <div><span>Rewards</span><strong>+{formatOne.format(rewardBonus)}%</strong></div>
            <div><span>Next</span><strong>{formatGameNumber(snapshot.prestige.nextRenown)}</strong></div>
          </div>
        </div>
        <button type="button" className="prestige-action" disabled={!snapshot.prestige.canPrestige} onClick={onPrestige}>
          {snapshot.prestige.canPrestige ? `Legacy Rite +${snapshot.prestige.gain}` : snapshot.prestige.capstoneCleared ? "Build Renown" : "Defeat Moonvein"}
        </button>
      </div>
    </section>
  );
}

function InventoryPanel({ state, selectedItem, onEquip }: { state: GameState; selectedItem?: InventoryItem; onEquip: (item: InventoryItem) => void }) {
  const itemSpec = selectedItem ? gameContent.items.find((item) => item.id === selectedItem.itemId) : undefined;

  return (
    <section className="dashboard-panel span-2">
      <div className="panel-title"><Backpack size={15} /> Inventory / Equipment</div>
      <div className="inventory-split">
        <div className="equipment-slots">
          {(["weapon", "armor", "charm"] as const).map((slot) => {
            const instanceId = state.inventory.equipped[slot];
            const instance = state.inventory.items.find((item) => item.instanceId === instanceId);
            const spec = instance ? gameContent.items.find((item) => item.id === instance.itemId) : undefined;
            return (
              <div className="equip-slot" key={slot}>
                <span>{slot}</span>
                <strong>{spec?.name ?? "Empty"}</strong>
              </div>
            );
          })}
        </div>
        <div className="inventory-grid">
          {state.inventory.items.slice(0, 12).map((item) => {
            const spec = gameContent.items.find((entry) => entry.id === item.itemId);
            return (
              <button className="item-cell" key={item.instanceId} onClick={() => onEquip(item)}>
                <AssetGlyph src={getItemAsset(spec?.id)} label={spec?.name} fallback={spec?.name.slice(0, 1) ?? "?"} />
              </button>
            );
          })}
        </div>
        <div className="item-detail">
          {itemSpec ? (
            <>
              <span className="eyebrow">{itemSpec.rarity}</span>
              <h3>{itemSpec.name}</h3>
              <p>{itemSpec.description}</p>
              <div className="stat-table">
                {itemSpec.effects.map((effect) => (
                  <Row
                    key={`${effect.stat}-${effect.value}`}
                    label={effect.stat}
                    value={`${effect.mode === "percent" ? `${formatOne.format(effect.value * 100)}%` : formatOne.format(effect.value)}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">No item selected.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function NavRow({ icon, label, active, badge, disabled, child, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; disabled?: boolean; child?: boolean; onClick?: () => void }) {
  return (
    <button className={`nav-row ${active ? "active" : ""} ${child ? "child" : ""}`} disabled={disabled} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
      {badge && <b>{badge}</b>}
    </button>
  );
}

function ResourcePill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="resource-pill">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function createDebugSkipState(current: GameState, skipId: DebugSkipId): GameState {
  const state = createGame(current.updatedAt);

  if (skipId === "fresh") {
    return state;
  }

  state.hunt.huntsCompleted = 1;
  state.resources["green-herb"] = gameNumber(2);

  if (skipId === "training") {
    state.activeTrainingId = "might";
    return advanceRealtime(state, 0);
  }

  addDebugInventory(state);

  if (skipId === "inventory") {
    state.player.gold = gameNumber(2500);
    state.training.might.level = 4;
    state.training.vigor.level = 3;
    return advanceRealtime(state, 0);
  }

  makeDebugAreaBossReady(state, "emberfall-woods");
  state.player.baseStats.attack = 165;
  state.player.baseStats.health = 900;
  state.player.baseStats.defence = 55;
  state.hunt.hunterHp = 900;

  if (skipId === "emberBoss") {
    return advanceRealtime(state, 0);
  }

  unlockDebugArea(state, "ironroot-basin");
  state.areas["emberfall-woods"].bossDefeated = true;
  state.hunt.selectedAreaId = "ironroot-basin";

  if (skipId === "ironroot") {
    return advanceRealtime(state, 0);
  }

  for (const area of gameContent.areas) {
    unlockDebugArea(state, area.id);
    state.areas[area.id].bossUnlocked = true;
    state.areas[area.id].bossDefeated = true;
    state.areas[area.id].progress = area.progressRequired;
  }
  state.hunt.selectedAreaId = "moonfen-ruins";
  state.player.renown = gameNumber(500);
  state.player.gold = gameNumber(50000);
  state.player.baseStats.attack = 900;
  state.player.baseStats.health = 5500;
  state.player.baseStats.defence = 420;
  state.hunt.hunterHp = 5500;

  if (skipId === "prestigeReady") {
    return advanceRealtime(state, 0);
  }

  state.player.prestige = 1;
  state.player.renown = gameNumber(0);
  state.player.gold = gameNumber(12000);
  state.settlement = {
    foundedAtPrestige: 1,
    seasonsPassed: 4,
    population: 18,
    stores: 9,
    outpostScouts: 4,
    forgeHeat: 11
  };
  state.hunt.selectedAreaId = "emberfall-woods";

  return advanceRealtime(state, 0);
}

function grantDebugCurrency(state: GameState, currency: "gold" | "renown", amount: number): GameState {
  state.player[currency] = gameNumber(toFiniteNumber(state.player[currency]) + amount);
  return state;
}

function grantDebugBankedTime(state: GameState, seconds: number): GameState {
  state.time.bankedSeconds += seconds;
  return state;
}

function addDebugInventory(state: GameState): GameState {
  const itemIds = gameContent.items.map((item) => item.id);
  const existingDebugItems = new Set(state.inventory.items.filter((item) => item.instanceId.startsWith("debug-")).map((item) => item.instanceId));

  itemIds.forEach((itemId, index) => {
    const level = [1, 2, 5, 12, 25, 50, 100][index % 7];
    const instanceId = `debug-${itemId}-${index}`;
    if (!existingDebugItems.has(instanceId)) {
      state.inventory.items.push({
        instanceId,
        itemId,
        acquiredAt: state.updatedAt + index + 1,
        level,
        locked: index % 5 === 0
      });
    }
  });

  gameContent.resources.forEach((resource, index) => {
    state.resources[resource.id] = gameNumber(250 + index * 75);
  });

  state.inventory.equipped.weapon = state.inventory.items.find((item) => item.itemId === "bramblemaw-cleaver")?.instanceId ?? state.inventory.equipped.weapon;
  state.inventory.equipped.armor = state.inventory.items.find((item) => item.itemId === "ironroot-hauberk")?.instanceId ?? state.inventory.equipped.armor;
  state.inventory.equipped.charm = state.inventory.items.find((item) => item.itemId === "matriarch-signet")?.instanceId ?? state.inventory.equipped.charm;

  return state;
}

function setDebugSettlementUnlocked(state: GameState, unlocked: boolean): GameState {
  if (!unlocked) {
    state.player.prestige = 0;
    state.settlement = {
      foundedAtPrestige: undefined,
      seasonsPassed: 0,
      population: 0,
      stores: 0,
      outpostScouts: 0,
      forgeHeat: 0
    };
    return state;
  }

  state.player.prestige = Math.max(1, state.player.prestige);
  state.settlement.foundedAtPrestige ??= 1;
  state.settlement.seasonsPassed = Math.max(1, state.settlement.seasonsPassed);
  state.settlement.population = Math.max(6, state.settlement.population);
  state.settlement.stores = Math.max(3, state.settlement.stores);
  state.settlement.outpostScouts = Math.max(1, state.settlement.outpostScouts);
  state.settlement.forgeHeat = Math.max(3, state.settlement.forgeHeat);

  return state;
}

function setDebugAllAreasUnlocked(state: GameState, unlocked: boolean): GameState {
  if (!unlocked) {
    const fresh = createGame(state.updatedAt);
    state.areas = fresh.areas;
    state.hunt.selectedAreaId = "emberfall-woods";
    return state;
  }

  for (const area of gameContent.areas) {
    unlockDebugArea(state, area.id);
  }

  return state;
}

function makeDebugAreaBossReady(state: GameState, areaId: string): void {
  const area = gameContent.areas.find((entry) => entry.id === areaId);
  if (!area) {
    return;
  }

  unlockDebugArea(state, area.id);
  state.hunt.selectedAreaId = area.id;
  state.areas[area.id].progress = area.progressRequired;
  state.areas[area.id].bossUnlocked = true;
  state.areas[area.id].bossDefeated = false;
}

function unlockDebugArea(state: GameState, areaId: string): void {
  const areaState = state.areas[areaId];
  if (!areaState) {
    return;
  }

  areaState.visible = true;
  areaState.unlocked = true;
}

function Metric({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  return (
    <div className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{delta}</em>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`stat-row ${muted ? "muted" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) {
    return "Stable";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatDurationCompact(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${Math.floor(totalSeconds)}s`;
}

function getEquippedItem(state: GameState, slot: EquipmentSlot): InventoryItem | undefined {
  const instanceId = state.inventory.equipped[slot];
  return state.inventory.items.find((item) => item.instanceId === instanceId);
}

function getItemSpec(item?: InventoryItem): ItemSpec | undefined {
  return item ? gameContent.items.find((entry) => entry.id === item.itemId) : undefined;
}

function canMergeInventoryItems(targetItem: InventoryItem, sourceItem: InventoryItem, equippedInstanceIds: (string | undefined)[]): boolean {
  return targetItem.instanceId !== sourceItem.instanceId
    && targetItem.itemId === sourceItem.itemId
    && !sourceItem.locked
    && !equippedInstanceIds.includes(sourceItem.instanceId)
    && getItemLevel(targetItem) < maxItemLevel
    && getItemLevel(sourceItem) < maxItemLevel;
}

function inventoryItemMatchesFilter(item: InventoryItem, filter: InventoryFilter, bagItems: InventoryItem[]): boolean {
  const spec = getItemSpec(item);

  if (filter === "all") {
    return true;
  }

  if (filter === "locked") {
    return item.locked;
  }

  if (filter === "upgradable") {
    return getItemLevel(item) < maxItemLevel && bagItems.some((entry) => (
      entry.instanceId !== item.instanceId
      && entry.itemId === item.itemId
      && !entry.locked
      && getItemLevel(entry) < maxItemLevel
    ));
  }

  return spec?.slot === filter;
}

function compareInventoryItems(left: InventoryItem, right: InventoryItem, sort: InventorySort): number {
  const leftSpec = getItemSpec(left);
  const rightSpec = getItemSpec(right);

  if (sort === "strongest") {
    return getComparableItemScore(rightSpec, right) - getComparableItemScore(leftSpec, left);
  }

  if (sort === "level") {
    return getItemLevel(right) - getItemLevel(left) || right.acquiredAt - left.acquiredAt;
  }

  if (sort === "rarity") {
    return getRarityRank(rightSpec) - getRarityRank(leftSpec) || getItemLevel(right) - getItemLevel(left);
  }

  if (sort === "name") {
    return (leftSpec?.name ?? "").localeCompare(rightSpec?.name ?? "") || right.acquiredAt - left.acquiredAt;
  }

  return right.acquiredAt - left.acquiredAt;
}

function getComparableItemScore(spec: ItemSpec | undefined, item: InventoryItem): number {
  return spec ? getItemGearScore(spec, item) : 0;
}

function getRarityRank(spec?: ItemSpec): number {
  if (spec?.rarity === "rare") {
    return 3;
  }

  if (spec?.rarity === "uncommon") {
    return 2;
  }

  return 1;
}

function getTrainingSpecName(trainingId: TrainingId): string {
  return trainingSpecs.find((training) => training.id === trainingId)?.name ?? "Training";
}

function formatStatLabel(stat: string): string {
  const labels: Record<string, string> = {
    attack: "Attack",
    defence: "Defence",
    health: "Health",
    speed: "Speed",
    critChance: "Crit Chance",
    luck: "Luck",
    recoveryRate: "Recovery",
    goldFind: "Gold Find",
    xpGain: "XP Gain",
    materialFind: "Material Find"
  };

  return labels[stat] ?? stat;
}

function formatEffectValue(mode: "flat" | "percent", value: number, stat?: string): string {
  if (mode === "percent" || stat === "critChance" || stat === "recoveryRate") {
    return `${value >= 0 ? "+" : ""}${formatOne.format(value * 100)}%`;
  }

  return `${value >= 0 ? "+" : ""}${formatOne.format(value)}`;
}

function formatTrainingGain(stat: keyof ReturnType<typeof getSnapshot>["stats"], value: number): string {
  if (stat === "recoveryRate") {
    return `+${formatOne.format(value * 100)}% recovery`;
  }

  return `+${formatOne.format(value)} ${stat}`;
}

function getThreatPips(target?: MonsterSpec): boolean[] {
  return Array.from({ length: 8 }, (_, index) => Boolean(target && index < Math.ceil(target.power / 42)));
}
