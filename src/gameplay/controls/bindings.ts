/**
 * EVERY keyboard binding in the game lives here. Names are Phaser key names
 * (see Phaser.Input.Keyboard.KeyCodes). The same key may back different actions
 * as long as those actions are used in different phases (e.g. SPACE snaps in
 * preSnap, aims the throw reticle in the pass phase, and jukes in the run phase;
 * R runs a handoff in preSnap and scrambles in the pass phase).
 * Swap the whole scheme here (mouse, hold-to-charge, ...) without touching game logic.
 */
export type Action = 'snap' | 'aim' | 'run' | 'scramble' | 'juke' | 'dive' | 'pause' | 'cancel';

export const ACTION_KEYS: Record<Action, string[]> = {
  snap: ['SPACE'], // preSnap: press to snap the pass play
  aim: ['SPACE'], // pass: HOLD to show the throw reticle, release to throw
  run: ['R'], // preSnap: press to hand the ball to the RB and run
  scramble: ['R'], // pass: run it (QB keeps the ball)
  juke: ['SPACE'], // run: press to juke
  cancel: ['X'], // pass: while aiming, abort the throw (no ball thrown, no down lost)
  dive: ['E'], // run: press to dive forward
  pause: ['ESC'], // any time during a match: open the pause menu (forfeit lives there, behind a confirmation)
};

export const MOVE_KEYS = {
  up: ['W', 'UP'],
  down: ['S', 'DOWN'],
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
};

export const SPRINT_KEYS = ['SHIFT'];
