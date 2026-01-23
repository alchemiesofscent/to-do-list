import fs from 'node:fs';
import path from 'node:path';

import { parseProjectsMarkdownToTasks } from '../src/projectsParser.ts';
import { parsePmoConfigYaml } from '../src/pmo/config.ts';
import { parseYamlFrontmatter } from '../src/pmo/frontmatter.ts';
import { slugFromProjectId } from '../src/pmo/slug.ts';
import { parseFirstTableAfterHeading } from '../src/pmo/markdownTable.ts';

type Severity = 'error' | 'warning';
type Finding = { severity: Severity; message: string };

function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(fm: Record<string, unknown>, key: string): string | null {
  const v = fm[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function requiredSchema(fm: Record<string, unknown>, expected: string): Finding[] {
  const schema = requiredString(fm, 'schema');
  if (schema !== expected) {
    return [{ severity: 'error', message: `Expected schema "${expected}", got "${schema ?? 'missing'}"` }];
  }
  return [];
}

function validatePmoConfig(filePath: string): { config: ReturnType<typeof parsePmoConfigYaml> | null; findings: Finding[] } {
  const findings: Finding[] = [];
  try {
    const cfg = parsePmoConfigYaml(readText(filePath));
    if (cfg.chunks.length !== 6) findings.push({ severity: 'error', message: `config.yml must define exactly 6 chunks (got ${cfg.chunks.length})` });
    if (!cfg.timezone) findings.push({ severity: 'error', message: 'config.yml missing timezone' });
    if (!cfg.defaults.max_tasks_per_day) findings.push({ severity: 'error', message: 'config.yml missing defaults.max_tasks_per_day' });
    if (!cfg.weekly_constraints.monday_meeting_block?.label) findings.push({ severity: 'warning', message: 'config.yml missing monday_meeting_block label' });
    return { config: cfg, findings };
  } catch (e: unknown) {
    findings.push({ severity: 'error', message: e instanceof Error ? e.message : 'Failed to parse config.yml' });
    return { config: null, findings };
  }
}

function validateMarkdownTable(params: {
  filePath: string;
  heading: string;
  requiredColumns: string[];
}): { headers: string[]; rows: string[][]; findings: Finding[] } {
  const raw = readText(params.filePath);
  const { body } = parseYamlFrontmatter(raw);
  const table = parseFirstTableAfterHeading({ markdownBody: body, heading: params.heading });
  if (!table) {
    return { headers: [], rows: [], findings: [{ severity: 'error', message: `Missing table under "## ${params.heading}" in ${params.filePath}` }] };
  }

  const headers = table.headers.map((h) => h.trim());
  const headerSet = new Set(headers.map((h) => h.toLowerCase().replace(/\s+/g, '_')));
  const missing = params.requiredColumns.filter((c) => !headerSet.has(c));
  const findings: Finding[] = [];
  if (missing.length) findings.push({ severity: 'error', message: `Missing required columns in ${params.filePath}: ${missing.join(', ')}` });
  return { headers, rows: table.rows, findings };
}

function validateProjectsRoot(params: {
  projectsRoot: string;
  seedTaskIds: Set<string>;
  maxOpenActions: number;
  staleDays: number;
  todayUtc: string;
}): Finding[] {
  const findings: Finding[] = [];
  const dirs = fs
    .readdirSync(params.projectsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  for (const slugDir of dirs) {
    const folder = path.join(params.projectsRoot, slugDir);
    const requiredFiles = ['00_brief.md', '01_plan.md', '02_status.md', '03_actions.md', '04_assets.md'];
    for (const f of requiredFiles) {
      const p = path.join(folder, f);
      if (!fs.existsSync(p)) findings.push({ severity: 'error', message: `Missing ${p}` });
    }
    const briefPath = path.join(folder, '00_brief.md');
    if (!fs.existsSync(briefPath)) continue;

    const brief = parseYamlFrontmatter(readText(briefPath));
    findings.push(...requiredSchema(brief.frontmatter, 'scholars-opus-project-brief@1').map((f) => ({ ...f, message: `${briefPath}: ${f.message}` })));
    const projectId = requiredString(brief.frontmatter, 'project_id');
    const projectSlug = requiredString(brief.frontmatter, 'project_slug');
    if (!projectId) findings.push({ severity: 'error', message: `${briefPath}: missing project_id` });
    if (!projectSlug) findings.push({ severity: 'error', message: `${briefPath}: missing project_slug` });

    if (projectId && !params.seedTaskIds.has(projectId)) {
      findings.push({ severity: 'warning', message: `${briefPath}: project_id "${projectId}" is not present in data/projects.md` });
    }

    if (projectId) {
      const expectedSlug = slugFromProjectId(projectId);
      if (slugDir !== expectedSlug) findings.push({ severity: 'error', message: `${folder}: folder slug "${slugDir}" does not match derived slug "${expectedSlug}" from project_id` });
      if (projectSlug && projectSlug !== expectedSlug) findings.push({ severity: 'error', message: `${briefPath}: project_slug "${projectSlug}" does not match derived slug "${expectedSlug}" from project_id` });
    }

    const actionsPath = path.join(folder, '03_actions.md');
    if (!fs.existsSync(actionsPath)) continue;
    const actionsRaw = readText(actionsPath);
    const actionsFm = parseYamlFrontmatter(actionsRaw);
    findings.push(...requiredSchema(actionsFm.frontmatter, 'scholars-opus-project-actions@1').map((f) => ({ ...f, message: `${actionsPath}: ${f.message}` })));

    const requiredCols = [
      'action_id',
      'action',
      'kind',
      'effort',
      'depends_on',
      'blocked',
      'owner',
      'priority_hint',
      'due_date',
      'last_touched',
      'status',
      'notes',
    ];
    const tableRes = validateMarkdownTable({ filePath: actionsPath, heading: 'Next actions', requiredColumns: requiredCols });
    findings.push(...tableRes.findings);
    if (tableRes.rows.length === 0) continue;

    const headersNorm = tableRes.headers.map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const idx = Object.fromEntries(headersNorm.map((h, i) => [h, i])) as Record<string, number>;

    const seenActionIds = new Set<string>();
    let openCount = 0;
    const stale: string[] = [];

    const threshold = new Date(`${params.todayUtc}T00:00:00.000Z`);
    threshold.setUTCDate(threshold.getUTCDate() - params.staleDays);
    const thresholdKey = utcDateKey(threshold);

    for (const row of tableRes.rows) {
      const actionId = row[idx.action_id] ?? '';
      if (!actionId.trim()) continue;
      if (seenActionIds.has(actionId)) findings.push({ severity: 'error', message: `${actionsPath}: duplicate action_id "${actionId}"` });
      seenActionIds.add(actionId);

      const status = (row[idx.status] ?? '').trim();
      if (!['open', 'done', 'dropped'].includes(status)) {
        findings.push({ severity: 'error', message: `${actionsPath}: invalid status "${status}" for action_id "${actionId}"` });
      }
      if (status === 'open') openCount += 1;

      const blocked = (row[idx.blocked] ?? '').trim();
      const lastTouched = (row[idx.last_touched] ?? '').trim();
      if (status === 'open' && blocked === 'no' && /^\d{4}-\d{2}-\d{2}$/.test(lastTouched)) {
        if (lastTouched < thresholdKey) stale.push(actionId);
      }
    }

    if (openCount > params.maxOpenActions) {
      findings.push({ severity: 'error', message: `${actionsPath}: too many open actions (${openCount}); max is ${params.maxOpenActions}` });
    }
    if (stale.length > 0) {
      findings.push({ severity: 'warning', message: `${actionsPath}: stale open actions (last_touched older than ${params.staleDays} days): ${stale.join(', ')}` });
    }
  }

  return findings;
}

function main() {
  const repoRoot = process.cwd();
  const configPath = path.join(repoRoot, 'pmo', 'config.yml');
  const pmoFiles = ['inbox.md', 'delegation_outbox.md', 'decision_log.md'].map((f) => path.join(repoRoot, 'pmo', f));
  const projectsRoot = path.join(repoRoot, 'projects');

  const findings: Finding[] = [];

  // Seed tasks (for project_id existence checks)
  const projectsMd = path.join(repoRoot, 'data', 'projects.md');
  const markdown = readText(projectsMd);
  const { tasks } = parseProjectsMarkdownToTasks(markdown);
  const seedIds = new Set(tasks.map((t) => t.id));

  // Config
  if (!fs.existsSync(configPath)) {
    findings.push({ severity: 'error', message: `Missing ${configPath}` });
  }
  const cfgRes = validatePmoConfig(configPath);
  findings.push(...cfgRes.findings);

  // PMO markdown schemas
  for (const file of pmoFiles) {
    if (!fs.existsSync(file)) {
      findings.push({ severity: 'error', message: `Missing ${file}` });
      continue;
    }
    const { frontmatter } = parseYamlFrontmatter(readText(file));
    if (!isRecord(frontmatter)) {
      findings.push({ severity: 'error', message: `${file}: invalid frontmatter` });
      continue;
    }
    const schema = requiredString(frontmatter, 'schema');
    if (!schema) findings.push({ severity: 'error', message: `${file}: missing schema` });
  }

  // Projects
  if (!cfgRes.config) {
    findings.push({ severity: 'error', message: 'Cannot validate projects: config.yml invalid' });
  } else {
    findings.push(
      ...validateProjectsRoot({
        projectsRoot,
        seedTaskIds: seedIds,
        maxOpenActions: cfgRes.config.defaults.max_active_actions_per_project,
        staleDays: cfgRes.config.defaults.stale_days,
        todayUtc: utcDateKey(),
      })
    );
  }

  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  for (const w of warnings) console.warn(`WARN: ${w.message}`);
  for (const e of errors) console.error(`ERROR: ${e.message}`);

  if (errors.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PMO validation passed (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`);
}

main();

