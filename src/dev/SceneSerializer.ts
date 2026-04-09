import * as THREE from 'three';

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export class SceneSerializer {
  static exportEditableTransforms(objects: THREE.Object3D[]): string {
    const payload = objects.map((object) => ({
      name: object.name,
      position: {
        x: round(object.position.x),
        y: round(object.position.y),
        z: round(object.position.z),
      },
      rotation: {
        x: round(object.rotation.x),
        y: round(object.rotation.y),
        z: round(object.rotation.z),
      },
      scale: {
        x: round(object.scale.x),
        y: round(object.scale.y),
        z: round(object.scale.z),
      },
    }));

    return JSON.stringify(payload, null, 2);
  }
}
