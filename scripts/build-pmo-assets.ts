import fs from 'node:fs';
import path from 'node:path';

type IndexFile = {
  path: string; // path relative to the public root, e.g. "pmo/inbox.md"
  hash: string;
  bytes: number;
};

type PmoIndex = {
  generated_at_utc: string;
  source_root: string;
  files: IndexFile[];
};

type ProjectIndexEntry = {
  project_slug: string;
  files: IndexFile[];
};

type ProjectsIndex = {
  generated_at_utc: string;
  source_root: string;
  projects: ProjectIndexEntry[];
};

function hashStringFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function ensureEmptyDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function listFilesRecursively(root: string): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursively(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function copyFileToPublic(params: { srcPath: string; srcRoot: string; publicRoot: string; publicSubdir: string }): IndexFile {
  const { srcPath, srcRoot, publicRoot, publicSubdir } = params;
  const rel = path.relative(srcRoot, srcPath).replaceAll(path.sep, '/');
  const dest = path.join(publicRoot, publicSubdir, rel);

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcPath, dest);

  const buf = fs.readFileSync(srcPath);
  const content = buf.toString('utf8');
  return {
    path: `${publicSubdir}/${rel}`,
    hash: hashStringFNV1a(content),
    bytes: buf.byteLength,
  };
}

function buildPmoAssets() {
  const repoRoot = process.cwd();
  const publicRoot = path.join(repoRoot, 'public');

  const pmoSrc = path.join(repoRoot, 'pmo');
  const projectsSrc = path.join(repoRoot, 'projects');

  const pmoOut = path.join(publicRoot, 'pmo');
  const projectsOut = path.join(publicRoot, 'projects');

  if (!fs.existsSync(pmoSrc)) {
    throw new Error('Missing /pmo source folder');
  }
  if (!fs.existsSync(projectsSrc)) {
    throw new Error('Missing /projects source folder');
  }

  ensureEmptyDir(pmoOut);
  ensureEmptyDir(projectsOut);

  const pmoFiles = listFilesRecursively(pmoSrc).sort((a, b) => a.localeCompare(b));
  const pmoIndex: PmoIndex = {
    generated_at_utc: new Date().toISOString(),
    source_root: 'pmo',
    files: pmoFiles.map((file) => copyFileToPublic({ srcPath: file, srcRoot: pmoSrc, publicRoot, publicSubdir: 'pmo' })),
  };
  fs.writeFileSync(path.join(pmoOut, 'index.json'), JSON.stringify(pmoIndex, null, 2) + '\n', 'utf8');

  const projectSlugs = fs
    .readdirSync(projectsSrc, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  const projectsIndex: ProjectsIndex = {
    generated_at_utc: new Date().toISOString(),
    source_root: 'projects',
    projects: projectSlugs.map((slug) => {
      const srcDir = path.join(projectsSrc, slug);
      const files = listFilesRecursively(srcDir).sort((a, b) => a.localeCompare(b));
      return {
        project_slug: slug,
        files: files.map((file) =>
          copyFileToPublic({
            srcPath: file,
            srcRoot: srcDir,
            publicRoot,
            publicSubdir: `projects/${slug}`,
          })
        ),
      };
    }),
  };
  fs.writeFileSync(path.join(projectsOut, 'index.json'), JSON.stringify(projectsIndex, null, 2) + '\n', 'utf8');

  console.log(`PMO assets packaged: ${pmoIndex.files.length} /pmo files, ${projectsIndex.projects.length} projects`);
}

buildPmoAssets();

