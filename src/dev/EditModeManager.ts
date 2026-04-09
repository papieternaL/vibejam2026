import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { EditCameraController } from './EditCameraController';
import { SelectionManager } from './SelectionManager';
import { SceneSerializer } from './SceneSerializer';
import { editModeConfig } from '../config/editModeConfig';

type EditableWorld = {
  scene: THREE.Scene;
  getGameplayCamera(): THREE.Camera;
  getEditableObjects(): THREE.Object3D[];
  setGameplayPaused(paused: boolean): void;
  setGameplayHudVisible(visible: boolean): void;
  setEditHelpersVisible(visible: boolean): void;
};

export class EditModeManager {
  private readonly world: EditableWorld;
  private readonly domElement: HTMLElement;
  private readonly editCamera: EditCameraController;
  private readonly selection: SelectionManager;
  private readonly transformControls: TransformControls;
  private readonly transformControlsHelper: THREE.Object3D;
  private readonly axesHelper = new THREE.AxesHelper(2.5);
  private readonly overlay = document.createElement('section');
  private enabled = false;
  private gizmoMode: 'translate' | 'rotate' | 'scale' = 'translate';
  private draggingGizmo = false;
  private readonly onModeChanged: (enabled: boolean) => void;

  constructor(
    world: EditableWorld,
    renderer: THREE.WebGLRenderer,
    overlayParent: HTMLElement,
    onModeChanged: (enabled: boolean) => void,
  ) {
    this.world = world;
    this.domElement = renderer.domElement;
    this.onModeChanged = onModeChanged;

    this.editCamera = new EditCameraController(this.domElement);
    this.selection = new SelectionManager(this.domElement, world.scene, this.onSelectionChanged);

    this.transformControls = new TransformControls(this.editCamera.camera, this.domElement);
    this.transformControls.enabled = false;
    this.transformControls.setMode(this.gizmoMode);
    this.transformControls.addEventListener('dragging-changed', this.onDraggingChanged as never);
    this.transformControlsHelper = this.transformControls.getHelper();
    this.transformControlsHelper.visible = false;
    world.scene.add(this.transformControlsHelper);

    this.axesHelper.visible = false;
    world.scene.add(this.axesHelper);

    this.overlay.className = 'edit-overlay';
    overlayParent.append(this.overlay);
    this.overlay.hidden = true;

    window.addEventListener('keydown', this.onKeyDown);
    this.domElement.addEventListener('click', this.onClick);
  }

  dispose(): void {
    this.editCamera.dispose();
    this.selection.dispose();
    this.transformControls.removeEventListener('dragging-changed', this.onDraggingChanged as never);
    window.removeEventListener('keydown', this.onKeyDown);
    this.domElement.removeEventListener('click', this.onClick);
  }

  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    this.world.setGameplayPaused(enabled);
    this.world.setGameplayHudVisible(!enabled);
    this.world.setEditHelpersVisible(enabled);

    this.selection.setRegisteredObjects(this.world.getEditableObjects());
    this.selection.setEnabled(enabled);
    this.editCamera.setEnabled(enabled);

    this.transformControls.enabled = enabled;
    this.transformControlsHelper.visible = enabled && this.selection.getSelected() !== null;
    this.axesHelper.visible = enabled;
    this.overlay.hidden = !enabled;
    this.onModeChanged(enabled);

    if (enabled) {
      document.exitPointerLock();
      this.editCamera.syncFromCamera(this.world.getGameplayCamera());
    } else {
      this.selection.clearSelection();
      this.transformControls.detach();
    }
  }

  update(deltaSeconds: number): void {
    if (!this.enabled) {
      return;
    }

    this.editCamera.update(deltaSeconds, this.draggingGizmo);
    this.selection.update();
    this.refreshOverlay();
  }

  resize(aspectRatio: number): void {
    this.editCamera.resize(aspectRatio);
  }

  getActiveCamera(): THREE.Camera {
    return this.enabled ? this.editCamera.camera : this.world.getGameplayCamera();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  exportEditableTransforms(): string {
    return SceneSerializer.exportEditableTransforms(this.world.getEditableObjects());
  }

  getDebugState(): {
    enabled: boolean;
    selectedName: string | null;
    gizmoMode: 'translate' | 'rotate' | 'scale';
    moveSpeed: number;
    freelookActive: boolean;
    registeredCount: number;
    cameraPosition: { x: number; y: number; z: number };
    cameraRotation: { x: number; y: number; z: number };
  } {
    return {
      enabled: this.enabled,
      selectedName: this.selection.getSelected()?.name ?? null,
      gizmoMode: this.gizmoMode,
      moveSpeed: this.editCamera.getMoveSpeed(),
      freelookActive: this.editCamera.isFreelookActive(),
      registeredCount: this.selection.getRegisteredCount(),
      cameraPosition: {
        x: Number(this.editCamera.camera.position.x.toFixed(3)),
        y: Number(this.editCamera.camera.position.y.toFixed(3)),
        z: Number(this.editCamera.camera.position.z.toFixed(3)),
      },
      cameraRotation: {
        x: Number(this.editCamera.camera.rotation.x.toFixed(3)),
        y: Number(this.editCamera.camera.rotation.y.toFixed(3)),
        z: Number(this.editCamera.camera.rotation.z.toFixed(3)),
      },
    };
  }

  debugRaycast(clientX: number, clientY: number): Array<{
    objectName: string;
    rootName: string | null;
    distance: number;
  }> {
    return this.selection.debugRaycast(this.editCamera.camera, clientX, clientY);
  }

  private readonly onSelectionChanged = (object: THREE.Object3D | null): void => {
    if (!object) {
      this.transformControls.detach();
      this.transformControlsHelper.visible = false;
      return;
    }

    this.transformControls.attach(object);
    this.transformControlsHelper.visible = true;
    this.transformControls.setMode(this.gizmoMode);
  };

  private readonly onDraggingChanged = (event: { value: unknown }): void => {
    const dragging = Boolean(event.value);
    this.draggingGizmo = dragging;
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (!this.enabled || event.button !== 0 || this.draggingGizmo || this.editCamera.isFreelookActive()) {
      return;
    }
    this.selection.pick(this.editCamera.camera, event.clientX, event.clientY);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'F1') {
      event.preventDefault();
      this.toggle();
      return;
    }

    if (!this.enabled) {
      return;
    }

    if (event.ctrlKey && event.code === 'KeyS') {
      event.preventDefault();
      const json = this.exportEditableTransforms();
      console.log(json);
      return;
    }

    if (event.code === 'Digit1') {
      this.setGizmoMode('translate');
    } else if (event.code === 'Digit2') {
      this.setGizmoMode('rotate');
    } else if (event.code === 'Digit3') {
      this.setGizmoMode('scale');
    } else if (event.code === 'Delete') {
      this.deleteSelection();
    } else if (event.ctrlKey && event.code === 'KeyD') {
      event.preventDefault();
      this.duplicateSelection();
    }
  };

  private setGizmoMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.gizmoMode = mode;
    this.transformControls.setMode(mode);
  }

  private deleteSelection(): void {
    const selected = this.selection.getSelected();
    if (!selected || !selected.parent) {
      return;
    }

    selected.parent.remove(selected);
    this.selection.clearSelection();
    this.selection.setRegisteredObjects(this.world.getEditableObjects());
  }

  private duplicateSelection(): void {
    const selected = this.selection.getSelected();
    if (!selected || !selected.parent) {
      return;
    }

    const clone = selected.clone(true);
    clone.name = `${selected.name}-copy`;
    clone.position.add(
      new THREE.Vector3(
        editModeConfig.duplicateOffset.x,
        editModeConfig.duplicateOffset.y,
        editModeConfig.duplicateOffset.z,
      ),
    );
    this.markEditableRecursive(clone);
    selected.parent.add(clone);
    this.selection.setRegisteredObjects(this.world.getEditableObjects());
    this.selection.pickObject(clone);
  }

  private markEditableRecursive(object: THREE.Object3D): void {
    object.userData.editable = true;
    object.userData.editableRoot = true;
    object.traverse((child) => {
      if (child !== object) {
        child.userData.editable = true;
      }
    });
  }

  private refreshOverlay(): void {
    const selected = this.selection.getSelected();
    this.overlay.innerHTML = [
      '<h2>Edit Mode ON</h2>',
      `<p>Selected: ${selected?.name ?? 'None'}</p>`,
      `<p>Gizmo: ${this.gizmoMode}</p>`,
      `<p>Fly Speed: ${this.editCamera.getMoveSpeed().toFixed(1)}</p>`,
      '<p>F1 toggle | RMB freelook | WASD move | Q/E down/up | Shift faster</p>',
      '<p>1/2/3 gizmo | Ctrl+S export | Delete remove | Ctrl+D duplicate</p>',
    ].join('');
  }
}
