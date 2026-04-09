import { defineConfig } from 'vite';

const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGithubPages ? '/vibejam2026/' : '/',
});
