import * as THREE from 'three';
import { editModeConfig } from '../config/editModeConfig';
import { clamp, damp } from '../core/math';

export class EditCameraController {
  readonly camera: THREE.PerspectiveCamera;

  private readonly domElement: HTMLElement;
  private readonly pressedKeys = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly targetVelocity = new THREE.Vector3();
  private yaw = 0;
  private pitch = -0.35;
  private enabled = false;
  private freelookActive = false;
  private moveSpeed: number = editModeConfig.baseMoveSpeed;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 300);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.preventContextMenu);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.preventContextMenu);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.freelookActive = false;
      this.pressedKeys.clear();
      this.velocity.set(0, 0, 0);
      this.targetVelocity.set(0, 0, 0);
    }
  }

  syncFromCamera(camera: THREE.Camera): void {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }

    this.camera.position.copy(camera.position);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    this.yaw = Math.atan2(forward.x, forward.z);
    this.pitch = Math.asin(clamp(forward.y, -1, 1));
    this.applyRotation();
  }

  update(deltaSeconds: number, draggingGizmo: boolean): void {
    if (!this.enabled || draggingGizmo) {
      this.targetVelocity.set(0, 0, 0);
    } else if (this.freelookActive) {
      const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      const move = new THREE.Vector3();

      if (this.pressedKeys.has('KeyW')) move.add(forward);
      if (this.pressedKeys.has('KeyS')) move.sub(forward);
      if (this.pressedKeys.has('KeyA')) move.sub(right);
      if (this.pressedKeys.has('KeyD')) move.add(right);
      if (this.pressedKeys.has('KeyQ')) move.y -= 1;
      if (this.pressedKeys.has('KeyE')) move.y += 1;

      if (move.lengthSq() > 1) {
        move.normalize();
      }

      const speedMultiplier =
        this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight')
          ? editModeConfig.fastMultiplier
          : 1;
      this.targetVelocity.copy(move.multiplyScalar(this.moveSpeed * speedMultiplier));
    } else {
      this.targetVelocity.set(0, 0, 0);
    }

    this.velocity.x = damp(this.velocity.x, this.targetVelocity.x, editModeConfig.positionSharpness, deltaSeconds);
    this.velocity.y = damp(this.velocity.y, this.targetVelocity.y, editModeConfig.positionSharpness, deltaSeconds);
    this.velocity.z = damp(this.velocity.z, this.targetVelocity.z, editModeConfig.positionSharpness, deltaSeconds);

    this.camera.position.addScaledVector(this.velocity, deltaSeconds);
    this.applyRotation();
  }

  resize(aspectRatio: number): void {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }

  isFreelookActive(): boolean {
    return this.enabled && this.freelookActive;
  }

  getMoveSpeed(): number {
    return this.moveSpeed;
  }

  private applyRotation(): void {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) {
      return;
    }
    this.pressedKeys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || !this.freelookActive) {
      return;
    }

    this.yaw -= event.movementX * editModeConfig.lookSensitivity;
    this.pitch = clamp(
      this.pitch - event.movementY * editModeConfig.lookSensitivity,
      editModeConfig.pitchMin,
      editModeConfig.pitchMax,
    );
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (!this.enabled) {
      return;
    }
    if (event.button === 2 && this.domElement.contains(event.target as Node)) {
      this.freelookActive = true;
    }
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button === 2) {
      this.freelookActive = false;
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.enabled || !this.domElement.contains(event.target as Node)) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    this.moveSpeed = clamp(
      this.moveSpeed * (direction > 0 ? editModeConfig.speedStep : 1 / editModeConfig.speedStep),
      editModeConfig.minSpeed,
      editModeConfig.maxSpeed,
    );
  };

  private readonly preventContextMenu = (event: MouseEvent): void => {
    if (this.enabled) {
      event.preventDefault();
    }
  };
}
