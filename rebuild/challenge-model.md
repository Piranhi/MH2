# Challenge Model

Challenges are optional prestige-started runs with special restrictions or altered mechanics. They should be essential over time because their rewards become permanent power, automation, or feature evolution. Some should be exciting build puzzles, some should be straightforward grind checks, and some should be intentionally awkward until the player has unlocked the right tools.

Inspirations from other idle games:

- Antimatter Dimensions uses challenges that change core production rules, disable upgrade groups, and often reward autobuyers or powerful production changes.
- Antimatter Dimensions later repeats the idea with harder challenge layers, including repeated challenge completions and record-time rewards.
- Unnamed Space Idle starts challenges through a prestige reset, disables or focuses major systems, and grants important bonuses to specific feature pillars.
- Realm Grinder uses faction-style tier challenges with unlock requirements, sequential tiers, and perks that become permanent parts of future builds.
- Revolution Idle-style challenge structures commonly use handicaps, milestone unlocks, and permanent production/prestige rewards.

## Design Goals

- Challenges start from a fresh prestige state so the restriction actually matters.
- Challenge rewards should be strong enough that players want to do them.
- Challenge restrictions should teach alternate ways to value systems.
- Challenge completion levels should reward both "I finally beat it" and "I optimized it beautifully".
- Challenges should refresh old mechanics instead of adding endless new panels.
- Challenge UI should separate game chunks so players are not staring at impossible late-game goals too early.

## Starting A Challenge

Default rule:

- Starting a challenge performs a full Legacy Rite-style reset into a challenge run.
- The player chooses one unlocked challenge.
- The challenge defines what persists, what is disabled, and what goal must be reached.
- Leaving the challenge returns the player to a normal fresh run state, not to the exact old run.

Allowed to persist by default:

- Account age and Hunter Tenure.
- Completed challenge rewards.
- Legacy upgrades that the challenge allows.
- Heirlooms if the challenge allows gear.
- Resource mastery if the challenge allows mastery.
- Time-gated systems unless specifically paused.
- Cosmetic and achievement progress.

Reset or disabled by default:

- Current level, XP, gold, run training, route state, area progress, boss flags.
- Return to Camp progress.
- Temporary expedition buffs.
- Any systems explicitly disabled by the challenge.

Challenge-specific persistence should be clear in the UI:

```text
Allowed: Legacy Sparks, Hunter Tenure, Resource Mastery
Disabled: Gear, Blacksmith, Offline Bank
Goal: Defeat Stonebound Matriarch
Best reward tier: Complete in under 35 minutes
```

## Completion Levels

Each challenge has 5 levels. Level 1 is completion. Levels 2-5 are better completion standards, usually time-based, depth-based, or restriction-based.

Default time-tier pattern:

| Level | Requirement | Reward Shape |
| --- | --- | --- |
| 1 | Complete the challenge | Unlock the base reward |
| 2 | Complete under target time A | Improve reward by about 25%-50% |
| 3 | Complete under target time B | Add a secondary bonus |
| 4 | Complete under target time C | Add automation/QoL related to the challenge |
| 5 | Complete under target time D | Best reward form, often a mechanic upgrade |

Alternative tier types:

- Complete with fewer boss attempts.
- Complete without equipping rare gear.
- Complete without Return to Camp.
- Complete after reaching an optional deeper boss.
- Complete with a specific class seed or route.
- Complete while preserving a minimum amount of banked time.

Design rule:

- Level 1 should be achievable soon after unlock by a patient player.
- Level 5 should often require later systems, stronger legacy, or a clever route.
- The UI should show Level 1 as the current goal and show higher levels as aspirational.

## Reward Rules

Challenge rewards should be permanent and meaningful.

Good rewards:

- Starting power.
- Automation thresholds.
- Offline efficiency.
- Boss readiness.
- Route Planner power.
- Gear persistence.
- Resource mastery scaling.
- Blacksmith speed or cost reduction.
- Class doctrine bonuses.
- Oath Renewal improvements.

Avoid:

- Tiny generic +1% bonuses as the only reward.
- Rewards that only help inside the same challenge.
- Rewards that add another chore panel.
- Rewards that make the original challenge irrelevant immediately after Level 1.

Reward scaling example:

```text
Challenge: Bare Hands
L1: +5% base attack when no weapon is equipped.
L2: +8% base attack always.
L3: Start each Legacy run with +1 Weapon Forms level.
L4: Auto-equip ignores low-tier weapons after route clear.
L5: Unlock "Weapon Doctrine": first equipped weapon each run gains +20% attack.
```

## Challenge Chunks

Challenges should unlock in chunks that match the current game phase.

| Chunk | Approx Window | Theme | Expected Reset Layer |
| --- | --- | --- | --- |
| Ember Trials | 8-20 h | Early systems, boss basics, training, gear limitations | Legacy Rite |
| Iron Oaths | 20-45 h | Route automation, blacksmith, resource mastery | Legacy Rite |
| Moon Relics | 45-80 h | Long runs, class seed, offline/time systems | Legacy Rite or Oath Renewal |
| Elder Writs | 80-150 h | Feature refreshes, strict restrictions, deep bosses | Legacy Rite plus Oath Renewal |
| Era Trials | Future | Expansion-scale rule changes | Era Shift |

## Ember Trials

Early challenges should be readable and a little blunt. They mostly teach the player how much each basic system matters.

### 1. Bare Hands

Unlock:

- First Legacy Rite completed.

Goal:

- Defeat Elder Bramblemaw.

Restriction:

- Weapons are disabled.
- Charms still work.
- Training and armor are allowed.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat Elder Bramblemaw | +5% base attack |
| 2 | Under 45 min | +8% base attack |
| 3 | Under 30 min | Start runs with +1 Weapon Forms |
| 4 | Under 20 min | Auto-equip can ignore weaker weapons |
| 5 | Under 12 min | Weapon Doctrine: first weapon equipped each run gains +20% attack |

Why it works:

- It is simple and slightly boring.
- It makes training, charms, and survival matter more.
- It gives an essential attack foundation.

### 2. No Campfire

Unlock:

- Return to Camp unlocked.

Goal:

- Defeat Stonebound Matriarch.

Restriction:

- Recovery speed is heavily reduced.
- Rested Resolve and banked time are disabled.
- Offline progress still records time, but does not spend during the challenge.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat Stonebound Matriarch | +10% recovery speed |
| 2 | Under 90 min | +15% recovery speed |
| 3 | Under 65 min | Defeats lose less route momentum |
| 4 | Under 45 min | Auto-route can retreat to a safer area after defeat |
| 5 | Under 30 min | Camp Discipline: first defeat each run recovers instantly |

Why it works:

- It is not glamorous, but the reward is universally useful.
- It teaches survival and route safety.

### 3. Trophy Hunger

Unlock:

- Trophy Hook or first heirloom unlocked.

Goal:

- Defeat Elder Bramblemaw and Stonebound Matriarch in one challenge run.

Restriction:

- Boss trophy drops are disabled until both bosses are defeated.
- Regular gear drop rates are reduced.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat both bosses | +10% boss trophy drop value or salvage value |
| 2 | Under 80 min | +15% trophy salvage |
| 3 | Under 55 min | First boss trophy per run gains +1 rank preview |
| 4 | Under 38 min | Auto-boss favors bosses with missing trophy ranks |
| 5 | Under 25 min | Trophy Memory: first cleared boss each run grants bonus Field Notes |

Why it works:

- It makes the player route around missing boss loot.
- It supports the boss trophy loop without adding another resource.

### 4. Greenhorn Route

Unlock:

- Auto-advance unlocked.

Goal:

- Reach Moonfen Ruins.

Restriction:

- Auto-boss and auto-advance are disabled.
- Manual area and boss choices only.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Reach Moonfen | Route Planner starts with +5% progress speed |
| 2 | Under 75 min | +10% progress speed |
| 3 | Under 50 min | Route Planner shows better next-wall estimates |
| 4 | Under 35 min | Auto-advance can skip fully solved areas faster |
| 5 | Under 22 min | Route Memory improves auto-boss threshold by 5% |

Why it works:

- It is deliberately a bit tedious.
- It makes automation feel earned and valuable again.

## Iron Oaths

These challenges assume the player understands the first loop and has blacksmith or resource mastery coming online.

### 5. Dull Iron

Unlock:

- Blacksmith Charter claimed.

Goal:

- Defeat Stonebound Matriarch.

Restriction:

- Blacksmith upgrades are disabled.
- Gear drops and training still work.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat Stonebound Matriarch | -5% blacksmith upgrade costs |
| 2 | Under 70 min | -8% costs |
| 3 | Under 45 min | First forge upgrade each run is faster |
| 4 | Under 30 min | Auto-salvage grants +10% forge fuel |
| 5 | Under 18 min | Tempering I starts instantly on newly heirloomed gear |

Why it works:

- It reminds players how strong the blacksmith is.
- The reward makes the blacksmith smoother forever.

### 6. Empty Pockets

Unlock:

- Resource Mastery unlocked.

Goal:

- Defeat Moonvein Colossus.

Restriction:

- Current resource quantities reset to zero at challenge start.
- Resource drops are reduced by 50%.
- Lifetime mastery still applies.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat Moonvein Colossus | +5% material find |
| 2 | Under 2 h | +8% material find |
| 3 | Under 90 min | Resource mastery bonuses are +5% stronger |
| 4 | Under 60 min | Auto-route can target the best area for a selected material |
| 5 | Under 40 min | Supply Memory: start each run with a small bundle of mastered resources |

Why it works:

- It is a long, grindy challenge.
- It makes mastery feel like the thing that survives scarcity.

### 7. One Road

Unlock:

- Route Planner unlocked.

Goal:

- Defeat Moonvein Colossus.

Restriction:

- The player picks one route at challenge start.
- Manual area switching is disabled.
- Return to Camp is disabled.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat Moonvein Colossus | Route Planner progress +8% |
| 2 | Under 2 h | +12% route progress |
| 3 | Under 90 min | Route Planner can hold one fallback rule |
| 4 | Under 60 min | Routes can auto-farm missing boss readiness |
| 5 | Under 40 min | Chartered Route: solved regions compress into a single route stage |

Why it works:

- It is a routing puzzle.
- The reward directly reduces old-area noise.

### 8. Broken Clock

Unlock:

- Offline Efficiency level 3 or first major time-gated system.

Goal:

- Defeat Stonebound Matriarch or Moonvein Colossus depending on unlock timing.

Restriction:

- Banked time, Rested Resolve, and Camp Research bonuses are disabled.
- Active hunt time still works.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Complete goal | +5% offline bank rate |
| 2 | Under target A | +8% offline bank rate |
| 3 | Under target B | Rested Resolve cap +10% |
| 4 | Under target C | Camp Research completes 5% faster |
| 5 | Under target D | Waystone: first 10 minutes of banked time each run are 25% more efficient |

Why it works:

- It is a pure "play without the clock helping" check.
- The reward strengthens the time layer for everyone.

## Moon Relics

These are midgame challenges that can require class seeds, long runs, or specific matured systems.

### 9. Oathless

Unlock:

- First Class Seed claimed.

Goal:

- Defeat a tier 4 boss.

Restriction:

- Class bonuses are disabled.
- Training and gear still work.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat tier 4 boss | +5% class XP |
| 2 | Under 3 h | +8% class XP |
| 3 | Under 2 h | First class node each run costs less |
| 4 | Under 90 min | Class doctrine summary unlocks earlier |
| 5 | Under 60 min | Chosen class seed grants a small cross-run stat at level 1 |

Why it works:

- It makes class power visible by removing it.
- It rewards players with smoother class progression.

### 10. Moonless Hunt

Unlock:

- Moonfen relic gear acquired or Moonfen mastery level reached.

Goal:

- Defeat Moonvein Colossus.

Restriction:

- Charms and relic effects are disabled.
- Luck is set to zero.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat Moonvein Colossus | +5% luck |
| 2 | Under 2 h | +8% luck |
| 3 | Under 90 min | Relic drops gain +5% quality chance |
| 4 | Under 60 min | Route surveys reveal best relic target |
| 5 | Under 40 min | Relic Memory: first relic each run rolls one bonus stat |

Why it works:

- It is a gear puzzle and a mild pain point.
- The reward is exciting for drop-focused players.

### 11. Long Watch

Unlock:

- Camp Research and Legacy Maturation unlocked.

Goal:

- Reach a deep run age and defeat a chosen boss.

Restriction:

- Return to Camp is disabled.
- Legacy Rite is unavailable until the challenge is completed or abandoned.
- Short-run Field Note bonuses do not apply.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Survive 6 h run age and defeat target boss | +5% long-run rewards after 2 h |
| 2 | Defeat a deeper target before 6 h | +8% long-run rewards |
| 3 | Under 4 h | Legacy Maturation is 5% faster |
| 4 | Under 3 h | Deep run milestone preview unlocks |
| 5 | Under 2 h | Watcher's Patience: long runs gain a scaling boss readiness bonus |

Why it works:

- It explicitly validates long runs.
- It is boring on purpose unless the player has good automation.

### 12. No Heirlooms

Unlock:

- At least two heirlooms or Legacy Forge unlocked.

Goal:

- Defeat a tier 4 boss.

Restriction:

- Heirlooms are disabled.
- Normal gear can still drop and be equipped.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat tier 4 boss | +5% heirloom core power |
| 2 | Under 3 h | +8% core power |
| 3 | Under 2 h | First heirloom temper each run is cheaper |
| 4 | Under 90 min | Heirloom comparison UI unlocks |
| 5 | Under 60 min | Legacy Forge preserves one extra secondary effect |

Why it works:

- It makes non-heirloom gear matter again briefly.
- The reward deepens the heirloom layer.

## Elder Writs

These are late first-100-hours or post-100-hours challenges. They should be hard enough that some Level 5 rewards are future goals.

### 13. Three Wounds

Unlock:

- Elder Hunt Writ unlocked.

Goal:

- Defeat three elder bosses in one challenge run.

Restriction:

- After each elder boss, the hunter gains a permanent wound for the rest of the challenge:
  - -15% attack.
  - -15% health.
  - -15% speed.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat three elder bosses | +5% elder hunt rewards |
| 2 | Under 5 h | +8% elder rewards |
| 3 | Under 4 h | First wound in elder content is reduced |
| 4 | Under 3 h | Elder route estimates improve |
| 5 | Under 2 h | Wound Mastery: class doctrine partially offsets challenge penalties |

Why it works:

- It is a build stress test.
- It creates a memorable "limping to the finish" run.

### 14. Silent Camp

Unlock:

- Expedition Camp and Oath Renewal unlocked.

Goal:

- Defeat a tier 5 boss.

Restriction:

- Expedition Camp, Camp Research, Route Surveys, and Forge Tempering are paused.
- Completed permanent rewards still apply.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat tier 5 boss | Camp timers +5% faster |
| 2 | Under 6 h | +8% faster |
| 3 | Under 4 h | Expedition rewards +5% |
| 4 | Under 3 h | Auto-start recommended camp timer unlocks |
| 5 | Under 2 h | Silent Efficiency: paused systems bank partial catch-up after challenge completion |

Why it works:

- It is intentionally uncomfortable.
- It proves the player can progress without the camp engine, then rewards that engine.

### 15. Ashen Oath

Unlock:

- First Oath Renewal completed.

Goal:

- Complete a renewed feature's capstone objective.

Restriction:

- The renewed feature is active, but its old supporting bonuses are disabled.
- Example: Route Charter works, but old area-specific route bonuses are disabled.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Complete capstone | Oath Stabilization +5% faster |
| 2 | Under target A | +8% faster |
| 3 | Under target B | Renewed feature starts at higher baseline |
| 4 | Under target C | Old feature summary gains an extra passive |
| 5 | Under target D | Oath Echo: future Oath Renewals keep one extra passive from the old form |

Why it works:

- It tests whether the transformed system can stand on its own.
- The reward makes future feature refreshes more exciting.

### 16. The First Hunt

Unlock:

- Several challenge Level 3 completions or second Legacy Rite branch.

Goal:

- Defeat Elder Bramblemaw, Stonebound Matriarch, and Moonvein Colossus.

Restriction:

- Most permanent bonuses are disabled except Hunter Tenure and completed challenge rewards.
- Gear, blacksmith, class, expedition camp, and resource mastery are disabled.
- Training is allowed.

Completion levels:

| Level | Requirement | Reward |
| --- | --- | --- |
| 1 | Defeat Moonvein Colossus | +5% all challenge rewards |
| 2 | Under 3 h | +8% all challenge rewards |
| 3 | Under 2 h | Challenge attempts start with +1 training choice |
| 4 | Under 90 min | Challenge timer UI shows projected tier |
| 5 | Under 60 min | Trial Memory: completed challenge rewards are 10% stronger outside challenges |

Why it works:

- It is a clean "back to basics" test.
- It is boring, fair, and essential.

## Challenge Reward Summary

| Challenge | Primary Reward Axis |
| --- | --- |
| Bare Hands | Base attack and weapon doctrine |
| No Campfire | Recovery and safety automation |
| Trophy Hunger | Boss trophy value and boss targeting |
| Greenhorn Route | Route Planner and auto-boss thresholds |
| Dull Iron | Blacksmith cost, fuel, and tempering |
| Empty Pockets | Material find and resource mastery |
| One Road | Route compression |
| Broken Clock | Offline/time system strength |
| Oathless | Class XP and doctrine |
| Moonless Hunt | Luck and relic quality |
| Long Watch | Long-run rewards and maturation |
| No Heirlooms | Heirloom core power |
| Three Wounds | Elder hunt rewards |
| Silent Camp | Camp timers and expeditions |
| Ashen Oath | Oath Renewal strength |
| The First Hunt | Global challenge reward scaling |

## UI And Unlock Rules

Challenge screen layout:

- Tabs or bands by chunk: Ember Trials, Iron Oaths, Moon Relics, Elder Writs, Era Trials.
- Each challenge card shows current level, next level requirement, best time, allowed systems, disabled systems, and reward preview.
- Locked challenges show broad requirements, not every hidden number.
- Impossible higher levels can be shown as "Later Power Recommended".

Run setup:

- Starting a challenge opens a confirmation showing the prestige reset.
- Player can choose allowed loadout pieces if the challenge permits heirlooms/classes.
- Challenge run gets a clear banner and exit button.

Timing:

- Timer starts after the challenge prestige reset.
- Offline time counts unless the challenge explicitly disables offline simulation.
- Time tiers use real elapsed challenge run time, not only active focus time.

Completion:

- Completing a higher level automatically grants lower levels.
- Replaying can improve the record and unlock higher levels.
- Rewards are permanent and apply immediately after the challenge ends.

Failure:

- No harsh penalty.
- Player can abandon and return to a fresh normal run.
- Challenge progress records best reached milestone for UI hints, but no partial power unless a specific challenge says so.

## Implementation Notes

Likely state additions:

```ts
type ChallengeLevel = 0 | 1 | 2 | 3 | 4 | 5;

type ChallengeRecord = {
  level: ChallengeLevel;
  bestSeconds?: number;
  completions: number;
};

type ActiveChallenge = {
  challengeId: string;
  startedAt: number;
  allowedSystems: string[];
  disabledSystems: string[];
};
```

Challenge content should be data-driven:

- `id`
- `name`
- `chunk`
- `unlock`
- `goal`
- `restrictions`
- `allowedPersistence`
- `timeTiers`
- `rewardsByLevel`

Core systems should ask a single challenge rules helper:

```text
isSystemEnabled(state, "blacksmith")
getChallengeModifier(state, "bossReadiness")
canPersistThroughChallenge(state, "heirlooms")
```

This keeps challenge logic from spreading through hunt, gear, prestige, and UI code.

## Open Balance Questions

- Should Level 5 rewards be realistic at unlock or deliberately future-facing?
- Should challenge rewards stack additively by level or replace the previous level with a stronger version?
- Should some challenges allow Return to Camp inside the challenge, or should challenge runs always be one expedition?
- Should challenge timer goals use wall-clock time, simulated hunt time, or active play time? Recommended: wall-clock challenge run time, with offline allowed unless disabled.
- Should first completion be mandatory for progression gates, while higher levels are optional optimizations? Recommended: yes.
