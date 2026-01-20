import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseProjectsMarkdownToTasks } from '../src/projectsParser.ts';

describe('projects parser', () => {
  it('parses data/projects.md into tasks with stable, unique ids', () => {
    const markdown = fs.readFileSync(path.resolve('data/projects.md'), 'utf8');
    const { tasks, revision } = parseProjectsMarkdownToTasks(markdown);

    expect(tasks.length).toBeGreaterThan(0);
    expect(revision).toMatch(/^[0-9a-f]{8}$/);

    const ids = new Set(tasks.map((t) => t.id));
    expect(ids.size).toBe(tasks.length);
  });

  it('classifies grants into type Grant', () => {
    const markdown = fs.readFileSync(path.resolve('data/projects.md'), 'utf8');
    const { tasks } = parseProjectsMarkdownToTasks(markdown);

    const grants = tasks.filter((t) => t.section?.toLowerCase().includes('grants'));
    expect(grants.length).toBeGreaterThan(0);
    expect(grants.every((t) => t.type === 'Grant')).toBe(true);
  });
});

