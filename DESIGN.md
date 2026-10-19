# Pokémon Bowl — Design Doc

A retro-style American football **browser** game where every player on the field is a
Pokémon. We keep Retro Bowl's look, feel, and single-player control model, and adapt
the controls and meta-structure for the browser + Pokémon theme.

This is a living document. Update it as decisions are made.

---

## Base Game: Retro Bowl (what we're keeping)

- Retro pixel-art, top-down, American football field
- **One-player control model**: you control the ball carrier; AI controls all
  other players. **Our adaptation (decided)**: the user plays **offense only** —
  the defense is always AI (shown, never player-controlled), and opponent
  possessions are simulated (fast-forwarded with a random outcome).
- Full football rules: 4 downs to gain 10 yards, first-down markers, field goals,
  game clock + play clock, scoring (TD / PAT / FG / safety)
- Retro Bowl is mobile-first (drag to run, drag+release to-throw). We are
  **browser-first**, so the control scheme changes (see below).

---

## Our Changes

### 1. Pokémon instead of people
- Every player on the field is a Pokémon; we render Pokémon sprites, not human
  pixel-art athletes.
- **Decided**: real sprites from the **PokeAPI sprites mirror** (classic 96×96
  PNGs, small files, retro look), preloaded at boot; a team-colored square
  remains as a fallback if a texture fails to load.
- Each Pokémon maps to a football **position** (see 7v7 lineup below).
- **Stat mapping**: resolved — 5 user-facing stats → internal stats, implemented
  (see "Stat system" below). `teams.ts` currently holds dummy values the user
  will remap.
- **Decided**: Pokémon **types are cosmetic for now** (flavor only). We can add
  gameplay effects later as a balance layer.
- **Open**: sprite source + licensing (PokeAPI / Bulbapedia sprites are common for
  personal projects; confirm scope).

### 2. Browser controls (replacing mobile drag)
Retro Bowl's drag-to-run / drag-release-to-throw does not map to a browser.

- **Move**: `WASD` or Arrow keys — move the active player
- **Pass (offense)**: `Space` at the snap → QB dropback → hold `Space` → targeting
  reticle (starts on your best look downfield) → steer → release to throw; `X`
  cancels. The ball flies to a FIXED landing point = aim + Gaussian error; the
  reticle ring is that error (QB accuracy, throw distance, pressure), and the
  receiver can adjust to anything inside his catch reach (WR Catching). See
  "Passing model" below.
- **Run (offense)** (implemented, playtest #2 ask): `R` at the snap = handoff to
  the RB, control him immediately. Juke/sprint/dive unchanged.
- **Scramble** (kept at user's request): `R` during the dropback = QB keeps the
  ball and runs it himself. (So `R` is "run it" in both offensive phases —
  handoff before the snap, scramble after.)
- **Pre-snap play preview** (implemented): each receiver's route is drawn on the
  field as a line (start → waypoints, dot at the end) during the pre-snap phase.
- **Pause**: `ESC` in a match → pause menu (Resume / Forfeit — see "Campaign & menus").
- **Defense**: not player-controlled (offense-only, see Match structure).
- **Isolate controls**: all key bindings live in one `Input` module / config map
  (`bindings.ts`) so the scheme can be swapped later (e.g. to mouse-click or
  hold-to-charge) without touching game logic.

### 3. Campaign structure (replacing Retro Bowl's league / season / draft)
Instead of a 32-team league with a draft and season standings, we start with a
**4-team campaign / gauntlet**:

- **4 pre-defined teams**, each with a fixed roster. **No draft** (may add later).
- **7 on 7, no bench**: each team fields exactly 7 Pokémon; there is no bench.
- **3 regular teams**: you **choose the order** you face them. Beat one → **take 1
  Pokémon** from their roster (your pick).
- **1 champion team** (the 4th): the boss / finale.
- **Flow**: beat all 3 regular teams (any order) → champion unlocks → beat the
  champion to win the game.
- **Losing a match = game over** (decided). No retries.

#### Roguelike meta (playtest #2 — not building yet, recording intent)
- The loop is meant to **feel roguelike**: lose → start over; win → keep the
  poached Pokémon and progress. Getting stronger by collecting players from
  beaten opponents is the core progression.
- **Champion is challengeable at any time** (not locked behind the 3 regulars)
  — but it should be *effectively impossible* without a strengthened roster,
  so **stats must meaningfully affect match outcomes** (hence the stat system
  below is a prerequisite, not polish).
- Difficulty ramps over time: more opponents, stronger ones, added over iterations
  (3 regulars + boss for now).
- Champion is **always on the menu** with a warning label (decided — see
  "Decisions (locked)").
- **Poached Pokémon keep their original stats** (decided).
- **Poach rule = swap** (decided): take 1 from the beaten team, drop 1 of your own
  to stay at 7. *(With the 14-per-team change, poaching is assumed to happen on the
  **offense** roster — the only side the user plays. Flag if you'd rather poach
  from anywhere.)*
- **Strategy layer**: you get *stronger* as you poach, so match order matters —
  face weaker teams first to build up before the tough ones.

#### 7v7 lineup (locked)
- Each team carries **14 Pokémon**: 7 offense + 7 defense (separate rosters —
  **decided**, correcting the earlier "same 7 both ways").
- **Offense (7)**: QB, 2× OL, RB, 2× WR, TE
- **Defense (7)**: 2× DL, 2× LB, 2× CB, S

### Match structure (locked for the MVP)
- A match is **2 halves × 2 minutes** of game clock (clock runs only while the
  ball is live).
- Scoring: **touchdown = 7** (no PAT in the MVP). The user never kicks field
  goals; the opponent simulation can score FGs (3).
- **User plays offense only.** Turnovers and TDs hand the ball to a
  *simulated* opponent drive: a random outcome (TD / FG / punt / turnover) that
  also consumes 10–30s of clock. Then the user gets a fresh drive at the own 25
  (prototype: every possession starts there — no kickoff placement yet).
- Halftime shows the score; after the second half the match ends and hands
  off to the Result screen, which routes automatically (see "Campaign & menus").
- Losing a match = game over **in campaign play** (decided; still no campaign
  screens yet — the MVP runs a single fixed matchup).

---

## Campaign & menus (implemented after playtest #4)

The user's call after playtest #4: the gameplay core is **"fun enough it is clear
it will work"** — gameplay tuning was **paused** while the campaign shell was built.
That shell is now in. The full loop is playable:

```
Title → Opponent Select → Match ⇄ Pause → Result → Poach → Opponent Select → …
                                           ↘ Game Over (loss / forfeit / all consumed)
                                           ↘ Victory (champion beaten)
```

### Screens (final set — no quick-match, no dedicated roster viewer)
1. **Title** (`TitleScene`) — bobbing title, your starting offense lined up as a
   bobbing sprite row. **Continue Run** (only when a saved run exists — shows the
   record + poach count; picks up a pending poach first if you closed the game
   right after a win), **New Run** (confirm dialog if it would erase a save),
   and **How to Play** (H) — a full-screen controls/goals reference. A red
   notice appears here if a saved match was left unfinished and counted as a
   forfeit.
2. **Opponent Select** (`OpponentSelectScene`) — a **scouting report per team**:
   team-color band + name, status (READY / DEFEATED / LOST / TIED — GONE /
   NEARLY IMPOSSIBLE), the defense as a sprite strip, **DEF rating** (mean of
   the seven defenders' overall), and **OPP SPEED +N** (difficulty ramp). Click a
   card or press its number key (1–4). Faced teams dim out. Footer: your team's
   record + both roster strips with OVR, and **Save & Quit** (returns to the
   title; the run is kept).
3. **Match** (`GameScene`) — the existing match, driven by a `MatchConfig`
   (teams + difficulty bonus) passed via scene `init()`. **ESC = pause** (see
   below); starting a match is recorded in the run (`startMatch`) so closing the
   tab mid-match is detectable.
4. **Pause** (`PauseScene`, new) — launched on top of the frozen match with its
   own (un-zoomed) camera: **Resume** and **Forfeit Match**. Forfeiting counts
   as a loss and ends the run, so it sits behind a `ConfirmDialog`. ESC / ENTER
   resume; keys are reset on resume so nothing stays "held".
5. **Result** (`ResultScene`) — a scoreboard panel: each side's color bar, name,
   and big score (the winner's score in gold); verdict header colored green/red/
   gray; a one-line note; one button that auto-routes (win → Poach, loss → Game
   Over, champion win → Victory, else back to select) — ENTER/SPACE too.
6. **Poach** (`PoachScene`) — pick a side (offense/defense toggle buttons), click
   one Pokémon from the beaten team ("TAKE ONE") and one of your own ("DROP
   ONE"). The center compare panel is always visible: a hint until both are
   picked, then the swap preview (per-stat deltas + net upgrade/downgrade),
   confirm with ENTER (or skip). ESC clears the selection. The team is consumed
   either way.
7. **Game Over** (`GameOverScene`) — reason (loss / forfeit / run ended), a
   **run recap panel** (match results + poaches) and your final roster as two
   sprite strips. **New Run** goes straight to the opponent hub; **Main Menu**.
8. **Victory** (`VictoryScene`) — champion beaten; same recap + the championship
   roster, this one bobbing in celebration.

### Loading
`BootScene` shows the title plus a loading bar + percentage while it preloads
the 70 roster sprites; a sprite that fails to load just falls back to a gray
square.

### Rules (decided with the user)
- **Poach once per team, from the team you just beat** (not from any beaten team);
  takes from **either** offense or defense — the taken Pokémon fills the dropped
  slot's position; skip is allowed. Champion gives **no** poach (victory screen only).
- **Tie** = the team is **consumed**: no poach, no replay, run continues if other
  teams are available. All teams consumed without a champion win → Game Over.
- **Difficulty ramp** (`config/campaign.ts`): +10 px/s per regular team beaten
  (`DIFFICULTY_PER_WIN`), +30 flat for the champion (`CHAMPION_DIFFICULTY_BONUS`).
  Applied to the *defense* sprites via a per-instance bonus in `PlayerSprite`.
- **Persistence** (implemented): the whole run is saved to `localStorage` after
  every change (key `pokemon-bowl:run`) and restored on load. The save format is
  pure, versioned, and fully validated (`core/runSave.ts`) — corrupt or outdated
  saves are silently ignored. If the game is closed **mid-match**, the saved
  `matchInProgress` flag means it is treated as a **forfeit (loss, run over)** —
  keeps "no retries" honest; `ABANDONED_MATCH_ENDS_RUN` in `config/campaign.ts`
  flips it to forgiving if ever desired. If the game is closed **after a win but
  before the poach**, `pendingPoach` keeps the reward and Continue Run resumes
  at the poach screen. If storage is unavailable (private mode etc.) the game
  plays on without saving.
- **Stats display**: 5-stat lines on every poach card + the compare panel; roster
  names on the hub cards. No dedicated roster screen.

### Supporting structure
- `core/campaign.ts` (pure, 27 tests): run state machine — results, poaches,
  difficulty, game-over/victory transitions, plus `startMatch` /
  `abandonMatch` / `skipPoach` / `isResumable` and the `matchInProgress` /
  `pendingPoach` fields for save/continue.
- `core/runSave.ts` (pure, 3 tests): versioned save format + validating parse.
- `core/poach.ts` (pure, 6 tests): stat comparison for the poach UI, plus
  `overall` / `averageOverall` (the DEF-rating / OVR numbers shown on screens).
- `state/runStore.ts`: module singleton the scenes read/write + the localStorage
  save/restore, `hasSavedRun`, and the one-time load notice (`takeNotice`).
- Scene data passes via typed `init(data)` overrides (the Phaser 3.90 d.ts doesn't
  expose `scene.getData()`).

---

## Visuals & UI system (the UI polish pass)

All menus and the HUD share one look-and-feel layer, so screens stay small and
consistent (and a font or palette change is one file):

- **Font**: **Press Start 2P**, self-hosted via `@fontsource/press-start-2p`
  (OFL-licensed, bundled by Vite, works offline). `main.ts` waits for
  `document.fonts.load` before creating the Phaser game (Phaser bakes text into
  canvas textures, so the font must exist before any text is made); on failure it
  starts anyway and the stack falls back to monospace. `pixelSize()` in
  `ui/theme.ts` snaps sizes to the font's 8-px grid so text stays crisp.
- **`ui/theme.ts`** — the single source for font face, text colors
  (GOLD/WHITE/RED/GREEN/GRAY/DIM), shape fills/borders (`FILL`), fade duration,
  and `textStyle()` (used by every screen, the HUD, the field, and player labels).
- **`ui/menu.ts`** — shared widgets: `menuBackground` (dark backdrop with faint
  mowing stripes + fade-in), `fadeTo` (fade-out → start scene; safe to call
  early, ignores repeats), `MenuButton` (primary / `secondary` / `danger`
  looks, hover highlight, hand cursor, optional **hotkeys** with auto-repeat
  guarded, `setActive` for toggles, `setEnabled`), `panel`, `label`,
  `pokemonImage` (sprite or gray-square fallback), `rosterStrip` (a row of
  sprites, optionally bobbing in a staggered wave), and `runSummaryPanel`
  (the end-of-run recap box).
- **`ui/ConfirmDialog.ts`** — modal "are you sure?" box over a click-swallowing
  dim, with a red confirm + a safe cancel. Used for the two destructive actions:
  forfeiting a match and erasing a saved run.
- **`ui/PokemonCard.ts`** — the poach-screen roster entry (sprite, name, slot,
  stat line) with hover + selected states.
- **Screen flow polish**: every menu transition is a short fade (`FADE_MS` =
  180 ms); primary actions have keyboard hotkeys (ENTER/SPACE to continue,
  1–4 to pick an opponent, H for help).

### The HUD score bug — root cause and fix

**Symptom**: after the 1.2 camera zoom went in, the score/clock HUD was not
visible during matches.

**Root cause**: a `scrollFactor(0)` object is *still scaled by camera zoom about
the camera's center* — it stops following the world, but it does not stop being
zoomed. At zoom 1.2 the whole HUD (positioned in raw screen coordinates) ended
up outside the frame.

**Fix** (`pin()` in `ui/Hud.ts`): pin an object to a fixed *screen* point by
placing it at the world point the zoom maps back onto that screen point
(`center + (screen − center)/zoom`) and shrinking it by `1/zoom` so it draws at
its natural size. The HUD is now genuinely screen-fixed at any zoom. New layout:
center-anchored match line (score · clock) + down/distance line in the top bar,
"ESC: PAUSE" in the corner, and the controls hint on a dark strip along the
bottom edge (readable over the grass).

---

## Stat system (implemented — weights are tunable)

**Two layers** (as the user suggested: user-facing stats we can reskin, internal
stats the game actually reads):

### User-facing (1–99; user maps Pokémon → these; `teams.ts` holds DUMMY values the user will remap)
- **Speed**, **Strength**, **Throwing**, **Awareness**, **Coordination**

### Internal (what systems read; any Pokémon can play any position)
| Internal stat | Drives | Roughly derived from |
|---|---|---|
| `speed` | movement (all positions) | Speed |
| `throwPower` | max throw distance / ball speed | Throwing |
| `throwAccuracy` | landing spread of a throw (the reticle ring) | Throwing + Coordination |
| `catching` | catch reach (how far off-target a ball he can adjust to) + contested catch | Coordination |
| `blocking` | OL push, RB/WR run blocking, pass protection | Strength (+ a bit of Speed) |
| `tackling` | tackle chance vs carrier | Strength (+ a bit of Awareness) |
| `avoidance` | dodging tackles (juke/dive success) | Coordination + Speed |
| `awareness` | **defensive AI quality** — reaction speed, read timing, coverage placement | Awareness |

### What each position actually uses
- **QB**: throwPower, throwAccuracy
- **OL**: blocking (speed for run plays)
- **DL**: speed (get-through), tackling, awareness (run reads)
- **RB**: speed, avoidance, blocking
- **WR/TE**: speed, catching, avoidance, (minor) blocking
- **LB/CB/S**: speed, awareness, tackling

Any Pokémon can line up anywhere; the position just determines which internal
stats matter. `core/pokemon.ts` has `deriveStats(userStats) → InternalStats`
(pure, unit-tested). Wiring in:

- `speed` → base movement (`speedStatToPxPerSec = 120 + speed + difficultyBonus`)
- `throwPower` → ball speed while in flight (0.75×–1.25× of BALL_SPEED)
- `throwAccuracy` → overthrow roll before the throw (`core/resolvers/throw.ts`)
- `catching` → shrinks contested radius + raises contested-catch chance (`resolveCatch`)
- `blocking` → per-OL block reach (0.6×–1.4× of BLOCK_RADIUS), pass rush and runs
- `tackling` vs `avoidance` → tackle/sack attempt rolls (`core/resolvers/tackle.ts`);
  one attempt per defender per cooldown; juke windows stay un-tackleable
- `awareness` → defense AI quality: blitz delay (earlier) and cover cushion (tighter)

**Open**: whether user-facing stats get a roster-screen display (no such UI yet).

### Passing model (replaced the hidden completion roll)
Nothing is rolled at release except the throw's landing error. Both QB and WR stats are
visible on the reticle, so a miss is something you can see coming.

- **Landing point** = aim point + Gaussian error, `sigma = (27 - 17*acc/99) * sqrt(dist/190) * (1 + 0.6*pressure)` px
  (`landingSigma`). Ring drawn at 1.51 sigma = where ~2 of 3 throws land. Deep throws and a
  rusher inside `PRESSURE_RADIUS` widen it. Error is capped at 3 sigma.
- **Catch reach** = `20 + 36*catching/99` px (`catchReach`). A receiver within his own reach of
  the landing point adjusts to it and gets the existing contested-catch roll (`resolveCatch`).
  Great hands rescue an inaccurate QB (QB acc 20 + WR 90 completes about as often as QB 68 + WR 30).
- **Ball flight**: straight to the landing point, no homing (`BallInAirPhase`). A ball that
  reaches no receiver can be picked off by a defender within `LOOSE_BALL_INTERCEPT_RADIUS`
  (25%), else incomplete with a note from where it landed (Overthrown! / Short! / Wide!).
- **Aim assist**: within `RETICLE_LOCK_RADIUS` of a receiver's *meeting point* the aim is pulled
  toward it (`aimAssist`, up to `AIM_ASSIST_MAX`, `1 - t^2` falloff so there's no pop at the
  edge). The meeting point is `solveIntercept`: iterates flight time vs. receiver position, so
  a ball thrown to it lands within ~1 px of the receiver.
- **Reticle readout** = the real completion chance: P(land within reach) (`chanceWithinReach`,
  numerically integrated) x P(catch) (`catchOdds`, using defenders' current distance to the
  meeting point). Green >= 70%, amber >= 45%, red below. Open field = gray SPOT throw.
- **Controls**: reticle starts on the deepest open receiver (else least covered), so a quick
  press is a real throw. `X` cancels. Space held through the snap only starts aiming after
  `SNAP_HOLD_GRACE`; a tap-to-snap no longer throws the ball at your feet.

### Pace & difficulty (playtest #2 decisions)
- Base movement slowed: old `150 + speed` (real Pokédex scale) → new
  `120 + internal speed` on the 0–99 scale (~30% slower overall).
- Reticle speed left alone (user said it felt right).
- **Speed is the difficulty lever**: `speedStatToPxPerSec(speed, difficultyBonus)`
  takes a bonus; `DIFFICULTY_SPEED_BONUS` in `config/gameplay.ts` is the knob for
  ramping opponents (and the boss) faster. Currently 0.
- Playtest #3: the current pace feels good.

### Running the ball: stamina & catch lag (playtest #3)
After a catch it was almost always a TD — the receiver arrived at full speed and the
defense couldn't recover. Two fixes, both in `RunPhase` + config:
- **Catch lag**: 0.5 s at 55% of base speed after a catch (the receiver breaks
  stride), giving converging defenders a window.
- **Carrier stamina**: drains while carrying (`STAMINA_DRAIN` ~7 s to empty, sprint
  drains 2×); speed floor is 70% of base (`STAMINA_MIN_FACTOR`). Tired carriers get
  caught — applies to run plays and scrambles too.
- Known: running still feels *a little* too easy overall; user has a tuning note
  coming. Levers: `TACKLE_ATTEMPT_COOLDOWN`, tackle roll bounds, stamina drain,
  `PURSUIT_SPEED_FACTOR`.

### Animation (procedural)
Sprites are single-frame PNGs (PokeAPI has no animation data and Phaser won't
animate GIF textures), so all "animation" is procedural, on the body object inside
each player's Container (game position is never touched):
- **Walk-bob**: gentle sine bob on any player who is moving (`PlayerSprite.update`)
- **Juke**: 360° spin (user request — playtest #4: "looks great")
- **Tackle / sack**: carrier white-flash + spin; the defender who made the play hops
  (user: still needs work — open, no specifics yet)
- **Catch**: receiver **jumps** (hop) for the ball; interception: the picking-off defender flashes
- **Touchdown**: offense pulses in a staggered ripple

### 2.5D pass arc (playtest #4)
A real perspective tilt was rejected: Phaser's perspective camera distorts every
object (sprites, text, ball) while all game math stays top-down — high risk, weird
results. Instead the pass is *drawn* as an arc (classic 2.5D), zero logic change:
- `Ball` separates the **ground position** (game logic: targeting, catching, camera)
  from the **drawn shape**: while flying, the shape is offset up by
  `sin(π·t)·arcHeight` and scaled up 1→1.5; a ground shadow shrinks and fades in.
- Flight progress `t` = distance-traveled / distance-at-release; arc height scales
  with throw distance (`BALL_ARC_BASE` + `BALL_ARC_PER_PX·dist`, capped at
  `BALL_ARC_MAX`) so deep throws visibly lob higher.
- The camera follows an invisible ground-level tracker, not the lifted ball shape.

### Camera zoom (playtest #4)
`CAMERA_ZOOM = 1.2` (config) — closer view = more control feel, and less empty
field behind the offense. The camera follows the ball and clamps to world bounds,
so the play never leaves the frame (this replaces the "dynamic zoom-out near the
edge" idea; revisit if it ever feels cramped). Note: `scrollFactor(0)` HUD objects
also scale with camera zoom — the HUD is ~20% larger; a separate HUD scene is the
clean fix if that ever bothers us.

### Play design: the RB runs routes
The RB is not a statue on pass plays: it runs a slot route out of the backfield and
is a valid throw target (receiver slot 3, deliberately uncovered — the LB shadows the
TE). Handoff plays still use the RB as the carrier. Future option: a formation
variant where the RB stays in and blocks instead.

---

## Open Questions

### Meta / campaign
- [x] **Poach source**: either roster (offense or defense) — decided.
- [x] **Meta depth**: poach only, no training/leveling (kept light — decided).
- [x] **Champion reward**: none — victory screen only (decided).
- [x] **Persistence upgrade**: done — `localStorage` save/restore with an
      abandoned-match rule (see "Campaign & menus").
- [ ] **Sprite licensing**: PokeAPI sprites are fine for personal projects; confirm
      acceptable for whatever distribution you have in mind.
- [ ] **Delete `claude/`?** Nothing depends on it.

### Gameplay (deferred — paused while we build menus; revisit in this rough order)
- [ ] **Catch radius logic** — user: "we need to update the catch radius logic a
      bit" (symptom TBD: too many drops? catches? zone in the wrong place?)
- [ ] **"Running a little too easy"** — user has a note coming. Levers:
      `TACKLE_ATTEMPT_COOLDOWN`, tackle roll bounds, stamina drain,
      `PURSUIT_SPEED_FACTOR`
- [ ] **Tackle feel** — "we still need to work on tackle, but not sure what"
- [ ] **Stat mapping weights** — confirm/adjust the `deriveStats` table (user:
      "adjust as we go")
- [ ] **Stat values** — user remaps Pokémon → 5-stat values in `teams.ts`
      (currently placeholders)
- [ ] **RB blocking option** — formation variant where the RB stays in and blocks
- [ ] **Player size / clutter** — re-check now that sprites + shadows + route
      lines + zoom are all in

## Decisions (locked)

- [x] **Meta structure**: 4-team campaign/gauntlet (3 regular + 1 champion), no draft
- [x] **Pokémon types**: cosmetic for now
- [x] **Rosters**: pre-defined / fixed (no draft)
- [x] **Roster size**: 7 on 7, no bench; **14 Pokémon per team** (7 offense +
      7 defense, separate rosters)
- [x] **Playable side**: user plays offense only; defense is shown but always
      simulated (opponent possessions fast-forwarded)
- [x] **Match length**: 2 halves × 2 minutes; touchdown = 7; no PAT/FG for the user
- [x] **Sprites**: official Pokémon sprites via the PokeAPI mirror (96×96 classic),
      preloaded at boot; square fallback if a load fails
- [x] **Losing a match**: game over (no retries)
- [x] **Poached Pokémon**: keep their original stats
- [x] **Poach rule**: swap — take 1 from beaten team, drop 1 of your own (stay at 7)
- [x] **Champion availability**: challengeable at **any time** (playtest #2) —
      meant to be effectively impossible without a strengthened roster; beating
      the 3 regulars is the sane path (supersedes the earlier "unlock after 3" idea)
- [x] **Control scheme (throw)**: button + aim reticle; bindings isolated in `Input`
- [x] **Tech stack**: TypeScript + Vite + Phaser 3
- [x] **Game framework**: Phaser 3 (no physics engine — own movement + collision)
- [x] **Stat mapping**: 5 user-facing stats → internal stats (implemented, see above)
- [x] **Pass arc**: 2.5D drawn parabola (ball rises/scales, ground shadow) + the
      receiver jumps at the catch — real perspective tilt rejected (distorts
      everything; too risky)
- [x] **Camera**: `CAMERA_ZOOM = 1.2`, follows a ground-level ball tracker,
      bounds-clamped (play never leaves the frame; dynamic zoom-out skipped)
- [x] **Build order (playtest #4)**: gameplay core paused — proven fun enough;
      **menus & overall game flow next** (done — see "Campaign & menus")
- [x] **Screen set**: Title / Opponent Select / Match / Result / Poach / Game Over /
      Victory. No quick-match mode, no dedicated roster viewer (this pass)
- [x] **Poach**: once per beaten team, from the team just beaten, either
      offense or defense, swap (taken fills dropped slot's position), skippable;
      champion gives no poach
- [x] **Tie**: team consumed — no poach, no replay, run continues if teams remain
- [x] **ESC in a match**: opens the **pause menu** (Resume / Forfeit); forfeit
      = loss = game over and sits behind a confirmation dialog
- [x] **Difficulty ramp**: +10 px/s per regular win, +30 flat for the champion
      (`config/campaign.ts`)
- [x] **Persistence**: the run is saved to `localStorage` and restored on load;
      a match left unfinished is counted as a forfeit (`ABANDONED_MATCH_ENDS_RUN`)
- [x] **UI system**: self-hosted Press Start 2P pixel font + `ui/theme.ts`
      (colors/sizes) + `ui/menu.ts` widgets + `ConfirmDialog`; all menus and the
      HUD built from it (see "Visuals & UI system")

---

## Tech Stack (locked)

- **TypeScript + Vite** — fast dev loop, type safety for a project this size
- **Phaser 3** — rendering, sprites/animation, camera, scenes (menu/game/reward),
  keyboard + mouse input, crisp pixel-art scaling. Stable, MIT-licensed.
- **No Phaser physics** — we use Phaser for rendering/input/scenes/camera and do
  our own movement + collision logic (Retro Bowl's movement is custom anyway).

### Architecture (reusing the proven `claude/` sample patterns)
- **`core/` never imports Phaser** — pure, unit-tested rules (downs, scoring,
  resolvers, stat mapping, team/roster data).
- **`gameplay/`** is Phaser-aware — scenes, field rendering, player sprites,
  controls, phase machine, AI, ball.
- **Phase state machine**: `preSnap → pass → (ballInAir →) run → postPlay →
  (preSnap | simDrive | halfEnd | matchOver)`.
- **Units conversion**: yards ↔ pixels (32 px = 1 yard).
- **Isolated bindings**: all key names in one `bindings.ts` map.
- **Discriminated unions** for play state; string-literal types for Position/species.
- **`config/`** holds all tuning numbers (field geometry, gameplay constants).

---

## Phases (build order + status)

1. **Core play (MVP)** — ✅ done (playtest #4: "fun enough it is clear it will work")
2. **Full rules** — mostly done (downs, clock, halves, scoring, simulated opponent
   drives). Remaining: play clock, user field goals, safety
3. **Campaign / menus** — ✅ done, including the UI polish pass (see "Campaign
   & menus" + "Visuals & UI system"); awaiting playtest #5
4. **Pokémon layer** — sprites ✅, stat mapping ✅ (values are dummies the user
   will remap); type effects not started (cosmetic-only decision stands)
5. **Polish** — procedural animations ✅ (bob/spin/flash/hop/pulse), 2.5D pass arc
   ✅, camera zoom ✅, HUD zoom fix ✅, pause menu ✅, save/continue ✅, full UI/
   visual system ✅; remaining: sound, game feel
