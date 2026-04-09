import * as THREE from 'three';
import { clamp } from '../../core/math';
import type { HeroPoseAdditive, HeroPoseDefinition, ResolvedHeroPose } from './AnimationStateTypes';

const vec3 = (values: [number, number, number]): THREE.Vector3 =>
  new THREE.Vector3(values[0], values[1], values[2]);

export function resolvePose(definition: HeroPoseDefinition): ResolvedHeroPose {
  return {
    bodyRotation: vec3(definition.bodyRotation),
    torsoOffset: vec3(definition.torsoOffset),
    torsoRotation: vec3(definition.torsoRotation),
    weaponAnchorPosition: vec3(definition.weaponAnchorPosition),
    weaponAnchorRotation: vec3(definition.weaponAnchorRotation),
    swordPivotPosition: vec3(definition.swordPivotPosition),
    swordPivotRotation: vec3(definition.swordPivotRotation),
  };
}

export function blendResolvedPose(a: ResolvedHeroPose, b: ResolvedHeroPose, t: number): ResolvedHeroPose {
  return {
    bodyRotation: a.bodyRotation.clone().lerp(b.bodyRotation, t),
    torsoOffset: a.torsoOffset.clone().lerp(b.torsoOffset, t),
    torsoRotation: a.torsoRotation.clone().lerp(b.torsoRotation, t),
    weaponAnchorPosition: a.weaponAnchorPosition.clone().lerp(b.weaponAnchorPosition, t),
    weaponAnchorRotation: a.weaponAnchorRotation.clone().lerp(b.weaponAnchorRotation, t),
    swordPivotPosition: a.swordPivotPosition.clone().lerp(b.swordPivotPosition, t),
    swordPivotRotation: a.swordPivotRotation.clone().lerp(b.swordPivotRotation, t),
  };
}

export function addPoseScaled(target: ResolvedHeroPose, additive: HeroPoseAdditive, weight: number): void {
  target.bodyRotation.addScaledVector(vec3(additive.bodyRotation), weight);
  target.torsoOffset.addScaledVector(vec3(additive.torsoOffset), weight);
  target.torsoRotation.addScaledVector(vec3(additive.torsoRotation), weight);
  target.weaponAnchorPosition.addScaledVector(vec3(additive.weaponAnchorPosition), weight);
  target.weaponAnchorRotation.addScaledVector(vec3(additive.weaponAnchorRotation), weight);
  target.swordPivotPosition.addScaledVector(vec3(additive.swordPivotPosition), weight);
  target.swordPivotRotation.addScaledVector(vec3(additive.swordPivotRotation), weight);
}

export function mirrorSwingResolvedPose(pose: ResolvedHeroPose, side: number): void {
  pose.weaponAnchorPosition.x *= side;
  pose.torsoOffset.x *= side;
  pose.weaponAnchorRotation.y *= side;
  pose.weaponAnchorRotation.z *= side;
  pose.torsoRotation.y *= side;
  pose.torsoRotation.z *= side;
  pose.bodyRotation.y *= side;
  pose.bodyRotation.z *= side;
  pose.swordPivotPosition.x *= side;
  pose.swordPivotRotation.y *= side;
  pose.swordPivotRotation.z *= side;
}

export function mirrorSwingAdditive(additive: HeroPoseAdditive, side: number): HeroPoseAdditive {
  return {
    bodyRotation: [additive.bodyRotation[0], additive.bodyRotation[1] * side, additive.bodyRotation[2] * side],
    torsoOffset: [additive.torsoOffset[0] * side, additive.torsoOffset[1], additive.torsoOffset[2]],
    torsoRotation: [additive.torsoRotation[0], additive.torsoRotation[1] * side, additive.torsoRotation[2] * side],
    weaponAnchorPosition: [
      additive.weaponAnchorPosition[0] * side,
      additive.weaponAnchorPosition[1],
      additive.weaponAnchorPosition[2],
    ],
    weaponAnchorRotation: [
      additive.weaponAnchorRotation[0],
      additive.weaponAnchorRotation[1] * side,
      additive.weaponAnchorRotation[2] * side,
    ],
    swordPivotPosition: [
      additive.swordPivotPosition[0] * side,
      additive.swordPivotPosition[1],
      additive.swordPivotPosition[2],
    ],
    swordPivotRotation: [
      additive.swordPivotRotation[0],
      additive.swordPivotRotation[1] * side,
      additive.swordPivotRotation[2] * side,
    ],
  };
}

export function easeOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

export function easeInOutSine(value: number): number {
  const t = clamp(value, 0, 1);
  return -(Math.cos(Math.PI * t) - 1) * 0.5;
}
