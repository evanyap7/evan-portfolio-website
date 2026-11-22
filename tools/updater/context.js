import { createHash } from 'node:crypto';

/**
 * @typedef {{ json(path: string): Promise<any>, text(path: string): Promise<string> }} GhClient
 * @typedef {{ name: string, fullName: string, description: string|null, pushedAt: string,
 *   defaultBranch: string, topics: string[], language?: string|null,
 *   commitsSince?: number, readmeHash?: string, recentCommitMessages?: string[] }} Repo
 * @typedef {{ name: string, description: string, readme: string, languages: string[],
 *   topics: string[], commits: string[], readmeHash: string }} RepoContext
 * @typedef {{ text: string, source: string }} Claim
 */

const README_LIMIT = 20000;

export class NoUsableContentError extends Error {
  constructor(repoName) {
    super(`Repo ${repoName} has no README or description to draft from`);
    this.name = 'NoUsableContentError';
  }
}

/** SHA-256 of the trimmed README. Shared by enrichRepos and collectContext. */
export function hashReadme(text) {
  return createHash('sha256').update(String(text ?? '').trim()).digest('hex');
}

/** Fetch a repo README as text; a missing README (404) is ''. */
export async function fetchReadme(repo, gh) {
  try {
    return await gh.text(`repos/${repo.fullName}/readme`);
  } catch (err) {
    if (/404/.test(String(err?.message))) return '';
    throw err;
  }
}

/**
 * @param {Repo} repo
 * @param {GhClient} gh
 * @param {string} [sinceIso]
 * @returns {Promise<RepoContext>}
 */
export async function collectContext(repo, gh, sinceIso) {
  const fullReadme = await fetchReadme(repo, gh);
  const description = (repo.description ?? '').trim();
  if (fullReadme.trim() === '' && description === '') throw new NoUsableContentError(repo.name);

  const since = sinceIso ? `&since=${encodeURIComponent(sinceIso).replace(/%3A/g, ':')}` : '';
  const [languages, commits] = await Promise.all([
    gh.json(`repos/${repo.fullName}/languages`),
    gh.json(`repos/${repo.fullName}/commits?sha=${repo.defaultBranch}&per_page=30${since}`),
  ]);
  return {
    name: repo.name,
    description,
    readme: fullReadme.trim().slice(0, README_LIMIT),
    languages: Object.keys(languages ?? {}),
    topics: repo.topics ?? [],
    commits: (commits ?? []).map((c) => c.commit.message),
    readmeHash: hashReadme(fullReadme),
  };
}

// $5, 1,200, 2.5, 3-5, 38/39, with optional %, +, or x suffix.
const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;
const CLAIM_RE = new RegExp(String.raw`\$?${NUM}(?:\s?[-–]\s?${NUM}|/${NUM})?(?:%|\+|x\b)?`, 'g');

/**
 * @param {string} text
 * @returns {Claim[]}
 */
export function extractClaims(text) {
  if (typeof text !== 'string' || text.trim() === '') return [];
  const sentences = [];
  const splitter = /[^\n]+?(?:[.!?](?=\s|$)|$|(?=\n))/g;
  for (const m of text.matchAll(splitter)) {
    const raw = m[0];
    if (raw.trim()) sentences.push({ start: m.index, end: m.index + raw.length, text: raw.trim() });
  }
  const claims = [];
  for (const m of text.matchAll(CLAIM_RE)) {
    const s = sentences.find((x) => m.index >= x.start && m.index < x.end);
    claims.push({ text: m[0].trim(), source: s ? s.text : text.trim() });
  }
  return claims;
}
