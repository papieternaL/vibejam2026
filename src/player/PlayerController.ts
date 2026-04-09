import * as THREE from 'three';
import { playerConfig } from '../config/playerConfig';
import { combatConfig } from '../config/combatConfig';
import { damp, dampAngle, moveTowards } from '../core/math';
import { InputManager } from '../core/InputManager';
import { GrayboxArena } from '../game/GrayboxArena';
import type {
  DamageRequest,
  DamageResult,
  DamageableTarget,
  ProjectileHitResult,
  StatusSpec,
  TeamId,
  WorldSpawnApi,
} from '../game/combatTypes';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerCombatController } from './PlayerCombatController';
import type { HeroVisualPhase, HeroVisualState } from './animation/AnimationStateTypes';

const upAxis = new THREE.Vector3(0, 1, 0);

type PlayerUpdateContext = {
  input: InputManager;
  arena: GrayboxArena;
  cameraYaw: number;
  cameraPitch: number;
  aimTarget: THREE.Vector3;
  world: WorldSpawnApi;
};

type CombatRuntimeState = {
  moveScale: number;
  extraVelocity: THREE.Vector3;
  desiredFacingYaw: number | null;
  turnSharpness: number;
  attackWeight: number;
  attackSide: number;
  chargeRatio: number;
  visualLift: number;
  spinRate: number;
  actionTint: number;
  cameraMode: 'normal' | 'combat';
  screenShake: number;
  actionLabel: string;
  visualState: HeroVisualState;
  visualPhase: HeroVisualPhase;
  phaseProgress: number;
  verticalImpulse: number | null;
  shieldActive: boolean;
  shieldFlash: number;
};

export class PlayerController implements DamageableTarget {
  readonly id = 'player';
  readonly team: TeamId = 'hero';
  readonly radius = 0.75;

  private readonly root = new THREE.Group();
  private readonly avatar = new PlayerAvatar();
  private readonly movementVelocity = new THREE.Vector3();
  private readonly techVelocity = new THREE.Vector3();
  private readonly retainedLandingVelocity = new THREE.Vector3();
  private readonly recentAirDashVelocity = new THREE.Vector3();
  private readonly movementDirection = new THREE.Vector3(0, 0, 1);
  private readonly desiredFacingDirection = new THREE.Vector3(0, 0, 1);
  readonly position = new THREE.Vector3();
  private readonly combat = new PlayerCombatController();
  private readonly headCenter = new THREE.Vector3();
  private readonly bodyCenter = new THREE.Vector3();

  private verticalVelocity = 0;
  private grounded = true;
  private jumpHeldLatch = false;
  private hadAirDashSinceTakeoff = false;
  private momentumJumpWindowTimer = 0;
  private momentumFeedbackTimer = 0;
  private boostPadFeedbackTimer = 0;
  private boostPadLockId: string | null = null;
  private facingYaw = 0;
  private health = playerConfig.maxHealth;
  private readonly maxHealth = playerConfig.maxHealth;
  private lastCombatState: CombatRuntimeState = {
    moveScale: 1,
    extraVelocity: new THREE.Vector3(),
    desiredFacingYaw: null,
    turnSharpness: combatConfig.movement.turnSharpness,
    attackWeight: 0,
    attackSide: 0,
    chargeRatio: 0,
    visualLift: 0,
    spinRate: 0,
    actionTint: 0,
    cameraMode: 'normal',
    screenShake: 0,
    actionLabel: 'Ready',
    visualState: 'idle',
    visualPhase: 'loop',
    phaseProgress: 0,
    verticalImpulse: null,
    shieldActive: false,
    shieldFlash: 0,
  };

  constructor(scene: THREE.Scene, spawnPoint: THREE.Vector3) {
    this.position.copy(spawnPoint);
    this.root.position.copy(this.position);
    this.root.add(this.avatar.group);
    scene.add(this.root);
  }

  update(deltaSeconds: number, context: PlayerUpdateContext): void {
    const wasGrounded = this.grounded;
    this.momentumJumpWindowTimer = Math.max(0, this.momentumJumpWindowTimer - deltaSeconds);
    this.momentumFeedbackTimer = Math.max(0, this.momentumFeedbackTimer - deltaSeconds);
    this.boostPadFeedbackTimer = Math.max(0, this.boostPadFeedbackTimer - deltaSeconds);
    this.techVelocity.multiplyScalar(Math.exp(-combatConfig.momentumTech.momentumDecayRate * deltaSeconds));
    if (this.techVelocity.lengthSq() < 0.0025) {
      this.techVelocity.set(0, 0, 0);
    }

    const moveX = Number(context.input.isDown('moveRight')) - Number(context.input.isDown('moveLeft'));
    const moveZ = Number(context.input.isDown('moveForward')) - Number(context.input.isDown('moveBackward'));

    const cameraForward = new THREE.Vector3(Math.sin(context.cameraYaw), 0, Math.cos(context.cameraYaw));
    const cameraRight = new THREE.Vector3().crossVectors(cameraForward, upAxis).negate();
    const facingForward = new THREE.Vector3(Math.sin(this.facingYaw), 0, Math.cos(this.facingYaw));
    const facingRight = new THREE.Vector3(facingForward.z, 0, -facingForward.x);
    const projectileSpawnOrigin = this.position
      .clone()
      .add(new THREE.Vector3(0, 1.28, 0))
      .addScaledVector(facingRight, -0.18)
      .addScaledVector(facingForward, 0.68);
    const desiredMove = new THREE.Vector3()
      .addScaledVector(cameraRight, moveX)
      .addScaledVector(cameraForward, moveZ);

    if (desiredMove.lengthSq() > 1) {
      desiredMove.normalize();
    }

    if (desiredMove.lengthSq() > 0.0001) {
      this.desiredFacingDirection.copy(desiredMove);
      this.movementDirection.x = damp(
        this.movementDirection.x,
        this.desiredFacingDirection.x,
        combatConfig.movement.movementSmoothing,
        deltaSeconds,
      );
      this.movementDirection.y = 0;
      this.movementDirection.z = damp(
        this.movementDirection.z,
        this.desiredFacingDirection.z,
        combatConfig.movement.movementSmoothing,
        deltaSeconds,
      );
      this.movementDirection.normalize();
    }

    this.lastCombatState = this.combat.update({
      deltaSeconds,
      input: context.input,
      facingYaw: this.facingYaw,
      cameraYaw: context.cameraYaw,
      cameraPitch: context.cameraPitch,
      grounded: this.grounded,
      world: context.world,
      projectileSpawnOrigin,
      aimTarget: context.aimTarget,
      desiredMove,
    });

    if (!wasGrounded && this.lastCombatState.actionLabel === 'Dashing') {
      this.recentAirDashVelocity.set(
        this.lastCombatState.extraVelocity.x,
        0,
        this.lastCombatState.extraVelocity.z,
      );
      this.hadAirDashSinceTakeoff = true;
    }

    const speedScale = this.lastCombatState.moveScale;
    const targetStrafeSpeed = moveX * combatConfig.movement.strafeMoveSpeed * speedScale;
    const targetForwardSpeed = moveZ * combatConfig.movement.forwardMoveSpeed * speedScale;
    const currentStrafeSpeed = this.movementVelocity.dot(cameraRight);
    const currentForwardSpeed = this.movementVelocity.dot(cameraForward);
    const airControlScale = this.combat.getAirControlScale();
    const groundedAccelScale = this.grounded ? 1 : combatConfig.movement.airControl * airControlScale;
    const strafeAccel =
      combatConfig.movement.acceleration *
      combatConfig.movement.strafeAccelerationMultiplier *
      groundedAccelScale;
    const strafeDecel =
      combatConfig.movement.deceleration *
      combatConfig.movement.strafeAccelerationMultiplier *
      groundedAccelScale;
    const forwardAccel = combatConfig.movement.acceleration * groundedAccelScale;
    const forwardDecel = combatConfig.movement.deceleration * groundedAccelScale;
    const strafeReverseAccel =
      combatConfig.movement.reverseAcceleration *
      combatConfig.movement.strafeAccelerationMultiplier *
      groundedAccelScale;
    const forwardReverseAccel = combatConfig.movement.reverseAcceleration * groundedAccelScale;

    const nextStrafeSpeed = moveTowards(
      currentStrafeSpeed,
      targetStrafeSpeed,
      this.resolveAxisMaxDelta(currentStrafeSpeed, targetStrafeSpeed, strafeAccel, strafeDecel, strafeReverseAccel, deltaSeconds),
    );
    const nextForwardSpeed = moveTowards(
      currentForwardSpeed,
      targetForwardSpeed,
      this.resolveAxisMaxDelta(currentForwardSpeed, targetForwardSpeed, forwardAccel, forwardDecel, forwardReverseAccel, deltaSeconds),
    );

    this.movementVelocity
      .copy(cameraRight)
      .multiplyScalar(nextStrafeSpeed)
      .addScaledVector(cameraForward, nextForwardSpeed);

    if (Math.abs(nextStrafeSpeed) < combatConfig.movement.stopSpeedEpsilon) {
      this.movementVelocity.addScaledVector(cameraRight, -nextStrafeSpeed);
    }
    if (Math.abs(nextForwardSpeed) < combatConfig.movement.stopSpeedEpsilon) {
      this.movementVelocity.addScaledVector(cameraForward, -nextForwardSpeed);
    }

    if (!context.input.isDown('jump')) {
      this.jumpHeldLatch = false;
    }

    const jumpRequested =
      context.input.wasPressed('jump') || (context.input.isDown('jump') && !this.jumpHeldLatch);

    if (this.grounded && jumpRequested && !this.combat.isBusy()) {
      const momentumJumpReady =
        this.momentumJumpWindowTimer > 0 &&
        this.retainedLandingVelocity.length() >= combatConfig.momentumTech.minimumCarrySpeed;
      if (momentumJumpReady) {
        this.techVelocity
          .copy(this.retainedLandingVelocity)
          .multiplyScalar(combatConfig.momentumTech.boostedJumpHorizontalMultiplier);
        this.clampPlanarSpeed(this.techVelocity, combatConfig.momentumTech.maxCarrySpeedCap);
        this.verticalVelocity =
          combatConfig.movement.jumpSpeed + combatConfig.momentumTech.boostedJumpVerticalBonus;
        this.momentumJumpWindowTimer = 0;
        this.retainedLandingVelocity.set(0, 0, 0);
        this.momentumFeedbackTimer = 0.14;
      } else {
        this.verticalVelocity = combatConfig.movement.jumpSpeed;
      }
      this.grounded = false;
      this.jumpHeldLatch = true;
    } else {
      this.verticalVelocity -= combatConfig.movement.gravity * this.combat.getGravityScale() * deltaSeconds;
    }

    if (this.lastCombatState.verticalImpulse !== null) {
      this.verticalVelocity = Math.max(this.verticalVelocity, this.lastCombatState.verticalImpulse);
      this.grounded = false;
    }

    const planarVelocity = this.movementVelocity
      .clone()
      .add(new THREE.Vector3(this.lastCombatState.extraVelocity.x, 0, this.lastCombatState.extraVelocity.z))
      .add(this.techVelocity);
    const proposedPosition = this.position.clone().addScaledVector(planarVelocity, deltaSeconds);
    const resolvedPosition = context.arena.resolvePlayerMovement(
      this.position,
      proposedPosition,
      playerConfig.colliderRadius,
    );
    this.position.x = resolvedPosition.x;
    this.position.z = resolvedPosition.z;

    const boostPadLaunch = context.arena.sampleBoostPad(this.position);
    if (boostPadLaunch) {
      if (this.boostPadLockId !== boostPadLaunch.id) {
        this.techVelocity.addScaledVector(boostPadLaunch.forward, boostPadLaunch.forwardSpeed);
        this.clampPlanarSpeed(
          this.techVelocity,
          Math.max(combatConfig.momentumTech.maxCarrySpeedCap + 3, boostPadLaunch.forwardSpeed + 4),
        );
        this.verticalVelocity = Math.max(this.verticalVelocity, boostPadLaunch.upwardSpeed);
        this.grounded = false;
        this.boostPadLockId = boostPadLaunch.id;
        this.boostPadFeedbackTimer = 0.18;
      }
    } else {
      this.boostPadLockId = null;
    }

    const effectiveVerticalVelocity = this.verticalVelocity + this.lastCombatState.extraVelocity.y;
    this.position.y += effectiveVerticalVelocity * deltaSeconds;
    const groundHeight = context.arena.sampleGroundHeight(this.position.x, this.position.z);

    if (this.position.y <= groundHeight + playerConfig.groundSnapDistance && effectiveVerticalVelocity <= 0) {
      this.position.y = groundHeight;
      this.verticalVelocity = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    if (!wasGrounded && this.grounded) {
      if (
        this.hadAirDashSinceTakeoff &&
        this.recentAirDashVelocity.length() >= combatConfig.momentumTech.minimumCarrySpeed
      ) {
        this.retainedLandingVelocity
          .copy(this.recentAirDashVelocity)
          .multiplyScalar(combatConfig.momentumTech.retentionPercent);
        this.clampPlanarSpeed(this.retainedLandingVelocity, combatConfig.momentumTech.maxCarrySpeedCap);
        this.techVelocity.copy(this.retainedLandingVelocity);
        this.momentumJumpWindowTimer = combatConfig.momentumTech.jumpWindowDuration;
      } else {
        this.retainedLandingVelocity.set(0, 0, 0);
        this.momentumJumpWindowTimer = 0;
      }
      this.recentAirDashVelocity.set(0, 0, 0);
      this.hadAirDashSinceTakeoff = false;
    }

    const desiredFacingYaw =
      this.lastCombatState.desiredFacingYaw ??
      (desiredMove.lengthSq() > 0.0001
        ? Math.atan2(this.movementDirection.x, this.movementDirection.z)
        : context.cameraYaw);
    this.facingYaw = dampAngle(
      this.facingYaw,
      desiredFacingYaw,
      this.lastCombatState.turnSharpness,
      deltaSeconds,
    );

    this.root.position.copy(this.position);
    this.root.rotation.y = this.facingYaw;

    const maxMoveSpeed = Math.max(
      combatConfig.movement.forwardMoveSpeed,
      combatConfig.movement.strafeMoveSpeed,
    );
    const normalizedSpeed = Math.min(1, planarVelocity.length() / Math.max(maxMoveSpeed, combatConfig.momentumTech.maxCarrySpeedCap));
    const forward = new THREE.Vector3(Math.sin(this.facingYaw), 0, Math.cos(this.facingYaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const localMoveX = THREE.MathUtils.clamp(
      planarVelocity.dot(right) / combatConfig.movement.strafeMoveSpeed,
      -1,
      1,
    );
    const localMoveZ = THREE.MathUtils.clamp(
      planarVelocity.dot(forward) / combatConfig.movement.forwardMoveSpeed,
      -1,
      1,
    );
    let locomotionState: HeroVisualState = this.lastCombatState.visualState;
    if (this.lastCombatState.visualState === 'idle') {
      locomotionState =
        normalizedSpeed > 0.72 ? 'fastMove' : normalizedSpeed > 0.18 ? 'run' : 'idle';
    }

    this.avatar.update(deltaSeconds, {
      normalizedSpeed,
      localMoveX,
      localMoveZ,
      grounded: this.grounded,
      chargeRatio: this.lastCombatState.chargeRatio,
      attackWeight: this.lastCombatState.attackWeight,
      attackSide: this.lastCombatState.attackSide,
      visualLift: this.lastCombatState.visualLift,
      spinRate: this.lastCombatState.spinRate,
      actionTint: Math.max(
        this.lastCombatState.actionTint,
        this.momentumFeedbackTimer * 0.85,
        this.boostPadFeedbackTimer * 0.68,
      ),
      hitConfirm: this.combat.getHitConfirm(),
      shieldActive: this.lastCombatState.shieldActive,
      shieldFlash: this.lastCombatState.shieldFlash,
      visualState: locomotionState,
      visualPhase: this.lastCombatState.visualPhase,
      phaseProgress: this.lastCombatState.phaseProgress,
    });
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  getFollowTarget(): THREE.Vector3 {
    return this.position.clone().add(
      new THREE.Vector3(0, playerConfig.followAnchorHeight + this.lastCombatState.visualLift * 0.4, 0),
    );
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getFacingYaw(): number {
    return this.facingYaw;
  }

  getMovementState(): { moveSpeed: number; verticalSpeed: number; grounded: boolean } {
    const planarSpeed = this.movementVelocity
      .clone()
      .add(new THREE.Vector3(this.lastCombatState.extraVelocity.x, 0, this.lastCombatState.extraVelocity.z))
      .add(this.techVelocity)
      .length();
    return {
      moveSpeed: planarSpeed,
      verticalSpeed: this.verticalVelocity + this.lastCombatState.extraVelocity.y,
      grounded: this.grounded,
    };
  }

  getCameraState(): { mode: 'normal' | 'combat'; shake: number } {
    return {
      mode: this.lastCombatState.cameraMode,
      shake: this.lastCombatState.screenShake,
    };
  }

  getHudState(): {
    health: number;
    maxHealth: number;
    actionLabel: string;
    chargeRatio: number;
    cooldowns: Record<string, number>;
    hitConfirm: number;
    visualState: string;
    visualPhase: string;
  } {
    const animationDebug = this.avatar.getDebugState();
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      actionLabel: this.lastCombatState.actionLabel,
      chargeRatio: this.combat.getFireCooldownRatio(),
      cooldowns: this.combat.getCooldowns(),
      hitConfirm: this.combat.getHitConfirm(),
      visualState: animationDebug.visualState,
      visualPhase: animationDebug.visualPhase,
    };
  }

  notifyProjectileHit(part: 'body' | 'head' | 'shield'): void {
    this.combat.notifyProjectileHit(part);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  applyDamage(request: DamageRequest): DamageResult {
    if (request.sourceTeam === this.team || !this.isAlive()) {
      return { applied: false, died: false, amount: 0 };
    }

    this.health = Math.max(0, this.health - request.amount);
    return {
      applied: true,
      died: this.health <= 0,
      amount: request.amount,
    };
  }

  applyStatus(_status: StatusSpec): void {}

  getMovementScalar(): number {
    return 1;
  }

  getDebugStatuses(): string[] {
    const statuses: string[] = [];
    if (this.combat.isShieldActive()) {
      statuses.push('shield');
    }
    if (this.momentumJumpWindowTimer > 0) {
      statuses.push(`momentum:${this.momentumJumpWindowTimer.toFixed(2)}`);
    }
    if (this.boostPadFeedbackTimer > 0 && this.boostPadLockId) {
      statuses.push(`boost:${this.boostPadLockId}`);
    }
    return statuses;
  }

  private clampPlanarSpeed(vector: THREE.Vector3, maxSpeed: number): void {
    const planarSpeed = Math.hypot(vector.x, vector.z);
    if (planarSpeed <= maxSpeed || planarSpeed <= 0.0001) {
      return;
    }

    const scale = maxSpeed / planarSpeed;
    vector.x *= scale;
    vector.z *= scale;
  }

  resolveProjectileHit(
    segmentStart: THREE.Vector3,
    segmentEnd: THREE.Vector3,
    projectileRadius: number,
    sourceTeam: TeamId,
  ): ProjectileHitResult | null {
    if (sourceTeam === this.team || !this.isAlive()) {
      return null;
    }

    const shotDirection = segmentEnd.clone().sub(segmentStart).normalize();
    this.bodyCenter.copy(this.position).setY(this.position.y + 1.12);
    this.headCenter.copy(this.position).setY(this.position.y + 1.98);

    if (
      this.combat.isShieldActive() &&
      this.segmentHitsSphere(segmentStart, segmentEnd, this.bodyCenter, combatConfig.shield.radius + projectileRadius)
    ) {
      this.combat.consumeShieldHit();
      return {
        position: this.bodyCenter.clone(),
        part: 'shield',
        damage: 0,
        blocked: true,
        died: false,
        flashColor: combatConfig.feedback.abilityFlashColors.shield,
        pulseScale: combatConfig.feedback.abilityPulseScales.shield,
      };
    }

    if (this.segmentHitsSphere(segmentStart, segmentEnd, this.headCenter, 0.3 + projectileRadius)) {
      const damage = combatConfig.bow.damage.head;
      const result = this.applyDamage({
        amount: damage,
        sourceTeam,
        sourceAbility: 'arrow-headshot',
        tags: ['projectile', 'ranged', 'headshot'],
        hitFlashColor: combatConfig.feedback.abilityFlashColors.headshot,
        hitDirection: shotDirection,
      });
      return {
        position: this.headCenter.clone(),
        part: 'head',
        damage,
        blocked: false,
        died: result.died,
        flashColor: combatConfig.feedback.abilityFlashColors.headshot,
        pulseScale: combatConfig.feedback.abilityPulseScales.headshot,
      };
    }

    if (this.segmentHitsSphere(segmentStart, segmentEnd, this.bodyCenter, 0.78 + projectileRadius)) {
      const damage = combatConfig.bow.damage.body;
      const result = this.applyDamage({
        amount: damage,
        sourceTeam,
        sourceAbility: 'arrow-body',
        tags: ['projectile', 'ranged'],
        hitFlashColor: combatConfig.feedback.abilityFlashColors.arrow,
        hitDirection: shotDirection,
      });
      return {
        position: this.bodyCenter.clone(),
        part: 'body',
        damage,
        blocked: false,
        died: result.died,
        flashColor: combatConfig.feedback.abilityFlashColors.arrow,
        pulseScale: combatConfig.feedback.abilityPulseScales.arrow,
      };
    }

    return null;
  }

  private resolveAxisMaxDelta(
    current: number,
    target: number,
    acceleration: number,
    deceleration: number,
    reverseAcceleration: number,
    deltaSeconds: number,
  ): number {
    if (Math.abs(target) <= 0.0001) {
      return deceleration * deltaSeconds;
    }

    if (Math.abs(current) > 0.0001 && Math.sign(current) !== Math.sign(target)) {
      return reverseAcceleration * deltaSeconds;
    }

    return acceleration * deltaSeconds;
  }

  private segmentHitsSphere(
    segmentStart: THREE.Vector3,
    segmentEnd: THREE.Vector3,
    center: THREE.Vector3,
    radius: number,
  ): boolean {
    const segment = segmentEnd.clone().sub(segmentStart);
    const startToCenter = center.clone().sub(segmentStart);
    const segmentLengthSq = Math.max(segment.lengthSq(), 0.0001);
    const travel = THREE.MathUtils.clamp(startToCenter.dot(segment) / segmentLengthSq, 0, 1);
    const closestPoint = segmentStart.clone().addScaledVector(segment, travel);
    return closestPoint.distanceTo(center) <= radius;
  }
}
