# Time-Gated Progression

Time-gated mechanics should act as a quiet safety net and a universal reward layer. They help players who are stuck, inefficient, or not checking the game often, but they also reward strong players because time-based systems stack with good routing and deep runs.

The goal is not to force the player to wait. The goal is to make elapsed time feel valuable.

## Design Principles

- Time gates should be boosts, unlock helpers, or alternative routes, not hard walls.
- The player should never feel punished for missing a day.
- Avoid daily streaks, limited-time chores, and "log in every 8 hours or lose value" design.
- Every time gate should work offline.
- Early time gates should be obvious and friendly; later ones can become strategic.
- Time gates should often improve old systems, making them faster, quieter, or more automatic.

Good time gate:

- "My route survey finished while I was away, so I can push the boss now."

Bad time gate:

- "I know exactly what to do, but the game refuses to let me continue for 6 hours."

## Time Sources

Use several time sources deliberately:

| Time Source | Meaning | Best Uses |
| --- | --- | --- |
| Account Age | Real wall-clock age of the save | Universal tenure rewards and catch-up |
| Time Since Unlock | Real wall-clock time since a system opened | Research, attunement, maturation |
| Time Since Last Return | Real wall-clock time since last check-in | Rested bonuses and banked time |
| Run Age | Time spent in current expedition or legacy run | Long-run bonuses and depth rewards |
| Active Hunt Time | Simulated hunt time | Skill-neutral grind progress |

Pure time-gated mechanics should mostly use Account Age or Time Since Unlock. Run Age is useful for encouraging long runs, but it is not the same as account-based time progression.

## Core Time-Gated Mechanics

### 1. Hunter Tenure

This is the broadest pure time reward.

Fantasy:

- The guild recognizes the hunter's growing tenure.
- Even a struggling hunter gains contacts, favors, better supplies, and institutional memory over time.

Trigger:

- Based on account age from save creation.

Example milestones:

| Account Age | Reward Type | Example Reward |
| --- | --- | --- |
| 30 min | Starter support | Small gold/material bundle |
| 2 h | First field favor | +5% offline bank cap or first rested bonus |
| 8 h | Guild stipend | Daily-independent resource parcel, claimable anytime |
| 24 h | Veteran notes | Permanent +1 starting training level |
| 3 days | Stable supply line | Start each run with basic low-tier materials |
| 7 days | Route patronage | First Return to Camp each run grants bonus Field Notes |
| 14 days | Legacy patron | First Legacy Rite after this gains a small bonus |

Design rules:

- Tenure rewards should be modest but meaningful.
- They should not replace playing well.
- They should make the game feel warmer to people who are slow, idle-heavy, or experimenting badly.

### 2. Rested Resolve

This is the "welcome back, here is momentum" mechanic.

Fantasy:

- The hunter, camp, and gear recover while away.

Trigger:

- Real time since last seen.
- Uses the same spirit as the current offline/banked time system.

Reward:

- A capped temporary boost applied after returning.
- Could increase XP, gold, material find, recovery speed, or boss readiness for the next set of hunts.

Recommended shape:

```text
restedResolve =
  min(restedCap, hoursAway * restedRate)
```

Spend options:

- Automatically improves the next N hunts.
- Or can be spent manually as "Press the Route" to speed up the current route.

Design rule:

- Rested Resolve should stack with banked time, not replace it.
- Banked time changes how fast simulation runs; Rested Resolve changes how rewarding or safe the next segment feels.

### 3. Camp Research

This is the cleanest strategic time gate.

Fantasy:

- The camp studies monster patterns, route maps, gear designs, or old relics.

Trigger:

- Player chooses one research project.
- It completes after real wall-clock time, online or offline.

Example projects:

| Project | Duration | Reward |
| --- | --- | --- |
| Emberfall Survey | 15 min | +10% progress gain in Emberfall |
| Boss Pattern Notes | 45 min | +5% boss readiness against revealed bosses |
| Ironroot Mapping | 2 h | Unlock better route estimates and Ironroot drop targeting |
| Salvage Methods | 4 h | Unlock auto-salvage for low-rarity gear |
| Moonfen Relic Study | 8 h | +1 luck and relic drop preview |
| Charter Drafting | 12 h | Reduces Field Notes cost of next Route Planner upgrade |

Design rules:

- Early projects should be short enough to teach the system.
- Later projects can run for hours.
- Research should not require babysitting.
- Queues can be an upgrade, not a default.

### 4. Route Surveys

This helps weak play directly without handing out raw stats only.

Fantasy:

- Scouts, maps, rumors, and field observations make an area easier to route.

Trigger:

- Select a target area or boss to survey.
- Survey fills over real time.

Rewards:

- Better boss readiness estimate.
- Small boss readiness boost in that area.
- Improved area progress gain.
- Improved drop targeting.
- Unlock "safe route" behavior that farms previous area when survival is too low.

Good use:

- A player stuck on Stonebound Matriarch can start a Matriarch Survey, leave, and come back with enough practical advantage to make progress.

Design rule:

- Surveys should be strongest for the player's current wall and weaker for already-solved old content.

### 5. Forge Tempering

This makes gear upgrades feel bigger without creating constant click pressure.

Fantasy:

- The blacksmith needs time to temper, bind, or stabilize upgraded gear.

Trigger:

- Player starts a temper on a chosen item or heirloom.
- It completes after real time.

Rewards:

- Big stat bump on completion.
- Unlock a new item effect.
- Convert a boss trophy into an heirloom candidate.
- Stabilize an Heirloom Core after Oath Renewal.

Example:

```text
Bramblemaw Cleaver Temper I
Duration: 2 h
Cost: Bramble Hide, Monster Bone
Reward: +18% weapon attack and unlocks auto-salvage for tier 1 weapon drops
```

Design rules:

- Tempering should be chunky and exciting.
- Avoid making the player restart many tiny timers.
- Later upgrades should support queueing or batch tempering.

### 6. Legacy Maturation

This connects pure time to full prestige.

Fantasy:

- Legacy choices settle into the bloodline, guild records, or oath traditions over time.

Trigger:

- A Legacy Spark, Charter, or major prestige upgrade is claimed.
- It matures over real wall-clock time.

Rewards:

- The upgrade starts immediately at partial strength.
- It reaches full strength after time passes.
- Optional milestone pulses can add small bonuses along the way.

Example:

```text
Route Memory
Immediate: previously defeated bosses auto-boss at 95% readiness
After 6 h: threshold improves to 90%
After 24 h: threshold improves to 85% for bosses defeated in prior Legacy Rites
```

Design purpose:

- Full prestige feels great immediately.
- Time still makes the new era stronger.
- Players who take longer between prestiges do not feel left behind.

### 7. Oath Stabilization

This is the time-gated partner to Oath Renewal.

Fantasy:

- A transformed system needs time to stabilize.

Trigger:

- After an Oath Renewal transforms Route Planner, Blacksmith, Training, or another feature.

Rewards:

- The new version is usable immediately.
- Extra layers unlock over time.
- The old version remains compressed, not re-expanded.

Example:

```text
Route Charter Stabilization
Immediate: route summary replaces manual old-area babysitting
After 4 h: route can skip fully solved bosses
After 12 h: route can auto-farm target drops before advancing
```

Design rule:

- Stabilization should feel like the new system warming up, not like the game withholding the thing the player just earned.

## First 100 Hours Placement

| Time | Time-Gated Layer | Purpose |
| --- | --- | --- |
| 0-2 h | Rested Resolve and Hunter Tenure preview | Teach that elapsed time helps |
| 2-6 h | Camp Research | Give stuck players a non-skill route through early walls |
| 6-12 h | Route Surveys | Help with Moonfen and first prestige push |
| 12-30 h | Legacy Maturation | Make first full prestige keep improving after reset |
| 20-45 h | Forge Tempering | Turn blacksmith into chunky timed upgrades |
| 45-80 h | Long-run tenure and class research | Reward players who push deep or play slowly |
| 80-100 h | Oath Stabilization | Make feature refreshes feel powerful over time |

## Interaction With Prestige

Return to Camp:

- Should not reset Hunter Tenure, Camp Research, Forge Tempering, or Legacy Maturation.
- May reset route-specific surveys if they were tied to the current expedition.
- Can grant Field Notes that reduce future research durations.

Legacy Rite:

- Should not reset Account Age or Tenure.
- Should keep completed research.
- Should keep matured legacy effects.
- Can unlock new time-gated tracks like Legacy Maturation or Forge Tempering.
- Can improve time gates through Legacy-gated upgrades.

Oath Renewal:

- Can start an Oath Stabilization timer.
- Should compress old timers where possible.
- Should not force the player to restart every old research track.

## Rewards For Weak And Strong Play

Weak or inefficient play:

- Tenure slowly adds baseline help.
- Research and surveys let the player overcome walls without perfect routing.
- Rested Resolve and banked time make returning feel productive.
- Forge Tempering creates clear power even if the player has not optimized drops.

Strong play:

- Research can be aimed at the next planned wall.
- Long runs get more value from route depth and surveys.
- Timed forge upgrades can be aligned with prestige timing.
- Legacy Maturation makes powerful builds come online faster across runs.

The same systems reward both groups. The difference is that skilled players aim them better.

## UI Rules

Keep time-gated mechanics calm.

Show:

- Current timer.
- What completes next.
- What reward it gives.
- Whether it continues offline.
- Suggested next project when idle.

Avoid:

- Flashing daily chores.
- Multiple tiny timers fighting for attention.
- Punishing missed claim windows.
- Making the player open five panels to restart timers.

Recommended UI:

- One compact "Camp Timers" panel.
- It can contain Research, Survey, Tempering, and Stabilization.
- Completed timers stay complete until claimed; they do not expire.
- Later automation can auto-start recommended projects.

## Implementation Notes

The current game already has useful time infrastructure:

- `createdAt`
- `updatedAt`
- `time.lastSeenAt`
- `time.bankedSeconds`
- `time.lastOfflineSeconds`
- `hunt.activeSeconds`

Likely additions:

- Account age derived from `now - createdAt`.
- `time.restedResolve`.
- `research.projects`.
- `surveys.active`.
- `forge.tempering`.
- `legacy.maturation`.
- A shared timer resolver so all timed systems use the same offline-safe logic.

All timed systems should resolve from timestamps, not frame ticks, so save/load and offline progress stay reliable.
