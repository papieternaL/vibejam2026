import * as THREE from 'three';
import { round } from '../core/math';
import { InputManager } from '../core/InputManager';
import { DummyTarget } from '../entities/DummyTarget';
import { ArrowProjectile } from '../entities/ArrowProjectile';
import { BurnZone } from '../entities/BurnZone';
import { DragonWave } from '../entities/DragonWave';
import { HitPulse } from '../entities/HitPulse';
import { VaultImpactEffect } from '../entities/VaultImpactEffect';
import { RoarBurstEffect } from '../entities/RoarBurstEffect';
import type { DamageableTarget, WorldSpawnApi } from './combatTypes';
import { GrayboxArena } from './GrayboxArena';
import { PlayerController } from '../player/PlayerController';
import { ThirdPersonCameraRig } from '../player/ThirdPersonCameraRig';
import { DebugHud } from '../ui/DebugHud';
import { combatConfig } from '../config/combatConfig';

export class GameWorld {
  private static readonly aimTargetDistance = 56;
  private readonly aimRaycaster = new THREE.Raycaster();
  private readonly aimScreenCenter = new THREE.Vector2(0, 0);

  private readonly scene = new THREE.Scene();
  private readonly arena: GrayboxArena;
  private readonly player: PlayerController;
  private readonly cameraRig: ThirdPersonCameraRig;
  private readonly hud: DebugHud;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly input: InputManager;
  private readonly dummies: DummyTarget[];
  private readonly arrows: ArrowProjectile[] = [];
  private readonly burnZones: BurnZone[] = [];
  private readonly dragonWaves: DragonWave[] = [];
  private readonly hitPulses: HitPulse[] = [];
  private readonly vaultImpacts: VaultImpactEffect[] = [];
  private readonly roarBursts: RoarBurstEffect[] = [];
  private gameplayPaused = false;

  constructor(overlayParent: HTMLElement, renderer: THREE.WebGLRenderer, input: InputManager) {
    this.renderer = renderer;
    this.input = input;
    this.scene.background = new THREE.Color(0xc6d7bf);
    this.scene.fog = new THREE.Fog(0xc6d7bf, 36, 78);

    this.setupLighting();

    this.arena = new GrayboxArena(this.scene);
    this.player = new PlayerController(this.scene, this.arena.getSpawnPoint());
    this.cameraRig = new ThirdPersonCameraRig(this.player.getFacingYaw());
    this.hud = new DebugHud(overlayParent);
    this.dummies = this.createDummyTargets();
  }

  update(deltaSeconds: number): void {
    if (this.gameplayPaused) {
      return;
    }

    this.arena.update(deltaSeconds);

    const lookDelta = this.input.consumeLookDelta();
    this.cameraRig.applyLookInput(lookDelta.x, lookDelta.y);
    const aimTarget = this.resolveAimTarget();

    this.player.update(deltaSeconds, {
      input: this.input,
      arena: this.arena,
      cameraYaw: this.cameraRig.getYaw(),
      cameraPitch: this.cameraRig.getPitch(),
      aimTarget,
      world: this.createWorldSpawnApi(),
    });

    for (const dummy of this.dummies) {
      dummy.update(deltaSeconds);
    }

    this.updateArrows(deltaSeconds);
    this.updateBurnZones(deltaSeconds);
    this.updateDragonWaves(deltaSeconds);
    this.updateHitPulses(deltaSeconds);
    this.updateVaultImpacts(deltaSeconds);
    this.updateRoarBursts(deltaSeconds);

    const cameraState = this.player.getCameraState();
    this.cameraRig.update(
      deltaSeconds,
      this.player.getFollowTarget(),
      this.player.getFacingYaw(),
      cameraState.mode,
      cameraState.shake,
    );

    const movement = this.player.getMovementState();
    const combatHud = this.player.getHudState();
    this.hud.update({
      pointerLocked: this.input.isPointerLocked(),
      playerPosition: this.player.getPosition(),
      moveSpeed: movement.moveSpeed,
      verticalSpeed: movement.verticalSpeed,
      grounded: movement.grounded,
      cameraYaw: this.cameraRig.getYaw(),
      cameraPitch: this.cameraRig.getPitch(),
      health: combatHud.health,
      maxHealth: combatHud.maxHealth,
      actionLabel: combatHud.actionLabel,
      chargeRatio: combatHud.chargeRatio,
      hitConfirm: combatHud.hitConfirm,
      visualState: combatHud.visualState,
      visualPhase: combatHud.visualPhase,
      cooldowns: combatHud.cooldowns,
      arrowsActive: this.arrows.length,
      dummySummaries: this.dummies.slice(0, 3).map((dummy) => ({
        id: dummy.id,
        healthRatio: dummy.getHealthRatio(),
        statuses: dummy.getDebugStatuses(),
      })),
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  renderWithCamera(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  resize(aspectRatio: number): void {
    this.cameraRig.resize(aspectRatio);
  }

  describeState(): string {
    const position = this.player.getPosition();
    const movement = this.player.getMovementState();
    const hud = this.player.getHudState();

    return JSON.stringify({
      coordinateSystem: 'Three.js world, +x east, +y up, +z north from blue spawn toward red spawn',
      player: {
        x: round(position.x),
        y: round(position.y),
        z: round(position.z),
        facingYaw: round(this.player.getFacingYaw()),
        grounded: movement.grounded,
        moveSpeed: round(movement.moveSpeed),
        verticalSpeed: round(movement.verticalSpeed),
        health: hud.health,
        action: hud.actionLabel,
        charge: round(hud.chargeRatio),
      },
      camera: {
        yaw: round(this.cameraRig.getYaw()),
        pitch: round(this.cameraRig.getPitch()),
      },
      arrows: this.arrows.map((arrow) => ({
        x: round(arrow.getPosition().x),
        y: round(arrow.getPosition().y),
        z: round(arrow.getPosition().z),
      })),
      dummies: this.dummies.map((dummy) => ({
        id: dummy.id,
        alive: dummy.isAlive(),
        x: round(dummy.position.x),
        z: round(dummy.position.z),
        healthRatio: round(dummy.getHealthRatio()),
        statuses: dummy.getDebugStatuses(),
      })),
      boostPads: this.arena.getBoostPadDebugState().map((pad) => ({
        id: pad.id,
        x: round(pad.x),
        y: round(pad.y),
        z: round(pad.z),
      })),
      grappleAnchors: this.arena.getGrappleAnchorDebugState().map((anchor) => ({
        id: anchor.id,
        kind: anchor.kind,
        radius: round(anchor.radius),
        x: round(anchor.x),
        y: round(anchor.y),
        z: round(anchor.z),
      })),
      playerStatuses: this.player.getDebugStatuses(),
    });
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getGameplayCamera(): THREE.Camera {
    return this.cameraRig.camera;
  }

  getEditableObjects(): THREE.Object3D[] {
    const editable: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (object.userData.editableRoot === true) {
        editable.push(object);
      }
    });
    return editable;
  }

  setGameplayPaused(paused: boolean): void {
    this.gameplayPaused = paused;
  }

  setGameplayHudVisible(visible: boolean): void {
    this.hud.setVisible(visible);
  }

  setEditHelpersVisible(visible: boolean): void {
    this.arena.setHelpersVisible(visible);
  }

  private createDummyTargets(): DummyTarget[] {
    const spawnPoints = [
      new THREE.Vector3(0, 0, 7.2),
      new THREE.Vector3(-18.2, 1.4, -4.8),
      new THREE.Vector3(-11.8, 3.25, 4.6),
      new THREE.Vector3(18.6, 1.2, -9.4),
      new THREE.Vector3(14.6, 3.55, 7.3),
    ];

    return spawnPoints.map(
      (spawnPoint, index) => new DummyTarget(this.scene, `dummy-${index + 1}`, spawnPoint),
    );
  }

  private createWorldSpawnApi(): WorldSpawnApi {
    return {
      spawnArrow: (position, direction, sourceTeam = 'hero', options) => {
        this.arrows.push(
          new ArrowProjectile(this.scene, position.clone(), direction.clone(), sourceTeam, options),
        );
      },
      spawnBurnZone: (position, directionYaw) => {
        this.burnZones.push(new BurnZone(this.scene, position.clone(), directionYaw));
      },
      spawnDragonWave: (position, directionYaw) => {
        this.dragonWaves.push(new DragonWave(this.scene, position.clone(), directionYaw));
      },
      spawnHitPulse: (position, color, size) => {
        this.hitPulses.push(new HitPulse(this.scene, position.clone(), color, size));
      },
      spawnVaultImpact: (position, radius) => {
        this.vaultImpacts.push(
          new VaultImpactEffect(
            this.scene,
            position.clone(),
            radius,
            combatConfig.feedback.abilityFlashColors.vault,
          ),
        );
      },
      spawnRoarBurst: (position, radius) => {
        this.roarBursts.push(
          new RoarBurstEffect(
            this.scene,
            position.clone(),
            radius,
            combatConfig.feedback.abilityFlashColors.wheel,
          ),
        );
      },
    };
  }

  private resolveAimTarget(): THREE.Vector3 {
    this.aimRaycaster.setFromCamera(this.aimScreenCenter, this.cameraRig.camera);

    const colliders: THREE.Object3D[] = [
      ...this.arena.getEditableObjects(),
      ...this.dummies.map((dummy) => dummy.getEditableObject()),
    ];
    const hits = this.aimRaycaster.intersectObjects(colliders, true);
    const validHit = hits.find((hit) => hit.distance > 0.1);
    if (validHit) {
      return validHit.point.clone();
    }

    return this.aimRaycaster.ray.origin
      .clone()
      .addScaledVector(this.aimRaycaster.ray.direction, GameWorld.aimTargetDistance);
  }

  private updateBurnZones(deltaSeconds: number): void {
    for (let index = this.burnZones.length - 1; index >= 0; index -= 1) {
      const zone = this.burnZones[index];
      const alive = zone.update(deltaSeconds, this.dummies);
      if (!alive) {
        zone.dispose(this.scene);
        this.burnZones.splice(index, 1);
      }
    }
  }

  private updateArrows(deltaSeconds: number): void {
    const targets: DamageableTarget[] = [this.player, ...this.dummies];
    for (let index = this.arrows.length - 1; index >= 0; index -= 1) {
      const arrow = this.arrows[index];
      const impact = arrow.update(deltaSeconds, targets);

      if (impact?.hit) {
        this.player.notifyProjectileHit(impact.part);
        this.hitPulses.push(
          new HitPulse(
            this.scene,
            impact.position.clone(),
            impact.flashColor,
            impact.pulseScale,
          ),
        );
      }

      if (impact || arrow.isExpired()) {
        arrow.dispose(this.scene);
        this.arrows.splice(index, 1);
      }
    }
  }

  private updateDragonWaves(deltaSeconds: number): void {
    for (let index = this.dragonWaves.length - 1; index >= 0; index -= 1) {
      const wave = this.dragonWaves[index];
      const alive = wave.update(deltaSeconds, this.dummies);
      if (!alive) {
        wave.dispose(this.scene);
        this.dragonWaves.splice(index, 1);
      }
    }
  }

  private updateHitPulses(deltaSeconds: number): void {
    for (let index = this.hitPulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.hitPulses[index];
      const alive = pulse.update(deltaSeconds);
      if (!alive) {
        pulse.dispose(this.scene);
        this.hitPulses.splice(index, 1);
      }
    }
  }

  private updateVaultImpacts(deltaSeconds: number): void {
    for (let index = this.vaultImpacts.length - 1; index >= 0; index -= 1) {
      const effect = this.vaultImpacts[index];
      const alive = effect.update(deltaSeconds);
      if (!alive) {
        effect.dispose(this.scene);
        this.vaultImpacts.splice(index, 1);
      }
    }
  }

  private updateRoarBursts(deltaSeconds: number): void {
    for (let index = this.roarBursts.length - 1; index >= 0; index -= 1) {
      const effect = this.roarBursts[index];
      const alive = effect.update(deltaSeconds);
      if (!alive) {
        effect.dispose(this.scene);
        this.roarBursts.splice(index, 1);
      }
    }
  }

  private setupLighting(): void {
    const hemisphere = new THREE.HemisphereLight(0xf6f6dd, 0x5e715d, 1.95);
    this.scene.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xfff0cf, 2.75);
    keyLight.position.set(14, 22, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -34;
    keyLight.shadow.camera.right = 34;
    keyLight.shadow.camera.top = 34;
    keyLight.shadow.camera.bottom = -34;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 68;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc7e1cf, 0.75);
    fillLight.position.set(-10, 12, -16);
    this.scene.add(fillLight);
  }
}
