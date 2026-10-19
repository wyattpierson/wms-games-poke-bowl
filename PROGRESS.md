# Pokémon Bowl — PROGRESS / HANDOFF

## DONE (awaiting playtest): passing overhaul — accuracy is physical, WR hands matter

Problem: throws felt inaccurate and clunky. Causes found: the ball homed to the receiver and the
reticle only fed a hidden dice roll (locked throws), while spot throws ignored QB stats entirely;
the reticle % ignored the catch roll and defenders; `missNote` never reached the screen
(`PlaySession` dropped it, so a miss read "Incomplete: Incomplete") and compared against the
receiver's current position instead of where the ball landed; and a tap on Space to snap also
fired as a throw at the QB's feet on key-up.

What changed (see DESIGN.md "Passing model" for the formulas):
- Ball flies to a fixed point = aim + QB throwing error. Ring on the reticle = that error.
- Receiver catch reach scales with Catching (WR skill compensates for QB inaccuracy).
- Aim assist toward the receiver's solved meeting point (replaces the all-or-nothing lock).
- Reticle shows true completion odds (landing x catch roll vs. nearby defenders), colour-coded.
- Reticle starts on the best open look; `X` cancels; tap-to-snap no longer throws.
- Pressure (rusher near QB) widens the ring. Deep throws are less accurate.
- Honest miss notes: Overthrown! / Short! / Wide!, from where the ball actually landed.

Files: `config/gameplay.ts` (new throw constants, old completion constants removed),
`core/resolvers/throw.ts` (rewritten) + `throw.test.ts` (rewritten, 34 tests),
`core/resolvers/catch.ts` (+`catchOdds`, `resolveCatch` now rolls against it) + tests,
`gameplay/phases/PassPhase.ts` + `BallInAirPhase.ts` (rewritten), `Phase.ts` (`ballInAir` request is
now `{ landing, intended }`; `PassTarget` removed), `PlaySession.ts` (wiring), `controls/bindings.ts` (+`cancel`).

Tuning knobs (all in `config/gameplay.ts`): `DISPERSION_BASE_PX`, `DISPERSION_ACCURACY_PX`,
`DISPERSION_DISTANCE_EXPONENT`, `PRESSURE_DISPERSION_BOOST`, `CATCH_REACH_MIN/MAX`, `AIM_ASSIST_MAX`,
`RETICLE_LOCK_RADIUS`. Not yet playtested in a browser; typecheck, build and 127 tests pass.

---

## DONE (awaiting playtest #6 feedback): passing-game fixes (3 items)

| # | Item | Status |
|---|------|--------|
| 1 | WRs sometimes stopped mid-route (stranded at the first waypoint) | ✅ root cause: `followRoute` only advanced waypoints on EXACT float equality, but `moveToward` stops ~0.5 px short — now advances within 2 px |
| 2 | Overthrown vs Short was a coin flip (`Math.random() < 0.5`) | ✅ now deterministic from aim: reticle projected past the receiver (downfield) = **Overthrown!**, short of them = **Short!** |
| 3 | Reticle looked like "throw where the WR is" but the ball homes to where they're going | ✅ **lead targeting**: reticle locks/scores against the receiver's *predicted* position when the ball arrives (flight time = distance ÷ QB ball speed, projected along remaining route); ghost reticle + arrow show the lead; % rewards aiming at the ghost |

**Design decisions (locked unless user objects):**
- Lock radius (64 px) and aim quality are now judged against the PREDICTED point, not
  the receiver's current position — leading the receiver is now the actual skill.
  A receiver standing still at the end of their route predicts to their own position,
  so slants/curls still lock the same way.
- Prediction is a pure helper (`predictAlongRoute` in `core/math/vec2.ts`, unit-tested);
  `PlayerSprite.predictPosition(seconds)` wraps it with the route speed.
- `missNote` travels on the `ballInAir` PhaseRequest so the note is decided at release,
  not at arrival.

**Files changed:**
- `core/math/vec2.ts` + `vec2.test.ts` (new, 8 tests) — `predictAlongRoute`
- `gameplay/entities/PlayerSprite.ts` — route-advance threshold fix; `predictPosition()`
- `gameplay/phases/PassPhase.ts` — predicted-point lock + quality, ghost reticle +
  lead arrow rendering, `missNote()` (over/short by aim direction), hint text
- `gameplay/phases/Phase.ts` — `missNote?: string` on the `ballInAir` request
- `gameplay/phases/BallInAirPhase.ts` — uses `missNote` (was `Math.random()` coin flip)

**Verification:** `tsc --noEmit` ✓, `vitest run` ✓ (**97 tests**, was 90). Playtest:
`npm run dev` → watch WRs run full multi-leg routes; aim at the ghost ring; check
Overthrown/Short matches where you aimed.

---

## DONE (awaiting playtest #5 feedback): playtest #5 feedback pass (4 items)

| # | Item | Status |
|---|------|--------|
| 1 | More offensive plays, randomly picked per down | ✅ 8 named plays in `data/playbook.ts`; `PlaySession.rollNewPlay()` re-rolls every down; name shown pre-snap in the HUD |
| 2 | Defense: man/zone schemes, WRs actually get open (or stay covered), open/covered visual, contested catches can fail/INT | ✅ see files below |
| 3 | Aim: ball goes where the reticle is (no magical nearest-WR fallback); QB accuracy × aim quality = completion %, shown on reticle; spot throws only catchable if a WR is actually there (INT risk) | ✅ see files below |
| 4 | Game length: 60 s halves + shorter dead time | ✅ `HALF_SECONDS = 60`; dead time trimmed |

**Verification:** `typecheck` ✓, `build` ✓, `test` ✓ (**90 tests**, was 73 — new:
coverage 9, throw 4, catch double-coverage cases). **NOT yet browser-verified** —
needs a playtest (`npm run dev`, `?match=tidal-wave` for quick entry).

**Files changed/added in this pass:**
- `config/gameplay.ts` — all new tuning knobs (coverage, separation, catch tuning
  fields, spot-throw radii, throw completion bounds, 60 s halves, shorter delays)
- `core/ai/coverage.ts` (new) + tests — scheme roll, man matchup roll, plan roll
- `core/resolvers/catch.ts` + tests — `resolveCatch(defenderDistances[], ...)`:
  clean / contested (1 defender) / double-covered (2+)
- `core/resolvers/throw.ts` + tests (new) — `aimQuality`, `completionChance`,
  `throwCompletes` (replaces `throwComesUp`; old throw tests moved out of tackle.test.ts)
- `data/playbook.ts` — 8 named route combos, `pickPlayDef`, `buildPlayWith`; `Play.name`
  is now the route-combo name (was the matchup string; unused elsewhere)
- `gameplay/PlaySession.ts` — `coverage: CoveragePlan` (rolled in `lineUp()`),
  `zoneHome` set on every defender at alignment, `updateSeparationIndicators()`
  (green/red rings, live, during pass + ballInAir), incomplete messages show why
- `gameplay/defenseBehavior.ts` — man: beaten → slow chase (0.65×), won → 24 px
  cushion; zone: hold `zoneHome`, respond within 110 px; blitzers drop back in zone mode
- `gameplay/entities/PlayerSprite.ts` — `setOpenIndicator('open'|'covered'|null)`
- `gameplay/phases/Phase.ts` — `PassTarget` (receiver | spot), `ballInAir` request
  carries `completes`
- `gameplay/phases/PassPhase.ts` — reticle: locked = green ring + completion %
  text + QB→reticle aim line; unlocked = gray + "SPOT"; **no fallback throw**;
  locked throws roll `completionChance(acc × aim)` at release
- `gameplay/phases/BallInAirPhase.ts` — receiver target (homing) vs spot target
  (fixed X marker); spot resolution: receiver within 40 px → contested-catch rules;
  defender within 40 px → 25% INT / bat down; else "No receiver there!"
- `gameplay/phases/PreSnapPhase.ts` — HUD hint: `PLAY: <name>  DEF: MAN|ZONE`
- `types/play.ts` — `incomplete` gained optional `note`

**Design decisions for this pass (locked unless user objects):**
- Coverage: 55% man / 45% zone, rolled per play. Man: per-receiver matchup roll
  (WR speed vs CB speed + randomness) — beaten CB chases slow (separation grows), won CB
  sticks with a tight ~24 px cushion (contested). Zone: cover defenders hold a home area,
  chase only when a receiver is within ~110 px of them; blitzers drop into their zones in
  zone mode (zone = no pressure, man = pressure). Scheme shown in the HUD pre-snap.
- Open/covered rings on receivers: green = open (no defender within 70 px), red = covered
  (within 45 px), computed live every frame during pass + ball-in-air.
- Catch resolution now takes the list of defender distances: 0 nearby = clean (95%),
  1 within ~55 px = contested (~35% catch / 15% INT), 2+ within ~55 px = double-covered
  (~20% catch / 30% INT). Catching stat still helps (shrinks pressure + boosts contested odds).
- Throws: reticle locks only within RETICLE_LOCK_RADIUS (64 px). Locked throw → ball homes
  to receiver; completes with `completionChance(throwAccuracy, aimQuality)` where
  aimQuality = 1 − dist/lockRadius (clamped at AIM_QUALITY_MIN 0.5). Reticle shows green
  ring + completion % when locked, gray + "SPOT" when not; a faint QB→reticle aim line.
  Unlocked throw → ball flies to the spot (X marker while in the air); only a receiver
  within 40 px of the spot at arrival can catch (contested rules apply); a defender within
  40 px of the spot can pick it off (25%); otherwise incomplete. Failed locked throws =
  short/overthrown incomplete.
- Plays: 8 named route combinations in `data/playbook.ts`, rolled per down, name shown
  in the HUD pre-snap. Defense alignment stays fixed (roles unchanged). The RB slot has
  no man-coverage assigner (free in man mode; in zone mode the deep defenders can help).
- Clock: HALF_SECONDS 60, dead time trimmed (POST_PLAY 1.6→1.2, sim drive 1.2/1.6→0.9/1.2,
  half end 2.0→1.5).

---

## PREVIOUS STATUS

> **STATUS: full campaign loop playable with a finished UI, playtests #1–#4 all
> addressed.** Real matches (2×2:00 halves), real Pokémon sprites, simulated
> opponent, stat system wired end-to-end, stamina + catch lag, RB slot route,
> procedural animation, 2.5D pass arc + catch jump, zoom 1.2 — the complete
> roguelike campaign shell (title → opponent select → match → result → poach →
> loop, game-over / victory / forfeit) — plus the **UI polish pass**: pixel font
> + shared theme/widget system, the **HUD score bug fixed** (zoom was scaling the
> scrollFactor-0 HUD out of frame), a **pause menu**, and **save/continue**
> (localStorage; an abandoned mid-match run counts as a forfeit).
> `typecheck` ✓, `test` ✓ (73 tests), `build` ✓, dev server on :5173.
> **NEXT: playtest #5 (the campaign loop, incl. the new UI/pause/saves), then
> resume gameplay tuning** — catch radius, "running too easy" note, tackle feel,
> stat values (listed in §4/§5 and DESIGN.md).

---

## 1a. UI polish pass + HUD fix + pause + save/continue (latest)

Full detail in DESIGN.md ("Visuals & UI system" + updated "Campaign & menus").

1. **HUD score bug — FIXED.** Root cause: a `scrollFactor(0)` object is still
   scaled by camera zoom about the camera center, so at `CAMERA_ZOOM = 1.2` the
   whole HUD (placed in raw screen coords) fell outside the frame. Fix: `pin()`
   in `ui/Hud.ts` places screen-fixed objects at the pre-image world position
   (`center + (screen − center)/zoom`) and shrinks them by `1/zoom` — genuinely
   screen-fixed at any zoom. HUD re-laid out: center-anchored score/clock +
   down line in the top bar, "ESC: PAUSE" in the corner, controls hint on a dark
   strip at the bottom.
2. **Look-and-feel layer.** Self-hosted **Press Start 2P** pixel font
   (`@fontsource/press-start-2p`, OFL, bundled offline; `main.ts` loads it
   before the Phaser game starts, monospace fallback). `ui/theme.ts` = one place
   for font/colors/fills + `textStyle()` (sizes snapped to the font's 8-px grid
   via `pixelSize()`); `ui/menu.ts` widgets (`MenuButton` with
   primary/secondary/danger + hotkeys, `panel`, `rosterStrip`, `pokemonImage`,
   `fadeTo`, `runSummaryPanel`, striped menu background + fade-in); new
   `ui/ConfirmDialog.ts` for destructive actions. Every screen, the HUD, the
   field, and player labels now build from this.
3. **Boot**: title + loading bar with percentage while sprites preload.
4. **Title**: bobbing title, starting-offense sprite row, **Continue Run** when
   a save exists (shows record; resumes a pending poach first), **New Run**
   (confirm before erasing a save), **How to Play** overlay (H), copyright
   footer. Red notice if a saved match was counted as a forfeit on load.
5. **Opponent select**: scouting-report cards (team-color band, status, defense
   sprite strip, **DEF rating** = mean defender overall, **OPP SPEED +N**),
   click or keys 1–4, dimmed faced teams, footer with both your roster strips +
   OVR, **Save & Quit** (run kept).
6. **Pause menu** (`PauseScene`): ESC no longer forfeits — it launches a pause
   scene on top of the frozen match (own un-zoomed camera): Resume / Forfeit
   (forfeit still = loss = run over, now behind a `ConfirmDialog`). ESC/ENTER
   resume; keyboard state reset on resume. `bindings.ts`: `forfeit` → `pause`.
7. **Result / Game Over / Victory**: scoreboard panel on Result (team colors,
   big scores, winner in gold); end-of-run screens get a run-recap panel + the
   final roster as sprite strips (bobbing on victory); New Run goes straight to
   the hub, plus a Main Menu button.
8. **Poach**: re-laid out — side toggle as buttons, compare panel always visible
   (hint → swap preview), ENTER confirms, ESC clears the selection.
9. **Save/continue (localStorage)**. `core/runSave.ts` (pure, versioned,
   fully-validated save format, 3 tests) + `state/runStore.ts` (saves on every
   change, restores on load, namespaced key, no-op if storage unavailable).
   `core/campaign.ts` gained `matchInProgress` / `pendingPoach` +
   `startMatch` / `abandonMatch` / `skipPoach` / `isResumable` (27 tests now).
   A saved run with an unfinished match = **forfeit** (`ABANDONED_MATCH_ENDS_RUN`
   in `config/campaign.ts` — set false to make refresh forgiving).
10. **Overall rating**: `overall()` / `averageOverall()` in `core/poach.ts`
    power the DEF ratings and OVR labels (6 tests now).

Test count 61 → 73. `typecheck` ✓, `build` ✓.

---

## 1. What was added in the latest pass (after first playtest)

User feedback incorporated:
1. **14 Pokémon per team** (was 7 both sides): each team now has 7 offense + 7 defense,
   separate rosters. `Team` = `{ offense: Pokemon[7], defense: Pokemon[7] }`.
   Roster order still positional (`OFFENSE_POSITIONS[i]` / `DEFENSE_POSITIONS[i]`).
   All 5 teams filled out in `core/teams.ts`.
2. **User plays offense only** (locked): defense is always AI and shown, never
   player-controlled. Opponent possessions are **simulated** (see below).
3. **Route speed ×0.8** (`ROUTE_SPEED_FACTOR` in `config/gameplay.ts`) — felt too fast.
4. **Match structure**: 2 halves × 2:00. Score, clock, halftime, final score,
   win/loss screen, R to restart. TD = 7 (no PAT). User can't kick FGs; the
   opponent simulation can score FGs (3).
5. **Real Pokémon sprites** (user approved PokeAPI/Bulbapedia): classic 96×96 sprites
   from the PokeAPI sprites mirror, preloaded in BootScene, rendered via
   `PlayerSprite` (team-colored square kept as fallback). 70 roster Pokémon →
   Pokédex ID map in `src/data/sprites.ts` (resolved via the PokeAPI species API).

New pure/testable core:
- `core/rules/clock.ts` — MatchClock (tick/isHalfOver/nextHalf/formatClock) + tests
- `core/rules/score.ts` — Score + addPoints
- `core/simulation.ts` — simulateDrive(rng): TD 20% / FG 10% / punt 40% / turnover 30%,
  consumes 10–30s of clock + tests

New gameplay:
- `PlaySession` owns clock/score and resolves play outcomes (`resolvePlay` →
  `PlayResolution`: continue | switchPossession | halfEnd | matchEnd)
- New phases: `SimDrivePhase` ("Ember Blitz has the ball..." → random outcome →
  fresh user drive at own 25), `HalfEndPhase`, `MatchOverPhase`
- Phase flow: `preSnap → pass → (ballInAir →) run → postPlay → (preSnap | simDrive | halfEnd | matchOver)`
- HUD: score + clock line (gold, top-left) above the downs line
- Clock runs only during live-ball phases (pass/ballInAir/run); frozen between plays
- GameScene: R restarts after match over

### Commands
`npm run dev` / `typecheck` / `test` / `build` — all green. Dev server currently on :5173.

### Environment notes
- Node v25.9.0, npm 11.13.0, macOS. Pinned TS ^5.6 / Vite ^5.4 / Vitest ^2.1.
- PokeAPI + raw.githubusercontent.com are reachable from this machine (verified).
- A prior session had `edit`/`write` "file not read in this session" failures; current
  sessions have been fine. Fallback if it bites: bash heredoc.

---

## 2. Current full file map

```
src/
  main.ts (loads the pixel font, then creates the game; scene list: Boot, Title,
           OpponentSelect, Game, Result, Poach, GameOver, Victory, Pause [last,
           draws on top of the match])
  config/field.ts  config/gameplay.ts   (all tuning knobs: ROUTE_SPEED_FACTOR, HALVES,
                                         HALF_SECONDS, SIM_DRIVE_* delays, stamina,
                                         CAMERA_ZOOM, 2.5D arc constants)
  config/campaign.ts  (difficulty ramp: DIFFICULTY_PER_WIN, CHAMPION_DIFFICULTY_BONUS,
                                         ABANDONED_MATCH_ENDS_RUN)
  types/field.ts  types/play.ts  types/campaign.ts (MatchConfig)  types/index.ts
  core/
    pokemon.ts (user-facing + internal stats, deriveStats)  pokemon.test.ts
    teams.ts (5 teams × 14 Pokémon; DUMMY 5-stat values, user will remap)
    campaign.ts (pure run state: results, poaches, difficulty, transitions,
                 startMatch/abandonMatch/skipPoach/isResumable, matchInProgress,
                 pendingPoach)  + tests (27)
    poach.ts (stat comparison for the poach UI, overall/averageOverall)  + tests (6)
    runSave.ts (pure, versioned, validated save format)  + tests (3)
    math/vec2.ts
    rules/downs.ts + tests, clock.ts + tests, score.ts
    resolvers/catch.ts + tests  resolvers/tackle.ts + tests  resolvers/throw.ts
    ai/defenseAI.ts (per-blocker-radius blocking)
    simulation.ts + tests
  state/runStore.ts (run singleton + localStorage save/restore: getRun/setRun/
                     resetRun/hasSavedRun/takeNotice)
  data/playbook.ts  data/sprites.ts (Pokédex IDs + sprite URL builder)
  gameplay/
    PlaySession.ts (owns clock/score; camera zoom + ground-level ball tracker;
                    phase machine; takes a difficulty bonus for the defense;
                    offense/defense/receivers; get qb()/rb())
    units.ts  defenseBehavior.ts (blocker radius by blocking stat; blitz/coverage
                                 by awareness; DL blocked by OL)
    controls/Controls.ts  controls/bindings.ts ('pause' on ESC; forfeit lives in
                          the pause menu)
    entities/PlayerSprite.ts (Container: shadow + body + label; `internal` stats;
                              per-instance difficultyBonus; effects: walk-bob /
                              spin / flash / pulse / hop)
    entities/Field.ts  entities/Ball.ts (2.5D flight: ground pos vs drawn pos + shadow)
    phases/Phase.ts  PreSnapPhase.ts (run/pass pick + route preview lines)
    PassPhase.ts (inaccuracy + stat sacks)  BallInAirPhase.ts (throwPower, catching)
    RunPhase.ts (stat tackles)
          PostPlayPhase.ts  SimDrivePhase.ts  HalfEndPhase.ts  MatchOverPhase.ts
          (MatchOver: final score + verdict → ResultScene)
  ui/theme.ts (font face, colors, FILL, FADE_MS, pixelSize, textStyle — the one
               look-and-feel source)  ui/menu.ts (menuBackground, fadeTo,
               MenuButton, panel, label, pokemonImage, rosterStrip, runSummaryPanel)
               ui/ConfirmDialog.ts (modal confirm/cancel)  ui/Hud.ts (pin(): screen-
               fixed at any camera zoom)  ui/PokemonCard.ts (sprite+stats card)
  scenes/BootScene.ts (title + loading bar, preloads 70 sprites → TitleScene)
          TitleScene.ts (Continue/New Run + confirm, How to Play overlay)  
          OpponentSelectScene.ts (scouting cards, 1–4 hotkeys, Save & Quit)
          GameScene.ts (MatchConfig via init(); ESC launches PauseScene + pauses)  
          PauseScene.ts (Resume / Forfeit behind ConfirmDialog; own camera)  
          ResultScene.ts (scoreboard panel, routes win/loss/tie/champion)  
          PoachScene.ts (side toggle, card columns, always-visible compare panel,
          ENTER confirm / ESC clear, skip)  GameOverScene.ts  VictoryScene.ts
          (run-recap panel + roster strips)
```

---

## 3. Playtest feedback log (#1–#4 — all addressed; history kept for context)

| # | Item | Status |
|---|------|--------|
| 1 | **Stat system**: 5 user-facing stats (Speed, Strength, Throwing, Awareness, Coordination) → internal stats (throwPower, throwAccuracy, catching, blocking, tackling, avoidance, awareness). Dummy values now; user will map Pokémon. Any Pokémon any position. | **Done** — `deriveStats()` in `core/pokemon.ts` (+ tests); wired into catch, tackle/sack rolls, throw inaccuracy, blocking radius, ball speed, defense-AI awareness (blitz timing, cover cushion). Weights tunable in `deriveStats` |
| 2 | **Run plays awkward** — Space does too many jobs | **Done** — `R` at the snap = handoff to RB; `Space` = pass. Scramble **kept** (user ask): `R` during dropback = QB runs it. Route preview lines drawn pre-snap |
| 3 | Defense AI collapsed on ball in the air | **Fixed**: `BallInAirPhase` now keeps coverage assignments (`updatePassDefense`) during flight |
| 4 | **Roguelike meta** (note for later, not building): lose = reset, win = keep poached + progress, 3 opponents + final boss, boss challengeable anytime but ~impossible without a bigger roster, difficulty ramps over time, stats must matter | Recorded in DESIGN.md ("Roguelike meta"); implies stats-first build order |
| 5 | Hard to tell teams apart on sprites | **Fixed**: team-colored shadow ellipse under every player (`PlayerSprite`) |
| 6 | **Feel: not enough control; slow everything down a bit; show play details pre-snap; running feels impossible** | **Done (playtest #3: pace good, routes helpful, running works)** — base speed down ~30% (reticle unchanged; `DIFFICULTY_SPEED_BONUS` is the difficulty lever); route lines pre-snap; tackles are tackling-vs-avoidance rolls (15–95%) on a cooldown, juke un-tackleable |
| 7 | **Playtest #3**: (a) running now works but maybe a little too easy (user has a note coming); (b) WRs too fast after the catch — always feels like a TD, defenders can't catch up; suggested **stamina while carrying**; (c) any way to **animate** sprites? at least spin on juke + tackle feedback; (d) RB shouldn't stand still — should run routes (maybe sometimes block) | **Done (a pending user note)** — (b) catch lag (0.5 s at 55% speed) + carrier stamina (drains while carrying, floor 70% speed, sprint drains 2×) so defenders converge; (c) procedural animation: walk-bob, juke 360° spin, tackle = flash + spin + defender hop, catch jump, TD ripple; (d) RB now runs a slot route and is throwable (slot 3, uncovered); RB blocking = noted for later |
| 8 | **Playtest #4**: (a) juke spin loved; (b) "how hard to angle the field a little" so passes visibly arc + WR jumps on catches; (c) **zoom in a bit** — too much space behind the offense, zoom should feel like more control (optional: zoom out if a WR nears the frame edge — "if hard, don't need it"); (d) catch radius logic needs a revisit (after the other items) | **Done (a, b, c)** — (b) no real perspective tilt (Phaser perspective camera distorts everything; too risky) — instead a **2.5D pass arc**: ball's ground path is unchanged, but it's *drawn* along a parabola (rises, scales up, ground shadow shrinks; longer throws lob higher), and the receiver **jumps** at the catch; (c) `CAMERA_ZOOM = 1.2` + camera now follows a ground-level ball tracker (bounds-clamped, so the play never leaves the frame); dynamic zoom-out skipped (clamping is enough for now); (d) catch radius = next |

## 4. Next steps

**HUD score bug — FIXED (see §1a.1).** `scrollFactor(0)` objects are still
scaled by camera zoom about the camera center, so at zoom 1.2 the HUD ended up
off-frame; `pin()` in `ui/Hud.ts` counter-positions + counter-scales it.

**Dev aid:** `?match=<teamId>` on the page URL jumps straight from Title into a
match vs that team (fresh run) — e.g. `http://localhost:5173/?match=tidal-wave`.
Handy for playtests/HUD debugging.

**CURRENT FOCUS: playtest #5 — the campaign loop + new UI.** The shell, pause
menu, and saves are all in (see "Campaign & menus" and "Visuals & UI system" in
DESIGN.md); next is a playtest of the whole run, then gameplay tuning resumes in
§4.B.

### A. Campaign shell — ✅ DONE (earlier pass; history — where §1a supersedes it,
§1a wins: ESC is now pause, persistence is now localStorage)
- `core/campaign.ts` + `core/poach.ts` (pure, 24 new tests), `config/campaign.ts`
  (ramp: +10/win, +30 champion), `state/runStore.ts` (run singleton).
- Seven scenes: Title, OpponentSelect, Game (MatchConfig via `init()`),
  Result (auto-routes), Poach (side toggle + card columns + compare panel),
  GameOver, Victory. MatchOverPhase hands off to ResultScene (no in-match R).
- Decisions locked with the user: poach once per team from the team just beaten,
  either side, skippable; champion = no poach, victory only; tie = consumed, no
  replay; forfeit = loss; no quick-match, no roster viewer (roster visible on
  hub + poach screens).

### B. Gameplay (deferred — revisit in this rough order when we return)
1. **Catch radius logic** — user: "we need to update the catch radius logic a bit"
   (symptom TBD: too many drops? too many catches? zone in the wrong place?)
2. **Inbox (user)**: the "running a little too easy" note. Levers:
   `TACKLE_ATTEMPT_COOLDOWN`, tackle roll bounds, stamina drain,
   `PURSUIT_SPEED_FACTOR`.
3. **Tackle feel** — "we still need to work on tackle, but not sure what".
4. **Stat mapping review** — user remaps Pokémon → 5-stat values in `teams.ts`
   (currently placeholder values I invented); adjust `deriveStats` weights as we go.
5. **RB blocking option** — formation variant where the RB stays in and blocks
   (`playbook.ts`).
6. **Player size / clutter** — re-check with sprites + shadows + route lines + zoom.

### C. Polish (later)
- UI/visual system, pause menu, save/continue — **done this pass** (§1a).
- Remaining: sound, more animation, game feel.

## 5. Open questions (for the user)

**Meta / campaign** (screen set, poach rules, tie rule, forfeit, persistence —
all decided and built; see DESIGN.md "Campaign & menus")
- [ ] Abandoned-match rule: default is *refresh mid-match = forfeit* (keeps
      "no retries" honest). `ABANDONED_MATCH_ENDS_RUN = false` makes it forgiving
      — which do you want?
- [ ] Sprite licensing scope for the distribution you have in mind
- [ ] Delete `claude/`? Nothing depends on it.

**Gameplay (deferred)** — full list in §4.B and DESIGN.md "Open Questions":
catch radius, running-too-easy note, tackle feel, stat weights, stat values,
RB blocking, player size/clutter.
