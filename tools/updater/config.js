import { readFileSync, writeFileSync } from 'node:fs';

const CONFIG_PATH = new URL('../projects-config.json', import.meta.url);
const STATE_PATH = new URL('../projects-state.json', import.meta.url);

/**
 * @typedef {{ owner: string, baseBranch: string, allow: string[], deny: string[],
 *   changeThresholds: { minCommits: number, readmeChanged: boolean },
 *   models: { draft: string } }} Config
 * @typedef {{ slug: string, status: 'pending'|'published'|'skipped',
 *   pushedAt: string, readmeHash: string, mark?: string }} RepoState
 * @typedef {{ repos: Record<string, RepoState> }} State
 */

function readJson(path) {
  const label = path instanceof URL ? path.pathname : String(path);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read ${label}: ${err.message}`);
  }
}

/** @returns {Config} */
export function loadConfig(path = CONFIG_PATH) {
  return readJson(path);
}

/** @returns {State} */
export function loadState(path = STATE_PATH) {
  return readJson(path);
}

/** @param {State} state */
export function saveState(state, path = STATE_PATH) {
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n');
}
