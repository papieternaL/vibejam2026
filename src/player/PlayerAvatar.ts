import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HybridAnimationController } from './animation/HybridAnimationController';
import type {
  HeroVisualRig,
  ProceduralAnimationDebugState,
  ProceduralAnimationInput,
} from './animation/AnimationStateTypes';

const polyPizzaSwordAssetUrl = new URL('../assets/models/poly-pizza-sword.glb', import.meta.url).href;

export class PlayerAvatar {
  private static readonly rightShoulderSocket = new THREE.Vector3(-0.36, 1.42, 0.06);
  private static readonly upAxis = new THREE.Vector3(0, 1, 0);
  private static readonly forwardAxis = new THREE.Vector3(0, 0, 1);

  readonly group = new THREE.Group();

  private readonly visualRoot = new THREE.Group();
  private readonly bodyRoot = new THREE.Group();
  private readonly torsoRoot = new THREE.Group();
  private readonly rightHandAnchor = new THREE.Group();
  private readonly torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.8, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0xc56c3e, roughness: 0.55 }),
  );
  private readonly head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 16),
    new THREE.MeshStandardMaterial({ color: 0xf2d8b0, roughness: 0.8 }),
  );
  private readonly shoulderGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x443b35, roughness: 0.85 }),
  );
  private readonly rightUpperArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 1, 0.13),
    new THREE.MeshStandardMaterial({ color: 0x3f352f, roughness: 0.88 }),
  );
  private readonly rightForearm = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x3a312c, roughness: 0.9 }),
  );
  private readonly rightHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.1, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x2f2723, roughness: 0.9 }),
  );
  private readonly shieldShellMaterial = new THREE.MeshBasicMaterial({
    color: 0x8ed6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly shieldShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.82, 18, 14),
    this.shieldShellMaterial,
  );
  private readonly chargeRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xc9f6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly chargeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.018, 10, 30),
    this.chargeRingMaterial,
  );
  private readonly chargeArrowMaterial = new THREE.MeshBasicMaterial({
    color: 0xeefbff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly chargeArrowGhost = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, 0.54),
    this.chargeArrowMaterial,
  );
  private readonly windBurstRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xb6efff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly windBurstRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.026, 10, 32),
    this.windBurstRingMaterial,
  );
  private readonly windHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xd7fbff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly windHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.018, 10, 28),
    this.windHaloMaterial,
  );
  private readonly swordPivot = new THREE.Group();
  private readonly swordVisualRoot = new THREE.Group();
  private readonly fallbackSword = new THREE.Group();
  private readonly slashTrailMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd6a3,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly slashTrail = new THREE.Mesh(
    new THREE.RingGeometry(0.54, 0.76, 40, 1, Math.PI * 0.15, Math.PI * 0.85),
    this.slashTrailMaterial,
  );
  private readonly torsoMaterial = this.torso.material as THREE.MeshStandardMaterial;
  private readonly swordMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.3, metalness: 0.8 });
  private readonly swordGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb069,
    emissive: 0x552400,
    roughness: 0.35,
  });
  private readonly handleMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2518, roughness: 0.85 });
  private readonly animationController: HybridAnimationController;
  private readonly upperArmDirection = new THREE.Vector3();
  private readonly forearmDirection = new THREE.Vector3();
  private readonly elbowPosition = new THREE.Vector3();
  private readonly shoulderToHand = new THREE.Vector3();
  private readonly armBendAxis = new THREE.Vector3();
  private readonly forearmMidpoint = new THREE.Vector3();
  private readonly upperArmMidpoint = new THREE.Vector3();
  private readonly currentInput: ProceduralAnimationInput = {
    normalizedSpeed: 0,
    localMoveX: 0,
    localMoveZ: 0,
    grounded: true,
    chargeRatio: 0,
    attackWeight: 0,
    attackSide: 1,
    visualLift: 0,
    spinRate: 0,
    actionTint: 0,
    hitConfirm: 0,
    shieldActive: false,
    shieldFlash: 0,
    visualState: 'idle',
    visualPhase: 'loop',
    phaseProgress: 0,
  };
  private lastAttackDebugKey = '';
  private hierarchyLogged = false;
  private effectTime = 0;

  constructor() {
    this.group.name = 'FireSwordDuelistVisual';
    this.visualRoot.name = 'visualRoot';
    this.bodyRoot.name = 'bodyRoot';
    this.torsoRoot.name = 'torsoRoot';
    this.rightHandAnchor.name = 'rightHandAnchor';
    this.swordPivot.name = 'swordPivot';
    this.swordVisualRoot.name = 'swordVisualRoot';
    this.fallbackSword.name = 'fallbackSword';
    this.slashTrail.name = 'slashTrail';

    this.torso.position.set(0, 1.04, 0);
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;

    this.head.position.set(0, 1.96, 0);
    this.head.castShadow = true;

    this.shoulderGuard.position.set(0, 1.42, 0);
    this.rightUpperArm.castShadow = true;
    this.rightUpperArm.receiveShadow = true;
    this.rightForearm.castShadow = true;
    this.rightForearm.receiveShadow = true;
    this.rightHand.position.set(0, 0, 0);
    this.rightHand.castShadow = true;
    this.rightHand.receiveShadow = true;
    this.shieldShell.position.set(0, 1.18, 0);
    this.shieldShell.visible = false;
    this.chargeRing.rotation.set(Math.PI * 0.5, 0, 0);
    this.chargeRing.position.set(0.02, 0.02, 0.2);
    this.chargeRing.visible = false;
    this.chargeArrowGhost.position.set(0.01, 0.01, 0.38);
    this.chargeArrowGhost.visible = false;
    this.windBurstRing.rotation.set(Math.PI * 0.5, 0, 0);
    this.windBurstRing.position.set(0, 1.22, 0.06);
    this.windBurstRing.visible = false;
    this.windHalo.rotation.set(Math.PI * 0.5, 0, 0);
    this.windHalo.position.set(0, 1.48, 0.12);
    this.windHalo.visible = false;

    this.rightHandAnchor.position.set(-0.34, 1.16, 0.16);

    // Sword handle (grip)
    const swordHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 0.22, 8),
      this.handleMaterial,
    );
    swordHandle.rotation.x = Math.PI * 0.5;
    swordHandle.position.set(0, 0, -0.11);

    // Pommel
    const swordPommel = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      this.swordMaterial,
    );
    swordPommel.position.set(0, 0, -0.24);

    // Crossguard
    const swordGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.04),
      this.swordMaterial,
    );
    swordGuard.position.set(0, 0, 0.0);

    // Blade
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.04, 0);
    bladeShape.lineTo(-0.035, 0.6);
    bladeShape.lineTo(0, 0.72);
    bladeShape.lineTo(0.035, 0.6);
    bladeShape.lineTo(0.04, 0);
    bladeShape.closePath();
    const bladeExtrudeSettings = { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 1 };
    const swordBlade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(bladeShape, bladeExtrudeSettings),
      this.swordGlowMaterial,
    );
    swordBlade.rotation.x = Math.PI * 0.5;
    swordBlade.position.set(0, -0.009, 0.02);
    swordBlade.castShadow = true;

    this.fallbackSword.add(swordHandle, swordPommel, swordGuard, swordBlade);
    this.slashTrail.position.set(0, 1.48, 0.82);
    this.slashTrail.rotation.set(THREE.MathUtils.degToRad(88), 0, THREE.MathUtils.degToRad(10));
    this.slashTrail.visible = false;
    this.swordVisualRoot.visible = false;
    this.swordVisualRoot.add(this.fallbackSword);
    this.swordPivot.add(this.swordVisualRoot);
    this.swordPivot.position.set(0, 0, 0.11);
    this.rightHandAnchor.add(this.rightHand, this.swordPivot, this.chargeRing, this.chargeArrowGhost);
    this.torsoRoot.add(
      this.torso,
      this.head,
      this.shoulderGuard,
      this.rightUpperArm,
      this.rightForearm,
      this.rightHandAnchor,
      this.shieldShell,
      this.windBurstRing,
      this.windHalo,
      this.slashTrail,
    );
    this.bodyRoot.add(this.torsoRoot);
    this.visualRoot.add(this.bodyRoot);
    this.group.add(this.visualRoot);

    this.animationController = new HybridAnimationController(this.createRig());
    this.loadPolyPizzaSword();
  }

  update(deltaSeconds: number, input: ProceduralAnimationInput): void {
    this.effectTime += deltaSeconds;
    Object.assign(this.currentInput, input);
    this.animationController.update(deltaSeconds, input);
    this.updateRightArmVisual();
    this.updateShieldVisual(input);
    this.updateChargeVisual(input);
    this.updateWindVisual(input);
    this.updateSlashTrail(input);
    this.debugSwordRig(input);
  }

  getDebugState(): ProceduralAnimationDebugState {
    return this.animationController.getDebugState();
  }

  private createRig(): HeroVisualRig {
    return {
      visualRoot: this.visualRoot,
      bodyRoot: this.bodyRoot,
      torsoRoot: this.torsoRoot,
      rightHandAnchor: this.rightHandAnchor,
      swordPivot: this.swordPivot,
      head: this.head,
      torsoMaterial: this.torsoMaterial,
      swordGlowMaterial: this.swordGlowMaterial,
    };
  }

  private updateRightArmVisual(): void {
    this.shoulderToHand.copy(this.rightHandAnchor.position).sub(PlayerAvatar.rightShoulderSocket);
    this.forearmDirection.copy(this.shoulderToHand).normalize();

    this.armBendAxis.crossVectors(PlayerAvatar.forwardAxis, this.forearmDirection);
    if (this.armBendAxis.lengthSq() < 0.0001) {
      this.armBendAxis.set(-1, 0, 0);
    } else {
      this.armBendAxis.normalize();
    }

    const swingAttack = this.currentInput.visualState === 'swing';
    const swingStartup = swingAttack && this.currentInput.visualPhase === 'startup';
    const swingActive = swingAttack && this.currentInput.visualPhase === 'active';
    const heavyAttack =
      this.currentInput.visualState === 'thrustCharge' || this.currentInput.visualState === 'thrustRelease';
    const attackBend = swingAttack || heavyAttack;
    const bendAmount = swingStartup ? 0.28 : swingActive ? 0.22 : attackBend ? 0.26 : 0.16;
    const elbowLift = swingStartup ? 0.04 : swingActive ? -0.04 : attackBend ? -0.04 : -0.08;
    const elbowForward =
      swingStartup
        ? -0.02
        : swingActive
          ? 0.14
          : heavyAttack
            ? 0.1
            : swingAttack
              ? 0.06
              : 0.02;

    this.elbowPosition
      .copy(PlayerAvatar.rightShoulderSocket)
      .addScaledVector(this.shoulderToHand, 0.46)
      .addScaledVector(this.armBendAxis, bendAmount)
      .addScaledVector(PlayerAvatar.upAxis, elbowLift)
      .addScaledVector(PlayerAvatar.forwardAxis, elbowForward);

    this.upperArmDirection.copy(this.elbowPosition).sub(PlayerAvatar.rightShoulderSocket);
    const upperArmLength = Math.max(0.14, this.upperArmDirection.length());
    this.upperArmDirection.normalize();
    this.upperArmMidpoint.copy(PlayerAvatar.rightShoulderSocket).add(this.elbowPosition).multiplyScalar(0.5);

    this.rightUpperArm.position.copy(this.upperArmMidpoint);
    this.rightUpperArm.scale.set(1, upperArmLength, 1);
    this.rightUpperArm.quaternion.setFromUnitVectors(PlayerAvatar.upAxis, this.upperArmDirection);

    this.forearmDirection.copy(this.rightHandAnchor.position).sub(this.elbowPosition);
    const forearmLength = Math.max(0.14, this.forearmDirection.length());
    this.forearmDirection.normalize();
    this.forearmMidpoint.copy(this.elbowPosition).add(this.rightHandAnchor.position).multiplyScalar(0.5);

    this.rightForearm.position.copy(this.forearmMidpoint);
    this.rightForearm.scale.set(1, forearmLength, 1);
    this.rightForearm.quaternion.setFromUnitVectors(PlayerAvatar.upAxis, this.forearmDirection);
  }

  private updateSlashTrail(input: ProceduralAnimationInput): void {
    if (input.visualState !== 'swing' && input.visualState !== 'thrustRelease') {
      this.slashTrail.visible = false;
      this.slashTrailMaterial.opacity = 0;
      return;
    }

    let weight = 0;
    if (input.visualState === 'swing') {
      if (input.visualPhase === 'active') {
        weight = Math.sin(input.phaseProgress * Math.PI);
      } else if (input.visualPhase === 'recovery') {
        weight = (1 - input.phaseProgress) * 0.28;
      }
    } else if (input.visualState === 'thrustRelease') {
      if (input.visualPhase === 'startup') {
        weight = input.phaseProgress * 0.35;
      } else if (input.visualPhase === 'active') {
        weight = 0.35 + Math.sin(input.phaseProgress * Math.PI) * 0.65;
      } else if (input.visualPhase === 'recovery') {
        weight = (1 - input.phaseProgress) * 0.3;
      }
    }

    if (weight <= 0.01) {
      this.slashTrail.visible = false;
      this.slashTrailMaterial.opacity = 0;
      return;
    }

    this.slashTrail.visible = true;
    if (input.visualState === 'swing') {
      this.slashTrailMaterial.opacity = 0.28 + weight * 0.62;
      this.slashTrail.scale.set(1.28 + weight * 0.5, 1.04 + weight * 0.14, 1);
      const phase =
        input.visualPhase === 'active'
          ? input.phaseProgress
          : input.visualPhase === 'recovery'
            ? 1
            : 0;
      const sweepX = THREE.MathUtils.lerp(input.attackSide * 0.56, -input.attackSide * 0.58, phase);
      const arcY = Math.sin(phase * Math.PI) * 0.12;
      const arcZ = THREE.MathUtils.lerp(0.64, 0.9, phase);
      this.slashTrail.position.set(
        sweepX,
        1.3 + arcY + weight * 0.08,
        arcZ + weight * 0.18,
      );
      this.slashTrail.rotation.set(
        THREE.MathUtils.degToRad(82),
        input.attackSide > 0 ? THREE.MathUtils.degToRad(-10) : THREE.MathUtils.degToRad(10),
        input.attackSide > 0 ? THREE.MathUtils.degToRad(18) : THREE.MathUtils.degToRad(162),
      );
      return;
    }

    this.slashTrailMaterial.opacity = 0.24 + weight * 0.56;
    this.slashTrail.scale.set(1.28 + weight * 0.3, 0.9 + weight * 0.08, 1);
    const slashPhase =
      input.visualPhase === 'active'
        ? input.phaseProgress
        : input.visualPhase === 'recovery'
          ? 1
          : 0;
    this.slashTrail.position.set(
      THREE.MathUtils.lerp(0.32, -0.18, slashPhase),
      1.56 + weight * 0.16,
      0.72 + weight * 0.22,
    );
    this.slashTrail.rotation.set(
      THREE.MathUtils.degToRad(78),
      THREE.MathUtils.degToRad(-18),
      THREE.MathUtils.degToRad(42),
    );
  }

  private updateShieldVisual(input: ProceduralAnimationInput): void {
    const active = input.shieldActive || input.shieldFlash > 0.01;
    this.shieldShell.visible = active;
    if (!active) {
      this.shieldShellMaterial.opacity = 0;
      return;
    }

    const pulse = input.shieldFlash > 0 ? 0.18 + input.shieldFlash * 0.38 : 0.14;
    this.shieldShellMaterial.opacity = pulse;
    this.shieldShell.scale.setScalar(1 + input.shieldFlash * 0.08);
  }

  private updateChargeVisual(input: ProceduralAnimationInput): void {
    const charge = THREE.MathUtils.clamp(input.chargeRatio, 0, 1);
    if (charge <= 0.01) {
      this.chargeRing.visible = false;
      this.chargeArrowGhost.visible = false;
      this.chargeRingMaterial.opacity = 0;
      this.chargeArrowMaterial.opacity = 0;
      return;
    }

    const fullPulse = charge >= 1 ? 0.12 + (Math.sin(this.effectTime * 18) * 0.5 + 0.5) * 0.16 : 0;
    this.chargeRing.visible = true;
    this.chargeArrowGhost.visible = true;
    this.chargeRingMaterial.opacity = 0.14 + charge * 0.28 + fullPulse;
    this.chargeArrowMaterial.opacity = 0.16 + charge * 0.32 + fullPulse * 0.7;
    this.chargeRing.scale.setScalar(0.72 + charge * 0.9 + fullPulse * 0.25);
    this.chargeRing.rotation.z = this.effectTime * (1.4 + charge * 2.8);
    this.chargeArrowGhost.scale.set(
      1,
      1 + charge * 0.25,
      0.78 + charge * 0.95 + fullPulse * 0.18,
    );
    this.chargeArrowGhost.position.z = 0.28 + charge * 0.22;
  }

  private updateWindVisual(input: ProceduralAnimationInput): void {
    const airborneWind = !input.grounded && input.visualLift > 0.01;
    if (!airborneWind) {
      this.windBurstRing.visible = false;
      this.windHalo.visible = false;
      this.windBurstRingMaterial.opacity = 0;
      this.windHaloMaterial.opacity = 0;
      return;
    }

    const burstWeight =
      input.visualPhase === 'active'
        ? 1 - input.phaseProgress * 0.45
        : input.visualPhase === 'travel'
          ? 0.46 + (Math.sin(this.effectTime * 7) * 0.5 + 0.5) * 0.16
          : 0.34;
    this.windBurstRing.visible = true;
    this.windHalo.visible = true;
    this.windBurstRingMaterial.opacity = 0.12 + burstWeight * 0.18;
    this.windHaloMaterial.opacity = 0.08 + burstWeight * 0.12;
    this.windBurstRing.scale.setScalar(1 + burstWeight * 0.8);
    this.windHalo.scale.setScalar(0.86 + burstWeight * 0.55);
    this.windBurstRing.position.y = 1.08 + burstWeight * 0.22;
    this.windHalo.position.y = 1.42 + Math.sin(this.effectTime * 8.5) * 0.08;
    this.windHalo.rotation.z = this.effectTime * 1.8;
  }

  private debugSwordRig(input: ProceduralAnimationInput): void {
    if (!import.meta.env.DEV) {
      return;
    }

    if (!this.hierarchyLogged) {
      this.hierarchyLogged = true;
      console.debug(
        '[SwordRig] hierarchy',
        JSON.stringify({
          swordPivotParent: this.swordPivot.parent?.name,
          swordMeshParent: this.swordVisualRoot.parent?.name,
        }),
      );
    }

    if (input.visualState !== 'swing' && input.visualState !== 'thrustCharge' && input.visualState !== 'thrustRelease') {
      this.lastAttackDebugKey = '';
      return;
    }

    const debugKey = `${input.visualState}:${input.visualPhase}:${Math.round(input.phaseProgress * 10)}`;
    if (debugKey === this.lastAttackDebugKey) {
      return;
    }

    this.lastAttackDebugKey = debugKey;
    console.debug(
      '[SwordRig] attack sample',
      JSON.stringify({
        state: input.visualState,
        phase: input.visualPhase,
        progress: Number(input.phaseProgress.toFixed(2)),
        swordPivotPosition: this.swordPivot.position.toArray().map((value) => Number(value.toFixed(3))),
        swordPivotRotation: [
          Number(this.swordPivot.rotation.x.toFixed(3)),
          Number(this.swordPivot.rotation.y.toFixed(3)),
          Number(this.swordPivot.rotation.z.toFixed(3)),
        ],
      }),
    );
  }

  private loadPolyPizzaSword(): void {
    const loader = new GLTFLoader();
    loader.load(
      polyPizzaSwordAssetUrl,
      (gltf) => {
        const assetRoot = new THREE.Group();
        const swordScene = gltf.scene.clone(true);
        swordScene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        // Fit the downloaded sword into the existing procedural hand grip.
        swordScene.scale.setScalar(0.8);
        swordScene.rotation.set(Math.PI * 0.5, Math.PI, -Math.PI * 0.5);
        swordScene.position.set(0.01, -0.01, -0.04);
        assetRoot.add(swordScene);

        this.swordVisualRoot.clear();
        this.swordVisualRoot.add(assetRoot);
      },
      undefined,
      () => {
        // Keep the primitive fallback sword if the asset load fails.
      },
    );
  }
}
