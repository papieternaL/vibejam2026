import * as THREE from 'three';

export class VaultImpactEffect {
  private readonly group = new THREE.Group();
  private readonly shockRing: THREE.Mesh;
  private readonly coreDisc: THREE.Mesh;
  private readonly burstColumns: THREE.Mesh[] = [];
  private remaining = 0.32;

  constructor(scene: THREE.Scene, position: THREE.Vector3, radius: number, color: number) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const discMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc08a,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8f52,
      transparent: true,
      opacity: 0.9,
    });

    this.shockRing = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.35, radius * 0.72, 28),
      ringMaterial,
    );
    this.shockRing.rotation.x = -Math.PI * 0.5;

    this.coreDisc = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.38, 24),
      discMaterial,
    );
    this.coreDisc.rotation.x = -Math.PI * 0.5;
    this.coreDisc.position.y = 0.01;

    this.group.position.copy(position);
    this.group.position.y += 0.04;
    this.group.add(this.shockRing, this.coreDisc);

    for (let index = 0; index < 6; index += 1) {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.02, radius * 0.7, 6),
        columnMaterial.clone(),
      );
      const angle = (index / 6) * Math.PI * 2;
      const distance = radius * 0.42;
      column.position.set(Math.sin(angle) * distance, radius * 0.2, Math.cos(angle) * distance);
      column.rotation.z = THREE.MathUtils.degToRad(18);
      column.rotation.y = angle;
      this.burstColumns.push(column);
      this.group.add(column);
    }

    scene.add(this.group);
  }

  update(deltaSeconds: number): boolean {
    this.remaining -= deltaSeconds;
    const normalized = THREE.MathUtils.clamp(1 - this.remaining / 0.32, 0, 1);

    this.shockRing.scale.setScalar(1 + normalized * 1.3);
    this.coreDisc.scale.setScalar(Math.max(0.4, 1 - normalized * 0.55));

    const ringMaterial = this.shockRing.material as THREE.MeshBasicMaterial;
    const discMaterial = this.coreDisc.material as THREE.MeshBasicMaterial;
    ringMaterial.opacity = Math.max(0, 0.95 - normalized * 0.9);
    discMaterial.opacity = Math.max(0, 0.5 - normalized * 0.45);

    for (const [index, column] of this.burstColumns.entries()) {
      const lift = normalized * (0.55 + index * 0.05);
      column.position.y = 0.18 + lift;
      column.scale.y = Math.max(0.2, 1 - normalized * 0.75);
      const material = column.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.9 - normalized * 1.1);
    }

    return this.remaining > 0;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
  }
}
