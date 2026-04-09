import * as THREE from 'three';
import { round } from '../core/math';

type HudState = {
  pointerLocked: boolean;
  playerPosition: THREE.Vector3;
  moveSpeed: number;
  verticalSpeed: number;
  grounded: boolean;
  cameraYaw: number;
  cameraPitch: number;
  health: number;
  maxHealth: number;
  actionLabel: string;
  chargeRatio: number;
  hitConfirm: number;
  visualState: string;
  visualPhase: string;
  cooldowns: Record<string, number>;
  arrowsActive: number;
  dummySummaries: Array<{
    id: string;
    healthRatio: number;
    statuses: string[];
  }>;
};

export class DebugHud {
  private readonly layer = document.createElement('div');
  private readonly leftPanel = document.createElement('section');
  private readonly rightPanel = document.createElement('section');
  private readonly reticle = document.createElement('div');

  constructor(parent: HTMLElement) {
    this.layer.className = 'hud-layer';
    this.leftPanel.className = 'hud-panel hud-panel-left';
    this.rightPanel.className = 'hud-panel hud-panel-right';
    this.reticle.className = 'reticle';

    this.leftPanel.innerHTML = `
      <h1>Ranged Prototype</h1>
      <div class="hud-bar">
        <div class="hud-bar-fill" data-role="health-fill"></div>
      </div>
      <p data-role="health-text"></p>
      <p data-role="action-text"></p>
      <div class="hud-bar hud-bar-charge">
        <div class="hud-bar-fill hud-bar-fill-charge" data-role="charge-fill"></div>
      </div>
      <p data-role="charge-text"></p>
    `;

    this.rightPanel.innerHTML = `
      <h2>Cooldowns / Debug</h2>
      <pre class="hud-readout" data-role="readout"></pre>
    `;

    this.layer.append(this.leftPanel, this.rightPanel);
    parent.append(this.layer, this.reticle);
  }

  update(state: HudState): void {
    const healthFill = this.leftPanel.querySelector<HTMLElement>('[data-role="health-fill"]');
    const healthText = this.leftPanel.querySelector<HTMLElement>('[data-role="health-text"]');
    const actionText = this.leftPanel.querySelector<HTMLElement>('[data-role="action-text"]');
    const chargeFill = this.leftPanel.querySelector<HTMLElement>('[data-role="charge-fill"]');
    const chargeText = this.leftPanel.querySelector<HTMLElement>('[data-role="charge-text"]');
    const readout = this.rightPanel.querySelector<HTMLPreElement>('[data-role="readout"]');

    if (!healthFill || !healthText || !actionText || !chargeFill || !chargeText || !readout) {
      return;
    }

    const healthRatio = state.health / Math.max(1, state.maxHealth);
    healthFill.style.width = `${healthRatio * 100}%`;
    healthText.textContent = `Health ${Math.round(state.health)} / ${state.maxHealth}`;
    actionText.textContent = `State: ${state.actionLabel}`;
    chargeFill.style.width = `${state.chargeRatio * 100}%`;
    const charging =
      state.actionLabel === 'Drawing Bow' ||
      state.actionLabel === 'Draw Ready' ||
      state.actionLabel === 'Full Charge';
    const drawReady = state.actionLabel === 'Draw Ready';
    const fullDrawReady = state.actionLabel === 'Full Charge';
    chargeFill.style.background = fullDrawReady
      ? 'linear-gradient(90deg, rgba(202, 247, 255, 0.95), rgba(123, 226, 255, 1))'
      : drawReady
        ? 'linear-gradient(90deg, rgba(255, 236, 165, 0.95), rgba(255, 196, 92, 1))'
      : 'linear-gradient(90deg, rgba(255, 205, 142, 0.95), rgba(255, 163, 89, 1))';
    chargeText.textContent = charging
      ? fullDrawReady
        ? 'Full charge ready'
        : drawReady
          ? 'Minimum draw reached'
          : `Drawing ${Math.round(state.chargeRatio * 100)}%`
      : state.actionLabel === 'Draw Cancelled'
        ? 'Draw released too early'
      : state.chargeRatio > 0
        ? `Arrow cooldown ${Math.round(state.chargeRatio * 100)}%`
        : 'Arrow ready';

    this.reticle.style.transform = `scale(${1 + state.hitConfirm * 1.8})`;
    this.reticle.style.borderColor = state.hitConfirm > 0 ? 'rgba(255, 242, 181, 1)' : 'rgba(255, 214, 170, 0.9)';

    readout.textContent = [
      `pointerLock: ${state.pointerLocked ? 'locked' : 'click to capture'}`,
      `player: x ${round(state.playerPosition.x)}  y ${round(state.playerPosition.y)}  z ${round(state.playerPosition.z)}`,
      `moveSpeed: ${round(state.moveSpeed)} m/s`,
      `verticalSpeed: ${round(state.verticalSpeed)} m/s`,
      `grounded: ${state.grounded}`,
      `cameraYaw: ${round(state.cameraYaw)}`,
      `cameraPitch: ${round(state.cameraPitch)}`,
      `visual: ${state.visualState}:${state.visualPhase}`,
      '',
      `fire cd: ${(state.cooldowns.fire ?? 0).toFixed(2)}`,
      `dash cd: ${(state.cooldowns.dash ?? 0).toFixed(2)}`,
      `launch cd: ${(state.cooldowns.launch ?? 0).toFixed(2)}`,
      `shield cd: ${(state.cooldowns.shield ?? 0).toFixed(2)}`,
      `arrows: ${state.arrowsActive}`,
      '',
      ...state.dummySummaries.map(
        (dummy) =>
          `${dummy.id}: ${Math.round(dummy.healthRatio * 100)}% ${dummy.statuses.length > 0 ? `[${dummy.statuses.join(', ')}]` : ''}`,
      ),
    ].join('\n');
  }

  setVisible(visible: boolean): void {
    this.layer.style.display = visible ? 'flex' : 'none';
    this.reticle.style.display = visible ? 'block' : 'none';
  }
}
