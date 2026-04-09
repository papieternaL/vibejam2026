import type { ProceduralAnimationInput, ResolvedHeroPose } from './AnimationStateTypes';
import { heroPoseConfig } from './HeroPoseConfig';
import { blendResolvedPose, resolvePose } from './AnimationPoseUtils';

export class LocomotionAnimationLayer {
  private motionTime = 0;
  private locomotionBlend = 0;
  private fastMoveBlend = 0;

  update(deltaSeconds: number, input: ProceduralAnimationInput): ResolvedHeroPose {
    if (input.grounded) {
      const stride = heroPoseConfig.locomotion.stride;
      const directionalSpeed =
        Math.abs(input.localMoveZ) + Math.abs(input.localMoveX) * stride.strafeRateScale;
      this.motionTime += deltaSeconds * (stride.baseRate + directionalSpeed * stride.speedRate);
    }

    this.locomotionBlend +=
      (Math.min(1, Math.max(0, input.normalizedSpeed * 1.1)) - this.locomotionBlend) *
      (1 - Math.exp(-heroPoseConfig.blend.locomotionSharpness * deltaSeconds));

    const fastMoveTarget =
      input.visualState === 'idle' || input.visualState === 'run' || input.visualState === 'fastMove'
        ? Math.min(
            1,
            Math.max(
              0,
              (input.normalizedSpeed - heroPoseConfig.locomotion.fastMoveThreshold) /
                (1 - heroPoseConfig.locomotion.fastMoveThreshold),
            ),
          )
        : 0;
    this.fastMoveBlend +=
      (fastMoveTarget - this.fastMoveBlend) *
      (1 - Math.exp(-heroPoseConfig.blend.fastMoveSharpness * deltaSeconds));

    const runPose = blendResolvedPose(
      resolvePose(heroPoseConfig.locomotionPoses.idle),
      resolvePose(heroPoseConfig.locomotionPoses.run),
      this.locomotionBlend,
    );
    const basePose = blendResolvedPose(
      runPose,
      resolvePose(heroPoseConfig.locomotionPoses.fastMove),
      this.fastMoveBlend,
    );

    this.applyLocomotionMotion(basePose, input);
    return basePose;
  }

  getDebugState(): { normalizedSpeed: number; locomotionBlend: number; fastMoveBlend: number } {
    return {
      normalizedSpeed: 0,
      locomotionBlend: this.locomotionBlend,
      fastMoveBlend: this.fastMoveBlend,
    };
  }

  getMotionTime(): number {
    return this.motionTime;
  }

  private applyLocomotionMotion(targetPose: ResolvedHeroPose, input: ProceduralAnimationInput): void {
    const locomotionAttackScale =
      1 - input.attackWeight * (1 - heroPoseConfig.locomotion.attackLocomotionScale);
    const idleAttackScale =
      1 - input.attackWeight * (1 - heroPoseConfig.locomotion.attackIdleScale);
    const idleWave = Math.sin(this.motionTime * heroPoseConfig.locomotion.idleSway.frequency);
    const idleLift = Math.cos(this.motionTime * heroPoseConfig.locomotion.idleSway.frequency * 0.75);
    const runWave = Math.sin(this.motionTime * heroPoseConfig.locomotion.runBob.frequency);
    const runLift =
      Math.sin(this.motionTime * heroPoseConfig.locomotion.runBob.frequency - Math.PI * 0.5) * 0.5 + 0.5;

    const idlePosition = heroPoseConfig.locomotion.idleSway.weaponAnchorPosition;
    const runPosition = heroPoseConfig.locomotion.runBob.weaponAnchorPosition;
    targetPose.weaponAnchorPosition.x += idleWave * idlePosition[0] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.weaponAnchorPosition.y += idleLift * idlePosition[1] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.weaponAnchorPosition.z += idleWave * idlePosition[2] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.weaponAnchorPosition.x += runWave * runPosition[0] * this.locomotionBlend * locomotionAttackScale;
    targetPose.weaponAnchorPosition.y += runLift * runPosition[1] * this.locomotionBlend * locomotionAttackScale;
    targetPose.weaponAnchorPosition.z +=
      Math.cos(this.motionTime * heroPoseConfig.locomotion.runBob.frequency) *
      runPosition[2] *
      this.locomotionBlend *
      locomotionAttackScale;

    const idleAnchorRotation = heroPoseConfig.locomotion.idleSway.weaponAnchorRotation;
    const runAnchorRotation = heroPoseConfig.locomotion.runBob.weaponAnchorRotation;
    targetPose.weaponAnchorRotation.x += idleWave * idleAnchorRotation[0] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.weaponAnchorRotation.y += idleLift * idleAnchorRotation[1] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.weaponAnchorRotation.z += idleWave * idleAnchorRotation[2] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.weaponAnchorRotation.x += runWave * runAnchorRotation[0] * this.locomotionBlend * locomotionAttackScale;
    targetPose.weaponAnchorRotation.y += runWave * runAnchorRotation[1] * this.locomotionBlend * locomotionAttackScale;
    targetPose.weaponAnchorRotation.z +=
      Math.cos(this.motionTime * heroPoseConfig.locomotion.runBob.frequency) *
      runAnchorRotation[2] *
      this.locomotionBlend *
      locomotionAttackScale;

    const idlePivotRotation = heroPoseConfig.locomotion.idleSway.swordPivotRotation;
    const runPivotRotation = heroPoseConfig.locomotion.runBob.swordPivotRotation;
    targetPose.swordPivotRotation.x += idleWave * idlePivotRotation[0] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.swordPivotRotation.y += idleLift * idlePivotRotation[1] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.swordPivotRotation.z += idleWave * idlePivotRotation[2] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.swordPivotRotation.x += runWave * runPivotRotation[0] * this.locomotionBlend * locomotionAttackScale;
    targetPose.swordPivotRotation.y += runWave * runPivotRotation[1] * this.locomotionBlend * locomotionAttackScale;
    targetPose.swordPivotRotation.z +=
      Math.cos(this.motionTime * heroPoseConfig.locomotion.runBob.frequency) *
      runPivotRotation[2] *
      this.locomotionBlend *
      locomotionAttackScale;

    const idleTorsoRotation = heroPoseConfig.locomotion.idleSway.torsoRotation;
    const runTorsoRotation = heroPoseConfig.locomotion.runBob.torsoRotation;
    targetPose.torsoRotation.x += idleWave * idleTorsoRotation[0] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.torsoRotation.y += idleLift * idleTorsoRotation[1] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.torsoRotation.z += idleWave * idleTorsoRotation[2] * (1 - this.locomotionBlend) * idleAttackScale;
    targetPose.torsoRotation.x += runWave * runTorsoRotation[0] * this.locomotionBlend * locomotionAttackScale;
    targetPose.torsoRotation.y += runWave * runTorsoRotation[1] * this.locomotionBlend * locomotionAttackScale;
    targetPose.torsoRotation.z +=
      Math.cos(this.motionTime * heroPoseConfig.locomotion.runBob.frequency) *
      runTorsoRotation[2] *
      this.locomotionBlend *
      locomotionAttackScale;

    targetPose.bodyRotation.z +=
      -input.localMoveX * heroPoseConfig.locomotion.lean.bodyRollFromStrafe * input.normalizedSpeed;
    targetPose.bodyRotation.x +=
      input.localMoveZ * heroPoseConfig.locomotion.lean.bodyPitchFromForward * input.normalizedSpeed;
    targetPose.torsoRotation.y +=
      input.localMoveX * heroPoseConfig.locomotion.lean.torsoYawFromStrafe * input.normalizedSpeed;
    targetPose.torsoRotation.z +=
      -input.localMoveX * heroPoseConfig.locomotion.lean.torsoRollFromStrafe * input.normalizedSpeed;
    targetPose.torsoRotation.x +=
      input.localMoveZ * heroPoseConfig.locomotion.lean.torsoPitchFromForward * input.normalizedSpeed;

    const readyBias = heroPoseConfig.locomotion.readyBias;
    const readyBlend = 1 - Math.min(1, input.attackWeight * 1.15);
    targetPose.torsoRotation.y += readyBias.torsoYawTowardCamera * readyBlend;
    targetPose.weaponAnchorPosition.y += readyBias.weaponForwardLift * readyBlend;
    targetPose.weaponAnchorPosition.z += readyBias.weaponForwardReach * readyBlend;
  }
}
