import type { AcademicTask, Domain, Priority, Status, TaskType } from './types.ts';

export function hashStringFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stripMarkdownInline(input: string): string {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableTaskId(type: TaskType, title: string): string {
  return `${type}_${hashStringFNV1a(`${type}|${title}`)}`;
}

function normalizeDomain(raw: string | undefined): Domain | undefined {
  const cleaned = (raw ?? '').trim().toLowerCase();
  if (!cleaned) return undefined;
  if (cleaned === 'writing') return 'Writing';
  if (cleaned === 'experiments' || cleaned === 'experiment') return 'Experiments';
  if (cleaned === 'dh' || cleaned === 'digital humanities') return 'DH';
  if (cleaned === 'grants' || cleaned === 'grant') return 'Grants';
  if (cleaned === 'admin' || cleaned === 'administration') return 'Admin';
  return undefined;
}

function isKnownTaskTypeLabel(label: string): boolean {
  const lc = label.trim().toLowerCase();
  return (
    lc === 'article' ||
    lc === 'book' ||
    lc === 'translation' ||
    lc === 'edited volume' ||
    lc === 'book review' ||
    lc === 'digital humanities' ||
    lc === 'grant' ||
    lc === 'book proposal'
  );
}

function normalizeType(rawType: string | undefined, section: string, title: string): TaskType {
  const cleaned = (rawType ?? '').trim().toLowerCase();
  // Writing types
  if (cleaned === 'article') return 'Article';
  if (cleaned === 'book') return 'Book';
  if (cleaned === 'translation' || cleaned === 'translations') return 'Translation';
  if (cleaned === 'edited volume' || cleaned === 'edited volumes') return 'Edited Volume';
  if (cleaned === 'book review' || cleaned === 'book reviews') return 'Book Review';
  if (cleaned === 'book proposal') return 'Book Proposal';
  // DH types
  if (cleaned === 'digital humanities' || cleaned === 'website') return 'Website';
  if (cleaned === 'database' || cleaned === 'db') return 'Database';
  if (cleaned === 'other dh') return 'Other DH';
  // Experiment types
  if (cleaned === 'perfume' || cleaned === 'experiment') return 'Perfume';
  if (cleaned === 'other experiment') return 'Other Experiment';
  // Grant types
  if (cleaned === 'management' || cleaned === 'grant management') return 'Management';
  if (cleaned === 'application' || cleaned === 'grant application') return 'Application';
  if (cleaned === 'sourcing' || cleaned === 'grant sourcing' || cleaned === 'grant' || cleaned === 'grants') return 'Sourcing';
  // Admin types
  if (cleaned === 'gacr') return 'GACR';
  if (cleaned === 'flu') return 'FLU';
  if (cleaned === 'iocb') return 'IOCB';
  if (cleaned === 'internal') return 'Internal';
  if (cleaned === 'admin' || cleaned === 'admin task' || cleaned === 'other admin') return 'Other Admin';

  const sectionLc = section.toLowerCase();
  if (sectionLc.includes('immediate priorities')) return 'Article';
  if (sectionLc.includes('book projects')) return 'Book';
  if (sectionLc.includes('articles & papers')) return 'Article';
  if (sectionLc.includes('translations')) return 'Translation';
  if (sectionLc.includes('digital humanities')) return 'Website';
  if (sectionLc.includes('grants')) return 'Sourcing';
  if (sectionLc.includes('completed')) {
    const titleLc = title.toLowerCase();
    if (titleLc.includes('award')) return 'Sourcing';
    return 'Article';
  }
  return 'Article';
}

function normalizeStatus(raw: string | undefined): Status | undefined {
  const cleaned = (raw ?? '').trim().toLowerCase();
  if (!cleaned) return undefined;
  if (cleaned === 'published') return 'Published';
  if (cleaned === 'complete') return 'Complete';
  if (cleaned === 'revision' || cleaned === 'in revision') return 'Revision';
  if (cleaned === 'draft' || cleaned === 'drafting') return 'Draft';
  if (cleaned === 'early stage' || cleaned === 'early') return 'Early Stage';
  if (cleaned === 'experimental' || cleaned === 'experiments') return 'Experimental';
  if (cleaned === 'needs update' || cleaned === 'needs updating' || cleaned === 'update') return 'Needs Update';
  if (cleaned === 'rejected') return 'Rejected';
  if (cleaned === 'upcoming' || cleaned === 'planned') return 'Upcoming';
  return undefined;
}

function normalizePriority(raw: string | undefined): Priority | undefined {
  const cleaned = (raw ?? '').trim().toLowerCase();
  if (!cleaned) return undefined;
  if (cleaned === 'high') return 'High';
  if (cleaned === 'medium') return 'Medium';
  if (cleaned === 'low') return 'Low';
  if (cleaned === 'aspirational') return 'Aspirational';
  return undefined;
}

function deriveStatus(text: string, isChecked: boolean, section: string): Status {
  if (isChecked) return 'Complete';
  const lc = text.toLowerCase();
  if (lc.includes('published')) return 'Published';
  if (lc.includes('rejected') || lc.includes('rejection')) return 'Rejected';
  if (lc.includes('final revision') || lc.includes('final revisions')) return 'Revision';
  if (lc.includes('in revision') || lc.includes('needs revision') || lc.includes('needs work')) return 'Revision';
  if (lc.includes('needs significant updating') || lc.includes('needs updating') || lc.includes('needs update') || lc.includes('update ')) {
    return 'Needs Update';
  }
  if (lc.includes('drafting') || lc.includes('in draft') || lc.includes('draft')) return 'Draft';
  if (lc.includes('experimental')) return 'Experimental';
  if (lc.includes('early draft') || lc.includes('early stage') || lc.includes('concept')) return 'Early Stage';
  if (lc.includes('planned') || lc.includes('upcoming') || lc.includes('target:')) return 'Upcoming';
  if (section.toLowerCase().includes('completed')) return 'Published';
  return 'Early Stage';
}

function derivePriority(text: string, section: string, status: Status): Priority {
  if (status === 'Published' || status === 'Complete') return 'Low';
  const lc = text.toLowerCase();
  if (section.toLowerCase().includes('immediate priorities') || lc.includes('deadline:')) return 'High';
  if (lc.includes('aspirational') || lc.includes('planned for 2027') || lc.includes('target: 2027')) return 'Aspirational';
  if (lc.includes('asap')) return 'High';
  return 'Medium';
}

function extractDeadlineNote(text: string): string | undefined {
  const match = text.match(/deadline:\s*([^.;\n]+)\b/i);
  if (!match) return undefined;
  return stripMarkdownInline(match[1]);
}

function extractCoAuthors(text: string): string | undefined {
  const match = text.match(/\bwith\s+([^.;()]+)\b/i);
  if (!match) return undefined;
  const name = stripMarkdownInline(match[1]);
  return name ? name : undefined;
}

function splitTitleAndNotes(line: string): { title: string; notes: string } {
  const parenMatch = line.match(/\(([^)]+)\)\.?\s*$/);
  if (!parenMatch) return { title: line.trim(), notes: '' };
  const notes = parenMatch[1].trim();
  const title = line.slice(0, parenMatch.index).trim().replace(/[.;:]\s*$/, '');
  return { title, notes };
}

function parseBool(raw: string | undefined): boolean | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'true' || cleaned === 'yes' || cleaned === 'y' || cleaned === '1') return true;
  if (cleaned === 'false' || cleaned === 'no' || cleaned === 'n' || cleaned === '0') return false;
  return undefined;
}

function parseIndentedMetadataAndNotes(lines: string[], startIndex: number): {
  meta: Record<string, string>;
  notes: string[];
  endIndex: number;
} {
  const meta: Record<string, string> = {};
  const notes: string[] = [];

  const recognizedKeys = new Set([
    'id',
    'domain',
    'type',
    'status',
    'priority',
    'deadline',
    'deadlinenote',
    'coauthors',
    'favorite',
    'isfavorite',
    'description',
  ]);

  let i = startIndex;
  for (; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) break;
    if (/^##\s+/.test(rawLine) || /^###\s+/.test(rawLine) || /^- \[/.test(rawLine) || /^- /.test(rawLine)) break;
    if (!rawLine.trim()) continue;

    const nestedBulletMatch = rawLine.match(/^\s+-\s+(.*)$/);
    if (nestedBulletMatch) {
      const content = nestedBulletMatch[1].trim();
      const kvMatch = content.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (kvMatch) {
        const keyRaw = kvMatch[1];
        const key = keyRaw.replace(/[_-]/g, '').toLowerCase();
        const valueRaw = kvMatch[2] ?? '';
        if (recognizedKeys.has(key)) {
          const value = valueRaw.trim();
          if (key === 'description' && value === '|') {
            const block: string[] = [];
            for (let j = i + 1; j < lines.length; j++) {
              const next = lines[j];
              if (!next.trim()) {
                block.push('');
                i = j;
                continue;
              }
              if (/^##\s+/.test(next) || /^###\s+/.test(next) || /^- \[/.test(next) || /^- /.test(next) || /^\s+-\s+/.test(next)) break;
              if (/^\s{4,}\S/.test(next) || /^\s{4,}$/.test(next)) {
                block.push(next.replace(/^\s{4}/, '').trimEnd());
                i = j;
                continue;
              }
              break;
            }
            meta[key] = block.join('\n').trim();
            continue;
          }

          meta[key] = stripMarkdownInline(value);
          continue;
        }
      }

      notes.push(stripMarkdownInline(content));
      continue;
    }

    if (/^\s+/.test(rawLine)) {
      notes.push(stripMarkdownInline(rawLine.trim()));
    }
  }

  return { meta, notes, endIndex: i - 1 };
}

export function parseProjectsMarkdownToTasks(markdown: string): {
  tasks: AcademicTask[];
  revision: string;
} {
  const revision = hashStringFNV1a(markdown);

  let currentSection = '';
  let currentSubsection = '';
  const tasks: AcademicTask[] = [];
  let inCodeFence = false;

  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    if (line.trimStart().startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const sectionMatch = line.match(/^##\s+(.+)\s*$/);
    if (sectionMatch) {
      currentSection = stripMarkdownInline(sectionMatch[1]);
      currentSubsection = '';
      continue;
    }

    const subsectionMatch = line.match(/^###\s+(.+)\s*$/);
    if (subsectionMatch) {
      currentSubsection = stripMarkdownInline(subsectionMatch[1]);
      continue;
    }

    const checkboxMatch = line.match(/^- \[( |x|X)\]\s+(.*)$/);
    if (!checkboxMatch) continue;

    const isChecked = checkboxMatch[1].toLowerCase() === 'x';
    let body = checkboxMatch[2];
    body = body.trim();

    if (!body) continue;

    let explicitType: string | undefined;
    const explicitTypeMatch = body.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (explicitTypeMatch) {
      const maybeType = stripMarkdownInline(explicitTypeMatch[1]);
      if (isKnownTaskTypeLabel(maybeType)) {
        explicitType = maybeType;
        body = explicitTypeMatch[2].trim();
      }
    }

    const boldTitleMatch = body.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
    let titlePart = body;
    let remainder = '';
    if (boldTitleMatch) {
      titlePart = boldTitleMatch[1];
      remainder = boldTitleMatch[2] ?? '';
    }

    const { title: rawTitle, notes } = splitTitleAndNotes(`${titlePart} ${remainder}`.trim());
    const title = stripMarkdownInline(rawTitle);
    if (!title) continue;

    const { meta, notes: indentedNotes, endIndex } = parseIndentedMetadataAndNotes(lines, i + 1);
    if (endIndex > i) i = endIndex;

    const domain = normalizeDomain(meta.domain);
    const type = normalizeType(meta.type || explicitType, currentSection, title);

    const combinedTextForDerivation = [notes, ...indentedNotes].filter(Boolean).join(' • ');
    const derivedStatus = deriveStatus(combinedTextForDerivation, isChecked, currentSection);
    const status = normalizeStatus(meta.status) ?? derivedStatus;
    const priority = normalizePriority(meta.priority) ?? derivePriority(combinedTextForDerivation, currentSection, status);

    const deadline = meta.deadline || undefined;
    const deadlineNote = meta.deadlinenote || extractDeadlineNote(combinedTextForDerivation);
    const coAuthors = meta.coauthors || extractCoAuthors(combinedTextForDerivation);
    const isFavorite = parseBool(meta.isfavorite ?? meta.favorite);

    const description =
      meta.description ||
      [notes ? stripMarkdownInline(notes) : '', ...indentedNotes].filter(Boolean).join('\n');

    tasks.push({
      id: meta.id || stableTaskId(type, title),
      title,
      domain,
      type,
      priority,
      status,
      description,
      coAuthors,
      deadline,
      deadlineNote,
      isFavorite,
      section: currentSection || undefined,
      subsection: currentSubsection || undefined,
      source: 'data/projects.md',
    });
  }

  return { tasks, revision };
}
