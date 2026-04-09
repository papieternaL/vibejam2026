# ElevenLabs SFX

This project uses ElevenLabs as an offline sound-generation pipeline.

## Setup

1. Set your API key in the shell:
   PowerShell:
   `$env:ELEVENLABS_API_KEY="your_key_here"`
2. Generate all configured effects:
   `npm run generate:sfx`
3. Force-regenerate every clip:
   `npm run generate:sfx:force`
4. Generate only specific ids:
   `node scripts/generate-elevenlabs-sfx.mjs bow-draw-start dash jump`

Generated files are written to `public/audio/generated/`.
The generator also refreshes `public/audio/generated/manifest.json`, which the runtime uses to load only available clips.

## Current SFX ids

- `bow-draw-start`
- `bow-draw-ready`
- `bow-full-charge`
- `bow-release-light`
- `bow-release-full`
- `bow-draw-cancel`
- `jump`
- `land`
- `dash`
- `wind-launch`
- `shield-up`
- `boost-pad`
- `arrow-hit-body`
- `arrow-hit-head`
- `arrow-hit-shield`
- `burn-zone`
- `dragon-wave`
- `vault-impact`
- `roar-burst`
