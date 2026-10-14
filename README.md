# Pokémon Bowl

A retro-style American football **browser game** where every player is a Pokémon
(Retro Bowl gameplay, Pokémon theme). See `DESIGN.md` for the full design and
`PROGRESS.md` for build status / handoff.

## Stack

TypeScript + Vite + Phaser 3 (no Phaser physics — custom movement/collision).
Pure rules live in `src/core/` (never imports Phaser, unit-tested with Vitest);
`src/gameplay/` is the Phaser-aware layer.

## Run

```bash
npm install
npm run dev        # play at the printed localhost URL
npm run typecheck  # tsc --noEmit
npm run test       # vitest (pure core rules)
npm run build      # production build to dist/
```

## Controls (MVP)

- **Pre-snap**: `SPACE` — snap
- **Pass**: `HOLD SPACE` — aim reticle appears; `WASD`/arrows steer it; `release SPACE` — throw
  (nearest receiver to the reticle; white ring shows the locked target). `R` — scramble
- **Run**: `WASD`/arrows — move, `SHIFT` — sprint, `SPACE` — juke, `E` — dive
- **After the final**: `R` — play again

All key bindings live in one place: `src/gameplay/controls/bindings.ts`.

## Match structure

You play **offense only** — the defense is AI, and opponent possessions are
simulated. A match is **2 halves × 2 minutes**; touchdown = 7. Beat the clock
and the scoreboard to win.
