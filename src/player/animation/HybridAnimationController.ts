import { damp, dampAngle } from '../../core/math';
import { heroPoseConfig } from './HeroPoseConfig';
import type {
  HeroVisualRig,
  ProceduralAnimationDebugState,
  ProceduralAnimationInput,
} from './AnimationStateTypes';
import { resolvePose } from './AnimationPoseUtils';
import { ClipBodyAnimationLayer } from './ClipBodyAnimationLayer';
import { CombatPresentationController } from './CombatPresentationController';
import { LocomotionAnimationLayer } from './LocomotionAnimationLayer';
import { WeaponAnimationController } from './WeaponAnimationController';

export class HybridAnimationController {
  private readonly rig: HeroVisualRig;
  private readonly locomotionLayer = new LocomotionAnimationLayer();
  private readonly combatLayer = new CombatPresentationController();
  private readonly clipBodyLayer = new ClipBodyAnimationLayer();
  private readonly weaponController: WeaponAnimationController;
  private readonly currentBodyRotation = resolvePose(heroPoseConfig.locomotionPoses.idle).bodyRotation;
  private readonly currentTorsoOffset = resolvePose(heroPoseConfig.locomotionPoses.idle).torsoOffset;
  private readonly currentTorsoRotation = resolvePose(heroPoseConfig.locomotionPoses.idle).torsoRotation;
  private bodySpin = 0;
  private lastInput: ProceduralAnimationInput | null = null;

  constructor(rig: HeroVisualRig) {
    this.rig = rig;
    this.weaponController = new WeaponAnimationController(rig);
    this.clipBodyLayer.attachRoot(rig.bodyRoot);
    this.weaponController.snapToPose(resolvePose(heroPoseConfig.locomotionPoses.idle));
    this.commitBodyTransforms(0, 0, 0);
  }

  update(deltaSeconds: number, input: ProceduralAnimationInput): void {
    this.lastInput = input;

    const locomotionPose = this.locomotionLayer.update(deltaSeconds, input);
    const combatPose = this.combatLayer.apply(locomotionPose, input);
    this.clipBodyLayer.update(deltaSeconds, input);

    const bodySharpness = heroPoseConfig.blend.bodySharpness;
    const torsoSharpness = heroPoseConfig.blend.torsoSharpness;
    this.currentBodyRotation.x = damp(this.currentBodyRotation.x, combatPose.bodyRotation.x, bodySharpness, deltaSeconds);
    this.currentBodyRotation.y = dampAngle(this.currentBodyRotation.y, combatPose.bodyRotation.y, bodySharpness, deltaSeconds);
    this.currentBodyRotation.z = damp(this.currentBodyRotation.z, combatPose.bodyRotation.z, bodySharpness, deltaSeconds);

    this.currentTorsoOffset.x = damp(this.currentTorsoOffset.x, combatPose.torsoOffset.x, torsoSharpness, deltaSeconds);
    this.currentTorsoOffset.y = damp(this.currentTorsoOffset.y, combatPose.torsoOffset.y, torsoSharpness, deltaSeconds);
    this.currentTorsoOffset.z = damp(this.currentTorsoOffset.z, combatPose.torsoOffset.z, torsoSharpness, deltaSeconds);

    this.currentTorsoRotation.x = damp(this.currentTorsoRotation.x, combatPose.torsoRotation.x, torsoSharpness, deltaSeconds);
    this.currentTorsoRotation.y = dampAngle(this.currentTorsoRotation.y, combatPose.torsoRotation.y, torsoSharpness, deltaSeconds);
    this.currentTorsoRotation.z = damp(this.currentTorsoRotation.z, combatPose.torsoRotation.z, torsoSharpness, deltaSeconds);

    this.commitBodyTransforms(deltaSeconds, input.visualLift, input.spinRate);
    this.weaponController.update(
      deltaSeconds,
      combatPose,
      input.actionTint,
      input.chargeRatio,
      input.hitConfirm,
      input.attackWeight,
    );

    const motionTime = this.locomotionLayer.getMotionTime();
    this.rig.head.rotation.y =
      Math.sin(motionTime * 1.15) * 0.03 +
      this.currentTorsoRotation.y * heroPoseConfig.locomotion.headTurnScale;
    this.rig.torsoMaterial.emissive.setRGB(
      input.actionTint * 0.44 + input.hitConfirm * 0.12,
      input.actionTint * 0.12,
      0,
    );
  }

  getDebugState(): ProceduralAnimationDebugState {
    return {
      visualState: this.lastInput?.visualState ?? 'idle',
      visualPhase: this.lastInput?.visualPhase ?? 'loop',
      normalizedSpeed: this.lastInput?.normalizedSpeed ?? 0,
      locomotionBlend: this.locomotionLayer.getDebugState().locomotionBlend,
      fastMoveBlend: this.locomotionLayer.getDebugState().fastMoveBlend,
    };
  }

  private commitBodyTransforms(deltaSeconds: number, visualLift: number, spinRate: number): void {
    const bobLift =
      Math.abs(Math.sin(this.locomotionLayer.getMotionTime() * 3.5)) *
      this.locomotionLayer.getDebugState().locomotionBlend *
      heroPoseConfig.locomotion.visualLiftAmplitude;
    this.rig.visualRoot.position.y = visualLift + bobLift;

    if (spinRate > 0.001) {
      this.bodySpin += spinRate * deltaSeconds;
    } else {
      this.bodySpin = dampAngle(this.bodySpin, 0, heroPoseConfig.blend.bodySharpness, deltaSeconds);
    }

    this.rig.bodyRoot.rotation.set(
      this.currentBodyRotation.x,
      this.currentBodyRotation.y + this.bodySpin,
      this.currentBodyRotation.z,
    );
    this.rig.torsoRoot.position.copy(this.currentTorsoOffset);
    this.rig.torsoRoot.rotation.set(
      this.currentTorsoRotation.x,
      this.currentTorsoRotation.y,
      this.currentTorsoRotation.z,
    );
  }
}
