import * as THREE from 'three';

export class HitPulse {
  private readonly mesh: THREE.Mesh;
  private remaining = 0.18;

  constructor(scene: THREE.Scene, position: THREE.Vector3, color: number, size: number) {
    this.mesh = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.42, size, 16),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.position.copy(position);
    this.mesh.lookAt(position.clone().add(new THREE.Vector3(0, 1, 0)));
    scene.add(this.mesh);
  }

  update(deltaSeconds: number): boolean {
    this.remaining -= deltaSeconds;
    this.mesh.scale.addScalar(deltaSeconds * 3.4);
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, this.remaining / 0.18);
    return this.remaining > 0;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
