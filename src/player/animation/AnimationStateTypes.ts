import * as THREE from 'three';

export type HeroVisualState =
  | 'idle'
  | 'run'
  | 'fastMove'
  | 'swing'
  | 'thrustCharge'
  | 'thrustRelease'
  | 'fireBurst'
  | 'fireVault'
  | 'fireWheel'
  | 'dragonFireCast'
  | 'hitReact'
  | 'dead';

export type HeroVisualPhase = 'loop' | 'startup' | 'active' | 'recovery' | 'travel' | 'impact';

export type HeroPoseDefinition = {
  bodyRotation: [number, number, number];
  torsoOffset: [number, number, number];
  torsoRotation: [number, number, number];
  weaponAnchorPosition: [number, number, number];
  weaponAnchorRotation: [number, number, number];
  swordPivotPosition: [number, number, number];
  swordPivotRotation: [number, number, number];
};

export type HeroPoseAdditive = HeroPoseDefinition;
export type HeroPoseMap = Partial<Record<HeroVisualPhase, HeroPoseDefinition>>;
export type HeroPoseAdditiveMap = Partial<Record<HeroVisualPhase, HeroPoseAdditive>>;

export type ResolvedHeroPose = {
  bodyRotation: THREE.Vector3;
  torsoOffset: THREE.Vector3;
  torsoRotation: THREE.Vector3;
  weaponAnchorPosition: THREE.Vector3;
  weaponAnchorRotation: THREE.Vector3;
  swordPivotPosition: THREE.Vector3;
  swordPivotRotation: THREE.Vector3;
};

export type ProceduralAnimationInput = {
  normalizedSpeed: number;
  localMoveX: number;
  localMoveZ: number;
  grounded: boolean;
  chargeRatio: number;
  attackWeight: number;
  attackSide: number;
  visualLift: number;
  spinRate: number;
  actionTint: number;
  hitConfirm: number;
  shieldActive: boolean;
  shieldFlash: number;
  visualState: HeroVisualState;
  visualPhase: HeroVisualPhase;
  phaseProgress: number;
};

export type ProceduralAnimationDebugState = {
  visualState: HeroVisualState;
  visualPhase: HeroVisualPhase;
  normalizedSpeed: number;
  locomotionBlend: number;
  fastMoveBlend: number;
};

export type HeroVisualRig = {
  visualRoot: THREE.Group;
  bodyRoot: THREE.Group;
  torsoRoot: THREE.Group;
  rightHandAnchor: THREE.Group;
  swordPivot: THREE.Group;
  head: THREE.Object3D;
  torsoMaterial: THREE.MeshStandardMaterial;
  swordGlowMaterial: THREE.MeshStandardMaterial;
};
