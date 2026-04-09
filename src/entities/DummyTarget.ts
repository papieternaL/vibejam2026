import * as THREE from 'three';
import { combatConfig } from '../config/combatConfig';
import { damp } from '../core/math';
import type {
  DamageRequest,
  DamageResult,
  DamageableTarget,
  ProjectileHitResult,
  StatusSpec,
  TeamId,
} from '../game/combatTypes';

type ActiveStatus = StatusSpec & {
  remaining: number;
  tickTimer: number;
};

export class DummyTarget implements DamageableTarget {
  readonly id: string;
  readonly team: TeamId = 'dummy';
  readonly radius = combatConfig.dummy.radius;
  readonly position = new THREE.Vector3();

  private readonly root = new THREE.Group();
  private readonly bodyCenter = new THREE.Vector3();
  private readonly headCenter = new THREE.Vector3();
  private readonly body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.8, 2.1, 14),
    new THREE.MeshStandardMaterial({ color: 0x727f8d, roughness: 0.72 }),
  );

  private readonly core = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xf88b54, emissive: 0x4d1200, roughness: 0.4 }),
  );

  private readonly material = this.body.material as THREE.MeshStandardMaterial;
  private readonly coreMaterial = this.core.material as THREE.MeshStandardMaterial;
  private readonly baseColor = new THREE.Color(0x727f8d);
  private readonly flashColor = new THREE.Color(0xffffff);
  private readonly hitOffset = new THREE.Vector3();
  private readonly hitTilt = new THREE.Vector3();
  private readonly statuses: ActiveStatus[] = [];

  private maxHealth: number = combatConfig.dummy.maxHealth;
  private health: number = combatConfig.dummy.maxHealth;
  private alive = true;
  private flashTimer = 0;
  private hitScaleTimer = 0;
  private respawnTimer = 0;

  constructor(scene: THREE.Scene, id: string, spawnPosition: THREE.Vector3) {
    this.id = id;
    this.position.copy(spawnPosition);
    this.root.name = id;
    this.root.userData.editable = true;
    this.root.userData.editableRoot = true;

    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.position.y = 1.05;

    this.core.position.set(0, 1.25, 0);

    this.root.add(this.body, this.core);
    this.root.position.copy(this.position);
    scene.add(this.root);
  }

  update(deltaSeconds: number): void {
    if (!this.alive) {
      this.respawnTimer -= deltaSeconds;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    let burnIntensity = 0;
    for (let index = this.statuses.length - 1; index >= 0; index -= 1) {
      const status = this.statuses[index];
      status.remaining -= deltaSeconds;
      status.tickTimer += deltaSeconds;

      if (status.kind === 'burn' || status.kind === 'dragonBurn') {
        burnIntensity = Math.max(burnIntensity, status.kind === 'dragonBurn' ? 1 : 0.6);
        while (status.tickTimer >= combatConfig.burn.tickRate) {
          status.tickTimer -= combatConfig.burn.tickRate;
          if (status.tickDamage) {
            this.health = Math.max(0, this.health - status.tickDamage * combatConfig.burn.tickRate);
          }
        }
      }

      if (status.remaining <= 0) {
        this.statuses.splice(index, 1);
      }
    }

    if (this.health <= 0) {
      this.kill();
      return;
    }

    this.flashTimer = Math.max(0, this.flashTimer - deltaSeconds);
    this.hitScaleTimer = Math.max(0, this.hitScaleTimer - deltaSeconds);
    this.hitOffset.x = damp(this.hitOffset.x, 0, combatConfig.feedback.dummySettleSharpness, deltaSeconds);
    this.hitOffset.y = damp(this.hitOffset.y, 0, combatConfig.feedback.dummySettleSharpness, deltaSeconds);
    this.hitOffset.z = damp(this.hitOffset.z, 0, combatConfig.feedback.dummySettleSharpness, deltaSeconds);
    this.hitTilt.x = damp(this.hitTilt.x, 0, combatConfig.feedback.dummySettleSharpness, deltaSeconds);
    this.hitTilt.y = damp(this.hitTilt.y, 0, combatConfig.feedback.dummySettleSharpness, deltaSeconds);
    this.hitTilt.z = damp(this.hitTilt.z, 0, combatConfig.feedback.dummySettleSharpness, deltaSeconds);

    const flashMix = Math.min(1, this.flashTimer / combatConfig.feedback.hitFlashSeconds);
    this.material.color.copy(this.baseColor).lerp(this.flashColor, flashMix);
    this.material.emissive.setRGB(0.12 + flashMix * 0.45, 0.09 + burnIntensity * 0.25, 0.08);
    this.coreMaterial.emissive.setRGB(0.24 + burnIntensity * 0.6, 0.1 + burnIntensity * 0.18, 0.04);
    this.body.position.set(this.hitOffset.x, 1.05 + this.hitOffset.y, this.hitOffset.z);
    this.body.rotation.set(this.hitTilt.x, this.hitTilt.y, this.hitTilt.z);
    this.core.position.set(this.hitOffset.x * 0.45, 1.25 + this.hitOffset.y * 0.35, this.hitOffset.z * 0.2);

    const hitScale = 1 + Math.sin((1 - this.hitScaleTimer / 0.12) * Math.PI) * 0.08;
    this.root.scale.setScalar(this.hitScaleTimer > 0 ? hitScale : 1);
  }

  isAlive(): boolean {
    return this.alive;
  }

  applyDamage(request: DamageRequest): DamageResult {
    if (!this.alive || request.sourceTeam === this.team) {
      return { applied: false, died: false, amount: 0 };
    }

    this.health = Math.max(0, this.health - request.amount);
    this.flashTimer = combatConfig.feedback.hitFlashSeconds;
    this.hitScaleTimer = 0.12;
    this.flashColor.setHex(request.hitFlashColor ?? 0xffffff);
    if (request.hitDirection) {
      const planarDirection = request.hitDirection.clone().setY(0).normalize();
      const reactionStrength = THREE.MathUtils.clamp(request.amount / 95, 0.4, 1);
      this.hitOffset.addScaledVector(planarDirection, combatConfig.feedback.dummyHitOffset * reactionStrength);
      this.hitTilt.x -= combatConfig.feedback.dummyHitTilt * 0.45 * reactionStrength;
      this.hitTilt.z += planarDirection.x * combatConfig.feedback.dummyHitTilt * reactionStrength;
      this.hitTilt.y -= planarDirection.x * 0.08 * reactionStrength;
    }

    if (request.statuses) {
      for (const status of request.statuses) {
        this.applyStatus(status);
      }
    }

    const died = this.health <= 0;
    if (died) {
      this.kill();
    }

    return {
      applied: true,
      died,
      amount: request.amount,
    };
  }

  applyStatus(status: StatusSpec): void {
    const existing = this.statuses.find((entry) => entry.kind === status.kind);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, status.duration);
      existing.potency = Math.max(existing.potency ?? 0, status.potency ?? 0);
      existing.tickDamage = Math.max(existing.tickDamage ?? 0, status.tickDamage ?? 0);
      return;
    }

    this.statuses.push({
      ...status,
      remaining: status.duration,
      tickTimer: 0,
    });
  }

  getMovementScalar(): number {
    let scalar = 1;
    for (const status of this.statuses) {
      if (status.kind === 'stun') {
        return 0;
      }
      if (status.kind === 'slow') {
        scalar = Math.min(scalar, 1 - (status.potency ?? 0));
      }
    }
    return scalar;
  }

  getDebugStatuses(): string[] {
    return this.statuses.map((status) => `${status.kind}:${status.remaining.toFixed(1)}`);
  }

  resolveProjectileHit(
    segmentStart: THREE.Vector3,
    segmentEnd: THREE.Vector3,
    projectileRadius: number,
    sourceTeam: TeamId,
  ): ProjectileHitResult | null {
    if (!this.alive || sourceTeam === this.team) {
      return null;
    }

    this.headCenter.copy(this.position).setY(this.position.y + 1.86);
    if (this.segmentHitsSphere(segmentStart, segmentEnd, this.headCenter, 0.3 + projectileRadius)) {
      const damage = combatConfig.bow.damage.head;
      const result = this.applyDamage({
        amount: damage,
        sourceTeam,
        sourceAbility: 'arrow-headshot',
        tags: ['projectile', 'ranged', 'headshot'],
        hitFlashColor: combatConfig.feedback.abilityFlashColors.headshot,
        hitDirection: segmentEnd.clone().sub(segmentStart).normalize(),
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

    this.bodyCenter.copy(this.position).setY(this.position.y + 1.08);
    if (this.segmentHitsSphere(segmentStart, segmentEnd, this.bodyCenter, 0.78 + projectileRadius)) {
      const damage = combatConfig.bow.damage.body;
      const result = this.applyDamage({
        amount: damage,
        sourceTeam,
        sourceAbility: 'arrow-body',
        tags: ['projectile', 'ranged'],
        hitFlashColor: combatConfig.feedback.abilityFlashColors.arrow,
        hitDirection: segmentEnd.clone().sub(segmentStart).normalize(),
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

  getHealthRatio(): number {
    return this.health / this.maxHealth;
  }

  getEditableObject(): THREE.Object3D {
    return this.root;
  }

  private kill(): void {
    this.alive = false;
    this.root.visible = false;
    this.respawnTimer = combatConfig.dummy.respawnDelay;
    this.statuses.length = 0;
  }

  private respawn(): void {
    this.health = this.maxHealth;
    this.alive = true;
    this.root.visible = true;
    this.root.scale.setScalar(1);
    this.body.position.set(0, 1.05, 0);
    this.body.rotation.set(0, 0, 0);
    this.core.position.set(0, 1.25, 0);
    this.hitOffset.set(0, 0, 0);
    this.hitTilt.set(0, 0, 0);
    this.flashTimer = 0;
    this.hitScaleTimer = 0;
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
