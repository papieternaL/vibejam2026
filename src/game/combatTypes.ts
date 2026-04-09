import * as THREE from 'three';
export type TeamId = 'hero' | 'dummy';

export type StatusKind = 'slow' | 'stun' | 'burn' | 'dragonBurn';

export type StatusSpec = {
  kind: StatusKind;
  duration: number;
  potency?: number;
  tickDamage?: number;
};

export type DamageRequest = {
  amount: number;
  sourceTeam: TeamId;
  sourceAbility: string;
  tags: string[];
  statuses?: StatusSpec[];
  hitFlashColor?: number;
  hitDirection?: THREE.Vector3;
};

export type DamageResult = {
  applied: boolean;
  died: boolean;
  amount: number;
};

export type ProjectileHitPart = 'head' | 'body' | 'shield';

export type ProjectileHitResult = {
  position: THREE.Vector3;
  part: ProjectileHitPart;
  damage: number;
  blocked: boolean;
  died: boolean;
  flashColor: number;
  pulseScale: number;
};

export type DamageableTarget = {
  id: string;
  team: TeamId;
  radius: number;
  position: THREE.Vector3;
  isAlive(): boolean;
  applyDamage(request: DamageRequest): DamageResult;
  applyStatus(status: StatusSpec): void;
  getMovementScalar(): number;
  getDebugStatuses(): string[];
  resolveProjectileHit(
    segmentStart: THREE.Vector3,
    segmentEnd: THREE.Vector3,
    projectileRadius: number,
    sourceTeam: TeamId,
  ): ProjectileHitResult | null;
};

export type WorldSpawnApi = {
  spawnArrow(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    sourceTeam?: TeamId,
    options?: {
      speed?: number;
      lifetime?: number;
      gravity?: number;
      chargeRatio?: number;
    },
  ): void;
  spawnBurnZone(position: THREE.Vector3, directionYaw: number): void;
  spawnDragonWave(position: THREE.Vector3, directionYaw: number): void;
  spawnHitPulse(position: THREE.Vector3, color: number, size: number): void;
  spawnVaultImpact(position: THREE.Vector3, radius: number): void;
  spawnRoarBurst(position: THREE.Vector3, radius: number): void;
};
