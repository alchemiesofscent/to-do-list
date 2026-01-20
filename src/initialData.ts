
import { parseProjectsMarkdownToTasks } from './projectsParser.ts';
import projectsMarkdown from '../data/projects.md?raw';

const parsed = parseProjectsMarkdownToTasks(projectsMarkdown);

export const PROJECTS_MD_REVISION = parsed.revision;
export const INITIAL_TASKS = parsed.tasks;
