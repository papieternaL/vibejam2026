import * as THREE from 'three';
import { combatConfig } from '../config/combatConfig';
import type { DamageableTarget } from '../game/combatTypes';

export class DragonWave {
  private readonly mesh: THREE.Mesh;
  private readonly direction = new THREE.Vector3();
  private readonly hitTargets = new Set<string>();
  private remaining = combatConfig.abilities.dragon.life;
  private readonly position: THREE.Vector3;

  constructor(scene: THREE.Scene, position: THREE.Vector3, directionYaw: number) {
    this.position = position.clone();
    this.direction.set(Math.sin(directionYaw), 0, Math.cos(directionYaw)).normalize();
    this.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(combatConfig.abilities.dragon.radius, 2.2, 6, 10),
      new THREE.MeshStandardMaterial({
        color: 0xff954d,
        emissive: 0x8a2500,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.92,
      }),
    );
    this.mesh.rotation.z = Math.PI * 0.5;
    this.mesh.rotation.y = directionYaw;
    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  update(deltaSeconds: number, targets: DamageableTarget[]): boolean {
    this.remaining -= deltaSeconds;
    this.position.addScaledVector(this.direction, combatConfig.abilities.dragon.speed * deltaSeconds);
    this.mesh.position.copy(this.position);

    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.opacity = Math.max(0.25, this.remaining / combatConfig.abilities.dragon.life);

    for (const target of targets) {
      if (!target.isAlive() || this.hitTargets.has(target.id)) {
        continue;
      }

      const distance = target.position.distanceTo(this.position);
      if (distance > combatConfig.abilities.dragon.radius + 1.2 + target.radius) {
        continue;
      }

      target.applyDamage({
        amount: combatConfig.abilities.dragon.damage,
        sourceTeam: 'hero',
        sourceAbility: 'dragon',
        tags: ['fire', 'ultimate', 'projectile'],
        statuses: [
          {
            kind: 'dragonBurn',
            duration: combatConfig.abilities.dragon.burnDuration,
            tickDamage: combatConfig.abilities.dragon.burnDamagePerSecond,
          },
        ],
      });
      this.hitTargets.add(target.id);
    }

    return this.remaining > 0;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
