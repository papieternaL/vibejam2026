export const inputConfig = {
  moveForward: ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyD', 'ArrowLeft'],
  moveRight: ['KeyA', 'ArrowRight'],
  jump: ['Space'],
  basicAttack: ['MouseLeft'],
  chargedAttack: ['MouseRight'],
  dash: ['ShiftLeft', 'ShiftRight'],
  engage: ['KeyQ'],
  sweep: ['KeyE'],
  ultimate: ['KeyR'],
  debugHitboxes: ['Backquote'],
  fullscreen: ['KeyF'],
} as const;

export type InputAction = keyof typeof inputConfig;
