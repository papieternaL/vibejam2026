import * as THREE from 'three';
import { combatConfig } from '../config/combatConfig';
import type { DamageableTarget } from '../game/combatTypes';

export class BurnZone {
  private readonly mesh: THREE.Mesh;
  private readonly position: THREE.Vector3;
  private remaining = combatConfig.abilities.wheel.zoneDuration;
  private tickTimer = 0;
  private readonly hitTargetIds = new Set<string>();

  constructor(scene: THREE.Scene, position: THREE.Vector3, directionYaw: number) {
    this.position = position.clone();
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 2.4, 0.1, 20),
      new THREE.MeshStandardMaterial({
        color: 0xff8d4d,
        emissive: 0x5a1f00,
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.72,
      }),
    );
    this.mesh.rotation.y = directionYaw;
    this.mesh.position.copy(this.position).add(new THREE.Vector3(0, 0.06, 0));
    scene.add(this.mesh);
  }

  update(deltaSeconds: number, targets: DamageableTarget[]): boolean {
    this.remaining -= deltaSeconds;
    this.tickTimer += deltaSeconds;

    this.mesh.scale.setScalar(0.86 + (1 - this.remaining / combatConfig.abilities.wheel.zoneDuration) * 0.16);
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.opacity = Math.max(0, this.remaining / combatConfig.abilities.wheel.zoneDuration) * 0.72;

    if (this.tickTimer >= combatConfig.burn.tickRate) {
      this.tickTimer = 0;
      for (const target of targets) {
        if (!target.isAlive() || this.hitTargetIds.has(`${target.id}:${Math.floor(this.remaining * 10)}`)) {
          continue;
        }

        const distance = target.position.distanceTo(this.position);
        if (distance > 2.45 + target.radius) {
          continue;
        }

        target.applyDamage({
          amount: combatConfig.abilities.wheel.burnDamagePerSecond * combatConfig.burn.tickRate,
          sourceTeam: 'hero',
          sourceAbility: 'wheel',
          tags: ['burn', 'zone'],
          statuses: [
            {
              kind: 'burn',
              duration: combatConfig.abilities.wheel.burnDuration,
              tickDamage: combatConfig.abilities.wheel.burnDamagePerSecond,
            },
          ],
        });
        this.hitTargetIds.add(`${target.id}:${Math.floor(this.remaining * 10)}`);
      }
    }

    return this.remaining > 0;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
