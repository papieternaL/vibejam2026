export type GameSfxId =
  | 'bow-draw-start'
  | 'bow-draw-ready'
  | 'bow-full-charge'
  | 'bow-release-light'
  | 'bow-release-full'
  | 'bow-draw-cancel'
  | 'jump'
  | 'land'
  | 'dash'
  | 'wind-launch'
  | 'shield-up'
  | 'boost-pad'
  | 'arrow-hit-body'
  | 'arrow-hit-head'
  | 'arrow-hit-shield'
  | 'burn-zone'
  | 'dragon-wave'
  | 'vault-impact'
  | 'roar-burst';

type SfxConfig = {
  url: string;
  volume: number;
  cooldownMs: number;
  playbackRateMin?: number;
  playbackRateMax?: number;
  polyphony?: number;
};

export const audioConfig: {
  masterVolume: number;
  sfx: Record<GameSfxId, SfxConfig>;
} = {
  masterVolume: 0.95,
  sfx: {
    'bow-draw-start': {
      url: '/audio/generated/bow-draw-start.mp3',
      volume: 0.5,
      cooldownMs: 40,
      playbackRateMin: 0.98,
      playbackRateMax: 1.03,
      polyphony: 1,
    },
    'bow-draw-ready': {
      url: '/audio/generated/bow-draw-ready.mp3',
      volume: 0.46,
      cooldownMs: 90,
      playbackRateMin: 0.98,
      playbackRateMax: 1.02,
      polyphony: 1,
    },
    'bow-full-charge': {
      url: '/audio/generated/bow-full-charge.mp3',
      volume: 0.52,
      cooldownMs: 140,
      playbackRateMin: 0.99,
      playbackRateMax: 1.01,
      polyphony: 1,
    },
    'bow-release-light': {
      url: '/audio/generated/bow-release-light.mp3',
      volume: 0.62,
      cooldownMs: 70,
      playbackRateMin: 0.99,
      playbackRateMax: 1.04,
      polyphony: 2,
    },
    'bow-release-full': {
      url: '/audio/generated/bow-release-full.mp3',
      volume: 0.72,
      cooldownMs: 70,
      playbackRateMin: 0.99,
      playbackRateMax: 1.03,
      polyphony: 2,
    },
    'bow-draw-cancel': {
      url: '/audio/generated/bow-draw-cancel.mp3',
      volume: 0.38,
      cooldownMs: 80,
      playbackRateMin: 0.98,
      playbackRateMax: 1.04,
      polyphony: 1,
    },
    jump: {
      url: '/audio/generated/jump.mp3',
      volume: 0.56,
      cooldownMs: 100,
      playbackRateMin: 0.98,
      playbackRateMax: 1.04,
      polyphony: 2,
    },
    land: {
      url: '/audio/generated/land.mp3',
      volume: 0.58,
      cooldownMs: 120,
      playbackRateMin: 0.97,
      playbackRateMax: 1.03,
      polyphony: 2,
    },
    dash: {
      url: '/audio/generated/dash.mp3',
      volume: 0.66,
      cooldownMs: 100,
      playbackRateMin: 0.98,
      playbackRateMax: 1.02,
      polyphony: 1,
    },
    'wind-launch': {
      url: '/audio/generated/wind-launch.mp3',
      volume: 0.68,
      cooldownMs: 120,
      playbackRateMin: 0.98,
      playbackRateMax: 1.03,
      polyphony: 1,
    },
    'shield-up': {
      url: '/audio/generated/shield-up.mp3',
      volume: 0.58,
      cooldownMs: 150,
      playbackRateMin: 0.98,
      playbackRateMax: 1.02,
      polyphony: 1,
    },
    'boost-pad': {
      url: '/audio/generated/boost-pad.mp3',
      volume: 0.65,
      cooldownMs: 110,
      playbackRateMin: 0.98,
      playbackRateMax: 1.04,
      polyphony: 1,
    },
    'arrow-hit-body': {
      url: '/audio/generated/arrow-hit-body.mp3',
      volume: 0.62,
      cooldownMs: 50,
      playbackRateMin: 0.98,
      playbackRateMax: 1.04,
      polyphony: 3,
    },
    'arrow-hit-head': {
      url: '/audio/generated/arrow-hit-head.mp3',
      volume: 0.72,
      cooldownMs: 50,
      playbackRateMin: 0.99,
      playbackRateMax: 1.03,
      polyphony: 2,
    },
    'arrow-hit-shield': {
      url: '/audio/generated/arrow-hit-shield.mp3',
      volume: 0.56,
      cooldownMs: 50,
      playbackRateMin: 0.99,
      playbackRateMax: 1.03,
      polyphony: 2,
    },
    'burn-zone': {
      url: '/audio/generated/burn-zone.mp3',
      volume: 0.52,
      cooldownMs: 120,
      playbackRateMin: 0.98,
      playbackRateMax: 1.02,
      polyphony: 1,
    },
    'dragon-wave': {
      url: '/audio/generated/dragon-wave.mp3',
      volume: 0.72,
      cooldownMs: 120,
      playbackRateMin: 0.98,
      playbackRateMax: 1.02,
      polyphony: 1,
    },
    'vault-impact': {
      url: '/audio/generated/vault-impact.mp3',
      volume: 0.74,
      cooldownMs: 100,
      playbackRateMin: 0.97,
      playbackRateMax: 1.02,
      polyphony: 1,
    },
    'roar-burst': {
      url: '/audio/generated/roar-burst.mp3',
      volume: 0.72,
      cooldownMs: 100,
      playbackRateMin: 0.98,
      playbackRateMax: 1.02,
      polyphony: 1,
    },
  },
};
