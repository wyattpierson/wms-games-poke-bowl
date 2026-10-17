import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/field';
import { applyPoach, skipPoach, teamById } from '../core/campaign';
import { compareStats, netUpgrade } from '../core/poach';
import { DEFENSE_POSITIONS, OFFENSE_POSITIONS, type Team } from '../core/teams';
import { getRun, setRun } from '../state/runStore';
import type { Side } from '../types';
import { DIM, GOLD, GRAY, GREEN, RED, WHITE, MenuButton, fadeTo, header, label, menuBackground, panel, pokemonImage } from '../ui/menu';
import { PokemonCard } from '../ui/PokemonCard';
import { FILL, textStyle } from '../ui/theme';

interface PoachData {
  teamId: string;
}

// Layout: two roster columns at the edges, the compare panel in the gap between them.
const CARD_W = 372;
const CARD_GAP_Y = 64;
const FIRST_CARD_Y = 220;
const LEFT_X = 236;
const RIGHT_X = GAME_WIDTH - 236;
const PANEL_X = GAME_WIDTH / 2;
const PANEL_Y = 415;
const PANEL_W = 400;
const PANEL_H = 440;
const ROWS = 7;

/**
 * After beating a regular team: take 1 of its Pokémon, drop 1 of your own (same side).
 * Pick a side (offense/defense), click one card from each column, compare the five stats in
 * the center panel, then confirm the swap (ENTER) or skip. The team is consumed either way.
 */
export class PoachScene extends Phaser.Scene {
  private team!: Team;
  private payload!: PoachData;
  private side: Side = 'offense';
  private takenIdx = -1;
  private droppedIdx = -1;
  private sourceCards: PokemonCard[] = [];
  private ownCards: PokemonCard[] = [];
  private columnTexts: Phaser.GameObjects.Text[] = [];
  private panelContent: Phaser.GameObjects.Container | null = null;
  private readonly sideButtons = new Map<Side, MenuButton>();

  constructor() {
    super('PoachScene');
  }

  init(data: PoachData): void {
    this.payload = data;
  }

  create(): void {
    // Scene instances are reused between visits, so reset per-visit state here.
    this.side = 'offense';
    this.takenIdx = -1;
    this.droppedIdx = -1;
    this.sourceCards = [];
    this.ownCards = [];
    this.columnTexts = [];
    this.panelContent = null;
    this.sideButtons.clear();

    menuBackground(this);
    this.team = teamById(this.payload.teamId);
    header(this, 'Take a Pokémon', 40);
    label(this, GAME_WIDTH / 2, 76, `from ${this.team.name} · they are gone after this`, GRAY, '14px');

    for (const side of ['offense', 'defense'] as Side[]) {
      const x = GAME_WIDTH / 2 + (side === 'offense' ? -95 : 95);
      this.sideButtons.set(side, new MenuButton(this, x, 122, side, () => this.setSide(side), { width: 170, height: 40, fontSize: 17, secondary: true }));
    }
    new MenuButton(this, GAME_WIDTH - 130, 122, 'Skip Poach', () => this.skip(), { width: 190, height: 40, fontSize: 16, secondary: true });

    panel(this, PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    this.input.keyboard?.on('keydown-ENTER', () => this.ready() && this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.clearSelection());

    this.buildSide();
  }

  private ready(): boolean {
    return this.takenIdx >= 0 && this.droppedIdx >= 0;
  }

  private setSide(side: Side): void {
    if (side === this.side) return;
    this.side = side;
    this.buildSide();
  }

  /** (Re)build the two roster columns for the current side; clears any selection. */
  private buildSide(): void {
    for (const card of [...this.sourceCards, ...this.ownCards]) card.container.destroy();
    for (const text of this.columnTexts) text.destroy();
    this.sourceCards = [];
    this.ownCards = [];
    this.takenIdx = -1;
    this.droppedIdx = -1;

    for (const [side, button] of this.sideButtons) button.setActive(side === this.side);

    const state = getRun();
    const positions = this.side === 'offense' ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;
    const source = this.team[this.side];
    const own = state.userTeam[this.side];

    this.columnTexts = [
      this.add.text(LEFT_X, 176, `${this.team.name.toUpperCase()}: TAKE ONE`, textStyle(15, GOLD)).setOrigin(0.5),
      this.add.text(RIGHT_X, 176, `${state.userTeam.name.toUpperCase()}: DROP ONE`, textStyle(15, WHITE)).setOrigin(0.5),
    ];

    for (let i = 0; i < ROWS; i++) {
      const y = FIRST_CARD_Y + i * CARD_GAP_Y;
      const taken = new PokemonCard(this, LEFT_X, y, source[i]!, positions[i]!, CARD_W);
      const dropped = new PokemonCard(this, RIGHT_X, y, own[i]!, positions[i]!, CARD_W);
      taken.onClick(() => this.select('taken', i));
      dropped.onClick(() => this.select('dropped', i));
      this.sourceCards.push(taken);
      this.ownCards.push(dropped);
    }
    this.renderPanel();
  }

  /** Clicking a card selects it; clicking the selected card again deselects it. */
  private select(which: 'taken' | 'dropped', idx: number): void {
    if (which === 'taken') this.takenIdx = this.takenIdx === idx ? -1 : idx;
    else this.droppedIdx = this.droppedIdx === idx ? -1 : idx;
    this.syncSelection();
  }

  private clearSelection(): void {
    this.takenIdx = -1;
    this.droppedIdx = -1;
    this.syncSelection();
  }

  private syncSelection(): void {
    this.sourceCards.forEach((card, i) => card.setSelected(i === this.takenIdx));
    this.ownCards.forEach((card, i) => card.setSelected(i === this.droppedIdx));
    this.renderPanel();
  }

  /** Center panel: a hint until both are picked, then the swap preview with confirm/cancel. */
  private renderPanel(): void {
    this.panelContent?.destroy();
    const content = this.add.container(PANEL_X, PANEL_Y);
    this.panelContent = content;

    if (!this.ready()) {
      content.add([
        this.add.text(0, -30, 'Pick one Pokémon\nfrom each team', { ...textStyle(16, GRAY), align: 'center', lineSpacing: 12 }).setOrigin(0.5),
        this.add.text(0, 40, 'Your pick takes the\ndropped Pokémon\'s position.', { ...textStyle(12, DIM), align: 'center', lineSpacing: 8 }).setOrigin(0.5),
      ]);
      return;
    }

    const state = getRun();
    const positions = this.side === 'offense' ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;
    const taken = this.team[this.side][this.takenIdx]!;
    const dropped = state.userTeam[this.side][this.droppedIdx]!;
    const slot = positions[this.droppedIdx]!;
    const deltas = compareStats(taken, dropped);
    const net = netUpgrade(deltas);
    const verdictColor = net > 0 ? GREEN : net < 0 ? RED : GRAY;

    // Who leaves, who arrives.
    content.add([
      this.add.text(-110, -205, 'DROP', textStyle(12, GRAY)).setOrigin(0.5),
      pokemonImage(this, dropped, -110, -165, 64),
      this.add.text(-110, -120, dropped.name, textStyle(15, WHITE)).setOrigin(0.5),
      this.add.text(0, -165, '>', textStyle(32, GOLD)).setOrigin(0.5),
      this.add.text(110, -205, 'TAKE', textStyle(12, GOLD)).setOrigin(0.5),
      pokemonImage(this, taken, 110, -165, 64),
      this.add.text(110, -120, taken.name, textStyle(15, GOLD)).setOrigin(0.5),
      this.add.text(0, -88, `${taken.name} plays ${slot}`, textStyle(14, GRAY)).setOrigin(0.5),
    ]);

    // Stat rows: label, dropped → taken, delta.
    deltas.forEach((d, i) => {
      const y = -50 + i * 30;
      const color = d.diff > 0 ? GREEN : d.diff < 0 ? RED : GRAY;
      const sign = d.diff > 0 ? `+${d.diff}` : `${d.diff}`;
      content.add([
        this.add.text(-160, y, d.label, textStyle(17, GRAY)).setOrigin(0, 0.5),
        this.add.text(-40, y, String(d.dropped), textStyle(17, WHITE)).setOrigin(1, 0.5),
        this.add.text(-8, y, '>', textStyle(16, GRAY)).setOrigin(0.5),
        this.add.text(20, y, String(d.taken), textStyle(17, WHITE)).setOrigin(0, 0.5),
        this.add.text(160, y, sign, textStyle(17, color)).setOrigin(1, 0.5),
      ]);
    });

    const verdict = net > 0 ? `NET UPGRADE +${net}` : net < 0 ? `NET DOWNGRADE ${net}` : 'NO CHANGE';
    const confirm = new MenuButton(this, -100, 168, 'Confirm', () => this.confirm(), { width: 170, height: 44, fontSize: 17 });
    const cancel = new MenuButton(this, 105, 168, 'Cancel', () => this.clearSelection(), { width: 140, height: 44, fontSize: 17, secondary: true });
    content.add([
      this.add.rectangle(0, 96, 340, 2, FILL.border),
      this.add.text(0, 120, verdict, textStyle(18, verdictColor)).setOrigin(0.5),
      confirm.container,
      cancel.container,
      this.add.text(0, 203, 'ENTER confirm · ESC cancel', textStyle(11, DIM)).setOrigin(0.5),
    ]);
  }

  private skip(): void {
    setRun(skipPoach(getRun()));
    fadeTo(this, 'OpponentSelectScene');
  }

  private confirm(): void {
    setRun(applyPoach(getRun(), this.side, this.team.id, this.takenIdx, this.droppedIdx));
    fadeTo(this, 'OpponentSelectScene');
  }
}
