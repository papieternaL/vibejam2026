import * as THREE from 'three';
import {
  arenaConfig,
  type ArchRuinConfig,
  type BoostPadConfig,
  type BoxConfig,
  type GrappleAnchorConfig,
  type GrappleAnchorKind,
  type GreeneryClusterConfig,
  type MidPlatformConfig,
  type PillarConfig,
  type RampConfig,
  type TreeConfig,
  type Vec2Config,
} from '../config/arenaConfig';
import { clamp } from '../core/math';

type RectBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type MovementBlocker = RectBounds & {
  bottomY: number;
  topY: number;
};

type FlatSurface = BoxConfig & RectBounds & { kind: 'flat' };
type RampSurface = RampConfig & RectBounds & { kind: 'ramp' };

type BoostPadRuntime = {
  config: BoostPadConfig;
  root: THREE.Group;
  ring: THREE.Mesh;
  halo: THREE.Mesh;
  stream: THREE.Mesh;
  forward: THREE.Vector3;
};

type GrappleAnchorRuntime = {
  id: string;
  kind: GrappleAnchorKind;
  radius: number;
  root: THREE.Object3D;
  offset: THREE.Vector3;
};

export type ArenaBoostPadLaunch = {
  id: string;
  forward: THREE.Vector3;
  upwardSpeed: number;
  forwardSpeed: number;
};

function toRectBounds(center: Vec2Config, size: Vec2Config): RectBounds {
  return {
    minX: center.x - size.x * 0.5,
    maxX: center.x + size.x * 0.5,
    minZ: center.z - size.z * 0.5,
    maxZ: center.z + size.z * 0.5,
  };
}

export class GrayboxArena {
  private static readonly playerCollisionHeight = 1.9;

  private readonly group = new THREE.Group();
  private readonly flatSurfaces: FlatSurface[] = [];
  private readonly rampSurfaces: RampSurface[] = [];
  private readonly blockers: MovementBlocker[] = [];
  private readonly editableRoots: THREE.Object3D[] = [];
  private readonly boostPads: BoostPadRuntime[] = [];
  private readonly grappleAnchors: GrappleAnchorRuntime[] = [];
  private readonly stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a8374,
    roughness: 0.95,
  });
  private readonly darkStoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x666258,
    roughness: 0.92,
  });
  private readonly mossMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d8a58,
    roughness: 0.96,
  });
  private readonly barkMaterial = new THREE.MeshStandardMaterial({
    color: 0x544233,
    roughness: 0.94,
  });
  private readonly leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f9d5c,
    roughness: 0.9,
  });
  private gridHelper: THREE.GridHelper | null = null;
  private elapsedSeconds = 0;

  constructor(scene: THREE.Scene) {
    this.group.name = 'ForestRuinsArena';
    scene.add(this.group);
    this.createArenaMeshes();
  }

  update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    for (const pad of this.boostPads) {
      const pulse = Math.sin(this.elapsedSeconds * 3.4 + pad.config.forwardYaw) * 0.5 + 0.5;
      const ringMaterial = pad.ring.material as THREE.MeshStandardMaterial;
      const haloMaterial = pad.halo.material as THREE.MeshBasicMaterial;
      const streamMaterial = pad.stream.material as THREE.MeshBasicMaterial;
      ringMaterial.emissiveIntensity = 0.6 + pulse * 0.55;
      haloMaterial.opacity = 0.18 + pulse * 0.12;
      streamMaterial.opacity = 0.16 + pulse * 0.16;
      pad.ring.rotation.z += deltaSeconds * 1.25;
      pad.halo.rotation.z -= deltaSeconds * 0.7;
      pad.stream.scale.setScalar(1 + pulse * 0.12);
    }
  }

  getSpawnPoint(): THREE.Vector3 {
    const spawn = arenaConfig.spawnZones[0];
    return new THREE.Vector3(spawn.position.x, arenaConfig.floor.height, spawn.position.z);
  }

  getEditableObjects(): THREE.Object3D[] {
    return [...this.editableRoots];
  }

  getBoostPadDebugState(): Array<{ id: string; x: number; y: number; z: number }> {
    return this.boostPads.map((pad) => ({
      id: pad.config.id,
      x: pad.root.position.x,
      y: pad.root.position.y,
      z: pad.root.position.z,
    }));
  }

  getGrappleAnchorDebugState(): Array<{
    id: string;
    kind: GrappleAnchorKind;
    radius: number;
    x: number;
    y: number;
    z: number;
  }> {
    return this.grappleAnchors.map((anchor) => {
      const worldPosition = anchor.root.localToWorld(anchor.offset.clone());
      return {
        id: anchor.id,
        kind: anchor.kind,
        radius: anchor.radius,
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z,
      };
    });
  }

  sampleBoostPad(position: THREE.Vector3): ArenaBoostPadLaunch | null {
    for (const pad of this.boostPads) {
      const dx = position.x - pad.root.position.x;
      const dz = position.z - pad.root.position.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > pad.config.radius * pad.config.radius) {
        continue;
      }

      if (Math.abs(position.y - pad.config.surfaceHeight) > pad.config.triggerHeight) {
        continue;
      }

      return {
        id: pad.config.id,
        forward: pad.forward.clone(),
        upwardSpeed: pad.config.upwardLaunchSpeed,
        forwardSpeed: pad.config.forwardLaunchSpeed,
      };
    }

    return null;
  }

  setHelpersVisible(visible: boolean): void {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  sampleGroundHeight(x: number, z: number): number {
    let highest = -Infinity;

    for (const surface of this.flatSurfaces) {
      if (this.contains(surface, x, z)) {
        highest = Math.max(highest, surface.height);
      }
    }

    for (const ramp of this.rampSurfaces) {
      if (!this.contains(ramp, x, z)) {
        continue;
      }

      const progress =
        ramp.axis === 'x'
          ? ramp.direction === 1
            ? (x - ramp.minX) / Math.max(0.0001, ramp.maxX - ramp.minX)
            : (ramp.maxX - x) / Math.max(0.0001, ramp.maxX - ramp.minX)
          : ramp.direction === 1
            ? (z - ramp.minZ) / Math.max(0.0001, ramp.maxZ - ramp.minZ)
            : (ramp.maxZ - z) / Math.max(0.0001, ramp.maxZ - ramp.minZ);
      const height = ramp.baseHeight + (ramp.topHeight - ramp.baseHeight) * clamp(progress, 0, 1);
      highest = Math.max(highest, height);
    }

    return highest === -Infinity ? arenaConfig.floor.height : highest;
  }

  resolvePlayerMovement(
    currentPosition: THREE.Vector3,
    proposedPosition: THREE.Vector3,
    radius: number,
  ): THREE.Vector3 {
    const result = proposedPosition.clone();
    result.x = clamp(result.x, -arenaConfig.bounds.x + radius, arenaConfig.bounds.x - radius);
    result.z = clamp(result.z, -arenaConfig.bounds.z + radius, arenaConfig.bounds.z - radius);

    const playerHeadY = result.y + GrayboxArena.playerCollisionHeight;

    for (const blocker of this.blockers) {
      if (result.y >= blocker.topY - 0.05) {
        continue;
      }

      if (playerHeadY <= blocker.bottomY + 0.05) {
        continue;
      }

      const expanded = {
        minX: blocker.minX - radius,
        maxX: blocker.maxX + radius,
        minZ: blocker.minZ - radius,
        maxZ: blocker.maxZ + radius,
      };

      const insideX = result.x > expanded.minX && result.x < expanded.maxX;
      const insideZ = result.z > expanded.minZ && result.z < expanded.maxZ;
      if (!insideX || !insideZ) {
        continue;
      }

      const pushLeft = Math.abs(result.x - expanded.minX);
      const pushRight = Math.abs(expanded.maxX - result.x);
      const pushBack = Math.abs(result.z - expanded.minZ);
      const pushForward = Math.abs(expanded.maxZ - result.z);
      const smallest = Math.min(pushLeft, pushRight, pushBack, pushForward);

      if (smallest === pushLeft) {
        result.x = expanded.minX;
      } else if (smallest === pushRight) {
        result.x = expanded.maxX;
      } else if (smallest === pushBack) {
        result.z = expanded.minZ;
      } else {
        result.z = expanded.maxZ;
      }
    }

    if (!Number.isFinite(result.x) || !Number.isFinite(result.z)) {
      return currentPosition.clone();
    }

    return result;
  }

  private contains(bounds: RectBounds, x: number, z: number): boolean {
    return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  }

  private createArenaMeshes(): void {
    const mainFloor = this.createFloor();
    this.group.add(mainFloor);

    this.flatSurfaces.push({
      ...arenaConfig.mainFloor,
      kind: 'flat',
      ...toRectBounds(arenaConfig.mainFloor.center, arenaConfig.mainFloor.size),
    });

    const grid = new THREE.GridHelper(arenaConfig.bounds.x * 2, 36, 0x435044, 0x60715e);
    grid.position.y = arenaConfig.floor.height + 0.015;
    grid.visible = false;
    this.gridHelper = grid;
    this.group.add(grid);

    for (const terrace of arenaConfig.sideTerraces) {
      const terraceMesh = this.createStoneBlock(terrace, terrace.height, terrace.color ?? 0x8b8678, true);
      this.markEditable(terraceMesh, terrace.id);
      this.group.add(terraceMesh);
      this.flatSurfaces.push({ ...terrace, kind: 'flat', ...toRectBounds(terrace.center, terrace.size) });
      this.blockers.push({
        ...toRectBounds(terrace.center, terrace.size),
        bottomY: arenaConfig.floor.height,
        topY: terrace.height,
      });
    }

    for (const ramp of arenaConfig.routeRamps) {
      const rampMesh = this.createRamp(ramp);
      this.markEditable(rampMesh, ramp.id);
      this.group.add(rampMesh);
      this.rampSurfaces.push({ ...ramp, kind: 'ramp', ...toRectBounds(ramp.center, ramp.size) });
    }

    for (const cover of arenaConfig.coverPieces) {
      const coverMesh = this.createStoneBlock(cover, cover.height, cover.color ?? 0x6f6a5e, false);
      this.markEditable(coverMesh, cover.id);
      this.group.add(coverMesh);
      this.blockers.push({
        ...toRectBounds(cover.center, cover.size),
        bottomY: arenaConfig.floor.height,
        topY: cover.height,
      });
    }

    for (const pillar of arenaConfig.pillars) {
      const pillarMesh = this.createPillar(pillar);
      this.markEditable(pillarMesh, pillar.id);
      this.group.add(pillarMesh);
      this.flatSurfaces.push({
        id: `${pillar.id}-top-surface`,
        center: pillar.center,
        size: pillar.topSize,
        height: pillar.shaftHeight + pillar.topThickness,
        color: pillar.color,
        kind: 'flat',
        ...toRectBounds(pillar.center, pillar.topSize),
      });
      this.blockers.push({
        ...toRectBounds(pillar.center, pillar.shaftSize),
        bottomY: arenaConfig.floor.height,
        topY: pillar.shaftHeight + pillar.topThickness,
      });
      this.registerGrappleAnchors(pillarMesh, pillar.grappleAnchors);
    }

    for (const platform of arenaConfig.midPlatforms) {
      const platformMesh = this.createMidPlatform(platform);
      this.markEditable(platformMesh, platform.id);
      this.group.add(platformMesh);
      this.flatSurfaces.push({
        id: `${platform.id}-surface`,
        center: platform.center,
        size: platform.size,
        height: platform.surfaceHeight,
        color: platform.color,
        kind: 'flat',
        ...toRectBounds(platform.center, platform.size),
      });
      this.blockers.push({
        ...toRectBounds(platform.center, platform.size),
        bottomY: platform.surfaceHeight - platform.thickness,
        topY: platform.surfaceHeight,
      });
      this.registerGrappleAnchors(platformMesh, platform.grappleAnchors);
    }

    for (const arch of arenaConfig.archesAndRuins) {
      const archGroup = this.createArchFragment(arch);
      this.markEditable(archGroup, arch.id);
      this.group.add(archGroup);
    }

    for (const spawn of arenaConfig.spawnZones) {
      const spawnPad = this.createSpawnPad(spawn.id, spawn.position, spawn.color);
      this.markEditable(spawnPad, spawn.id);
      this.group.add(spawnPad);
    }

    for (const cluster of arenaConfig.greeneryClusters) {
      const greenery = this.createGreeneryCluster(cluster);
      this.markEditable(greenery, cluster.id);
      this.group.add(greenery);
    }

    for (const tree of arenaConfig.trees) {
      const treeGroup = this.createTree(tree);
      this.markEditable(treeGroup, tree.id);
      this.group.add(treeGroup);
    }

    for (const padConfig of arenaConfig.boostPads) {
      const boostPad = this.createBoostPad(padConfig);
      this.markEditable(boostPad.root, padConfig.id);
      this.group.add(boostPad.root);
      this.boostPads.push(boostPad);
    }
  }

  private createFloor(): THREE.Group {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(arenaConfig.bounds.x * 2, arenaConfig.floor.thickness, arenaConfig.bounds.z * 2),
      new THREE.MeshStandardMaterial({
        color: arenaConfig.mainFloor.color,
        roughness: 0.98,
      }),
    );
    floor.position.set(0, arenaConfig.floor.height - arenaConfig.floor.thickness * 0.5, 0);
    floor.receiveShadow = true;

    const underlay = new THREE.Mesh(
      new THREE.BoxGeometry(arenaConfig.bounds.x * 2 + 6, 0.25, arenaConfig.bounds.z * 2 + 6),
      new THREE.MeshStandardMaterial({
        color: arenaConfig.floor.underlayColor,
        roughness: 1,
      }),
    );
    underlay.position.set(0, arenaConfig.floor.height - 0.72, 0);
    underlay.receiveShadow = true;

    const floorRoot = new THREE.Group();
    floorRoot.add(floor, underlay);
    this.markEditable(floorRoot, 'main-floor-root');
    return floorRoot;
  }

  private createStoneBlock(
    config: BoxConfig,
    height: number,
    color: number,
    walkable: boolean,
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(config.center.x, 0, config.center.z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(config.size.x, height, config.size.z),
      new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
    );
    body.position.y = height * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const mossCap = new THREE.Mesh(
      new THREE.BoxGeometry(config.size.x * 0.86, 0.08, config.size.z * 0.82),
      this.mossMaterial,
    );
    mossCap.position.set(0, height + 0.04, 0.04);
    mossCap.visible = !walkable || height <= 1.6;
    group.add(mossCap);

    return group;
  }

  private createRamp(config: RampConfig): THREE.Group {
    const rise = config.topHeight - config.baseHeight;
    const run = config.axis === 'x' ? config.size.x : config.size.z;
    const angle = Math.atan2(rise, run);
    const group = new THREE.Group();
    group.position.set(config.center.x, 0, config.center.z);

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(config.size.x, 0.55, config.size.z),
      new THREE.MeshStandardMaterial({ color: config.color ?? 0x8d7d67, roughness: 0.94 }),
    );
    slab.position.y = (config.baseHeight + config.topHeight) * 0.5;
    if (config.axis === 'x') {
      slab.rotation.z = config.direction === 1 ? -angle : angle;
    } else {
      slab.rotation.x = config.direction === 1 ? angle : -angle;
    }
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);

    const stripeGeometry =
      config.axis === 'x'
        ? new THREE.BoxGeometry(config.size.x * 0.72, 0.04, config.size.z * 0.36)
        : new THREE.BoxGeometry(config.size.x * 0.36, 0.04, config.size.z * 0.72);
    const mossStripe = new THREE.Mesh(stripeGeometry, this.mossMaterial);
    mossStripe.position.set(0, Math.max(config.baseHeight, config.topHeight) + 0.02, 0.06);
    mossStripe.rotation.copy(slab.rotation);
    group.add(mossStripe);

    return group;
  }

  private createPillar(config: PillarConfig): THREE.Group {
    const group = new THREE.Group();
    group.position.set(config.center.x, 0, config.center.z);

    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(config.shaftSize.x, config.shaftHeight, config.shaftSize.z),
      new THREE.MeshStandardMaterial({ color: config.color ?? 0x7b7669, roughness: 0.95 }),
    );
    shaft.position.y = config.shaftHeight * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(config.shaftSize.x * 1.2, 0.28, config.shaftSize.z * 1.2),
      this.darkStoneMaterial,
    );
    collar.position.y = 0.14;
    collar.receiveShadow = true;
    group.add(collar);

    const topCap = new THREE.Mesh(
      new THREE.BoxGeometry(config.topSize.x, config.topThickness, config.topSize.z),
      this.stoneMaterial,
    );
    topCap.position.y = config.shaftHeight + config.topThickness * 0.5;
    topCap.castShadow = true;
    topCap.receiveShadow = true;
    group.add(topCap);

    const mossRing = new THREE.Mesh(
      new THREE.BoxGeometry(config.topSize.x * 0.78, 0.05, config.topSize.z * 0.78),
      this.mossMaterial,
    );
    mossRing.position.set(0, config.shaftHeight + config.topThickness + 0.03, 0);
    group.add(mossRing);

    return group;
  }

  private createMidPlatform(config: MidPlatformConfig): THREE.Group {
    const group = new THREE.Group();
    group.position.set(config.center.x, 0, config.center.z);

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(config.size.x, config.thickness, config.size.z),
      new THREE.MeshStandardMaterial({ color: config.color ?? 0x8a8579, roughness: 0.95 }),
    );
    slab.position.y = config.surfaceHeight - config.thickness * 0.5;
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);

    const mossTop = new THREE.Mesh(
      new THREE.BoxGeometry(config.size.x * 0.82, 0.05, config.size.z * 0.82),
      this.mossMaterial,
    );
    mossTop.position.set(0, config.surfaceHeight + 0.03, 0.04);
    group.add(mossTop);

    if (config.shape === 'walkway') {
      const columnHeight = config.surfaceHeight - config.thickness;
      const columnOffsetZ = config.size.z * 0.32;
      for (const localZ of [-columnOffsetZ, columnOffsetZ]) {
        const column = new THREE.Mesh(
          new THREE.BoxGeometry(config.size.x * 0.58, Math.max(0.6, columnHeight), 0.62),
          this.darkStoneMaterial,
        );
        column.position.set(0, columnHeight * 0.5, localZ);
        column.castShadow = true;
        column.receiveShadow = true;
        group.add(column);

        this.blockers.push({
          ...toRectBounds(
            { x: config.center.x, z: config.center.z + localZ },
            { x: config.size.x * 0.58, z: 0.62 },
          ),
          bottomY: arenaConfig.floor.height,
          topY: columnHeight,
        });
      }

      const brokenLip = new THREE.Mesh(
        new THREE.BoxGeometry(config.size.x * 0.3, 0.18, config.size.z * 0.26),
        this.darkStoneMaterial,
      );
      brokenLip.position.set(config.size.x * 0.18, config.surfaceHeight - 0.08, 0);
      brokenLip.rotation.y = 0.18;
      group.add(brokenLip);
    } else {
      const supportHeight = config.surfaceHeight - config.thickness;
      const supportCenter = {
        x: config.center.x + config.size.x * 0.18,
        z: config.center.z,
      };
      const supportSize = { x: config.size.x * 0.34, z: config.size.z * 0.74 };
      const supportWall = new THREE.Mesh(
        new THREE.BoxGeometry(supportSize.x, Math.max(0.7, supportHeight), supportSize.z),
        this.darkStoneMaterial,
      );
      supportWall.position.set(config.size.x * 0.18, supportHeight * 0.5, 0);
      supportWall.castShadow = true;
      supportWall.receiveShadow = true;
      group.add(supportWall);

      this.blockers.push({
        ...toRectBounds(supportCenter, supportSize),
        bottomY: arenaConfig.floor.height,
        topY: supportHeight,
      });
    }

    return group;
  }

  private createArchFragment(config: ArchRuinConfig): THREE.Group {
    const group = new THREE.Group();
    group.position.set(config.center.x, 0, config.center.z);
    group.rotation.y = config.rotationY;

    const stoneColor = config.color ?? 0x8a8374;
    const columnWidth = Math.max(0.72, config.width * 0.18);
    const columnDepth = config.depth;
    const columnOffset = config.width * 0.32;
    const leftHeight = config.brokenSide === 'left' ? config.height * 0.56 : config.height;
    const rightHeight = config.brokenSide === 'right' ? config.height * 0.56 : config.height;

    const leftColumn = new THREE.Mesh(
      new THREE.BoxGeometry(columnWidth, leftHeight, columnDepth),
      new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.95 }),
    );
    leftColumn.position.set(-columnOffset, leftHeight * 0.5, 0);
    leftColumn.castShadow = true;
    leftColumn.receiveShadow = true;
    group.add(leftColumn);

    const rightColumn = new THREE.Mesh(
      new THREE.BoxGeometry(columnWidth, rightHeight, columnDepth),
      new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.95 }),
    );
    rightColumn.position.set(columnOffset, rightHeight * 0.5, 0);
    rightColumn.castShadow = true;
    rightColumn.receiveShadow = true;
    group.add(rightColumn);

    const beamWidth =
      config.brokenSide === 'none' || !config.brokenSide ? config.width * 0.72 : config.width * 0.5;
    const beamOffset =
      config.brokenSide === 'left' ? columnOffset * 0.22 : config.brokenSide === 'right' ? -columnOffset * 0.22 : 0;
    const beamHeight = Math.min(leftHeight, rightHeight) - 0.32;
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(beamWidth, 0.42, columnDepth * 0.95),
      new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.95 }),
    );
    beam.position.set(beamOffset, beamHeight, 0);
    beam.rotation.z = config.brokenSide === 'left' ? -0.08 : config.brokenSide === 'right' ? 0.08 : 0;
    beam.castShadow = true;
    beam.receiveShadow = true;
    group.add(beam);

    const vine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, config.height * 0.58, 5),
      this.mossMaterial,
    );
    vine.position.set(config.brokenSide === 'left' ? columnOffset : -columnOffset, config.height * 0.42, 0.1);
    vine.rotation.z = 0.26;
    group.add(vine);

    const worldLeft = new THREE.Vector3(-columnOffset, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      config.rotationY,
    );
    const worldRight = new THREE.Vector3(columnOffset, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      config.rotationY,
    );
    this.blockers.push(
      {
        ...toRectBounds(
          { x: config.center.x + worldLeft.x, z: config.center.z + worldLeft.z },
          { x: columnWidth, z: columnDepth },
        ),
        bottomY: arenaConfig.floor.height,
        topY: leftHeight,
      },
      {
        ...toRectBounds(
          { x: config.center.x + worldRight.x, z: config.center.z + worldRight.z },
          { x: columnWidth, z: columnDepth },
        ),
        bottomY: arenaConfig.floor.height,
        topY: rightHeight,
      },
    );

    return group;
  }

  private createGreeneryCluster(config: GreeneryClusterConfig): THREE.Group {
    const group = new THREE.Group();
    group.position.set(config.center.x, arenaConfig.floor.height, config.center.z);

    for (let index = 0; index < config.shrubCount; index += 1) {
      const angle = (index / config.shrubCount) * Math.PI * 2 + config.radius * 0.17;
      const radius = config.radius * (0.34 + (index % 3) * 0.18);
      const shrub = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55 + (index % 2) * 0.16),
        new THREE.MeshStandardMaterial({
          color: config.color ?? 0x5d8a58,
          roughness: 0.92,
        }),
      );
      shrub.position.set(Math.cos(angle) * radius, 0.42 + (index % 2) * 0.08, Math.sin(angle) * radius);
      shrub.scale.y = 0.78 + (index % 3) * 0.12;
      shrub.castShadow = true;
      shrub.receiveShadow = true;
      group.add(shrub);

      const grass = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 5), this.mossMaterial);
      grass.position.set(shrub.position.x * 0.84, 0.24, shrub.position.z * 0.82);
      grass.rotation.z = 0.15 * (index % 2 === 0 ? 1 : -1);
      group.add(grass);
    }

    return group;
  }

  private createTree(config: TreeConfig): THREE.Group {
    const group = new THREE.Group();
    group.position.set(config.position.x, arenaConfig.floor.height, config.position.z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.45, config.trunkHeight, 7),
      this.barkMaterial,
    );
    trunk.position.y = config.trunkHeight * 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(config.canopyRadius, 0),
      this.leafMaterial,
    );
    canopy.position.y = config.trunkHeight + config.canopyRadius * 0.55;
    canopy.scale.set(1.05, 0.86, 1);
    canopy.castShadow = true;
    group.add(canopy);

    const rootStone = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.45, 1.1),
      this.darkStoneMaterial,
    );
    rootStone.position.set(0.18, 0.22, -0.22);
    rootStone.rotation.y = 0.22;
    rootStone.receiveShadow = true;
    group.add(rootStone);

    return group;
  }

  private createSpawnPad(id: string, position: Vec2Config, color: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(position.x, arenaConfig.floor.height, position.z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.16, 24),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25,
        roughness: 0.42,
      }),
    );
    base.position.y = 0.08;
    base.receiveShadow = true;
    group.add(base);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.06, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.3,
      }),
    );
    rim.rotation.x = Math.PI * 0.5;
    rim.position.y = 0.17;
    group.add(rim);

    group.name = id;
    return group;
  }

  private createBoostPad(config: BoostPadConfig): BoostPadRuntime {
    const root = new THREE.Group();
    root.position.set(config.position.x, config.surfaceHeight, config.position.z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(config.visualScale * 1.05, config.visualScale * 1.15, 0.22, 28),
      new THREE.MeshStandardMaterial({
        color: 0x4f6057,
        roughness: 0.78,
      }),
    );
    base.position.y = 0.11;
    base.receiveShadow = true;
    root.add(base);

    const glyph = new THREE.Mesh(
      new THREE.CylinderGeometry(config.visualScale * 0.92, config.visualScale * 0.92, 0.05, 28),
      new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.72,
        roughness: 0.24,
      }),
    );
    glyph.position.y = 0.18;
    root.add(glyph);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(config.visualScale * 0.9, 0.08, 10, 36),
      new THREE.MeshStandardMaterial({
        color: 0xdffcff,
        emissive: config.color,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      }),
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = 0.32;
    root.add(ring);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(config.visualScale * 0.55, config.visualScale * 1.12, 28),
      haloMaterial,
    );
    halo.rotation.x = Math.PI * 0.5;
    halo.position.y = 0.2;
    root.add(halo);

    const streamMaterial = new THREE.MeshBasicMaterial({
      color: 0xdffcff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(config.visualScale * 0.16, config.visualScale * 0.28, 2.9, 10, 1, true),
      streamMaterial,
    );
    stream.position.y = 1.55;
    root.add(stream);

    const forward = new THREE.Vector3(Math.sin(config.forwardYaw), 0, Math.cos(config.forwardYaw)).normalize();
    return { config, root, ring, halo, stream, forward };
  }

  private registerGrappleAnchors(root: THREE.Object3D, anchors: GrappleAnchorConfig[]): void {
    if (anchors.length === 0) {
      return;
    }

    root.userData.grappleAnchors = anchors.map((anchor) => anchor.id);
    for (const anchor of anchors) {
      this.grappleAnchors.push({
        id: anchor.id,
        kind: anchor.kind,
        radius: anchor.radius,
        root,
        offset: new THREE.Vector3(anchor.offset.x, anchor.offset.y, anchor.offset.z),
      });
    }
  }

  private markEditable(object: THREE.Object3D, name: string): void {
    object.name = name;
    object.userData.editable = true;
    object.userData.editableRoot = true;
    this.editableRoots.push(object);
  }
}
