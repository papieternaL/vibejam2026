import * as THREE from 'three';
import type { ProceduralAnimationInput } from './AnimationStateTypes';

// Future hook for imported GLB body clips via AnimationMixer.
// Kept as a no-op in the current prototype so gameplay visuals remain fully procedural.
export class ClipBodyAnimationLayer {
  private mixer: THREE.AnimationMixer | null = null;

  attachRoot(root: THREE.Object3D): void {
    this.mixer = new THREE.AnimationMixer(root);
  }

  update(deltaSeconds: number, _input: ProceduralAnimationInput): void {
    this.mixer?.update(deltaSeconds);
  }
}
