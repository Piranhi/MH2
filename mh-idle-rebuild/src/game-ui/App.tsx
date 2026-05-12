import {
  Activity,
  Backpack,
  Castle,
  CircleDot,
  Clock3,
  Crown,
  Dumbbell,
  Footprints,
  Gem,
  Hammer,
  Hand,
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
import { abandonChallenge, advanceRealtime, attemptBoss, buyTimeUpgrade, buyTraining, canBuyTimeUpgrade, equipItem, getOfflineBankRate, getSnapshot, getTimeUpgradeCost, prestigeRun, selectArea, setTimeSpeed, spendBankedTime, startChallenge } from "../game-core/game";
import { gameContent } from "../game-core/content/content";
import { getRouteGuidance } from "../game-core/guidance";
import { challengeSpecs, getChallengeElapsedSeconds, getChallengeRecord, getNextChallengeReward, isChallengeUnlocked } from "../game-core/challenges";
import { xpForNextLevel } from "../game-core/balance";
import { formatGameNumber, toFiniteNumber } from "../game-core/numbers";
import type { GameNumber } from "../game-core/numbers";
import type { RouteGuidanceAction } from "../game-core/guidance";
import { canBuyTraining, getAffordableTrainingPurchases, getNextTrainingGain, getTrainingCost, getTrainingMilestoneBonus, getTrainingPotency, getTrainingPurchaseCost, trainingSpecs } from "../game-core/training";
import type { EquipmentSlot, GameState, InventoryItem, ItemSpec, MonsterSpec, ResourceSpec, SpeedMultiplier, TimeUpgradeId, TrainingId } from "../game-core/types";
import { clearBrowserSave, loadBrowserSave, writeBrowserSave } from "../platform/browserSave";

const formatWhole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatOne = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

type AppView = "hunt" | "train" | "offline" | "inventory" | "prestige" | "challenges";
type TrainingPurchaseAmount = 1 | 10 | "max";

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

export function App() {
  const [state, setState] = useState<GameState>(() => loadBrowserSave());
  const [view, setView] = useState<AppView>("hunt");
  const [trainingPurchaseAmount, setTrainingPurchaseAmount] = useState<TrainingPurchaseAmount>(1);
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
          <NavRow icon={<Trophy size={18} />} label="Challenges" active={view === "challenges"} badge={activeChallenge ? "Active" : String(completedChallenges)} onClick={() => setView("challenges")} />
          <NavRow icon={<Castle size={18} />} label="Outposts" disabled />
          <NavRow icon={<Hammer size={18} />} label="Blacksmith" badge="Later" disabled />
          <NavRow icon={<Backpack size={18} />} label="Inventory" active={view === "inventory"} badge={String(state.inventory.items.length)} onClick={() => setView("inventory")} />
          <NavRow icon={<Skull size={18} />} label="Bestiary" disabled />
        </nav>

        <button className="reset-button" onClick={() => setState(clearBrowserSave())}>
          <RefreshCw size={16} />
          Reset Slice
        </button>
      </aside>

      <main className="main-view">
        <TopBar state={state} xpPercent={xpPercent} />

        {view === "inventory" ? (
          <InventoryView
            snapshot={snapshot}
            state={state}
            selectedItem={selectedInventoryItem}
            onSelectItem={(item) => setSelectedInventoryItemId(item.instanceId)}
            onEquip={(item) => setState((current) => equipItem(current, item.instanceId))}
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
        ) : view === "train" ? (
          <TrainingView
            snapshot={snapshot}
            state={state}
            trainingUnlocked={visiblePanels.training}
            purchaseAmount={trainingPurchaseAmount}
            onBackToHunt={() => setView("hunt")}
            onSetPurchaseAmount={setTrainingPurchaseAmount}
            onTrain={(trainingId) => setState((current) => buyTraining(current, trainingId, trainingPurchaseAmount))}
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
    </div>
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
  purchaseAmount,
  onBackToHunt,
  onSetPurchaseAmount,
  onTrain
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  trainingUnlocked: boolean;
  purchaseAmount: TrainingPurchaseAmount;
  onBackToHunt: () => void;
  onSetPurchaseAmount: (amount: TrainingPurchaseAmount) => void;
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
            <p>Training costs grow exponentially. Milestones and legacy efficiency keep levels relevant while bulk buying clears old tiers quickly.</p>
            <div className="training-summary-grid">
              <div><span>Gold</span><strong>{formatGameNumber(state.player.gold)}</strong></div>
              <div><span>Boss Ready</span><strong>{formatWhole.format(Math.min(100, snapshot.bossReadiness * 100))}%</strong></div>
              <div><span>Attack</span><strong>{formatWhole.format(snapshot.stats.attack)}</strong></div>
              <div><span>Health</span><strong>{formatWhole.format(snapshot.stats.health)}</strong></div>
              <div><span>Recovery</span><strong>{formatOne.format(snapshot.recoveryPerSecond)} / sec</strong></div>
              <div><span>Legacy Efficiency</span><strong>x{formatOne.format(getTrainingPotency(state))}</strong></div>
            </div>
          </div>
          {trainingUnlocked ? (
            <TrainingPanel
              state={state}
              purchaseAmount={purchaseAmount}
              onSetPurchaseAmount={onSetPurchaseAmount}
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

function TopBar({ state, xpPercent }: { state: GameState; xpPercent: number }) {
  return (
    <header className="top-bar">
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
  onEquip
}: {
  snapshot: ReturnType<typeof getSnapshot>;
  state: GameState;
  selectedItem?: InventoryItem;
  onSelectItem: (item: InventoryItem) => void;
  onEquip: (item: InventoryItem) => void;
}) {
  const selectedSpec = selectedItem ? getItemSpec(selectedItem) : undefined;
  const equippedInstanceId = selectedSpec?.slot ? state.inventory.equipped[selectedSpec.slot] : undefined;
  const selectedIsEquipped = Boolean(selectedItem && selectedItem.instanceId === equippedInstanceId);
  const equippedComparable = selectedSpec?.slot
    ? getEquippedItem(state, selectedSpec.slot)
    : undefined;
  const selectedSlotView = selectedSpec?.slot
    ? equipmentSlotViews.find((slot) => slot.accepts.includes(selectedSpec.slot!))
    : undefined;
  const selectedCanEquip = Boolean(selectedItem && selectedSpec?.slot && selectedSlotView?.unlocked && !selectedIsEquipped);
  const selectedSlotLabel = selectedSlotView?.label ?? selectedSpec?.slot ?? "Item";

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

    onSelectItem(item);
    onEquip(item);
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
              {equipmentSlotViews.map((slot) => {
                const equipped = getEquippedItem(state, slot.id);
                const spec = equipped ? getItemSpec(equipped) : undefined;
                const compatible = Boolean(selectedSpec?.slot && slot.accepts.includes(selectedSpec.slot));
                const classes = [
                  "equipment-socket",
                  slot.unlocked ? "unlocked" : "locked",
                  spec ? "filled" : "empty",
                  compatible ? "compatible" : ""
                ].filter(Boolean).join(" ");

                return (
                  <button
                    type="button"
                    key={slot.id}
                    className={classes}
                    aria-disabled={!slot.unlocked}
                    onClick={() => equipped && onSelectItem(equipped)}
                    onDragOver={(event) => handleSlotDragOver(event, slot)}
                    onDrop={(event) => handleSlotDrop(event, slot)}
                  >
                    <span className="slot-icon" aria-hidden="true">
                      {slot.icon}
                      {!slot.unlocked && <Lock className="slot-lock-icon" size={13} />}
                    </span>
                    <span className="slot-label">{slot.label}</span>
                    <strong>{spec?.name ?? (slot.unlocked ? "Empty" : "Locked")}</strong>
                    <em>{spec ? itemEffectSummary(spec) : slot.unlocked ? "Open" : "Unlock later"}</em>
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

          <div className="inventory-bag-column">
            <div className="inventory-toolbar">
              <span className="eyebrow">Bag</span>
              <strong>{state.inventory.items.length} Items</strong>
            </div>
            <div className="inventory-list-grid">
              {state.inventory.items.map((item) => {
                const spec = getItemSpec(item);
                const isEquipped = Object.values(state.inventory.equipped).includes(item.instanceId);

                return (
                  <button
                    type="button"
                    key={item.instanceId}
                    className={`inventory-list-item ${selectedItem?.instanceId === item.instanceId ? "active" : ""} ${isEquipped ? "equipped" : ""}`}
                    draggable={Boolean(spec?.slot)}
                    onDragStart={(event) => handleItemDragStart(event, item)}
                    onClick={() => onSelectItem(item)}
                  >
                    <div className="item-glyph">{spec?.name.slice(0, 1) ?? "?"}</div>
                    <div>
                      <strong>{spec?.name ?? "Unknown Item"}</strong>
                      <span>{spec ? `${spec.rarity} T${spec.tier}` : "Unknown"}</span>
                    </div>
                    {isEquipped && <b>Equipped</b>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inventory-detail-column">
            {selectedSpec && selectedItem ? (
              <>
                <span className="eyebrow">{selectedSpec.rarity} {selectedSpec.slot ?? "item"}</span>
                <h2>{selectedSpec.name}</h2>
                <p>{selectedSpec.description}</p>
                <div className="stat-table inventory-effect-table">
                  {selectedSpec.effects.map((effect) => (
                    <Row
                      key={`${effect.stat}-${effect.value}-${effect.mode}`}
                      label={effect.stat}
                      value={formatEffectValue(effect.mode, effect.value)}
                    />
                  ))}
                </div>
                {equippedComparable && equippedComparable.instanceId !== selectedItem.instanceId && (
                  <div className="compare-box">
                    <span>Currently Equipped</span>
                    <strong>{getItemSpec(equippedComparable)?.name ?? "Unknown Item"}</strong>
                    <em>{itemEffectSummary(getItemSpec(equippedComparable))}</em>
                  </div>
                )}
                <button
                  type="button"
                  className="equip-action"
                  disabled={!selectedCanEquip}
                  onClick={() => onEquip(selectedItem)}
                >
                  {selectedIsEquipped ? "Equipped" : selectedSlotView?.unlocked ? `Equip ${selectedSlotLabel}` : selectedSpec.slot ? "Slot Locked" : "Cannot Equip"}
                </button>
              </>
            ) : (
              <div className="empty-state">No item selected.</div>
            )}
          </div>
        </div>
      </section>
      <DropsPanel state={state} className="inventory-materials-panel" />
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
          <div className="portrait-ring">
            <Swords size={58} />
          </div>
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
          {target ? (
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

  return (
    <div className={`spoils-card ${reward ? "" : "spoils-card-empty"}`}>
      <span className="eyebrow">Spoils</span>
      <strong>{reward?.monsterName ?? "No spoils yet"}</strong>
      <div className="spoils-grid">
        <div><span>XP</span><b>{reward ? formatGameNumber(reward.xp) : "0"}</b></div>
        <div><span>Gold</span><b>{reward ? formatGameNumber(reward.gold) : "0"}</b></div>
        <div><span>Area</span><b>{reward ? `+${formatWhole.format(reward.progress)}` : "+0"}</b></div>
      </div>
      {(resources.length > 0 || items.length > 0) && (
        <div className="spoils-drops">
          {resources.slice(0, 2).map(({ resource, amount }) => (
            <em key={resource.id}>{formatGameNumber(amount)} {resource.name}</em>
          ))}
          {items.slice(0, 1).map((item) => (
            <em key={item.id}>{item.name}</em>
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
  const visibleAreas = gameContent.areas.filter((area) => state.areas[area.id]?.visible);

  return (
    <article className="area-card">
      <span className="eyebrow">Current Area</span>
      <h2>{snapshot.currentArea.name}</h2>
      <div className="area-landscape">
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
        {visibleAreas.map((area) => {
          const selectableAreaState = state.areas[area.id];
          const selectableProgress = Math.min(100, (selectableAreaState.progress / area.progressRequired) * 100);
          const active = area.id === snapshot.currentArea.id;
          const unlocked = selectableAreaState.unlocked;
          const outclassed = unlocked && !selectableAreaState.bossDefeated && snapshot.power < area.powerBand[0] * 0.78;
          const statusLabel = active
            ? "Exploring"
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
              className={`area-select-card ${active ? "active" : ""} ${unlocked ? "unlocked" : "locked"} ${outclassed ? "outclassed" : ""}`}
              disabled={!unlocked}
              onClick={() => onSelectArea(area.id)}
            >
              <span>{unlocked ? `T${area.tier}` : <Lock size={13} />}</span>
              <strong>{area.name}</strong>
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
  purchaseAmount = 1,
  onSetPurchaseAmount,
  onTrain,
  bare = false
}: {
  state: GameState;
  purchaseAmount?: TrainingPurchaseAmount;
  onSetPurchaseAmount?: (amount: TrainingPurchaseAmount) => void;
  onTrain: (trainingId: TrainingId) => void;
  bare?: boolean;
}) {
  const content = (
    <>
      {onSetPurchaseAmount && (
        <div className="training-toolbar">
          <span>Buy</span>
          {([1, 10, "max"] as TrainingPurchaseAmount[]).map((amount) => (
            <button
              key={String(amount)}
              type="button"
              className={purchaseAmount === amount ? "active" : ""}
              onClick={() => onSetPurchaseAmount(amount)}
            >
              {amount === "max" ? "Max" : `x${amount}`}
            </button>
          ))}
        </div>
      )}
      <div className="training-list">
        {trainingSpecs.map((training) => {
          const cost = getTrainingCost(state, training.id);
          const affordable = canBuyTraining(state, training.id);
          const level = state.training?.[training.id]?.level ?? 0;
          const purchases = purchaseAmount === "max"
            ? getAffordableTrainingPurchases(state, training.id)
            : Math.min(purchaseAmount, getAffordableTrainingPurchases(state, training.id, purchaseAmount));
          const purchaseCost = purchases > 0 ? getTrainingPurchaseCost(state, training.id, purchases) : cost;
          const nextGain = getNextTrainingGain(state, training.id);
          const milestoneBonus = getTrainingMilestoneBonus(level);

          return (
            <article className="training-row" key={training.id}>
              <div className="training-copy">
                <strong>{training.name}</strong>
                <span>{training.description}</span>
              </div>
              <div className="training-level">
                <span>Level</span>
                <strong>{level}{purchases > 0 ? ` -> ${level + purchases}` : ""}</strong>
              </div>
              <div className="training-level">
                <span>Next Gain</span>
                <strong>{formatTrainingGain(training.stat, nextGain)}</strong>
                {milestoneBonus > 0 && <em>+{formatOne.format(milestoneBonus * 100)}% milestone</em>}
              </div>
              <button disabled={!affordable} onClick={() => onTrain(training.id)}>
                {purchases > 1 ? `Buy ${purchases} (${formatGameNumber(purchaseCost)}g)` : formatGameNumber(cost)}
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
            <div className="item-glyph">{resource.name.slice(0, 1)}</div>
            <strong>{formatGameNumber(amount)}</strong>
            <span>{resource.name}</span>
          </div>
        ))}
        {resources.length === 0 && <div className="empty-state">No materials yet.</div>}
      </div>
    </section>
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
                <div className="item-glyph">{spec?.name.slice(0, 1) ?? "?"}</div>
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

function NavRow({ icon, label, active, badge, disabled, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; disabled?: boolean; onClick?: () => void }) {
  return (
    <button className={`nav-row ${active ? "active" : ""}`} disabled={disabled} onClick={onClick} type="button">
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
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

function itemEffectSummary(spec?: ItemSpec): string {
  if (!spec) {
    return "";
  }

  return spec.effects
    .slice(0, 2)
    .map((effect) => `${effect.stat} ${formatEffectValue(effect.mode, effect.value)}`)
    .join(", ");
}

function formatEffectValue(mode: "flat" | "percent", value: number): string {
  if (mode === "percent") {
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
