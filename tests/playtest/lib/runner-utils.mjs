export const DEFAULT_BASE_URL = 'http://localhost:8000/';
// Add a scenario only after every navigation uses the shared harness URL.
export const BASE_URL_SCENARIOS = new Set(['battle_lose', 'battle_bgm', 'tvform-rhythm', 'tvform-subrio-b', 'tvform-subrio', 'tvform-subrio-guard', 'ship-lounge', 'ship-ending', 'ship-castle', 'jjajang-shore', 'sinking-shore']);

/** Validate CLI names before using them as file paths. */
export function selectScenarios(args, available) {
  if (args.length === 1 && ['--help', '--list'].includes(args[0])) return { mode: args[0] };
  if (args.length === 1 && args[0] === '--all') return { mode: 'run', names: [...available] };
  if (!args.length) throw new Error('Select scenario names or --all; use --list to discover scenarios.');
  for (const name of args) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name) || !available.includes(name)) {
      throw new Error(`Unknown scenario: ${name}. Use --list (names omit .mjs).`);
    }
  }
  return { mode: 'run', names: [...new Set(args)] };
}

/** Base URLs identify a serving directory, never a query or a different file. */
export function validateBaseUrl(value = DEFAULT_BASE_URL) {
  let url;
  try { url = new URL(value); } catch { throw new Error('QA_BASE_URL must be an absolute HTTP(S) directory URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || /\.html?$/i.test(url.pathname)) {
    throw new Error('QA_BASE_URL must be an HTTP(S) directory URL without credentials, query, fragment, or index.html.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

/** Legacy navigation ignores QA_BASE_URL; refuse to mislabel its evidence. */
export function validateScenarioUrls(names, baseUrl) {
  if (baseUrl === DEFAULT_BASE_URL) return;
  const legacy = names.filter(name => !BASE_URL_SCENARIOS.has(name));
  if (legacy.length) throw new Error(`QA_BASE_URL is unsupported by legacy scenarios: ${legacy.join(', ')}. Migrate their navigation to lib/harness.mjs first.`);
}

/** A zero marker cannot override a crash, timeout, failure line, or earlier failure. */
export function classifyResult(output, exitCode, signal = null) {
  const markers = [...output.matchAll(/\bfails=(\d+)\b/g)].map(match => Number(match[1]));
  const reportedFails = markers.length ? Math.max(...markers) : null;
  const reasons = [];
  if (exitCode !== 0) reasons.push(`child exit ${exitCode ?? 'unknown'}`);
  if (signal) reasons.push(`signal ${signal}`);
  if (reportedFails === null) reasons.push('missing fails= marker');
  if (reportedFails > 0) reasons.push(`reported ${reportedFails} failure(s)`);
  if (/^\s*(?:FAIL\b|CRASH\b)/m.test(output)) reasons.push('failure in log');
  return { passed: reasons.length === 0, reportedFails, reasons };
}

export function harnessResultErrors(detail) {
  if (!detail) return ['missing harness result.json'];
  if (detail.status !== 'passed' || detail.fails !== 0) return ['harness did not finish successfully'];
  if (!Array.isArray(detail.checks) || !detail.checks.length || detail.checks.some(check => check.passed !== true)) return ['invalid harness checks'];
  return [];
}
