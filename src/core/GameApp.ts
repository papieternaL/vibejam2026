import * as THREE from 'three';
import { FixedStepLoop } from './FixedStepLoop';
import { InputManager } from './InputManager';
import { GameWorld } from '../game/GameWorld';
import { EditModeManager } from '../dev/EditModeManager';

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (milliseconds: number) => void;
    edit_mode_debug: {
      getState: () => {
        enabled: boolean;
        selectedName: string | null;
        gizmoMode: 'translate' | 'rotate' | 'scale';
        moveSpeed: number;
        freelookActive: boolean;
        registeredCount: number;
        cameraPosition: { x: number; y: number; z: number };
        cameraRotation: { x: number; y: number; z: number };
      };
      exportTransforms: () => string;
      debugRaycast: (
        clientX: number,
        clientY: number,
      ) => Array<{ objectName: string; rootName: string | null; distance: number }>;
    };
  }
}

export class GameApp {
  private readonly shell = document.createElement('div');
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly input: InputManager;
  private readonly world: GameWorld;
  private readonly editMode: EditModeManager;
  private readonly loop: FixedStepLoop;
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.shell.className = 'app-shell';
    this.root.replaceChildren(this.shell);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.className = 'game-canvas';
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

    this.shell.appendChild(this.renderer.domElement);

    this.input = new InputManager(this.renderer.domElement);
    this.world = new GameWorld(this.shell, this.renderer, this.input);
    this.editMode = new EditModeManager(
      {
        scene: this.world.getScene(),
        getGameplayCamera: () => this.world.getGameplayCamera(),
        getEditableObjects: () => this.world.getEditableObjects(),
        setGameplayPaused: (paused) => this.world.setGameplayPaused(paused),
        setGameplayHudVisible: (visible) => this.world.setGameplayHudVisible(visible),
        setEditHelpersVisible: (visible) => this.world.setEditHelpersVisible(visible),
      },
      this.renderer,
      this.shell,
      (enabled) => this.input.setPointerLockEnabled(!enabled),
    );
    this.loop = new FixedStepLoop(1 / 60, this.update, this.render);

    this.onResize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onWindowKeyDown);

    window.render_game_to_text = () => this.world.describeState();
    window.advanceTime = (milliseconds: number) => {
      this.loop.advanceSeconds(milliseconds / 1000);
    };
    window.edit_mode_debug = {
      getState: () => this.editMode.getDebugState(),
      exportTransforms: () => this.editMode.exportEditableTransforms(),
      debugRaycast: (clientX: number, clientY: number) => this.editMode.debugRaycast(clientX, clientY),
    };
  }

  start(): void {
    this.loop.start();
  }

  private readonly update = (deltaSeconds: number): void => {
    this.world.update(deltaSeconds);
    this.editMode.update(deltaSeconds);
    this.input.clearFrameState();
  };

  private readonly render = (): void => {
    this.world.renderWithCamera(this.editMode.getActiveCamera());
  };

  private readonly onResize = (): void => {
    const width = this.root.clientWidth || window.innerWidth;
    const height = this.root.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height, false);
    this.world.resize(width / Math.max(1, height));
    this.editMode.resize(width / Math.max(1, height));
  };

  private readonly onWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'KeyF') {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    this.shell.requestFullscreen().catch(() => {});
  };
}
