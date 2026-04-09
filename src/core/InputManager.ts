import { inputConfig, type InputAction } from '../config/inputConfig';

export class InputManager {
  private static readonly pressBufferMs = 120;

  private readonly pressedKeys = new Set<string>();
  private readonly justPressedKeys = new Set<string>();
  private readonly justReleasedKeys = new Set<string>();
  private readonly pressBufferExpiry = new Map<string, number>();
  private readonly consumedBufferedPresses = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private pointerLocked = false;
  private pointerLockEnabled = true;
  private readonly targetElement: HTMLElement;

  constructor(targetElement: HTMLElement) {
    this.targetElement = targetElement;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.targetElement.addEventListener('click', this.requestPointerLock);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.targetElement.removeEventListener('click', this.requestPointerLock);
  }

  isDown(action: InputAction): boolean {
    return inputConfig[action].some((code) => this.pressedKeys.has(code));
  }

  wasPressed(action: InputAction): boolean {
    const now = performance.now();
    return inputConfig[action].some((code) => {
      if (this.justPressedKeys.has(code)) {
        return true;
      }

      const expiry = this.pressBufferExpiry.get(code) ?? 0;
      if (expiry <= now || this.consumedBufferedPresses.has(code)) {
        return false;
      }

      this.consumedBufferedPresses.add(code);
      return true;
    });
  }

  wasReleased(action: InputAction): boolean {
    return inputConfig[action].some((code) => this.justReleasedKeys.has(code));
  }

  consumeLookDelta(): { x: number; y: number } {
    const delta = {
      x: this.lookDeltaX,
      y: this.lookDeltaY,
    };

    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    return delta;
  }

  clearFrameState(): void {
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  setPointerLockEnabled(enabled: boolean): void {
    this.pointerLockEnabled = enabled;
    if (!enabled && document.pointerLockElement === this.targetElement) {
      document.exitPointerLock();
    }
  }

  private readonly requestPointerLock = (): void => {
    if (this.pointerLockEnabled && document.pointerLockElement !== this.targetElement) {
      this.targetElement.requestPointerLock();
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.isGameplayBinding(event.code)) {
      event.preventDefault();
    }

    if (!this.pressedKeys.has(event.code)) {
      this.justPressedKeys.add(event.code);
      this.pressBufferExpiry.set(event.code, performance.now() + InputManager.pressBufferMs);
      this.consumedBufferedPresses.delete(event.code);
    }

    this.pressedKeys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.isGameplayBinding(event.code)) {
      event.preventDefault();
    }

    this.pressedKeys.delete(event.code);
    this.justReleasedKeys.add(event.code);
    this.pressBufferExpiry.delete(event.code);
    this.consumedBufferedPresses.delete(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) {
      return;
    }

    this.lookDeltaX += event.movementX;
    this.lookDeltaY += event.movementY;
  };

  private readonly onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.targetElement;
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    const code = event.button === 0 ? 'MouseLeft' : event.button === 2 ? 'MouseRight' : '';
    if (!code) {
      return;
    }

    if (!this.pressedKeys.has(code)) {
      this.justPressedKeys.add(code);
      this.pressBufferExpiry.set(code, performance.now() + InputManager.pressBufferMs);
      this.consumedBufferedPresses.delete(code);
    }

    this.pressedKeys.add(code);
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    const code = event.button === 0 ? 'MouseLeft' : event.button === 2 ? 'MouseRight' : '';
    if (!code) {
      return;
    }

    this.pressedKeys.delete(code);
    this.justReleasedKeys.add(code);
    this.pressBufferExpiry.delete(code);
    this.consumedBufferedPresses.delete(code);
  };

  private isGameplayBinding(code: string): boolean {
    return (Object.values(inputConfig) as ReadonlyArray<ReadonlyArray<string>>).some((bindings) =>
      bindings.includes(code),
    );
  }
}
