import { audioConfig, type GameSfxId } from '../config/audioConfig';

type PlaybackOptions = {
  volumeScale?: number;
  playbackRateScale?: number;
};

export class GameAudioManager {
  private readonly lastPlayAt = new Map<GameSfxId, number>();
  private readonly unavailable = new Set<GameSfxId>();
  private readonly activeCounts = new Map<GameSfxId, number>();
  private readonly available = new Set<GameSfxId>();
  private enabled = true;
  private manifestLoaded = false;

  constructor() {
    void this.loadManifest();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(id: GameSfxId, options: PlaybackOptions = {}): void {
    if (!this.enabled || this.unavailable.has(id) || !this.manifestLoaded || !this.available.has(id)) {
      return;
    }

    const definition = audioConfig.sfx[id];
    const now = performance.now();
    const previousPlayAt = this.lastPlayAt.get(id) ?? -Infinity;
    if (now - previousPlayAt < definition.cooldownMs) {
      return;
    }

    const activeCount = this.activeCounts.get(id) ?? 0;
    if (activeCount >= (definition.polyphony ?? 2)) {
      return;
    }

    const audio = new Audio(definition.url);
    audio.preload = 'auto';
    audio.volume = Math.min(
      1,
      Math.max(0, definition.volume * audioConfig.masterVolume * (options.volumeScale ?? 1)),
    );

    const playbackRateMin = definition.playbackRateMin ?? 1;
    const playbackRateMax = definition.playbackRateMax ?? playbackRateMin;
    const randomizedPlaybackRate =
      playbackRateMin + Math.random() * Math.max(0, playbackRateMax - playbackRateMin);
    audio.playbackRate = randomizedPlaybackRate * (options.playbackRateScale ?? 1);

    this.lastPlayAt.set(id, now);
    this.activeCounts.set(id, activeCount + 1);

    const cleanup = (): void => {
      const nextActiveCount = Math.max(0, (this.activeCounts.get(id) ?? 1) - 1);
      this.activeCounts.set(id, nextActiveCount);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', onError);
    };

    const onError = (): void => {
      this.unavailable.add(id);
      cleanup();
    };

    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', onError, { once: true });
    void audio.play().catch(() => {
      cleanup();
    });
  }

  private async loadManifest(): Promise<void> {
    try {
      const response = await fetch('/audio/generated/manifest.json', { cache: 'no-cache' });
      if (!response.ok) {
        this.manifestLoaded = true;
        return;
      }

      const ids = (await response.json()) as GameSfxId[];
      for (const id of ids) {
        this.available.add(id);
      }
    } catch {
      // Leave audio disabled until the manifest request settles.
    } finally {
      this.manifestLoaded = true;
    }
  }
}
