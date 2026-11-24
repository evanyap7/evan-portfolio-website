import { fetchReadme, hashReadme } from './context.js';

/** @typedef {import('./config.js').Config} Config */
/** @typedef {import('./config.js').State} State */
/** @typedef {import('./context.js').Repo} Repo */
/** @typedef {import('./context.js').GhClient} GhClient */

const UNSEEN_COMMIT_CAP = 30;
const MAX_COMMITS = 100;
const PER_PAGE = 100;
const MAX_PAGES = 10;
const CHORE_RE = /^(chore|docs|ci|style|test)(\([^)]*\))?!?:/i;

/**
 * Public, non-fork, non-archived repos, minus deny; restricted to allow when allow is non-empty.
 * @param {Config} config
 * @param {GhClient} gh
 * @returns {Promise<Repo[]>}
 */
export async function listEligibleRepos(config, gh) {
  const raw = [];
  for (let page = 1; ; page += 1) {
    if (page > MAX_PAGES) throw new Error(`More than ${MAX_PAGES} pages of repos; refusing a partial list`);
    const batch = await gh.json(`users/${config.owner}/repos?type=owner&sort=pushed&per_page=${PER_PAGE}&page=${page}`);
    if (!Array.isArray(batch)) throw new Error('GitHub repo list is not an array');
    raw.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return raw
    .filter((r) => !r.private && !r.fork && !r.archived)
    .filter((r) => !config.deny.includes(r.name))
    .filter((r) => config.allow.length === 0 || config.allow.includes(r.name))
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description ?? null,
      pushedAt: r.pushed_at,
      defaultBranch: r.default_branch,
      topics: r.topics ?? [],
      language: r.language ?? null,
    }));
}

/** True when there are commits and every one is a conventional chore/docs/ci/style/test. */
export function isChoreOnly(messages) {
  return messages.length > 0 && messages.every((m) => CHORE_RE.test(String(m).trim()));
}

/**
 * Add commitsSince, readmeHash and recentCommitMessages to each repo.
 * @param {Repo[]} repos
 * @param {State} state
 * @param {GhClient} gh
 * @returns {Promise<Repo[]>}
 */
export async function enrichRepos(repos, state, gh) {
  const results = await Promise.all(repos.map(async (repo) => {
    try {
      const seen = state.repos[repo.name];
      const since = seen ? `&since=${seen.pushedAt}` : '';
      const perPage = seen ? MAX_COMMITS : UNSEEN_COMMIT_CAP;
      const [commits, readme] = await Promise.all([
        gh.json(`repos/${repo.fullName}/commits?sha=${repo.defaultBranch}&per_page=${perPage}${since}`)
          .catch((err) => {
            if (/409/.test(String(err?.message))) return []; // empty repo
            throw err;
          }),
        fetchReadme(repo, gh),
      ]);
      const recentCommitMessages = commits.map((c) => c.commit.message);
      return { ...repo, commitsSince: commits.length, readmeHash: hashReadme(readme), recentCommitMessages };
    } catch (err) {
      console.warn(`updater: skipping ${repo.name}: ${err?.message ?? err}`);
      return null;
    }
  }));
  return results.filter(Boolean);
}

/**
 * New = unseen. Changed = published/skipped and (README hash differs, or enough
 * non-chore-only commits); a skipped entry recorded with kind 'new' comes back as new.
 * Pending repos are never re-proposed.
 * @param {Repo[]} repos enriched repos
 * @param {State} state
 * @param {Config} config
 * @returns {Array<{ repo: Repo, kind: 'new'|'changed' }>}
 */
export function classify(repos, state, config) {
  const { minCommits, readmeChanged } = config.changeThresholds;
  const out = [];
  for (const repo of repos) {
    const seen = state.repos[repo.name];
    if (!seen) {
      out.push({ repo, kind: 'new' });
      continue;
    }
    if (seen.status === 'pending') continue;
    const readmeDiffers = readmeChanged && repo.readmeHash !== undefined && repo.readmeHash !== seen.readmeHash;
    const enoughCommits = (repo.commitsSince ?? 0) >= minCommits && !isChoreOnly(repo.recentCommitMessages ?? []);
    // A rejected new repo has no page to edit, so when it changes it is proposed as new again.
    const kind = seen.status === 'skipped' && seen.kind === 'new' ? 'new' : 'changed';
    if (readmeDiffers || enoughCommits) out.push({ repo, kind });
  }
  return out;
}
