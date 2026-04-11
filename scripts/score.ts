/**
 * DX Experiment — GS Scoring Script (Taskflow / Brownfield variant)
 * Produces score.json with GS property scores + external metrics.
 * Run: npm run score
 *
 * Scoring rubric (8 pts automated, 6 pts via hidden live test = 14 pts total):
 *   Self-describing  1pt  — README describes the feature built
 *   Bounded          2pt  — Zero direct prisma.* calls in route files
 *   Verifiable       2pt  — Tests pass (1pt) + coverage ≥ 60% on src (1pt)
 *   Defended         1pt  — CI config present OR pre-commit hook present
 *   Auditable        2pt  — ≥50% conventional commits (1pt) + decision log (1pt)
 *   Composable       3pt  — Scored externally via hidden live test (clean arch / DI / no coupling)
 *   Executable       3pt  — Scored externally via hidden live test (server starts, contracts pass)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Run a shell command, return stdout. Never throws — returns empty string on error. */
function run(cmd: string, env?: Record<string, string>): string {
  try {
    const opts = { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] as const, env: { ...process.env, ...env } };
    return execSync(cmd, opts).toString().trim();
  } catch (e: any) {
    return e.stdout?.toString().trim() ?? '';
  }
}

/** Recursively collect files matching a predicate. */
function collectFiles(dir: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      results.push(...collectFiles(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

/** Count regex matches across an array of files. Returns [matchCount, fileList]. */
function countMatches(files: string[], pattern: RegExp): [number, string[]] {
  let count = 0;
  const matched: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const hits = content.match(pattern)?.length ?? 0;
    if (hits > 0) { count += hits; matched.push(relative(ROOT, file)); }
  }
  return [count, matched];
}

// ─── Checks ──────────────────────────────────────────────────────────────────

function checkSelfDescribing(): { score: number; max: number; details: string } {
  const readme = join(ROOT, 'README.md');
  if (!existsSync(readme)) return { score: 0, max: 1, details: 'README.md missing' };
  const content = readFileSync(readme, 'utf8');
  const diffOutput = run('git diff origin/condition-a -- README.md || git diff origin/condition-b -- README.md');
  const wasModified = diffOutput.trim().length > 0;
  if (!wasModified) return { score: 0, max: 1, details: 'README not modified from template — update it to describe what you built' };
  if (content.length <= 300) return { score: 0, max: 1, details: `README modified but too short (${content.length} chars)` };
  return { score: 1, max: 1, details: `README updated by participant (${content.length} chars)` };
}

function checkBounded(): { score: number; max: number; details: string; violations: string[] } {
  // Taskflow uses Prisma — participants should use a repository/service layer.
  // Exclude db/ and repositories/ directories where direct DB access is expected.
  const DB_DIRS = ['db', 'database', 'repositories', 'repository', 'prisma'];
  const routeFiles = collectFiles(SRC, f => {
    if (!f.endsWith('.ts') || f.endsWith('.test.ts') || f.endsWith('.spec.ts')) return false;
    const rel = relative(SRC, f).replace(/\\/g, '/');
    return !DB_DIRS.some(d => rel.startsWith(d + '/') || rel === d + '.ts');
  });
  const [count, violations] = countMatches(routeFiles, /\bprisma\b/g);
  if (count === 0) return { score: 2, max: 2, details: 'No direct DB calls in route/service files', violations: [] };
  if (count <= 3) return { score: 1, max: 2, details: `${count} direct DB call(s) outside repository layer`, violations };
  return { score: 0, max: 2, details: `${count} direct DB calls found — repository layer missing`, violations };
}

function checkVerifiable(): { score: number; max: number; details: string; testsPassed: number; testsFailed: number; coveragePct: number | null } {
  // Run tests — NODE_ENV=test prevents the Express server from binding a port during import
  const testOutput = run('npx vitest run --reporter=json --outputFile=.score-test-report.json', { NODE_ENV: 'test' });
  let testsPassed = 0;
  let testsFailed = 0;
  let coveragePct: number | null = null;

  const reportPath = join(ROOT, '.score-test-report.json');
  if (existsSync(reportPath)) {
    try {
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      testsPassed = report.numPassedTests ?? 0;
      testsFailed = report.numFailedTests ?? 0;
    } catch { /* ignore parse errors */ }
  }

  // Run coverage — json-summary produces coverage-summary.json read below
  const coverageOutput = run('npx vitest run --coverage --coverage.reporter=json-summary --coverage.reportsDirectory=.score-coverage', { NODE_ENV: 'test' });
  const coverageSummaryPath = join(ROOT, '.score-coverage', 'coverage-summary.json');
  if (existsSync(coverageSummaryPath)) {
    try {
      const summary = JSON.parse(readFileSync(coverageSummaryPath, 'utf8'));
      const rawPct = summary.total?.lines?.pct ?? null;
      coveragePct = rawPct !== null ? Number(rawPct) : null;
      if (coveragePct !== null && isNaN(coveragePct)) coveragePct = null;
    } catch { /* ignore */ }
  }

  const testsPass = testsFailed === 0 && testsPassed > 0;
  const coveragePass = coveragePct !== null && coveragePct >= 60;

  const score = (testsPass ? 1 : 0) + (coveragePass ? 1 : 0);
  const details = [
    `Tests: ${testsPassed} passed, ${testsFailed} failed`,
    coveragePct !== null ? `Coverage: ${coveragePct.toFixed(1)}%` : 'Coverage: not measured',
  ].join(' | ');

  return { score, max: 2, details, testsPassed, testsFailed, coveragePct };
}

function checkDefended(): { score: number; max: number; details: string } {
  const hasCi = existsSync(join(ROOT, '.github', 'workflows'));
  const hasPreCommit = existsSync(join(ROOT, '.husky', 'pre-commit')) ||
                       existsSync(join(ROOT, '.git', 'hooks', 'pre-commit'));
  if (hasCi || hasPreCommit) {
    const sources = [hasCi && 'CI workflow', hasPreCommit && 'pre-commit hook'].filter(Boolean).join(', ');
    return { score: 1, max: 1, details: `Structural guard present: ${sources}` };
  }
  return { score: 0, max: 1, details: 'No CI config or pre-commit hook found' };
}

function checkAuditable(): { score: number; max: number; details: string; conventionalPct: number; hasDecisionLog: boolean } {
  // Conventional commits
  const logOutput = run('git log --oneline');
  const lines = logOutput.split('\n').filter(Boolean);
  const totalCommits = lines.length;
  const conventionalPattern = /^[a-f0-9]+ (feat|fix|refactor|test|chore|docs|style|perf|ci|build)(\(.+\))?:/;
  const conventionalCount = lines.filter(l => conventionalPattern.test(l)).length;
  const conventionalPct = totalCommits > 0 ? (conventionalCount / totalCommits) : 0;

  // Decision log: any doc recording a design choice and reasoning
  const hasDecisionLog =
    existsSync(join(ROOT, 'docs', 'adr')) ||
    existsSync(join(ROOT, 'docs', 'decisions')) ||
    collectFiles(ROOT, f =>
      /\b(adr|decision|design-log|design-notes|rationale|choices)\b/i.test(basename(f)) &&
      f.endsWith('.md') && !f.includes('node_modules')
    ).length > 0;

  const score = (conventionalPct >= 0.5 ? 1 : 0) + (hasDecisionLog ? 1 : 0);
  const details = [
    `Conventional commits: ${conventionalCount}/${totalCommits} (${(conventionalPct * 100).toFixed(0)}%)`,
    `Decision log: ${hasDecisionLog ? 'present' : 'missing — add a doc recording one design choice you made and why'}`,
  ].join(' | ');

  return { score, max: 2, details, conventionalPct, hasDecisionLog };
}
// --- Participant Intake ----------------------------------------------------------

function checkIntake(): {
  status: 'complete' | 'consent_pending' | 'missing';
  consented: boolean;
  q1: string | null;
  q2: string | null;
  q3: string | null;
} {
  const intakePath = join(ROOT, 'INTAKE.md');
  if (!existsSync(intakePath)) return { status: 'missing', consented: false, q1: null, q2: null, q3: null };

  const content = readFileSync(intakePath, 'utf8');
  const consented = /- \[x\] I consent/i.test(content);

  const sections = content.split(/\*\*Q\d/);
  const extractAnswer = (section: string): string | null => {
    const m = section.match(/Answer:\s*([^\n]+)/);
    const val = m?.[1]?.replace(/<!--.*?-->/g, '').trim() ?? null;
    return val && val.length > 0 ? val : null;
  };

  const q1 = sections[1] ? extractAnswer(sections[1]) : null;
  const q2 = sections[2] ? extractAnswer(sections[2]) : null;
  const q3 = sections[3] ? extractAnswer(sections[3]) : null;
  const status = consented && q1 && q2 && q3 ? 'complete' : 'consent_pending';
  return { status, consented, q1, q2, q3 };
}

// ─── External Metrics ────────────────────────────────────────────────────────

function externalMetrics(): Record<string, unknown> {
  // TypeScript errors
  const tscOutput = run('npx tsc --noEmit 2>&1');
  const tscErrors = (tscOutput.match(/error TS/g) ?? []).length;

  // ESLint
  let eslintErrors = 0;
  let eslintWarnings = 0;
  const eslintJson = run(`npx eslint "src/**/*.ts" --format json`);
  try {
    const eslintReport = JSON.parse(eslintJson);
    for (const file of eslintReport) {
      eslintErrors += file.errorCount ?? 0;
      eslintWarnings += file.warningCount ?? 0;
    }
  } catch { /* not installed or no files */ }

  // npm audit
  let auditCritical = 0;
  let auditHigh = 0;
  const auditJson = run('npm audit --json');
  try {
    const audit = JSON.parse(auditJson);
    auditCritical = audit.metadata?.vulnerabilities?.critical ?? 0;
    auditHigh = audit.metadata?.vulnerabilities?.high ?? 0;
  } catch { /* ignore */ }

  // Duplicate code (Bounded proxy) — using jscpd if available
  let duplicatePct: number | null = null;
  const jscpdOut = run('npx jscpd src --min-lines 5 --reporters json --output .score-jscpd 2>/dev/null');
  const jscpdReport = join(ROOT, '.score-jscpd', 'jscpd-report.json');
  if (existsSync(jscpdReport)) {
    try {
      const jscpd = JSON.parse(readFileSync(jscpdReport, 'utf8'));
      duplicatePct = jscpd.statistics?.total?.percentage ?? null;
    } catch { /* ignore */ }
  }

  // Cyclomatic complexity — count branches as a proxy
  const srcFiles = collectFiles(SRC, f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  let branchCount = 0;
  for (const file of srcFiles) {
    const content = readFileSync(file, 'utf8');
    branchCount += (content.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcase\b|\?\?|\?\./g) ?? []).length;
  }

  return { tscErrors, eslintErrors, eslintWarnings, auditCritical, auditHigh, duplicatePct, branchCount };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('Running GS scoring...\n');

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const commit = run('git rev-parse --short HEAD');
  const branch = run('git branch --show-current');

  const selfDescribing = checkSelfDescribing();
  const bounded = checkBounded();
  const verifiable = checkVerifiable();
  const defended = checkDefended();
  const auditable = checkAuditable();
  const intake = checkIntake();

  const automatedScore = selfDescribing.score + bounded.score + verifiable.score + defended.score + auditable.score;
  const automatedMax = selfDescribing.max + bounded.max + verifiable.max + defended.max + auditable.max;

  const composable = { score: null as null, max: 3, details: 'Pending — scored via hidden live test after submission (clean architecture, DI, no unexpected coupling)' };
  const executable = { score: null as null, max: 3, details: 'Pending — scored via hidden live test after submission (server starts, API behavioral contracts pass)' };

  const metrics = externalMetrics();
  metrics.testCoverage = verifiable.coveragePct;
  metrics.testCount = verifiable.testsPassed + verifiable.testsFailed;
  metrics.depCount = Object.keys((pkg.dependencies ?? {}) as Record<string, string>).length;

  const result = {
    meta: {
      repo: pkg.name,
      commit,
      branch,
      timestamp: new Date().toISOString(),
      scorer_version: '1.0.0',
    },
    gs_scores: {
      self_describing: selfDescribing,
      bounded: bounded,
      verifiable: verifiable,
      defended: defended,
      auditable: auditable,
      composable,
      executable,
      total_automated: { score: automatedScore, max: automatedMax },
      total_with_live_tests: { score: null, max: automatedMax + 6, details: 'Available after hidden live tests (Composable + Executable)' },
    },
    intake: intake,
    external_metrics: metrics,
  };

  writeFileSync(join(ROOT, 'score.json'), JSON.stringify(result, null, 2));

  // Print summary
  console.log('── GS Score ─────────────────────────────');
  console.log(`Self-describing  ${selfDescribing.score}/${selfDescribing.max}  ${selfDescribing.details}`);
  console.log(`Bounded          ${bounded.score}/${bounded.max}  ${bounded.details}`);
  console.log(`Verifiable       ${verifiable.score}/${verifiable.max}  ${verifiable.details}`);
  console.log(`Defended         ${defended.score}/${defended.max}  ${defended.details}`);
  console.log(`Auditable        ${auditable.score}/${auditable.max}  ${auditable.details}`);
  console.log(`Composable       ?/3   Pending live test (clean arch / DI)`);
  console.log(`Executable       ?/3   Pending live test (API behavioral contracts)`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Automated total  ${automatedScore}/${automatedMax}  (14 total with live tests)`);
  console.log('\nscore.json written.\n');
  // Intake gate — loud CI warning if consent not recorded
  if (intake.status !== 'complete') {
    const msg = intake.status === 'missing'
      ? 'INTAKE.md not found — complete and commit it before your final push.'
      : 'INTAKE incomplete — tick the consent checkbox and answer all three questions.';
    console.error('\n' + '═'.repeat(50));
    console.error('⚠️  CONSENT GATE: ' + msg);
    console.error('Your score is recorded but this session may be EXCLUDED from analysis.');
    console.error('═'.repeat(50) + '\n');
  }
}

main();

