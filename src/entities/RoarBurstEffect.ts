import * as THREE from 'three';

export class RoarBurstEffect {
  private readonly group = new THREE.Group();
  private readonly chestWave: THREE.Mesh;
  private readonly chestRing: THREE.Mesh;
  private readonly shoulderHalo: THREE.Mesh;
  private readonly groundRing: THREE.Mesh;
  private remaining = 0.28;

  constructor(scene: THREE.Scene, position: THREE.Vector3, radius: number, color: number) {
    this.chestWave = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.32, 24, 16, 0, Math.PI * 2, 0.3, 1.35),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
      }),
    );
    this.chestWave.position.y = 1.28;
    this.chestWave.rotation.x = THREE.MathUtils.degToRad(90);

    this.chestRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.5, 0.06, 10, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffb072,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      }),
    );
    this.chestRing.position.y = 1.22;
    this.chestRing.rotation.y = Math.PI * 0.5;

    this.shoulderHalo = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.18, radius * 0.46, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffd0a0,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    this.shoulderHalo.position.y = 1.42;

    this.groundRing = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.32, radius * 0.88, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffb072,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      }),
    );
    this.groundRing.rotation.x = -Math.PI * 0.5;
    this.groundRing.position.y = 0.04;

    this.group.position.copy(position);
    this.group.add(this.chestWave, this.chestRing, this.shoulderHalo, this.groundRing);
    scene.add(this.group);
  }

  update(deltaSeconds: number): boolean {
    this.remaining -= deltaSeconds;
    const normalized = THREE.MathUtils.clamp(1 - this.remaining / 0.28, 0, 1);
    this.chestWave.scale.setScalar(1 + normalized * 1.1);
    this.chestRing.scale.setScalar(1 + normalized * 0.95);
    this.shoulderHalo.scale.setScalar(1 + normalized * 0.65);
    this.groundRing.scale.setScalar(1 + normalized * 0.45);

    const waveMaterial = this.chestWave.material as THREE.MeshBasicMaterial;
    const chestRingMaterial = this.chestRing.material as THREE.MeshBasicMaterial;
    const haloMaterial = this.shoulderHalo.material as THREE.MeshBasicMaterial;
    const ringMaterial = this.groundRing.material as THREE.MeshBasicMaterial;
    waveMaterial.opacity = Math.max(0, 0.34 - normalized * 0.32);
    chestRingMaterial.opacity = Math.max(0, 0.92 - normalized * 0.9);
    haloMaterial.opacity = Math.max(0, 0.5 - normalized * 0.48);
    ringMaterial.opacity = Math.max(0, 0.28 - normalized * 0.26);
    this.chestWave.position.y = 1.28 + normalized * 0.16;
    this.chestRing.position.y = 1.22 + normalized * 0.12;
    this.shoulderHalo.position.y = 1.42 + normalized * 0.1;

    return this.remaining > 0;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
  }
}
