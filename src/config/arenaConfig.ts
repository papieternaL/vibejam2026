export type Vec2Config = {
  x: number;
  z: number;
};

export type Vec3Config = {
  x: number;
  y: number;
  z: number;
};

export type BoxConfig = {
  id: string;
  center: Vec2Config;
  size: Vec2Config;
  height: number;
  color?: number;
};

export type RampConfig = {
  id: string;
  center: Vec2Config;
  size: Vec2Config;
  baseHeight: number;
  topHeight: number;
  axis: 'x' | 'z';
  direction: 1 | -1;
  color?: number;
};

export type SpawnZoneConfig = {
  id: string;
  position: Vec2Config;
  color: number;
};

export type ArchRuinConfig = {
  id: string;
  center: Vec2Config;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
  brokenSide?: 'left' | 'right' | 'none';
  color?: number;
};

export type GreeneryClusterConfig = {
  id: string;
  center: Vec2Config;
  radius: number;
  shrubCount: number;
  color?: number;
};

export type TreeConfig = {
  id: string;
  position: Vec2Config;
  trunkHeight: number;
  canopyRadius: number;
};

export type BoostPadConfig = {
  id: string;
  position: Vec2Config;
  surfaceHeight: number;
  radius: number;
  triggerHeight: number;
  upwardLaunchSpeed: number;
  forwardLaunchSpeed: number;
  forwardYaw: number;
  visualScale: number;
  color: number;
};

export type GrappleAnchorKind = 'pillarTop' | 'ledgeEdge' | 'walkwayCorner';

export type GrappleAnchorConfig = {
  id: string;
  kind: GrappleAnchorKind;
  offset: Vec3Config;
  radius: number;
};

export type PillarConfig = {
  id: string;
  center: Vec2Config;
  shaftSize: Vec2Config;
  shaftHeight: number;
  topSize: Vec2Config;
  topThickness: number;
  color?: number;
  grappleAnchors: GrappleAnchorConfig[];
};

export type MidPlatformConfig = {
  id: string;
  center: Vec2Config;
  size: Vec2Config;
  surfaceHeight: number;
  thickness: number;
  color?: number;
  shape: 'walkway' | 'ledge';
  grappleAnchors: GrappleAnchorConfig[];
};

export const arenaConfig = {
  bounds: {
    x: 27,
    z: 25,
  },
  floor: {
    height: 0,
    thickness: 1,
    color: 0x787468,
    underlayColor: 0x485347,
  },
  spawnZones: [
    { id: 'south-spawn', position: { x: 0, z: -22 }, color: 0x5da7f0 },
    { id: 'north-spawn', position: { x: 0, z: 22 }, color: 0xf0845d },
  ] satisfies SpawnZoneConfig[],
  mainFloor: {
    id: 'main-floor',
    center: { x: 0, z: 0 },
    size: { x: 54, z: 50 },
    height: 0,
    color: 0x878274,
  } satisfies BoxConfig,
  sideTerraces: [
    {
      id: 'west-lane-terrace',
      center: { x: -18.4, z: 0 },
      size: { x: 6.6, z: 24 },
      height: 1.4,
      color: 0x8a8477,
    },
    {
      id: 'east-lane-lower',
      center: { x: 18.2, z: -9.2 },
      size: { x: 6, z: 13.6 },
      height: 1.2,
      color: 0x8a8477,
    },
    {
      id: 'east-lane-upper',
      center: { x: 20, z: 9.5 },
      size: { x: 5.4, z: 10.8 },
      height: 2.4,
      color: 0x878173,
    },
  ] satisfies BoxConfig[],
  routeRamps: [
    {
      id: 'west-south-ramp',
      center: { x: -13.9, z: -10.4 },
      size: { x: 5.8, z: 4.8 },
      baseHeight: 0,
      topHeight: 1.4,
      axis: 'x',
      direction: -1,
      color: 0x8d7d67,
    },
    {
      id: 'west-north-ramp',
      center: { x: -13.9, z: 10.4 },
      size: { x: 5.8, z: 4.8 },
      baseHeight: 0,
      topHeight: 1.4,
      axis: 'x',
      direction: -1,
      color: 0x8d7d67,
    },
    {
      id: 'east-lower-entry-ramp',
      center: { x: 13.8, z: -12.1 },
      size: { x: 5.8, z: 4.8 },
      baseHeight: 0,
      topHeight: 1.2,
      axis: 'x',
      direction: 1,
      color: 0x8d7d67,
    },
    {
      id: 'east-mid-step-ramp',
      center: { x: 18.9, z: 0.2 },
      size: { x: 4.6, z: 6.2 },
      baseHeight: 1.2,
      topHeight: 2.4,
      axis: 'z',
      direction: 1,
      color: 0x88785f,
    },
    {
      id: 'east-center-return-ramp',
      center: { x: 14.2, z: 8.4 },
      size: { x: 5.6, z: 4.8 },
      baseHeight: 0,
      topHeight: 2.4,
      axis: 'x',
      direction: 1,
      color: 0x8d7d67,
    },
  ] satisfies RampConfig[],
  coverPieces: [
    { id: 'center-south-wall', center: { x: 0, z: -5.7 }, size: { x: 6.2, z: 1.6 }, height: 2.45, color: 0x68665d },
    { id: 'center-north-wall', center: { x: 0, z: 5.8 }, size: { x: 6.2, z: 1.6 }, height: 2.45, color: 0x68665d },
    { id: 'center-west-block', center: { x: -6.4, z: 0.5 }, size: { x: 2.3, z: 5.3 }, height: 2.6, color: 0x6d695f },
    { id: 'center-east-block', center: { x: 6.4, z: -0.5 }, size: { x: 2.3, z: 5.3 }, height: 2.6, color: 0x6d695f },
    { id: 'center-sw-cover', center: { x: -4.3, z: -2.1 }, size: { x: 3, z: 1.4 }, height: 1.8, color: 0x767164 },
    { id: 'center-ne-cover', center: { x: 4.3, z: 2.1 }, size: { x: 3, z: 1.4 }, height: 1.8, color: 0x767164 },
    { id: 'center-core-slab', center: { x: 0, z: 0 }, size: { x: 3.4, z: 3.4 }, height: 1.2, color: 0x817b6e },
    { id: 'west-lane-cover-south', center: { x: -20.2, z: -12.8 }, size: { x: 3.4, z: 1.4 }, height: 2, color: 0x6a695f },
    { id: 'west-lane-cover-mid', center: { x: -16.3, z: -0.8 }, size: { x: 2.8, z: 1.6 }, height: 1.9, color: 0x6d6a60 },
    { id: 'west-lane-cover-north', center: { x: -20.2, z: 12.8 }, size: { x: 3.4, z: 1.4 }, height: 2, color: 0x6a695f },
    { id: 'east-lane-cover-south', center: { x: 20.2, z: -14.2 }, size: { x: 3.2, z: 1.4 }, height: 2.05, color: 0x69675d },
    { id: 'east-lane-cover-mid', center: { x: 21, z: -1.6 }, size: { x: 2.8, z: 1.6 }, height: 1.85, color: 0x6d6a60 },
    { id: 'east-lane-cover-north', center: { x: 20.1, z: 12.4 }, size: { x: 3.6, z: 1.4 }, height: 2.2, color: 0x6a675d },
  ] satisfies BoxConfig[],
  pillars: [
    {
      id: 'pillar-west-south',
      center: { x: -10.6, z: -8.8 },
      shaftSize: { x: 1.7, z: 1.7 },
      shaftHeight: 6.2,
      topSize: { x: 2.8, z: 2.8 },
      topThickness: 0.45,
      color: 0x7c7567,
      grappleAnchors: [
        { id: 'pillar-west-south-top', kind: 'pillarTop', offset: { x: 0, y: 6.65, z: 0 }, radius: 1.4 },
      ],
    },
    {
      id: 'pillar-west-north',
      center: { x: -10.6, z: 8.8 },
      shaftSize: { x: 1.7, z: 1.7 },
      shaftHeight: 6.2,
      topSize: { x: 2.8, z: 2.8 },
      topThickness: 0.45,
      color: 0x7c7567,
      grappleAnchors: [
        { id: 'pillar-west-north-top', kind: 'pillarTop', offset: { x: 0, y: 6.65, z: 0 }, radius: 1.4 },
      ],
    },
    {
      id: 'pillar-east-south',
      center: { x: 10.6, z: -8.8 },
      shaftSize: { x: 1.7, z: 1.7 },
      shaftHeight: 6.2,
      topSize: { x: 2.8, z: 2.8 },
      topThickness: 0.45,
      color: 0x7c7567,
      grappleAnchors: [
        { id: 'pillar-east-south-top', kind: 'pillarTop', offset: { x: 0, y: 6.65, z: 0 }, radius: 1.4 },
      ],
    },
    {
      id: 'pillar-east-north',
      center: { x: 10.6, z: 8.8 },
      shaftSize: { x: 1.7, z: 1.7 },
      shaftHeight: 6.2,
      topSize: { x: 2.8, z: 2.8 },
      topThickness: 0.45,
      color: 0x7c7567,
      grappleAnchors: [
        { id: 'pillar-east-north-top', kind: 'pillarTop', offset: { x: 0, y: 6.65, z: 0 }, radius: 1.4 },
      ],
    },
    {
      id: 'pillar-west-rear',
      center: { x: -21.2, z: 0 },
      shaftSize: { x: 1.8, z: 1.8 },
      shaftHeight: 6.8,
      topSize: { x: 3, z: 3 },
      topThickness: 0.45,
      color: 0x7a7365,
      grappleAnchors: [
        { id: 'pillar-west-rear-top', kind: 'pillarTop', offset: { x: 0, y: 7.25, z: 0 }, radius: 1.45 },
      ],
    },
    {
      id: 'pillar-east-rear',
      center: { x: 21.2, z: 0 },
      shaftSize: { x: 1.8, z: 1.8 },
      shaftHeight: 6.8,
      topSize: { x: 3, z: 3 },
      topThickness: 0.45,
      color: 0x7a7365,
      grappleAnchors: [
        { id: 'pillar-east-rear-top', kind: 'pillarTop', offset: { x: 0, y: 7.25, z: 0 }, radius: 1.45 },
      ],
    },
  ] satisfies PillarConfig[],
  midPlatforms: [
    {
      id: 'west-walkway-south',
      center: { x: -11.8, z: -5.4 },
      size: { x: 2.8, z: 5.8 },
      surfaceHeight: 3.15,
      thickness: 0.38,
      color: 0x8a8374,
      shape: 'walkway',
      grappleAnchors: [
        { id: 'west-walkway-south-front', kind: 'walkwayCorner', offset: { x: 0, y: 3.15, z: -2.35 }, radius: 1.15 },
        { id: 'west-walkway-south-back', kind: 'walkwayCorner', offset: { x: 0, y: 3.15, z: 2.35 }, radius: 1.15 },
      ],
    },
    {
      id: 'west-walkway-north',
      center: { x: -11.8, z: 4.6 },
      size: { x: 2.4, z: 4.8 },
      surfaceHeight: 3.25,
      thickness: 0.38,
      color: 0x867f70,
      shape: 'walkway',
      grappleAnchors: [
        { id: 'west-walkway-north-front', kind: 'walkwayCorner', offset: { x: 0, y: 3.25, z: -1.95 }, radius: 1.1 },
        { id: 'west-walkway-north-back', kind: 'walkwayCorner', offset: { x: 0, y: 3.25, z: 1.95 }, radius: 1.1 },
      ],
    },
    {
      id: 'east-ledges-low',
      center: { x: 14.4, z: -4.8 },
      size: { x: 3.4, z: 3.2 },
      surfaceHeight: 2.85,
      thickness: 0.42,
      color: 0x8b8474,
      shape: 'ledge',
      grappleAnchors: [
        { id: 'east-ledges-low-edge', kind: 'ledgeEdge', offset: { x: -1.35, y: 2.85, z: 0 }, radius: 1.05 },
      ],
    },
    {
      id: 'east-ledges-mid',
      center: { x: 17.2, z: 1.1 },
      size: { x: 2.8, z: 2.8 },
      surfaceHeight: 3.2,
      thickness: 0.42,
      color: 0x867f70,
      shape: 'ledge',
      grappleAnchors: [
        { id: 'east-ledges-mid-edge', kind: 'ledgeEdge', offset: { x: -1.05, y: 3.2, z: 0 }, radius: 1.05 },
      ],
    },
    {
      id: 'east-ledges-high',
      center: { x: 14.6, z: 7.3 },
      size: { x: 3.6, z: 3.2 },
      surfaceHeight: 3.55,
      thickness: 0.42,
      color: 0x8a8273,
      shape: 'ledge',
      grappleAnchors: [
        { id: 'east-ledges-high-edge', kind: 'ledgeEdge', offset: { x: -1.45, y: 3.55, z: 0 }, radius: 1.1 },
      ],
    },
  ] satisfies MidPlatformConfig[],
  archesAndRuins: [
    { id: 'west-edge-arch', center: { x: -24.3, z: 0 }, width: 5.4, depth: 1.3, height: 5.2, rotationY: 0, brokenSide: 'right', color: 0x8b8577 },
    { id: 'east-edge-arch', center: { x: 24.3, z: 0 }, width: 5.4, depth: 1.3, height: 5.2, rotationY: Math.PI, brokenSide: 'left', color: 0x8b8577 },
    { id: 'south-west-ruin', center: { x: -12.8, z: -21.5 }, width: 4.5, depth: 1.2, height: 4, rotationY: 0.2, brokenSide: 'left', color: 0x847d70 },
    { id: 'south-east-ruin', center: { x: 12.6, z: -21.3 }, width: 4.5, depth: 1.2, height: 4.2, rotationY: -0.24, brokenSide: 'right', color: 0x847d70 },
    { id: 'north-west-ruin', center: { x: -12.6, z: 21.4 }, width: 4.5, depth: 1.2, height: 4.2, rotationY: Math.PI - 0.2, brokenSide: 'right', color: 0x847d70 },
    { id: 'north-east-ruin', center: { x: 12.8, z: 21.5 }, width: 4.5, depth: 1.2, height: 4, rotationY: Math.PI + 0.24, brokenSide: 'left', color: 0x847d70 },
  ] satisfies ArchRuinConfig[],
  greeneryClusters: [
    { id: 'south-west-edge-green', center: { x: -18.4, z: -23 }, radius: 3.2, shrubCount: 6, color: 0x5f915a },
    { id: 'south-east-edge-green', center: { x: 18.4, z: -23 }, radius: 3.2, shrubCount: 6, color: 0x5f915a },
    { id: 'north-west-edge-green', center: { x: -18.4, z: 23 }, radius: 3.2, shrubCount: 6, color: 0x5f915a },
    { id: 'north-east-edge-green', center: { x: 18.4, z: 23 }, radius: 3.2, shrubCount: 6, color: 0x5f915a },
    { id: 'west-mid-green', center: { x: -24.2, z: 11.8 }, radius: 2.8, shrubCount: 5, color: 0x577f52 },
    { id: 'east-mid-green', center: { x: 24.2, z: -11.8 }, radius: 2.8, shrubCount: 5, color: 0x577f52 },
    { id: 'center-west-green', center: { x: -8.2, z: 10.4 }, radius: 2.2, shrubCount: 4, color: 0x5b8a57 },
    { id: 'center-east-green', center: { x: 8.2, z: -10.4 }, radius: 2.2, shrubCount: 4, color: 0x5b8a57 },
  ] satisfies GreeneryClusterConfig[],
  trees: [
    { id: 'tree-sw-corner', position: { x: -25.1, z: -22.6 }, trunkHeight: 6.5, canopyRadius: 3 },
    { id: 'tree-se-corner', position: { x: 25.1, z: -22.6 }, trunkHeight: 6.5, canopyRadius: 3 },
    { id: 'tree-nw-corner', position: { x: -25.1, z: 22.6 }, trunkHeight: 6.5, canopyRadius: 3 },
    { id: 'tree-ne-corner', position: { x: 25.1, z: 22.6 }, trunkHeight: 6.5, canopyRadius: 3 },
    { id: 'tree-west-mid', position: { x: -25.8, z: 4 }, trunkHeight: 6.1, canopyRadius: 2.7 },
    { id: 'tree-east-mid', position: { x: 25.8, z: -4 }, trunkHeight: 6.1, canopyRadius: 2.7 },
    { id: 'tree-south-mid', position: { x: -4.4, z: -24.1 }, trunkHeight: 5.8, canopyRadius: 2.6 },
    { id: 'tree-north-mid', position: { x: 4.4, z: 24.1 }, trunkHeight: 5.8, canopyRadius: 2.6 },
  ] satisfies TreeConfig[],
  boostPads: [
    {
      id: 'center-pad-west',
      position: { x: -2.9, z: 0.8 },
      surfaceHeight: 0,
      radius: 1.35,
      triggerHeight: 0.95,
      upwardLaunchSpeed: 15.4,
      forwardLaunchSpeed: 3.2,
      forwardYaw: 0.42,
      visualScale: 1.32,
      color: 0x84f0ff,
    },
    {
      id: 'center-pad-east',
      position: { x: 2.9, z: -0.8 },
      surfaceHeight: 0,
      radius: 1.35,
      triggerHeight: 0.95,
      upwardLaunchSpeed: 15.4,
      forwardLaunchSpeed: 3.2,
      forwardYaw: Math.PI - 0.42,
      visualScale: 1.32,
      color: 0x84f0ff,
    },
    {
      id: 'west-entry-pad',
      position: { x: -15.1, z: -14.4 },
      surfaceHeight: 0,
      radius: 1.24,
      triggerHeight: 1,
      upwardLaunchSpeed: 12.8,
      forwardLaunchSpeed: 9.4,
      forwardYaw: -0.9,
      visualScale: 1.08,
      color: 0x67e8ff,
    },
    {
      id: 'west-redirect-pad',
      position: { x: -11.8, z: 4.6 },
      surfaceHeight: 3.25,
      radius: 1.15,
      triggerHeight: 1,
      upwardLaunchSpeed: 11.8,
      forwardLaunchSpeed: 8.8,
      forwardYaw: 0.96,
      visualScale: 1,
      color: 0x5fe0ff,
    },
    {
      id: 'east-lower-pad',
      position: { x: 16.6, z: -10.7 },
      surfaceHeight: 1.2,
      radius: 1.18,
      triggerHeight: 1,
      upwardLaunchSpeed: 12.4,
      forwardLaunchSpeed: 8.9,
      forwardYaw: 0.34,
      visualScale: 1.04,
      color: 0x67e8ff,
    },
    {
      id: 'east-high-pad',
      position: { x: 14.5, z: 7.3 },
      surfaceHeight: 3.55,
      radius: 1.12,
      triggerHeight: 1,
      upwardLaunchSpeed: 11.6,
      forwardLaunchSpeed: 8.6,
      forwardYaw: Math.PI + 0.26,
      visualScale: 0.98,
      color: 0x5fe0ff,
    },
  ] satisfies BoostPadConfig[],
} as const;
