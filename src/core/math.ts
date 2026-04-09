export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

export function damp(current: number, target: number, sharpness: number, deltaSeconds: number): number {
  return current + (target - current) * (1 - Math.exp(-sharpness * deltaSeconds));
}

export function normalizeAngle(angle: number): number {
  let value = angle;

  while (value > Math.PI) {
    value -= Math.PI * 2;
  }

  while (value < -Math.PI) {
    value += Math.PI * 2;
  }

  return value;
}

export function dampAngle(
  current: number,
  target: number,
  sharpness: number,
  deltaSeconds: number,
): number {
  const delta = normalizeAngle(target - current);
  return normalizeAngle(current + delta * (1 - Math.exp(-sharpness * deltaSeconds)));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
