import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('public/audio/generated');
const promptsPath = path.resolve('scripts/elevenlabs-sfx-prompts.json');
const manifestPath = path.join(outputDir, 'manifest.json');
const force = process.argv.includes('--force');
const requestedIds = process.argv.filter((arg) => !arg.startsWith('--')).slice(2);

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('Missing ELEVENLABS_API_KEY. Set it in your shell before running this script.');
  process.exit(1);
}

const promptManifest = JSON.parse(await fs.readFile(promptsPath, 'utf8'));
const prompts = requestedIds.length > 0
  ? promptManifest.filter((entry) => requestedIds.includes(entry.id))
  : promptManifest;

if (prompts.length === 0) {
  console.error('No matching SFX prompt ids found.');
  process.exit(1);
}

await fs.mkdir(outputDir, { recursive: true });

for (const prompt of prompts) {
  const outputPath = path.join(outputDir, `${prompt.id}.mp3`);
  if (!force) {
    try {
      await fs.access(outputPath);
      console.log(`Skipping ${prompt.id} (already exists)`);
      continue;
    } catch {
      // Continue to generation.
    }
  }

  console.log(`Generating ${prompt.id}...`);
  const response = await fetch(
    'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: prompt.prompt,
        duration_seconds: prompt.durationSeconds,
        prompt_influence: prompt.promptInfluence,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate ${prompt.id}: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
  console.log(`Saved ${outputPath}`);
}

const generatedFiles = await fs.readdir(outputDir, { withFileTypes: true });
const manifest = generatedFiles
  .filter((entry) => entry.isFile() && entry.name.endsWith('.mp3'))
  .map((entry) => entry.name.replace(/\.mp3$/i, ''))
  .sort((left, right) => left.localeCompare(right));

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated ${manifestPath}`);

console.log('SFX generation complete.');
