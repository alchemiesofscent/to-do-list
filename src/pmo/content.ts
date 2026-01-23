import { parseYamlFrontmatter } from './frontmatter.ts';
import { parsePmoConfigYaml, type PmoConfig } from './config.ts';

export type PmoIndexFile = { path: string; hash: string; bytes: number };
export type PmoIndex = { generated_at_utc: string; source_root: string; files: PmoIndexFile[] };

export type ProjectsIndex = {
  generated_at_utc: string;
  source_root: string;
  projects: Array<{ project_slug: string; files: PmoIndexFile[] }>;
};

export type ProjectDoc = {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
  raw: string;
};

export type ProjectBundle = {
  project_slug: string;
  docs: Record<'00_brief.md' | '01_plan.md' | '02_status.md' | '03_actions.md' | '04_assets.md', ProjectDoc>;
};

const cache = new Map<string, string>();

function baseUrl(): string {
  return import.meta.env.BASE_URL || '/';
}

async function fetchText(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  cache.set(url, text);
  return text;
}

export async function loadPmoIndex(): Promise<PmoIndex> {
  const url = `${baseUrl()}pmo/index.json`;
  return JSON.parse(await fetchText(url)) as PmoIndex;
}

export async function loadProjectsIndex(): Promise<ProjectsIndex> {
  const url = `${baseUrl()}projects/index.json`;
  return JSON.parse(await fetchText(url)) as ProjectsIndex;
}

export async function loadPmoConfig(): Promise<PmoConfig> {
  const text = await fetchText(`${baseUrl()}pmo/config.yml`);
  return parsePmoConfigYaml(text);
}

export async function loadProjectBundle(projectSlug: string): Promise<ProjectBundle> {
  const files = ['00_brief.md', '01_plan.md', '02_status.md', '03_actions.md', '04_assets.md'] as const;
  const docsEntries = await Promise.all(
    files.map(async (file) => {
      const url = `${baseUrl()}projects/${projectSlug}/${file}`;
      const raw = await fetchText(url);
      const { frontmatter, body } = parseYamlFrontmatter(raw);
      return [file, { path: `projects/${projectSlug}/${file}`, frontmatter, body, raw }] as const;
    })
  );

  return {
    project_slug: projectSlug,
    docs: Object.fromEntries(docsEntries) as ProjectBundle['docs'],
  };
}

