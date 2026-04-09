import * as THREE from 'three';
import { cameraConfig } from '../config/cameraConfig';
import { combatConfig } from '../config/combatConfig';
import { clamp, damp } from '../core/math';

type CameraMode = 'normal' | 'combat';

export class ThirdPersonCameraRig {
  readonly camera: THREE.PerspectiveCamera;

  private readonly lookDirection = new THREE.Vector3();
  private readonly smoothedPosition = new THREE.Vector3();
  private readonly smoothedTarget = new THREE.Vector3();
  private readonly aimBias = new THREE.Vector3();
  private yaw: number;
  private pitch = -0.16;
  private shakeAmount = 0;
  private shakeTime = 0;

  constructor(initialYaw = 0) {
    this.camera = new THREE.PerspectiveCamera(cameraConfig.fov, 1, cameraConfig.near, cameraConfig.far);
    this.yaw = initialYaw;
  }

  applyLookInput(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * cameraConfig.yawSensitivity;
    this.yaw = THREE.MathUtils.euclideanModulo(this.yaw + Math.PI, Math.PI * 2) - Math.PI;
    this.pitch = clamp(
      this.pitch - deltaY * cameraConfig.pitchSensitivity,
      combatConfig.camera.pitchMin,
      combatConfig.camera.pitchMax,
    );
  }

  update(
    deltaSeconds: number,
    followTarget: THREE.Vector3,
    facingYaw: number,
    mode: CameraMode,
    shake: number,
  ): void {
    const distance =
      mode === 'combat' ? combatConfig.camera.combatDistance : combatConfig.camera.normalDistance;
    const positionSharpness =
      mode === 'combat'
        ? combatConfig.camera.combatPositionSharpness
        : combatConfig.camera.normalPositionSharpness;
    const targetSharpness =
      mode === 'combat'
        ? combatConfig.camera.combatTargetSharpness
        : combatConfig.camera.normalTargetSharpness;
    const lookAhead =
      mode === 'combat'
        ? combatConfig.camera.attackLookAheadDistance
        : combatConfig.camera.lookAheadDistance;

    const lookDirection = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    ).normalize();

    const shoulderDirection = new THREE.Vector3(lookDirection.z, 0, -lookDirection.x)
      .normalize()
      .multiplyScalar(combatConfig.camera.shoulderOffset);
    const targetShoulderDirection = shoulderDirection
      .clone()
      .setLength(combatConfig.camera.targetShoulderOffset);

    const desiredAimBias = new THREE.Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw)).multiplyScalar(lookAhead);
    this.aimBias.x = damp(this.aimBias.x, desiredAimBias.x, combatConfig.camera.aimBiasSharpness, deltaSeconds);
    this.aimBias.y = damp(this.aimBias.y, desiredAimBias.y, combatConfig.camera.aimBiasSharpness, deltaSeconds);
    this.aimBias.z = damp(this.aimBias.z, desiredAimBias.z, combatConfig.camera.aimBiasSharpness, deltaSeconds);

    const desiredTarget = followTarget
      .clone()
      .add(this.aimBias)
      .add(targetShoulderDirection)
      .add(new THREE.Vector3(0, combatConfig.camera.focusHeight, 0));
    const desiredPosition = desiredTarget
      .clone()
      .add(shoulderDirection)
      .addScaledVector(lookDirection, -distance);

    if (this.smoothedPosition.lengthSq() === 0 && this.smoothedTarget.lengthSq() === 0) {
      this.smoothedPosition.copy(desiredPosition);
      this.smoothedTarget.copy(desiredTarget);
    } else {
      this.smoothedPosition.x = damp(this.smoothedPosition.x, desiredPosition.x, positionSharpness, deltaSeconds);
      this.smoothedPosition.y = damp(this.smoothedPosition.y, desiredPosition.y, positionSharpness, deltaSeconds);
      this.smoothedPosition.z = damp(this.smoothedPosition.z, desiredPosition.z, positionSharpness, deltaSeconds);

      this.smoothedTarget.x = damp(this.smoothedTarget.x, desiredTarget.x, targetSharpness, deltaSeconds);
      this.smoothedTarget.y = damp(this.smoothedTarget.y, desiredTarget.y, targetSharpness, deltaSeconds);
      this.smoothedTarget.z = damp(this.smoothedTarget.z, desiredTarget.z, targetSharpness, deltaSeconds);
    }

    this.shakeAmount = Math.max(this.shakeAmount, shake);
    this.shakeAmount = Math.max(0, this.shakeAmount - deltaSeconds * combatConfig.camera.shakeDamping);
    this.shakeTime += deltaSeconds * 40;

    const shakeOffset = new THREE.Vector3(
      Math.sin(this.shakeTime) * this.shakeAmount,
      Math.cos(this.shakeTime * 0.8) * this.shakeAmount * 0.5,
      0,
    );

    this.camera.position.copy(this.smoothedPosition).add(shakeOffset);
    this.camera.lookAt(this.smoothedTarget);
  }

  resize(aspectRatio: number): void {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }

  getYaw(): number {
    return this.yaw;
  }

  getPitch(): number {
    return this.pitch;
  }

  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  getLookDirection(): THREE.Vector3 {
    return this.camera.getWorldDirection(this.lookDirection).normalize().clone();
  }
}
