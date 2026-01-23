export function slugFromProjectId(projectId: string): string {
  const lower = projectId.toLowerCase();
  const replaced = lower.replace(/[^a-z0-9]+/g, '-');
  return replaced.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

