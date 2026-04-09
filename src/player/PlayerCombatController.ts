import * as THREE from 'three';
import { combatConfig } from '../config/combatConfig';
import { InputManager } from '../core/InputManager';
import type { WorldSpawnApi } from '../game/combatTypes';
import type { HeroVisualPhase, HeroVisualState } from './animation/AnimationStateTypes';

type CombatUpdateContext = {
  deltaSeconds: number;
  input: InputManager;
  facingYaw: number;
  cameraYaw: number;
  cameraPitch: number;
  grounded: boolean;
  world: WorldSpawnApi;
  projectileSpawnOrigin: THREE.Vector3;
  aimTarget: THREE.Vector3;
  desiredMove: THREE.Vector3;
};

type CombatPresentation = {
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

export class PlayerCombatController {
  private static readonly launchBurstSeconds = 0.1;
  private readonly impulseVelocity = new THREE.Vector3();
  private readonly dashDirection = new THREE.Vector3();
  private readonly shotDirection = new THREE.Vector3();
  private readonly spreadAxis = new THREE.Vector3();
  private readonly cooldowns: Record<string, number> = {
    fire: 0,
    dash: 0,
    launch: 0,
    shield: 0,
  };

  private dashTimer = 0;
  private launchTimer = 0;
  private shieldTimer = 0;
  private shieldFlashTimer = 0;
  private slowFallTimer = 0;
  private queuedSlowFallDuration = 0;
  private hitConfirmTimer = 0;
  private screenShake = 0;
  private firedThisFrame = false;
  private fireFeedbackTimer = 0;
  private lastFiredChargeRatio = 0;
  private launchVerticalImpulse: number | null = null;
  private chargeTimer = 0;
  private chargingShot = false;
  private shotChargeRatio = 0;
  private airDashesRemaining: number = combatConfig.dash.airDashCount;

  update(context: CombatUpdateContext): CombatPresentation {
    this.firedThisFrame = false;
    this.launchVerticalImpulse = null;
    this.shotChargeRatio = 0;

    for (const key of Object.keys(this.cooldowns)) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - context.deltaSeconds);
    }

    this.dashTimer = Math.max(0, this.dashTimer - context.deltaSeconds);
    this.launchTimer = Math.max(0, this.launchTimer - context.deltaSeconds);
    this.shieldTimer = Math.max(0, this.shieldTimer - context.deltaSeconds);
    this.shieldFlashTimer = Math.max(0, this.shieldFlashTimer - context.deltaSeconds);
    this.slowFallTimer = Math.max(0, this.slowFallTimer - context.deltaSeconds);
    this.fireFeedbackTimer = Math.max(0, this.fireFeedbackTimer - context.deltaSeconds);
    this.hitConfirmTimer = Math.max(0, this.hitConfirmTimer - context.deltaSeconds);
    this.screenShake = Math.max(0, this.screenShake - context.deltaSeconds * combatConfig.camera.shakeDamping);

    if (this.launchTimer <= 0 && this.queuedSlowFallDuration > 0) {
      this.slowFallTimer = this.queuedSlowFallDuration;
      this.queuedSlowFallDuration = 0;
    }

    if (context.grounded) {
      this.airDashesRemaining = combatConfig.dash.airDashCount;
    }

    const horizontalMoveDirection =
      context.desiredMove.lengthSq() > 0.0001
        ? context.desiredMove.clone().setY(0).normalize()
        : new THREE.Vector3(Math.sin(context.cameraYaw), 0, Math.cos(context.cameraYaw));
    const facingDirection = new THREE.Vector3(Math.sin(context.facingYaw), 0, Math.cos(context.facingYaw));
    const cameraForward3D = new THREE.Vector3(
      Math.sin(context.cameraYaw) * Math.cos(context.cameraPitch),
      Math.sin(context.cameraPitch),
      Math.cos(context.cameraYaw) * Math.cos(context.cameraPitch),
    ).normalize();

    if (
      context.input.wasPressed('dash') &&
      this.cooldowns.dash <= 0 &&
      (context.grounded || this.airDashesRemaining > 0)
    ) {
      this.dashDirection.copy(horizontalMoveDirection);
      if (this.dashDirection.lengthSq() < 0.0001) {
        this.dashDirection.set(cameraForward3D.x, 0, cameraForward3D.z);
        if (this.dashDirection.lengthSq() < 0.0001) {
          this.dashDirection.copy(facingDirection);
        } else {
          this.dashDirection.normalize();
        }
      }

      const downwardInfluence =
        Math.max(0, -cameraForward3D.y - 0.12) * combatConfig.dash.downwardDashMultiplier;
      this.dashDirection.y = -downwardInfluence;
      this.dashDirection.normalize();

      const dashSpeed = combatConfig.dash.speed;
      this.impulseVelocity.addScaledVector(this.dashDirection, dashSpeed);
      this.dashTimer = combatConfig.dash.duration;
      this.cooldowns.dash = combatConfig.dash.cooldown;
      this.screenShake = Math.max(this.screenShake, combatConfig.dash.shake);
      if (!context.grounded) {
        this.airDashesRemaining = Math.max(0, this.airDashesRemaining - 1);
      }
    }

    if (context.input.wasPressed('engage') && this.cooldowns.launch <= 0) {
      this.impulseVelocity.addScaledVector(facingDirection, combatConfig.launch.forwardSpeed);
      this.launchVerticalImpulse = combatConfig.launch.upwardSpeed;
      this.launchTimer = PlayerCombatController.launchBurstSeconds;
      this.slowFallTimer = 0;
      this.queuedSlowFallDuration = combatConfig.launch.slowFallDuration;
      this.cooldowns.launch = combatConfig.launch.cooldown;
      this.screenShake = Math.max(this.screenShake, combatConfig.launch.shake);
    }

    if (context.input.wasPressed('sweep') && this.cooldowns.shield <= 0 && this.shieldTimer <= 0) {
      this.shieldTimer = combatConfig.shield.duration;
      this.cooldowns.shield = combatConfig.shield.cooldown;
      this.shieldFlashTimer = combatConfig.shield.hitFlashSeconds * 0.6;
    }

    if (context.input.wasPressed('basicAttack') && this.cooldowns.fire <= 0 && !this.chargingShot) {
      this.chargingShot = true;
      this.chargeTimer = 0;
    }

    if (this.chargingShot && context.input.isDown('basicAttack')) {
      this.chargeTimer += context.deltaSeconds;
      this.shotChargeRatio = THREE.MathUtils.clamp(
        (this.chargeTimer - combatConfig.bow.charge.minReleaseTime) /
          Math.max(
            0.0001,
            combatConfig.bow.charge.fullChargeTime - combatConfig.bow.charge.minReleaseTime,
          ),
        0,
        1,
      );
    }

    if (this.chargingShot && context.input.wasReleased('basicAttack')) {
      this.shotDirection.copy(context.aimTarget).sub(context.projectileSpawnOrigin);
      if (this.shotDirection.lengthSq() < 0.0001) {
        this.shotDirection.copy(facingDirection);
      } else {
        this.shotDirection.normalize();
      }

      const speed = this.sampleChargeSpeed(this.shotChargeRatio);
      const gravity = this.sampleChargeGravity(this.shotChargeRatio);
      const lifetime = this.sampleChargeLifetime(this.shotChargeRatio);
      const spread = THREE.MathUtils.lerp(
        combatConfig.bow.arrow.tapSpreadRadians,
        combatConfig.bow.arrow.fullSpreadRadians,
        THREE.MathUtils.smoothstep(this.shotChargeRatio, 0, 1),
      );
      if (spread > 0.0001) {
        this.spreadAxis.set(0, 1, 0).applyAxisAngle(this.shotDirection, Math.PI * 0.5);
        if (this.spreadAxis.lengthSq() < 0.0001) {
          this.spreadAxis.set(1, 0, 0);
        }
        this.spreadAxis.normalize();
        this.shotDirection.applyAxisAngle(this.spreadAxis, spread);
      }

      context.world.spawnArrow(context.projectileSpawnOrigin.clone(), this.shotDirection, 'hero', {
        speed,
        lifetime,
        gravity,
        chargeRatio: this.shotChargeRatio,
      });
      this.cooldowns.fire = combatConfig.bow.arrow.fireInterval;
      this.firedThisFrame = true;
      this.fireFeedbackTimer = 0.12;
      this.lastFiredChargeRatio = this.shotChargeRatio;
      this.screenShake = Math.max(
        this.screenShake,
        THREE.MathUtils.lerp(combatConfig.feedback.lightShake * 0.22, combatConfig.feedback.lightShake * 0.55, this.shotChargeRatio),
      );
      this.chargingShot = false;
      this.chargeTimer = 0;
    }

    const impulseDrag =
      (context.grounded ? combatConfig.movement.externalVelocityDrag : combatConfig.movement.externalVelocityDrag * 0.45) *
      context.deltaSeconds;
    this.impulseVelocity.multiplyScalar(Math.max(0, 1 - impulseDrag));

    return this.buildPresentation(context);
  }

  notifyProjectileHit(part: 'body' | 'head' | 'shield'): void {
    this.hitConfirmTimer = combatConfig.feedback.hitConfirmSeconds;
    if (part === 'head') {
      this.screenShake = Math.max(this.screenShake, combatConfig.feedback.heavyShake * 0.8);
    } else if (part === 'shield') {
      this.screenShake = Math.max(this.screenShake, combatConfig.feedback.lightShake * 0.35);
    } else {
      this.screenShake = Math.max(this.screenShake, combatConfig.feedback.lightShake * 0.55);
    }
  }

  consumeShieldHit(): boolean {
    if (this.shieldTimer <= 0) {
      return false;
    }

    this.shieldTimer = 0;
    this.shieldFlashTimer = combatConfig.shield.hitFlashSeconds;
    this.screenShake = Math.max(this.screenShake, combatConfig.feedback.lightShake * 0.45);
    return true;
  }

  isShieldActive(): boolean {
    return this.shieldTimer > 0;
  }

  getCooldowns(): Record<string, number> {
    return { ...this.cooldowns };
  }

  getFireCooldownRatio(): number {
    if (this.chargingShot) {
      return this.shotChargeRatio;
    }
    return this.cooldowns.fire / Math.max(0.0001, combatConfig.bow.arrow.fireInterval);
  }

  getHitConfirm(): number {
    return this.hitConfirmTimer;
  }

  getShieldFlashRatio(): number {
    return this.shieldFlashTimer / Math.max(0.0001, combatConfig.shield.hitFlashSeconds);
  }

  isBusy(): boolean {
    return false;
  }

  private buildPresentation(context: CombatUpdateContext): CombatPresentation {
    const dashing = this.dashTimer > 0;
    const launching = this.launchTimer > 0;
    const shieldActive = this.shieldTimer > 0;
    const slowFalling = this.slowFallTimer > 0;
    const fireFeedbackActive = this.fireFeedbackTimer > 0;
    const fullDrawPulse =
      this.chargingShot && this.shotChargeRatio >= 1
        ? 0.08 + (Math.sin(this.chargeTimer * 20) * 0.5 + 0.5) * 0.08
        : 0;
    const movementPhaseProgress = dashing
      ? 1 - this.dashTimer / Math.max(0.0001, combatConfig.dash.duration)
      : launching
        ? 1 - this.launchTimer / PlayerCombatController.launchBurstSeconds
        : 0;

    return {
      moveScale: this.chargingShot ? combatConfig.bow.arrow.movementSlowScale : 1,
      extraVelocity: this.impulseVelocity.clone(),
      desiredFacingYaw:
        dashing || launching || this.firedThisFrame || this.chargingShot ? context.cameraYaw : null,
      turnSharpness: combatConfig.movement.aimTurnSharpness,
      attackWeight: 0,
      attackSide: 1,
      chargeRatio: this.shotChargeRatio,
      visualLift: launching ? 0.66 : slowFalling ? 0.54 : 0,
      spinRate: 0,
      actionTint: fireFeedbackActive
        ? THREE.MathUtils.lerp(0.14, 0.36, this.lastFiredChargeRatio)
        : this.chargingShot
          ? 0.08 + this.shotChargeRatio * 0.22 + fullDrawPulse
          : shieldActive
            ? 0.08
            : launching
              ? 0.16
              : slowFalling
                ? 0.09
                : 0,
      cameraMode: dashing || launching || slowFalling || this.chargingShot ? 'combat' : 'normal',
      screenShake: this.screenShake,
      actionLabel: shieldActive
        ? 'Wind Shield'
        : launching
          ? 'Wind Burst'
          : slowFalling
            ? 'Slow Fall'
          : this.chargingShot
            ? this.shotChargeRatio >= 1
              ? 'Full Draw'
              : 'Charging Shot'
          : dashing
            ? 'Dashing'
            : fireFeedbackActive
              ? this.lastFiredChargeRatio >= 0.8
                ? 'Precision Shot'
                : 'Quick Shot'
              : 'Ready',
      visualState: dashing || launching || slowFalling ? 'fastMove' : 'idle',
      visualPhase: dashing || launching ? 'active' : slowFalling ? 'travel' : 'loop',
      phaseProgress: movementPhaseProgress,
      verticalImpulse: this.launchVerticalImpulse,
      shieldActive,
      shieldFlash: this.getShieldFlashRatio(),
    };
  }

  getGravityScale(): number {
    return this.slowFallTimer > 0 ? combatConfig.launch.slowFallGravityScale : 1;
  }

  getAirControlScale(): number {
    return this.slowFallTimer > 0 ? combatConfig.launch.slowFallAirControl : 1;
  }

  private sampleChargeSpeed(chargeRatio: number): number {
    if (chargeRatio <= 0.5) {
      return THREE.MathUtils.lerp(
        combatConfig.bow.arrow.tap.speed,
        combatConfig.bow.arrow.mid.speed,
        chargeRatio / 0.5,
      );
    }

    return THREE.MathUtils.lerp(
      combatConfig.bow.arrow.mid.speed,
      combatConfig.bow.arrow.full.speed,
      (chargeRatio - 0.5) / 0.5,
    );
  }

  private sampleChargeGravity(chargeRatio: number): number {
    const baseGravity = combatConfig.bow.arrow.gravityBase;
    if (chargeRatio <= 0.5) {
      return (
        baseGravity *
        THREE.MathUtils.lerp(
          combatConfig.bow.arrow.tap.gravityMultiplier,
          combatConfig.bow.arrow.mid.gravityMultiplier,
          chargeRatio / 0.5,
        )
      );
    }

    return (
      baseGravity *
      THREE.MathUtils.lerp(
        combatConfig.bow.arrow.mid.gravityMultiplier,
        combatConfig.bow.arrow.full.gravityMultiplier,
        (chargeRatio - 0.5) / 0.5,
      )
    );
  }

  private sampleChargeLifetime(chargeRatio: number): number {
    if (chargeRatio <= 0.5) {
      return THREE.MathUtils.lerp(
        combatConfig.bow.arrow.tap.lifetime,
        combatConfig.bow.arrow.mid.lifetime,
        chargeRatio / 0.5,
      );
    }

    return THREE.MathUtils.lerp(
      combatConfig.bow.arrow.mid.lifetime,
      combatConfig.bow.arrow.full.lifetime,
      (chargeRatio - 0.5) / 0.5,
    );
  }
}
