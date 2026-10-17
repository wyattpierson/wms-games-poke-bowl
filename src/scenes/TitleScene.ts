import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';
import { difficultyBonus, wins } from '../core/campaign';
import { CAMPAIGN_TEAMS, PLAYER_TEAM } from '../core/teams';
import { getRun, hasSavedRun, resetRun, takeNotice } from '../state/runStore';
import type { MatchConfig } from '../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DIM, GOLD, GRAY, RED, WHITE, MenuButton, fadeTo, label, menuBackground, panel, pokemonImage } from '../ui/menu';
import { FILL, textStyle } from '../ui/theme';

/** Controls reference shown by "How to play". Keep in sync with gameplay/controls/bindings.ts. */
const HELP: [heading: string, lines: string[]][] = [
  ['THE GOAL', ['Win matches (2 halves of 2:00). After each win,', 'take one Pokémon from the team you beat.', 'Beat the champion to win the run.']],
  ['PRE-SNAP', ['SPACE: pass play     R: hand off and run']],
  ['PASSING', ['Hold SPACE to aim (WASD / arrows), let go to throw', 'R: scramble with the QB']],
  ['RUNNING', ['WASD / arrows: move     SHIFT: sprint', 'SPACE: juke     E: dive']],
  ['PAUSE', ['ESC pauses. Forfeiting there ends the run.']],
  ['SAVING', ['Progress saves automatically. Closing the game', 'mid-match counts as a forfeit.']],
];

/** Title screen: the only entry point into a run. Offers Continue when a saved run exists. */
export class TitleScene extends Phaser.Scene {
  private help: Phaser.GameObjects.Container | null = null;
  private dialog: ConfirmDialog | null = null;
  private saved = false;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.help = null;
    this.dialog = null;

    // Dev deep-link: ?match=<teamId> jumps straight into a match (useful for playtests).
    const teamId = new URLSearchParams(window.location.search).get('match');
    const team = CAMPAIGN_TEAMS.find((t) => t.id === teamId);
    if (team) {
      resetRun();
      const config: MatchConfig = {
        userTeam: getRun().userTeam,
        opponent: team,
        difficultyBonus: difficultyBonus(getRun(), team.id),
      };
      this.scene.start('GameScene', config);
      return;
    }

    menuBackground(this);
    const mid = GAME_WIDTH / 2;
    this.saved = hasSavedRun();

    const title = this.add
      .text(mid, 150, 'POKÉMON BOWL', { ...textStyle(76, GOLD), stroke: '#7c2d12', strokeThickness: 10 })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, y: 144, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(this, mid, 225, 'beat the gauntlet · poach their pokémon · topple the champion', WHITE, '18px');
    label(this, mid, 255, 'lose a match and the run is over — no retries', GRAY, '14px');
    const notice = takeNotice();
    if (notice) label(this, mid, 292, notice, RED, '16px');

    // Your starting offense, lined up and bobbing.
    PLAYER_TEAM.offense.forEach((pokemon, i) => {
      const x = mid + (i - 3) * 112;
      this.add.ellipse(x, 408, 56, 16, PLAYER_TEAM.color, 0.55);
      const sprite = pokemonImage(this, pokemon, x, 380, 72);
      this.tweens.add({ targets: sprite, y: 372, duration: 520, yoyo: true, repeat: -1, delay: i * 110, ease: 'Sine.easeInOut' });
    });

    const howTo = { width: 320, height: 44, fontSize: 16, secondary: true } as const;
    if (this.saved) {
      new MenuButton(this, mid, 480, 'Continue Run', () => this.primary(), { width: 320, height: 60, hotkeys: ['ENTER', 'SPACE'] });
      label(this, mid, 520, this.savedSummary(), GRAY, '13px');
      new MenuButton(this, mid, 562, 'New Run', () => this.newRun(), howTo);
      new MenuButton(this, mid, 614, 'How to Play', () => this.showHelp(), { ...howTo, hotkeys: ['H'] });
    } else {
      new MenuButton(this, mid, 500, 'New Run', () => this.primary(), { width: 320, height: 60, hotkeys: ['ENTER', 'SPACE'] });
      new MenuButton(this, mid, 568, 'How to Play', () => this.showHelp(), { ...howTo, hotkeys: ['H'] });
      label(this, mid, 622, 'ENTER to start  ·  H for controls', DIM, '13px');
    }
    label(this, mid, GAME_HEIGHT - 24, 'Fan project · Pokémon © Nintendo / Game Freak · not for sale', DIM, '12px');

    this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.dialog) this.dialog.cancel();
      else this.hideHelp();
    });
  }

  private savedSummary(): string {
    const run = getRun();
    const w = wins(run);
    return `${run.userTeam.name} · ${w} ${w === 1 ? 'win' : 'wins'} · ${run.poaches.length} poached`;
  }

  /** True (after closing the help overlay if it was open) when a modal is in the way and the key/click should be ignored. */
  private blocked(): boolean {
    if (this.dialog) return true;
    if (this.help) {
      this.hideHelp();
      return true;
    }
    return false;
  }

  /** ENTER / SPACE / the big button: Continue if there is a saved run, otherwise start one. */
  private primary(): void {
    if (this.blocked()) return;
    if (this.saved) this.continueRun();
    else this.startNew();
  }

  private continueRun(): void {
    const pending = getRun().pendingPoach;
    // Closed the game after a win but before taking a Pokémon: pick that up first.
    if (pending) fadeTo(this, 'PoachScene', { teamId: pending });
    else fadeTo(this, 'OpponentSelectScene');
  }

  private startNew(): void {
    resetRun();
    fadeTo(this, 'OpponentSelectScene');
  }

  /** New Run with a saved run present: confirm before erasing it. */
  private newRun(): void {
    if (this.blocked()) return;
    this.dialog = new ConfirmDialog(this, {
      title: 'Start a new run?',
      body: `Your saved run will be erased.\n${this.savedSummary()}`,
      confirmLabel: 'Erase & start',
      cancelLabel: 'Keep my run',
      onConfirm: () => {
        this.dialog = null;
        this.startNew();
      },
      onCancel: () => { this.dialog = null; },
    });
  }

  private showHelp(): void {
    if (this.help || this.dialog) return;
    const mid = GAME_WIDTH / 2;
    const parts: Phaser.GameObjects.GameObject[] = [];

    // Full-screen dim; clicking anywhere (or ESC / ENTER / SPACE) closes it.
    const dim = this.add.rectangle(mid, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setInteractive();
    dim.on('pointerdown', () => this.hideHelp());
    parts.push(dim, panel(this, mid, 360, 980, 600, FILL.gold));
    parts.push(this.add.text(mid, 100, 'HOW TO PLAY', textStyle(32, GOLD)).setOrigin(0.5));

    let y = 144;
    for (const [heading, lines] of HELP) {
      parts.push(this.add.text(mid - 440, y, heading, textStyle(16, GOLD)));
      y += 26;
      for (const line of lines) {
        parts.push(this.add.text(mid - 420, y, line, textStyle(16, WHITE)));
        y += 24;
      }
      y += 12;
    }
    parts.push(this.add.text(mid, 640, 'click or press ESC to close', textStyle(8, DIM)).setOrigin(0.5));

    this.help = this.add.container(0, 0, parts).setDepth(100);
  }

  private hideHelp(): void {
    this.help?.destroy();
    this.help = null;
  }
}
