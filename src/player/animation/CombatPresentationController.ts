import * as THREE from 'three';
import { clamp } from '../../core/math';
import type { ProceduralAnimationInput, ResolvedHeroPose } from './AnimationStateTypes';
import { heroPoseConfig } from './HeroPoseConfig';
import {
  addPoseScaled,
  easeInOutSine,
  easeOutCubic,
  mirrorSwingAdditive,
  mirrorSwingResolvedPose,
  resolvePose,
} from './AnimationPoseUtils';

const deg = (value: number): number => (value * Math.PI) / 180;

export class CombatPresentationController {
  apply(basePose: ResolvedHeroPose, input: ProceduralAnimationInput): ResolvedHeroPose {
    const targetPose = this.resolveStatePose(basePose, input);
    this.applyStateTimelineMotion(targetPose, input);
    this.applyActionCurves(targetPose, input);
    this.applyBodyHooks(targetPose, input);
    return targetPose;
  }

  private resolveStatePose(basePose: ResolvedHeroPose, input: ProceduralAnimationInput): ResolvedHeroPose {
    if (input.visualState === 'idle' || input.visualState === 'run' || input.visualState === 'fastMove') {
      return basePose;
    }

    const statePoses = heroPoseConfig.statePoses[input.visualState];
    if (!statePoses) {
      return basePose;
    }

    const poseDefinition =
      statePoses[input.visualPhase] ?? statePoses.active ?? statePoses.startup ?? heroPoseConfig.locomotionPoses.idle;
    const overlay = resolvePose(poseDefinition);
    if (input.visualState === 'swing') {
      mirrorSwingResolvedPose(overlay, input.attackSide);
    }

    const weight = this.resolveOverlayBlend(input);
    return {
      bodyRotation: basePose.bodyRotation.clone().lerp(overlay.bodyRotation, weight),
      torsoOffset: basePose.torsoOffset.clone().lerp(overlay.torsoOffset, weight),
      torsoRotation: basePose.torsoRotation.clone().lerp(overlay.torsoRotation, weight),
      weaponAnchorPosition: basePose.weaponAnchorPosition.clone().lerp(overlay.weaponAnchorPosition, weight),
      weaponAnchorRotation: basePose.weaponAnchorRotation.clone().lerp(overlay.weaponAnchorRotation, weight),
      swordPivotPosition: basePose.swordPivotPosition.clone().lerp(overlay.swordPivotPosition, weight),
      swordPivotRotation: basePose.swordPivotRotation.clone().lerp(overlay.swordPivotRotation, weight),
    };
  }

  private resolveOverlayBlend(input: ProceduralAnimationInput): number {
    if (input.visualState === 'thrustCharge') {
      return 0.55 + input.phaseProgress * 0.45;
    }
    if (input.visualPhase === 'startup') {
      return clamp(input.phaseProgress * 1.2, 0, 1);
    }
    if (input.visualPhase === 'recovery') {
      return 1 - input.phaseProgress * 0.82;
    }
    return 1;
  }

  private applyStateTimelineMotion(targetPose: ResolvedHeroPose, input: ProceduralAnimationInput): void {
    const additiveMap = heroPoseConfig.timelineAdditives[input.visualState];
    if (!additiveMap) {
      return;
    }

    const rawAdditive = additiveMap[input.visualPhase];
    if (!rawAdditive) {
      return;
    }

    const additive =
      input.visualState === 'swing'
        ? mirrorSwingAdditive(rawAdditive, input.attackSide)
        : rawAdditive;
    const progress = clamp(input.phaseProgress, 0, 1);
    const weight =
      input.visualPhase === 'recovery'
        ? 1 - progress
        : input.visualPhase === 'startup'
          ? progress
          : 0.35 + progress * 0.65;
    addPoseScaled(targetPose, additive, weight);
  }

  private applyBodyHooks(targetPose: ResolvedHeroPose, input: ProceduralAnimationInput): void {
    targetPose.torsoRotation.z += input.attackSide * input.attackWeight * heroPoseConfig.locomotion.attackLean.torsoRoll;
    targetPose.torsoRotation.x -= input.chargeRatio * heroPoseConfig.locomotion.attackLean.torsoPitchFromCharge;

    if (input.hitConfirm > 0) {
      const hitPulse = Math.sin(input.hitConfirm * Math.PI * 5) * input.hitConfirm;
      targetPose.weaponAnchorPosition.z -= 0.08 * hitPulse;
      targetPose.swordPivotPosition.z -= 0.04 * hitPulse;
      targetPose.swordPivotRotation.x += deg(12) * hitPulse;
      targetPose.swordPivotRotation.z -= input.attackSide * deg(10) * hitPulse;
      targetPose.torsoRotation.x -= deg(4) * hitPulse;
    }
  }

  private applyActionCurves(targetPose: ResolvedHeroPose, input: ProceduralAnimationInput): void {
    const t = clamp(input.phaseProgress, 0, 1);

    switch (input.visualState) {
      case 'swing': {
        const curve = heroPoseConfig.actionCurves.swing;
        const side = input.attackSide;
        if (input.visualPhase === 'startup') {
          const weight = easeOutCubic(t);
          targetPose.weaponAnchorPosition.x += side * curve.drawBackReach * 0.7 * weight;
          targetPose.weaponAnchorPosition.z -= 0.04 * weight;
          targetPose.weaponAnchorRotation.y += side * curve.drawBackYaw * 0.3 * weight;
          targetPose.weaponAnchorRotation.z += side * deg(4) * weight;
          targetPose.swordPivotPosition.x += side * 0.08 * weight;
          targetPose.swordPivotPosition.z -= 0.08 * weight;
          targetPose.swordPivotRotation.y += side * deg(12) * weight;
          targetPose.swordPivotRotation.z += side * deg(12) * weight;
          targetPose.torsoRotation.y += side * curve.torsoYaw * 0.34 * weight;
        } else if (input.visualPhase === 'active') {
          const weight = easeInOutSine(t);
          const arcHeight = Math.sin(weight * Math.PI);
          targetPose.weaponAnchorPosition.x += side * THREE.MathUtils.lerp(0.04, -0.08, weight);
          targetPose.weaponAnchorPosition.z += THREE.MathUtils.lerp(-0.02, curve.frontOffset, weight);
          targetPose.weaponAnchorRotation.y += side * THREE.MathUtils.lerp(curve.drawBackYaw * 0.16, -curve.sweepYaw * 0.18, weight);
          targetPose.swordPivotPosition.x += side * THREE.MathUtils.lerp(0.28, -0.34, weight);
          targetPose.swordPivotPosition.y += curve.arcLift * arcHeight;
          targetPose.swordPivotPosition.z += THREE.MathUtils.lerp(-0.02, curve.sweepReach, weight);
          targetPose.swordPivotRotation.y += side * THREE.MathUtils.lerp(deg(22), deg(-36), weight);
          targetPose.swordPivotRotation.z += side * THREE.MathUtils.lerp(deg(10), deg(-28), weight);
          targetPose.torsoRotation.y -= side * curve.torsoYaw * (0.1 + weight * 0.18);
        } else if (input.visualPhase === 'recovery') {
          const weight = 1 - easeOutCubic(t);
          targetPose.weaponAnchorRotation.y += side * deg(6) * weight;
          targetPose.swordPivotPosition.x += side * 0.12 * weight;
          targetPose.swordPivotPosition.z -= 0.04 * weight;
          targetPose.swordPivotRotation.y += side * deg(12) * weight;
          targetPose.swordPivotRotation.z += side * deg(10) * weight;
          targetPose.torsoRotation.y += side * curve.torsoYaw * 0.1 * weight;
        }
        break;
      }
      case 'thrustCharge': {
        const curve = heroPoseConfig.actionCurves.thrustCharge;
        const weight = easeOutCubic(input.chargeRatio);
        targetPose.weaponAnchorPosition.x += 0.02 * weight;
        targetPose.weaponAnchorPosition.z -= curve.pullBack * 0.12 * weight;
        targetPose.weaponAnchorPosition.y += curve.lift * 0.14 * weight;
        targetPose.swordPivotPosition.x += 0.14 * weight;
        targetPose.swordPivotPosition.y += (curve.gripLift + 0.18) * weight;
        targetPose.swordPivotPosition.z -= 0.06 * weight;
        targetPose.swordPivotRotation.x -= deg(28) * weight;
        targetPose.swordPivotRotation.y += deg(16) * weight;
        targetPose.swordPivotRotation.z += deg(86) * weight;
        targetPose.weaponAnchorRotation.x += curve.torsoPitch * 0.28 * weight;
        targetPose.torsoRotation.x -= curve.torsoPitch * weight;
        targetPose.torsoRotation.y += curve.tipAimYaw * 0.4 * weight;
        break;
      }
      case 'thrustRelease': {
        const curve = heroPoseConfig.actionCurves.thrustRelease;
        if (input.visualPhase === 'startup') {
          const weight = easeOutCubic(t);
          targetPose.weaponAnchorPosition.y += curve.recoil * 0.14 * weight;
          targetPose.weaponAnchorPosition.z -= 0.02 * weight;
          targetPose.swordPivotPosition.x += 0.1 * weight;
          targetPose.swordPivotPosition.y += 0.12 * weight;
          targetPose.swordPivotRotation.x -= deg(12) * weight;
          targetPose.swordPivotRotation.y += deg(12) * weight;
          targetPose.swordPivotRotation.z += deg(38) * weight;
        } else if (input.visualPhase === 'active') {
          const weight = easeOutCubic(t);
          targetPose.weaponAnchorPosition.x += THREE.MathUtils.lerp(0.01, -0.01, weight);
          targetPose.weaponAnchorPosition.z += curve.extension * 0.05 * weight;
          targetPose.weaponAnchorPosition.y += 0.03 * weight;
          targetPose.swordPivotPosition.x += THREE.MathUtils.lerp(0.22, -0.28, weight);
          targetPose.swordPivotPosition.y += THREE.MathUtils.lerp(0.22, -0.08, weight);
          targetPose.swordPivotPosition.z += 0.16 + curve.extension * 0.18 * weight;
          targetPose.swordPivotRotation.x += THREE.MathUtils.lerp(deg(-26), deg(36), weight);
          targetPose.swordPivotRotation.y += THREE.MathUtils.lerp(deg(12), deg(-22), weight);
          targetPose.swordPivotRotation.z += THREE.MathUtils.lerp(deg(98), deg(-92), weight);
          targetPose.torsoRotation.x += curve.torsoPitch * weight;
          targetPose.torsoRotation.y -= deg(10) * weight;
        } else if (input.visualPhase === 'recovery') {
          const weight = 1 - easeOutCubic(t);
          targetPose.weaponAnchorPosition.z += curve.recoil * 0.1 * weight;
          targetPose.swordPivotPosition.x -= 0.1 * weight;
          targetPose.swordPivotPosition.y += 0.04 * weight;
          targetPose.swordPivotPosition.z += 0.08 * weight;
          targetPose.swordPivotRotation.y -= deg(10) * weight;
          targetPose.swordPivotRotation.z -= deg(38) * weight;
        }
        break;
      }
      case 'fireBurst': {
        const curve = heroPoseConfig.actionCurves.fireBurst;
        const weight = 1 - Math.abs(t * 2 - 1);
        targetPose.weaponAnchorPosition.z -= curve.trail * weight;
        targetPose.weaponAnchorRotation.x += deg(8) * weight;
        targetPose.torsoRotation.z += input.attackSide * curve.braceRoll * weight;
        break;
      }
      case 'fireVault': {
        const curve = heroPoseConfig.actionCurves.fireVault;
        if (input.visualPhase === 'startup') {
          const weight = easeOutCubic(t);
          targetPose.torsoOffset.y -= curve.startupCrouch * weight;
          targetPose.torsoOffset.z -= curve.startupCrouch * 0.45 * weight;
          targetPose.weaponAnchorPosition.y += curve.travelRaise * 0.28 * weight;
          targetPose.weaponAnchorPosition.z -= curve.startupCrouch * 0.7 * weight;
          targetPose.weaponAnchorRotation.x += curve.overheadPitch * 0.55 * weight;
          targetPose.weaponAnchorRotation.y += curve.startupCoilYaw * weight;
          targetPose.swordPivotRotation.z -= deg(12) * weight;
          targetPose.torsoRotation.y += curve.startupCoilYaw * 0.55 * weight;
          targetPose.torsoRotation.x -= deg(10) * weight;
        } else if (input.visualPhase === 'travel') {
          const weight = easeInOutSine(t);
          targetPose.weaponAnchorPosition.y += curve.travelRaise * weight;
          targetPose.weaponAnchorPosition.z -= curve.travelRaise * 0.28 * weight;
          targetPose.weaponAnchorRotation.x += curve.overheadPitch * weight;
          targetPose.weaponAnchorRotation.y += curve.travelYaw * weight;
          targetPose.swordPivotRotation.x += deg(18) * weight;
          targetPose.swordPivotRotation.z -= deg(20) * weight;
          targetPose.torsoRotation.x -= deg(12) * weight;
          targetPose.torsoRotation.y += curve.travelYaw * 0.45 * weight;
        } else if (input.visualPhase === 'impact') {
          const weight = easeOutCubic(t);
          targetPose.weaponAnchorPosition.y -= curve.slamDrop * weight;
          targetPose.weaponAnchorPosition.z += curve.slamReach * weight;
          targetPose.weaponAnchorRotation.x -= deg(54) * weight;
          targetPose.weaponAnchorRotation.y -= curve.travelYaw * 0.65 * weight;
          targetPose.swordPivotRotation.x -= deg(28) * weight;
          targetPose.swordPivotRotation.z += deg(18) * weight;
          targetPose.torsoRotation.x += curve.slamPitch * weight;
          targetPose.torsoRotation.z += deg(8) * weight;
        } else if (input.visualPhase === 'recovery') {
          const weight = 1 - easeOutCubic(t);
          targetPose.weaponAnchorPosition.y += curve.recoveryLift * weight;
          targetPose.weaponAnchorPosition.z += curve.recoveryLift * weight;
          targetPose.swordPivotRotation.x -= deg(10) * weight;
          targetPose.torsoRotation.x += deg(8) * weight;
        }
        break;
      }
      case 'fireWheel': {
        const curve = heroPoseConfig.actionCurves.fireWheel;
        if (input.visualPhase === 'startup') {
          const weight = easeOutCubic(t);
          targetPose.weaponAnchorPosition.z -= curve.bracePull * weight;
          targetPose.weaponAnchorPosition.y += curve.chestLift * 0.35 * weight;
          targetPose.weaponAnchorRotation.z += deg(8) * weight;
          targetPose.swordPivotRotation.z += deg(10) * weight;
          targetPose.torsoRotation.x -= curve.roarLeanBack * 0.45 * weight;
        } else if (input.visualPhase === 'active') {
          const weight = easeInOutSine(t);
          targetPose.weaponAnchorPosition.y += curve.chestLift * weight;
          targetPose.weaponAnchorPosition.z += curve.bracePull * 0.5 * weight;
          targetPose.weaponAnchorRotation.z += curve.swordRoll * Math.sin(weight * Math.PI);
          targetPose.swordPivotPosition.y += curve.swordLift * weight;
          targetPose.swordPivotRotation.x -= deg(12) * weight;
          targetPose.swordPivotRotation.z += curve.swordRoll * 0.5 * Math.sin(weight * Math.PI);
          targetPose.torsoRotation.x += curve.roarLeanBack * weight;
        } else if (input.visualPhase === 'recovery') {
          const weight = 1 - easeOutCubic(t);
          targetPose.weaponAnchorPosition.y += curve.recoverySettle * weight;
          targetPose.swordPivotRotation.z += deg(6) * weight;
          targetPose.torsoRotation.x += deg(6) * weight;
        }
        break;
      }
      case 'dragonFireCast': {
        const curve = heroPoseConfig.actionCurves.dragonFireCast;
        if (input.visualPhase === 'startup') {
          const weight = easeOutCubic(t);
          targetPose.weaponAnchorPosition.y += curve.raise * weight;
          targetPose.weaponAnchorRotation.x += deg(20) * weight;
          targetPose.torsoRotation.x -= curve.castPitch * weight;
        } else if (input.visualPhase === 'recovery') {
          const weight = 1 - easeOutCubic(t);
          targetPose.weaponAnchorPosition.z += curve.braceForward * weight;
        }
        break;
      }
      default:
        break;
    }
  }
}
