# Prestige Model

Prestige should not be one button forever. It should become a family of reset depths that support different player moods:

- Short reset loops when the player wants a burst of progress.
- Long runs when the player wants to push deeper and collect rare rewards.
- Later feature resets that transform old systems into stronger, quieter versions.

Pure elapsed-time progression is covered in `time-gated-progression.md`. Prestige should interact with those systems, but it should not wipe account-age rewards or make time-based boosts feel fragile.

The aim is not to punish the player for choosing the "wrong" run length. A healthy idle game should make both of these feel valid:

- "I will prestige now because the next run will be much faster."
- "I will stay in this run because I am close to a deep milestone."

## Prestige Layers

| Layer | Working Name | Unlock Window | Reset Depth | Main Reward | Best For |
| --- | --- | --- | --- | --- | --- |
| 1 | Return to Camp | First prestige era or shortly before it | Light | Field Notes, supplies, route upgrades | Short cycles and cleanup |
| 2 | Legacy Rite | First major wall, around Moonfen/first prestige | Medium | Legacy Sparks, permanent power, new start conditions | Real resets and new mechanics |
| 3 | Oath Renewal | Midgame, after class/blacksmith are established | Feature-specific | Transform a system, compress old UI, unlock a new version | Refreshing mature systems |
| 4 | Era Shift | Much later | Heavy | New layer of progression, rule changes, high-impact unlocks | Expansion-level resets |

For the first 100 hours, only the first three need serious design. Era Shift is a future-proof placeholder.

## Layer 1: Return to Camp

This is the lite-prestige.

Fantasy:

- The hunter returns from the field, files a report, spends supplies, and starts a new expedition route.
- This is not a bloodline reset. It is a controlled reset of the current expedition.

Unlock timing:

- Option A: unlock after defeating Moonvein Colossus once.
- Option B: preview after Stonebound Matriarch, unlock after first full Legacy Rite.

Recommended default:

- Let first true prestige teach the reset loop, then unlock Return to Camp during the second run. That keeps the first 10 hours clean and makes the second run immediately feel more sophisticated.

Resets:

- Area progress bars for the active expedition.
- Boss "defeated this expedition" flags.
- Route momentum and temporary expedition buffs.
- Current route plan.

Keeps:

- Hunter level.
- Training levels.
- Equipped gear and inventory.
- Unlocked areas.
- Resources.
- Resource mastery.
- Blacksmith upgrades.
- Class progress.
- Legacy upgrades.
- Offline bank upgrades.

Rewards:

- Field Notes.
- Camp Supplies.
- Route Planner upgrades.
- Small temporary start boosts for the next expedition.
- Optional reroll or targeting tools for loot.

Design purpose:

- It gives players a reset button that does not erase a long build.
- It lets players repeat boss chains for trophies, route rewards, and Field Notes.
- It cleans up solved area progress without forcing a full prestige.

Good uses:

- "I want to farm Bramblemaw and Matriarch trophies quickly."
- "I want more Field Notes for automation."
- "I want to reset my route because this run has become messy."

Bad uses to avoid:

- It should not be optimal to spam Return to Camp every minute.
- It should not give the same permanent currency as a full prestige.
- It should not reset enough that players feel punished for using it.

Suggested reward shape:

```text
fieldNotes =
  expeditionReport
  * routeDepthMultiplier
  * firstClearBonus
```

`expeditionReport` comes from boss clears, hunts completed, and renown earned since the last Return to Camp.

`routeDepthMultiplier` increases when the player reaches deeper areas before returning.

`firstClearBonus` rewards pushing to a newly solved boss before returning.

This means a short return is useful, but a deeper expedition can make the return much better.

## Layer 2: Legacy Rite

This is the main prestige.

Fantasy:

- The hunter passes knowledge into a legacy, bloodline, oath, or guild record.
- The next hunter starts weaker in immediate run power but stronger in permanent systems.

Unlock timing:

- After Moonvein Colossus or equivalent first-run capstone.
- Requires enough renown for at least 1 Legacy Spark.

Resets:

- Hunter level.
- XP.
- Gold.
- Area progress.
- Boss defeated-this-run flags.
- Basic training bought during the run, unless preserved by a Legacy upgrade.
- Temporary expedition buffs.
- Current route.

Keeps:

- Prestige count.
- Legacy Sparks and spent legacy upgrades.
- Hunter Tenure and completed time-gated research.
- Heirlooms.
- Resource mastery.
- Bestiary milestones.
- Class unlocks and persistent class XP.
- Blacksmith recipes or forge tiers.
- Offline efficiency upgrades, unless balance says these should become legacy-gated.
- Cosmetic/title/achievement progress.

Open design decision:

- Whether normal inventory persists through Legacy Rite. Recommended: keep only equipped heirlooms and special trophies by default, then unlock broader gear preservation later. This makes "heirlooming" gear a real reward and prevents inventory noise from exploding.

Rewards:

- Legacy Sparks.
- Permanent stat and reward multipliers.
- First-run start bonuses.
- New system unlocks such as auto-boss, auto-advance, blacksmith, class seed, or expedition camp.
- Access to some large upgrades that can only be claimed during or immediately after a full Legacy Rite.

Current implementation hook:

- The game already has `player.prestige`.
- Current permanent effects are `+5% stats` and `+4% rewards` per prestige point.
- Current gain formula is based on renown.

Design note:

- The raw multiplier is useful, but the first Legacy Rite needs a visible mechanic unlock too. A 5% stat gain is not a "BAM" moment by itself.

## Legacy-Gated Major Upgrades

Some large upgrades should require a full Legacy Rite. Not every upgrade, and not every system, but enough that full prestige remains exciting and structurally important.

Design purpose:

- Full prestige should feel like entering a new run era.
- Some upgrades should be too large to fit inside an ongoing run cleanly.
- The player should occasionally think, "I could keep pushing, but if I reset now, the next run changes shape."

Use Legacy-gated upgrades for:

- New start conditions.
- Major automation unlocks.
- Large feature transformations that affect the whole run.
- New permanent currencies or branches.
- Upgrades that would be awkward or confusing to apply mid-run.
- Power boosts large enough that the current run would become instantly unbalanced.

Do not use Legacy-gated upgrades for:

- Small stat purchases.
- Minor QoL.
- Incremental blacksmith ranks.
- Basic resource spends.
- Anything the player needs to fix a short-term wall right now.

Example Legacy-gated upgrades:

| Upgrade | Unlocks After | Effect | Why It Needs Full Prestige |
| --- | --- | --- | --- |
| Hunter's Memory | First Legacy Rite | Start future runs with baseline training | Changes early-run pacing |
| Trophy Hook | First or second Legacy Rite | Preserve one boss trophy as an heirloom | Changes inventory reset rules |
| Route Memory | First Legacy Rite plus Matriarch clear | Previously beaten bosses can be auto-bossed earlier | Changes the structure of route progression |
| Blacksmith Charter | Legacy Rite after first duplicate boss trophy | Unlock blacksmith as a permanent system | Converts drops/resources into a new economy |
| Class Seed | Legacy Rite after tier 4 entry | Choose first specialization seed | Changes stat identity from generic to build-driven |
| Expedition Charter | Legacy Rite after resource mastery milestone | Unlock expedition camp | Moves old area farming out of the main loop |
| Legacy Forge | Later Legacy Rite | Convert a mature item into an heirloom core | Alters how gear persists through resets |
| Elder Hunt Writ | Later Legacy Rite | Unlock elder boss ladder | Opens a new long-run challenge layer |

Presentation rule:

- Show Legacy-gated upgrades before the player can afford them.
- Label them as "Available after next Legacy Rite" or "Requires a full Legacy Rite".
- The player should understand why a full reset is tempting before they press it.

Timing rule:

- The best moment for a Legacy-gated upgrade is when the current run is slowing down, but the player can still imagine one more long-run goal.
- This creates a real choice: cash out for a transformed next run, or push deeper for a better payout.

Suggested first Legacy Spark choices:

- Hunter's Memory: start each run with +3 total training levels.
- Trophy Hook: keep the first boss trophy as a starter heirloom.
- Route Memory: bosses beaten in prior runs can be auto-bossed earlier.
- Campfire Discipline: start each run with some banked time.

## Layer 3: Oath Renewal

This is a feature-specific prestige introduced after a system has matured.

Fantasy:

- The hunter renews an oath, recasts a weapon tradition, rewrites a route charter, or codifies a class doctrine.
- The old version of a feature is reset or compressed, and the stronger version replaces it.

Unlock timing:

- Around 40-80 hours, after the player has used blacksmith, route automation, or class specialization enough for the feature to feel familiar.

Examples:

| Feature | Oath Renewal Reset | Reward | Compression |
| --- | --- | --- | --- |
| Blacksmith | Reset upgrade ranks on selected gear | Create an Heirloom Core with a permanent scaling bonus | Old upgrade rows become one core level |
| Route Planner | Reset route milestones | Create a Charter that auto-clears solved regions faster | Old area list becomes a route summary |
| Training | Reset high manual training levels | Create a Doctrine that grants automatic baseline stats | Individual early stat clicks fade out |
| Class | Reset class nodes within a branch | Upgrade the class seed into a specialization | Early class bonuses become one passive |
| Resource Mastery | Spend mastery thresholds | Unlock a resource law or global bonus | Old resource counts matter less than mastery tier |

Design purpose:

- Oath Renewal refreshes a feature without adding a whole new tab.
- It is the Unnamed Space Idle-style move: the familiar mechanic changes form, gets much stronger, and stops asking the player to manage old details.

Important rule:

- Oath Renewal should never feel like losing a feature. It should feel like mastering the feature so hard that the old version becomes beneath the main UI.

## Layer 4: Era Shift

This is a future major reset. Do not build it in MVP.

Possible use:

- After many Legacy Rites and Oath Renewals, the player enters a new era of hunting.
- It could reset most legacy systems, but grant a powerful new global layer.
- This is where settlement, guild, bloodline, or world-scale systems could become relevant.

Keep this as a later expansion tool, not a first-100-hours requirement.

## Encouraging Both Short Runs And Long Runs

The game should avoid a single optimal run length.

Short-run incentives:

- Return to Camp gives Field Notes quickly.
- Boss trophy ranks benefit from repeated route clears.
- Route Planner and automation upgrades use Field Notes.
- Some daily-feeling goals can reward clean short expeditions.

Long-run incentives:

- Deep bosses give first-clear bonuses.
- Deeper areas improve `routeDepthMultiplier`.
- Legacy Sparks become much better after major renown thresholds.
- Rare relics, class XP, elder hunt progress, and high-tier resource mastery require staying out.
- Some rewards only appear after a run reaches a minimum depth or age.

Mixed-run incentives:

- Field Notes from Return to Camp improve automation for future long runs.
- Long runs unlock new depth multipliers that make future short returns more valuable.
- Legacy Rites unlock starting conditions that make both short and long runs faster.
- Oath Renewals consume progress from mature features, so the player alternates between building a feature up and refreshing it.

## Run Length Controls

Use visible breakpoints rather than hidden optimal math.

The prestige panel should show:

- Return to Camp reward if used now.
- Next Field Notes breakpoint.
- Legacy Sparks if full prestige is used now.
- Next Legacy Spark breakpoint.
- Legacy-gated upgrades that would become claimable after this full prestige.
- Deep milestone currently within reach.
- What resets and what stays for each button.

Example UI framing:

```text
Return to Camp
Gain: 42 Field Notes
Next: +8 Field Notes after Stonebound Matriarch
Resets: current route, area progress, expedition boss flags
Keeps: level, gear, training, resources, masteries

Legacy Rite
Gain: 2 Legacy Sparks
Next: 3 Sparks at 410 Renown
Unlocks after reset: Blacksmith Charter
Resets: level, gold, training, current route, area progress
Keeps: heirlooms, masteries, legacy upgrades, class unlocks
```

This helps the player make an intentional decision instead of guessing.

## Anti-Noise Rules

Prestige should reduce noise over time.

- Return to Camp cleans up old route state.
- Legacy Rite unlocks better starts and automation.
- Oath Renewal compresses mature mechanics into stronger summaries.
- Deep old systems should become passive contributions, not permanent chores.

When a prestige layer is introduced, ask:

1. What old decision is this removing?
2. What new decision is replacing it?
3. What power spike does the player feel immediately?
4. What UI can become quieter afterward?

If the answer is only "number gets bigger", the prestige layer is not ready.

## First 100 Hours Recommendation

0-10 hours:

- Teach hunts, bosses, gear, training, offline bank.
- First Legacy Rite happens near the Moonfen capstone.
- Legacy Rite grants a strong Legacy Spark unlock, not just a small multiplier.

10-30 hours:

- Introduce Return to Camp.
- Return to Camp gives Field Notes for Route Planner, auto-boss, and auto-advance upgrades.
- Players can now do short expedition loops without wiping their long-term build.
- Gate the Blacksmith Charter behind a Legacy Rite so it arrives as a new-run power spike, not a random mid-run panel.

30-60 hours:

- Long runs become more valuable through blacksmith, resource mastery, tier 4, and class seed progress.
- Legacy Rite remains useful for permanent starts and mechanic unlocks.
- Gate the first Class Seed behind a later Legacy Rite so identity starts a new run cleanly.

60-100 hours:

- Introduce the first Oath Renewal for either Route Planner, Blacksmith, or Training.
- The chosen feature transforms and compresses old UI.
- The player now has three reset decisions: return, legacy, or renew a mature feature.
- Gate Expedition Charter or Elder Hunt Writ behind a Legacy Rite when the game needs another major reset-and-surge moment.

Recommended first Oath Renewal:

- Route Charter. It is easy to understand and directly solves the noisy old-area problem.
- The route system upgrades from manual area progression to "clear known route until wall, then farm target".
