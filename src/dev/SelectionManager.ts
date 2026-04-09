import * as THREE from 'three';

type SelectionChangeHandler = (object: THREE.Object3D | null) => void;

export class SelectionManager {
  private readonly domElement: HTMLElement;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0xffd98c);
  private readonly registered = new Set<THREE.Object3D>();
  private selected: THREE.Object3D | null = null;
  private enabled = false;
  private readonly onSelectionChange: SelectionChangeHandler;

  constructor(domElement: HTMLElement, scene: THREE.Scene, onSelectionChange: SelectionChangeHandler) {
    this.domElement = domElement;
    this.onSelectionChange = onSelectionChange;
    this.boxHelper.visible = false;
    scene.add(this.boxHelper);
  }

  dispose(): void {
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.boxHelper.visible = enabled && this.selected !== null;
    if (!enabled) {
      this.clearSelection();
    }
  }

  setRegisteredObjects(objects: THREE.Object3D[]): void {
    this.registered.clear();
    for (const object of objects) {
      this.registered.add(object);
    }
  }

  update(): void {
    if (this.selected) {
      this.boxHelper.setFromObject(this.selected);
      this.boxHelper.visible = this.enabled;
    }
  }

  getSelected(): THREE.Object3D | null {
    return this.selected;
  }

  getRegisteredCount(): number {
    return this.registered.size;
  }

  pickObject(object: THREE.Object3D): void {
    this.selected = object;
    this.boxHelper.setFromObject(object);
    this.boxHelper.visible = this.enabled;
    this.onSelectionChange(object);
  }

  clearSelection(): void {
    this.selected = null;
    this.boxHelper.visible = false;
    this.onSelectionChange(null);
  }

  pick(camera: THREE.Camera, clientX: number, clientY: number): void {
    if (!this.enabled) {
      return;
    }

    const intersects = this.raycast(camera, clientX, clientY);
    const hit = intersects.find((entry) => this.resolveEditableRoot(entry.object));

    if (!hit) {
      this.clearSelection();
      return;
    }

    const root = this.resolveEditableRoot(hit.object);
    if (!root) {
      this.clearSelection();
      return;
    }

    this.selected = root;
    this.boxHelper.setFromObject(root);
    this.boxHelper.visible = true;
    this.onSelectionChange(root);
  }

  debugRaycast(camera: THREE.Camera, clientX: number, clientY: number): Array<{
    objectName: string;
    rootName: string | null;
    distance: number;
  }> {
    return this.raycast(camera, clientX, clientY).slice(0, 8).map((entry) => ({
      objectName: entry.object.name || entry.object.type,
      rootName: this.resolveEditableRoot(entry.object)?.name ?? null,
      distance: Number(entry.distance.toFixed(3)),
    }));
  }

  private resolveEditableRoot(object: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (this.registered.has(current) || current.userData.editableRoot === true) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  private raycast(camera: THREE.Camera, clientX: number, clientY: number): THREE.Intersection[] {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    camera.updateMatrixWorld(true);
    for (const object of this.registered) {
      object.updateWorldMatrix(true, true);
    }
    this.raycaster.setFromCamera(this.pointer, camera);
    return this.raycaster.intersectObjects([...this.registered], true);
  }
}
