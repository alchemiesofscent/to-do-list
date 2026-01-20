import type { AcademicTask, Priority, Status, TaskType } from './types.ts';

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
  if (cleaned === 'article') return 'Article';
  if (cleaned === 'book') return 'Book';
  if (cleaned === 'translation' || cleaned === 'translations') return 'Translation';
  if (cleaned === 'edited volume' || cleaned === 'edited volumes') return 'Edited Volume';
  if (cleaned === 'book review' || cleaned === 'book reviews') return 'Book Review';
  if (cleaned === 'digital humanities') return 'Digital Humanities';
  if (cleaned === 'grant' || cleaned === 'grants') return 'Grant';
  if (cleaned === 'book proposal') return 'Book Proposal';

  const sectionLc = section.toLowerCase();
  if (sectionLc.includes('immediate priorities')) return 'Article';
  if (sectionLc.includes('book projects')) return 'Book';
  if (sectionLc.includes('articles & papers')) return 'Article';
  if (sectionLc.includes('translations')) return 'Translation';
  if (sectionLc.includes('digital humanities')) return 'Digital Humanities';
  if (sectionLc.includes('grants')) return 'Grant';
  if (sectionLc.includes('completed')) {
    const titleLc = title.toLowerCase();
    if (titleLc.includes('award')) return 'Grant';
    return 'Article';
  }
  return 'Article';
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

export function parseProjectsMarkdownToTasks(markdown: string): {
  tasks: AcademicTask[];
  revision: string;
} {
  const revision = hashStringFNV1a(markdown);

  let currentSection = '';
  let currentSubsection = '';
  const tasks: AcademicTask[] = [];

  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

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
    const bulletMatch = !checkboxMatch ? line.match(/^- (.*)$/) : null;
    if (!checkboxMatch && !bulletMatch) continue;

    const isChecked = checkboxMatch ? checkboxMatch[1].toLowerCase() === 'x' : false;
    let body = checkboxMatch ? checkboxMatch[2] : (bulletMatch ? bulletMatch[1] : '');
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

    const extraLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (!next) break;
      if (/^##\s+/.test(next) || /^###\s+/.test(next) || /^- /.test(next)) break;
      if (/^\s+-\s+/.test(next)) {
        extraLines.push(stripMarkdownInline(next.replace(/^\s+-\s+/, '')));
        i = j;
        continue;
      }
      if (/^\s{2,}\S/.test(next)) {
        extraLines.push(stripMarkdownInline(next.trim()));
        i = j;
        continue;
      }
      break;
    }

    const type = normalizeType(explicitType, currentSection, title);
    const combinedTextForDerivation = [notes, ...extraLines].filter(Boolean).join(' • ');
    const status = deriveStatus(combinedTextForDerivation, isChecked, currentSection);
    const priority = derivePriority(combinedTextForDerivation, currentSection, status);
    const deadlineNote = extractDeadlineNote(combinedTextForDerivation);
    const coAuthors = extractCoAuthors(combinedTextForDerivation);

    const descriptionParts = [
      notes ? stripMarkdownInline(notes) : '',
      ...extraLines,
    ].filter(Boolean);

    const description = descriptionParts.join('\n');

    tasks.push({
      id: stableTaskId(type, title),
      title,
      type,
      priority,
      status,
      description,
      coAuthors,
      deadlineNote,
      section: currentSection || undefined,
      subsection: currentSubsection || undefined,
      source: 'projects.md',
    });
  }

  return { tasks, revision };
}
