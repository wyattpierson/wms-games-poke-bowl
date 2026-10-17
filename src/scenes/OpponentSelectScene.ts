import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/field';
import { availableOpponents, difficultyBonus, isChampion, startMatch, wins, type CampaignState } from '../core/campaign';
import { averageOverall } from '../core/poach';
import { CAMPAIGN_TEAMS, type Team } from '../core/teams';
import { getRun, setRun } from '../state/runStore';
import type { MatchConfig } from '../types';
import { DIM, GOLD, GRAY, RED, WHITE, MenuButton, fadeTo, header, label, menuBackground, rosterStrip } from '../ui/menu';
import { FILL, textStyle } from '../ui/theme';

const CARD_W = 290;
const CARD_H = 340;
const CARD_GAP = 14;
const CARD_TOP = 118;
const NUMBER_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR'];

/**
 * Campaign hub: pick which team to face next. Each card is a scouting report on that team's
 * defense. Teams you've faced (beaten or tied) are dimmed and gone; the champion is always
 * available, with a warning. Click a card or press its number key.
 */
export class OpponentSelectScene extends Phaser.Scene {
  constructor() {
    super('OpponentSelectScene');
  }

  create(): void {
    menuBackground(this);
    header(this, 'Choose your opponent', 52);
    label(this, GAME_WIDTH / 2, 88, 'win to take one of their pokémon · faced teams are gone for good', GRAY, '16px');

    const state = getRun();
    const available = new Set(availableOpponents(state).map((t) => t.id));
    const count = CAMPAIGN_TEAMS.length;
    const left = (GAME_WIDTH - (count * CARD_W + (count - 1) * CARD_GAP)) / 2;
    CAMPAIGN_TEAMS.forEach((team, i) => {
      this.buildCard(team, i, left + CARD_W / 2 + i * (CARD_W + CARD_GAP), available.has(team.id), state);
    });

    this.buildFooter(state);
  }

  private buildCard(team: Team, index: number, cx: number, isAvailable: boolean, state: CampaignState): void {
    const outcome = state.results[team.id];
    const isBoss = isChampion(team.id);
    const border = isBoss ? FILL.red : FILL.border;
    const cy = CARD_TOP + CARD_H / 2;

    const plate = this.add.rectangle(cx, cy, CARD_W, CARD_H, FILL.plate).setStrokeStyle(2, border);

    const status =
      outcome === 'win' ? { text: 'DEFEATED', color: GOLD }
      : outcome === 'loss' ? { text: 'LOST', color: RED }
      : outcome === 'tie' ? { text: 'TIED — GONE', color: GRAY }
      : isBoss ? { text: 'NEARLY IMPOSSIBLE', color: RED }
      : { text: 'READY', color: GOLD };

    const rating = averageOverall(team.defense);
    this.add.rectangle(cx, CARD_TOP + 38, CARD_W - 4, 72, team.color);
    this.add
      .text(cx, CARD_TOP + (isBoss ? 26 : 38), team.name.toUpperCase(), { ...textStyle(16), stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5);
    if (isBoss) this.add.text(cx, CARD_TOP + 56, 'CHAMPION', { ...textStyle(13, GOLD), stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
    const statusText = this.add.text(cx, CARD_TOP + 98, status.text, textStyle(16, status.color)).setOrigin(0.5);
    this.add.text(cx, CARD_TOP + 136, 'SCOUTING REPORT: DEFENSE', textStyle(12, DIM)).setOrigin(0.5);
    rosterStrip(this, cx, CARD_TOP + 182, team.defense, 30, 36);
    this.add.text(cx, CARD_TOP + 236, `DEF RATING ${rating}`, textStyle(16, WHITE)).setOrigin(0.5);
    this.add.text(cx, CARD_TOP + 264, `OPP SPEED +${difficultyBonus(state, team.id)}`, textStyle(16, WHITE)).setOrigin(0.5);

    if (!isAvailable) {
      // Dim the whole card, but keep the status line readable: a faced team can't be picked again.
      this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x000000, 0.55).setDepth(5);
      statusText.setDepth(6);
      return;
    }

    this.add.text(cx, CARD_TOP + CARD_H - 30, `click or press ${index + 1}`, textStyle(13, GOLD)).setOrigin(0.5);

    plate.setInteractive({ useHandCursor: true });
    plate.on('pointerover', () => plate.setStrokeStyle(3, FILL.gold));
    plate.on('pointerout', () => plate.setStrokeStyle(2, border));
    plate.on('pointerdown', () => this.startMatch(team));
    const key = NUMBER_KEYS[index];
    if (key) this.input.keyboard?.on(`keydown-${key}`, () => this.startMatch(team));
  }

  private startMatch(team: Team): void {
    const run = getRun();
    const config: MatchConfig = {
      userTeam: run.userTeam,
      opponent: team,
      difficultyBonus: difficultyBonus(run, team.id),
    };
    // Commit to the match: if the game is closed mid-match the saved run counts it as abandoned.
    setRun(startMatch(run, team.id));
    fadeTo(this, 'GameScene', config);
  }

  /** Your team name, record, and both roster rows (the "roster visible on the hub" decision). */
  private buildFooter(state: CampaignState): void {
    const team = state.userTeam;
    const w = wins(state);
    this.add
      .text(70, 540, `YOUR TEAM  ${team.name}  ·  ${w} ${w === 1 ? 'win' : 'wins'}  ·  ${state.poaches.length} poached`, textStyle(16, GOLD))
      .setOrigin(0, 0.5);

    const rows = [['OFFENSE', team.offense, 70], ['DEFENSE', team.defense, 430]] as const;
    for (const [name, group, x] of rows) {
      this.add.text(x, 572, `${name}   OVR ${averageOverall(group)}`, textStyle(12, GRAY)).setOrigin(0, 0.5);
      rosterStrip(this, x + 150, 610, group, 36, 44);
    }

    new MenuButton(this, 1075, 590, 'Save & Quit', () => fadeTo(this, 'TitleScene'), { width: 240, height: 44, fontSize: 16, secondary: true });
    label(this, 1075, 632, 'your run is saved', DIM, '13px');
  }
}
