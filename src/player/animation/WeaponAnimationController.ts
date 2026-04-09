import * as THREE from 'three';
import { clamp, damp } from '../../core/math';
import { heroPoseConfig } from './HeroPoseConfig';
import type { HeroVisualRig, ResolvedHeroPose } from './AnimationStateTypes';

export class WeaponAnimationController {
  private static readonly gripOffset = new THREE.Vector3(0, 0, 0.11);
  private static readonly mountOffset = new THREE.Vector3(...heroPoseConfig.weaponMountOffset);

  private readonly rig: HeroVisualRig;
  private readonly currentWeaponAnchorPosition = new THREE.Vector3();
  private readonly currentWeaponAnchorRotation = new THREE.Vector3();
  private readonly currentSwordPivotPosition = new THREE.Vector3();
  private readonly currentSwordPivotRotation = new THREE.Vector3();

  constructor(rig: HeroVisualRig) {
    this.rig = rig;
  }

  snapToPose(pose: ResolvedHeroPose): void {
    this.currentWeaponAnchorPosition.copy(pose.weaponAnchorPosition);
    this.currentWeaponAnchorRotation.copy(pose.weaponAnchorRotation);
    this.currentSwordPivotPosition.copy(pose.swordPivotPosition);
    this.currentSwordPivotRotation.copy(pose.swordPivotRotation);
    this.commitTransforms();
  }

  update(
    deltaSeconds: number,
    targetPose: ResolvedHeroPose,
    actionTint: number,
    chargeRatio: number,
    hitConfirm: number,
    attackWeight: number,
  ): void {
    const baseSharpness = heroPoseConfig.blend.weaponSharpness;
    const attackBlend = clamp(attackWeight, 0, 1);
    const anchorSharpness = THREE.MathUtils.lerp(baseSharpness, Math.min(baseSharpness + 18, 68), attackBlend);
    const pivotSharpness = THREE.MathUtils.lerp(baseSharpness + 8, 120, attackBlend);

    this.currentWeaponAnchorPosition.x = damp(this.currentWeaponAnchorPosition.x, targetPose.weaponAnchorPosition.x, anchorSharpness, deltaSeconds);
    this.currentWeaponAnchorPosition.y = damp(this.currentWeaponAnchorPosition.y, targetPose.weaponAnchorPosition.y, anchorSharpness, deltaSeconds);
    this.currentWeaponAnchorPosition.z = damp(this.currentWeaponAnchorPosition.z, targetPose.weaponAnchorPosition.z, anchorSharpness, deltaSeconds);

    this.currentWeaponAnchorRotation.x = damp(this.currentWeaponAnchorRotation.x, targetPose.weaponAnchorRotation.x, anchorSharpness, deltaSeconds);
    this.currentWeaponAnchorRotation.y = damp(this.currentWeaponAnchorRotation.y, targetPose.weaponAnchorRotation.y, anchorSharpness, deltaSeconds);
    this.currentWeaponAnchorRotation.z = damp(this.currentWeaponAnchorRotation.z, targetPose.weaponAnchorRotation.z, anchorSharpness, deltaSeconds);

    this.currentSwordPivotPosition.x = damp(this.currentSwordPivotPosition.x, targetPose.swordPivotPosition.x, pivotSharpness, deltaSeconds);
    this.currentSwordPivotPosition.y = damp(this.currentSwordPivotPosition.y, targetPose.swordPivotPosition.y, pivotSharpness, deltaSeconds);
    this.currentSwordPivotPosition.z = damp(this.currentSwordPivotPosition.z, targetPose.swordPivotPosition.z, pivotSharpness, deltaSeconds);

    this.currentSwordPivotRotation.x = damp(this.currentSwordPivotRotation.x, targetPose.swordPivotRotation.x, pivotSharpness, deltaSeconds);
    this.currentSwordPivotRotation.y = damp(this.currentSwordPivotRotation.y, targetPose.swordPivotRotation.y, pivotSharpness, deltaSeconds);
    this.currentSwordPivotRotation.z = damp(this.currentSwordPivotRotation.z, targetPose.swordPivotRotation.z, pivotSharpness, deltaSeconds);

    this.commitTransforms();

    const glowStrength =
      heroPoseConfig.glow.base +
      actionTint * heroPoseConfig.glow.actionTintScale +
      chargeRatio * heroPoseConfig.glow.chargeScale +
      hitConfirm * heroPoseConfig.glow.hitConfirmScale;
    this.rig.swordGlowMaterial.emissive.setRGB(glowStrength, 0.14 + chargeRatio * 0.08, 0.02);
  }

  private commitTransforms(): void {
    this.rig.rightHandAnchor.position.set(
      -(this.currentWeaponAnchorPosition.x + WeaponAnimationController.mountOffset.x),
      this.currentWeaponAnchorPosition.y + WeaponAnimationController.mountOffset.y,
      this.currentWeaponAnchorPosition.z + WeaponAnimationController.mountOffset.z,
    );
    this.rig.rightHandAnchor.rotation.set(
      this.currentWeaponAnchorRotation.x,
      -this.currentWeaponAnchorRotation.y,
      -this.currentWeaponAnchorRotation.z,
    );
    this.rig.swordPivot.position.set(
      WeaponAnimationController.gripOffset.x - this.currentSwordPivotPosition.x,
      WeaponAnimationController.gripOffset.y + this.currentSwordPivotPosition.y,
      WeaponAnimationController.gripOffset.z + this.currentSwordPivotPosition.z,
    );
    this.rig.swordPivot.rotation.set(
      this.currentSwordPivotRotation.x,
      -this.currentSwordPivotRotation.y,
      -this.currentSwordPivotRotation.z,
    );
  }
}
