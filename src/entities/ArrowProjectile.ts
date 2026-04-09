import * as THREE from 'three';
import { combatConfig } from '../config/combatConfig';
import type { DamageableTarget, ProjectileHitResult, TeamId } from '../game/combatTypes';

const forwardAxis = new THREE.Vector3(0, 0, 1);

type ArrowImpact = {
  hit: boolean;
  position: THREE.Vector3;
  part: ProjectileHitResult['part'];
  flashColor: number;
  pulseScale: number;
};

export class ArrowProjectile {
  private readonly root = new THREE.Group();
  private readonly position = new THREE.Vector3();
  private readonly previousPosition = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly shaft: THREE.Mesh;
  private readonly tip: THREE.Mesh;
  private readonly trail: THREE.Mesh;
  private readonly tipMaterial: THREE.MeshStandardMaterial;
  private readonly trailMaterial: THREE.MeshBasicMaterial;
  private readonly radius: number = combatConfig.bow.arrow.radius;
  private readonly gravity: number;
  private lifeRemaining: number;
  private readonly sourceTeam: TeamId;

  constructor(
    scene: THREE.Scene,
    spawnPosition: THREE.Vector3,
    direction: THREE.Vector3,
    sourceTeam: TeamId,
    options?: { speed?: number; lifetime?: number; gravity?: number; chargeRatio?: number },
  ) {
    this.position.copy(spawnPosition);
    this.previousPosition.copy(spawnPosition);
    this.velocity.copy(direction).normalize().multiplyScalar(options?.speed ?? combatConfig.bow.arrow.mid.speed);
    this.sourceTeam = sourceTeam;
    this.gravity = options?.gravity ?? combatConfig.bow.arrow.gravityBase * combatConfig.bow.arrow.tap.gravityMultiplier;
    this.lifeRemaining = options?.lifetime ?? combatConfig.bow.arrow.mid.lifetime;
    const chargeRatio = THREE.MathUtils.clamp(options?.chargeRatio ?? 0, 0, 1);

    const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x5f4632, roughness: 0.84 });
    this.tipMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe2b3,
      emissive: 0xb24500,
      roughness: 0.25,
      metalness: 0.12,
    });
    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd18a,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.96, 8), shaftMaterial);
    this.shaft.rotation.x = Math.PI * 0.5;
    this.tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 10), this.tipMaterial);
    this.tip.rotation.x = -Math.PI * 0.5;
    this.tip.position.z = 0.58;
    this.trail = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.7), this.trailMaterial);
    this.trail.position.z = -0.2;
    this.trail.rotation.y = Math.PI * 0.5;
    const trailScale = THREE.MathUtils.lerp(0.8, 1.45, chargeRatio);
    this.trail.scale.set(1, trailScale, 1);
    this.trailMaterial.opacity = THREE.MathUtils.lerp(0.42, 0.82, chargeRatio);
    this.tipMaterial.emissive.setRGB(
      THREE.MathUtils.lerp(0.22, 0.95, chargeRatio),
      THREE.MathUtils.lerp(0.1, 0.42, chargeRatio),
      THREE.MathUtils.lerp(0.02, 0.18, chargeRatio),
    );

    this.root.add(this.shaft, this.tip, this.trail);
    this.root.position.copy(this.position);
    this.root.quaternion.setFromUnitVectors(forwardAxis, this.velocity.clone().normalize());
    this.root.castShadow = true;
    scene.add(this.root);
  }

  update(deltaSeconds: number, targets: DamageableTarget[]): ArrowImpact | null {
    this.lifeRemaining -= deltaSeconds;
    if (this.lifeRemaining <= 0) {
      return null;
    }

    this.previousPosition.copy(this.position);
    this.velocity.y -= this.gravity * deltaSeconds;
    this.position.addScaledVector(this.velocity, deltaSeconds);
    this.root.position.copy(this.position);
    if (this.velocity.lengthSq() > 0.0001) {
      this.root.quaternion.setFromUnitVectors(forwardAxis, this.velocity.clone().normalize());
    }

    const impact = this.resolveHit(targets);
    if (impact) {
      return impact;
    }

    return null;
  }

  isExpired(): boolean {
    return this.lifeRemaining <= 0;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.root);
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  private resolveHit(targets: DamageableTarget[]): ArrowImpact | null {
    for (const target of targets) {
      if (!target.isAlive() || target.team === this.sourceTeam) {
        continue;
      }

      const hit = target.resolveProjectileHit(
        this.previousPosition,
        this.position,
        this.radius,
        this.sourceTeam,
      );
      if (!hit) {
        continue;
      }

      this.lifeRemaining = 0;
      return {
        hit: true,
        position: hit.position,
        part: hit.part,
        flashColor: hit.flashColor,
        pulseScale: hit.pulseScale,
      };
    }

    return null;
  }
}
