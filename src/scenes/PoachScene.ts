import Phaser from 'phaser';
import { applyPoach, teamById } from '../core/campaign';
import { compareStats, netUpgrade } from '../core/poach';
import { DEFENSE_POSITIONS, OFFENSE_POSITIONS, type Team } from '../core/teams';
import type { Side } from '../types';
import { getRun, setRun } from '../state/runStore';
import { GOLD, GREEN, RED, WHITE, header, label, menuBackground, menuButton } from '../ui/menu';
import { PokemonCard } from '../ui/PokemonCard';

interface PoachData {
  teamId: string;
}

const CARD_GAP_Y = 74;
const FIRST_CARD_Y = 235;
const LEFT_X = 330;
const RIGHT_X = 950;

/**
 * After beating a regular team: take 1 of its Pokémon, drop 1 of your own (same side).
 * Pick a side (offense/defense), click one card from each column, compare the five
 * stats in the center panel, confirm the swap (or skip — the team is consumed either way).
 */
export class PoachScene extends Phaser.Scene {
  private team!: Team;
  private side: Side = 'offense';
  private takenIdx = -1;
  private droppedIdx = -1;
  private cards: PokemonCard[] = [];
  private panel: Phaser.GameObjects.Container | null = null;
  private sideButtons = new Map<Side, { plate: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }>();

  private payload!: PoachData;

  constructor() {
    super('PoachScene');
  }

  init(data: PoachData): void {
    this.payload = data;
  }

  create(): void {
    menuBackground(this);
    this.team = teamById(this.payload.teamId);
    header(this, `Take a Pokémon — ${this.team.name}`, 56);

    for (const [x, side] of [[545, 'offense'], [735, 'defense']] as [number, Side][]) {
      const plate = this.add
        .rectangle(x, 118, 170, 44, 0x1f2937, 1)
        .setStrokeStyle(2, 0x4b5563)
        .setInteractive();
      const text = this.add
        .text(x, 118, side.toUpperCase(), { fontFamily: 'monospace', fontSize: '18px', color: WHITE })
        .setOrigin(0.5);
      plate.on('pointerdown', () => {
        if (this.side !== side) {
          this.side = side;
          this.buildSide();
        }
      });
      this.sideButtons.set(side, { plate, text });
    }
    menuButton(this, 1130, 118, 'Skip Poach', () => this.scene.start('OpponentSelectScene'), 180, 44);
    label(this, 640, 165, 'pick one from each side, then compare and confirm', '#9ca3af', '14px');

    this.buildSide();
  }

  /** (Re)build the two roster columns for the current side; clears any selection. */
  private buildSide(): void {
    for (const c of this.cards) c.container.destroy();
    this.cards = [];
    this.hidePanel();
    this.takenIdx = -1;
    this.droppedIdx = -1;

    for (const [side, btn] of this.sideButtons) {
      btn.plate.setStrokeStyle(2, side === this.side ? 0xfacc15 : 0x4b5563);
      btn.text.setColor(side === this.side ? GOLD : WHITE);
    }

    const state = getRun();
    const positions = this.side === 'offense' ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;
    const source = this.team[this.side];
    const target = state.userTeam[this.side];

    this.add.text(LEFT_X, 200, this.team.name.toUpperCase(), { fontFamily: 'monospace', fontSize: '18px', color: GOLD }).setOrigin(0.5);
    this.add.text(RIGHT_X, 200, state.userTeam.name.toUpperCase(), { fontFamily: 'monospace', fontSize: '18px', color: WHITE }).setOrigin(0.5);

    for (let i = 0; i < 7; i++) {
      const y = FIRST_CARD_Y + i * CARD_GAP_Y;
      const left = new PokemonCard(this, LEFT_X, y, source[i]!, positions[i]!);
      const right = new PokemonCard(this, RIGHT_X, y, target[i]!, positions[i]!);
      left.onClick(() => this.select('taken', i));
      right.onClick(() => this.select('dropped', i));
      this.cards.push(left, right);
    }
  }

  /** Clicking a card selects (or re-clicking deselects) it for its side. */
  private select(which: 'taken' | 'dropped', idx: number): void {
    if (which === 'taken') this.takenIdx = this.takenIdx === idx ? -1 : idx;
    else this.droppedIdx = this.droppedIdx === idx ? -1 : idx;

    this.cards.forEach((c, i) => {
      const isTaken = i < 7 && i === this.takenIdx;
      const isDropped = i >= 7 && i - 7 === this.droppedIdx;
      c.setSelected(isTaken || isDropped);
    });

    if (this.takenIdx >= 0 && this.droppedIdx >= 0) this.showPanel();
    else this.hidePanel();
  }

  private hidePanel(): void {
    this.panel?.destroy();
    this.panel = null;
  }

  /** Center overlay: the two Pokémon, per-stat deltas, and confirm/cancel. */
  private showPanel(): void {
    this.hidePanel();
    const state = getRun();
    const positions = this.side === 'offense' ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;
    const taken = this.team[this.side][this.takenIdx]!;
    const dropped = state.userTeam[this.side][this.droppedIdx]!;
    const deltas = compareStats(taken, dropped);
    const net = netUpgrade(deltas);

    const panel = this.add.container(640, 380).setDepth(50);
    panel.add(this.add.rectangle(0, 0, 470, 330, 0x111827, 1).setStrokeStyle(2, 0xfacc15));

    const lines: { text: string; color: string }[] = [
      { text: `TAKE  ${taken.name} (${positions[this.takenIdx]})`, color: GOLD },
      { text: `DROP  ${dropped.name} (${positions[this.droppedIdx]})`, color: WHITE },
    ];
    for (const d of deltas) {
      const sign = d.diff > 0 ? `+${d.diff}` : `${d.diff}`;
      lines.push({ text: `${d.label}   ${d.dropped}  →  ${d.taken}   ${sign}`, color: d.diff > 0 ? GREEN : d.diff < 0 ? RED : '#9ca3af' });
    }
    const verdict = net > 0 ? `NET UPGRADE +${net}` : net < 0 ? `NET DOWNGRADE ${net}` : 'NO CHANGE';
    lines.push({ text: verdict, color: net > 0 ? GREEN : net < 0 ? RED : '#9ca3af' });

    let y = -128;
    for (const line of lines) {
      panel.add(this.add.text(0, y, line.text, { fontFamily: 'monospace', fontSize: '17px', color: line.color }));
      y += 27;
    }

    const confirm = menuButton(this, 545, 570, 'Confirm Swap', () => this.confirm(), 180, 46);
    const cancel = menuButton(this, 740, 570, 'Cancel', () => {
      this.takenIdx = -1;
      this.droppedIdx = -1;
      this.cards.forEach((c) => c.setSelected(false));
      this.hidePanel();
    }, 140, 46);
    this.panel = this.add.container(0, 0, [panel, confirm, cancel]).setDepth(51);
  }

  private confirm(): void {
    setRun(applyPoach(getRun(), this.side, this.team.id, this.takenIdx, this.droppedIdx));
    this.scene.start('OpponentSelectScene');
  }
}
