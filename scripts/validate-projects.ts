import fs from 'node:fs';
import path from 'node:path';

import { parseProjectsMarkdownToTasks } from '../src/projectsParser.ts';

const projectsPath = path.resolve('data/projects.md');
const markdown = fs.readFileSync(projectsPath, 'utf8');

const { tasks } = parseProjectsMarkdownToTasks(markdown);
if (tasks.length === 0) {
  throw new Error(`No tasks parsed from ${projectsPath}`);
}

const seenIds = new Set<string>();
for (const task of tasks) {
  if (seenIds.has(task.id)) {
    throw new Error(`Duplicate task id: ${task.id}`);
  }
  seenIds.add(task.id);

  if (!task.title.trim()) throw new Error(`Empty title for task id: ${task.id}`);
  if (!task.type) throw new Error(`Missing type for task id: ${task.id}`);
  if (!task.priority) throw new Error(`Missing priority for task id: ${task.id}`);
  if (!task.status) throw new Error(`Missing status for task id: ${task.id}`);
}

console.log(`Validated ${tasks.length} tasks from ${projectsPath}`);

