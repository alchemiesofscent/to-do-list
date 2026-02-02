import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PinnedItem } from '../src/pmo/dailyStorage.ts';
import { computeMyDayUpserts, filterItemsToWindow, mergeMyDay } from '../src/pmo/syncMyDay.ts';

function pmoItem(id: string, updatedAt: string, patch?: Partial<PinnedItem>): Extract<PinnedItem, { item_type: 'pmo_action' }> {
  const base: Extract<PinnedItem, { item_type: 'pmo_action' }> = {
    pinned_id: id,
    item_type: 'pmo_action',
    date_utc: '2026-02-02',
    chunk_id: 'chunk_1',
    project_id: 'p1',
    project_slug: 'proj',
    project_title: 'Project',
    action_id: 'a1',
    action_text: 'Action',
    kind: 'light',
    status: 'not_done',
    reason_code: null,
    reason_text: null,
    pinned_at_utc: '2026-02-02T00:00:00.000Z',
    updated_at_utc: updatedAt,
    deleted_at_utc: null,
  };
  return { ...base, ...(patch as Partial<typeof base> ?? {}) };
}

function todoItem(id: string, updatedAt: string, patch?: Partial<PinnedItem>): Extract<PinnedItem, { item_type: 'todo_task' }> {
  const base: Extract<PinnedItem, { item_type: 'todo_task' }> = {
    pinned_id: id,
    item_type: 'todo_task',
    date_utc: '2026-02-02',
    chunk_id: 'chunk_4',
    todo_id: 't1',
    title_snapshot: 'Todo',
    kind: 'light',
    status: 'not_done',
    reason_code: null,
    reason_text: null,
    pinned_at_utc: '2026-02-02T00:00:00.000Z',
    updated_at_utc: updatedAt,
    deleted_at_utc: null,
  };
  return { ...base, ...(patch as Partial<typeof base> ?? {}) };
}

describe('my day sync merge/upserts', () => {
  it('mergeMyDay is last-write-wins by updated_at_utc', () => {
    const cloud = todoItem('x', '2026-02-02T00:00:00.000Z', { title_snapshot: 'cloud' });
    const localOlder = todoItem('x', '2026-02-01T00:00:00.000Z', { title_snapshot: 'local' });
    const merged1 = mergeMyDay([localOlder], [cloud]);
    expect(merged1.find((i) => i.pinned_id === 'x')!.item_type).toBe('todo_task');
    expect((merged1.find((i) => i.pinned_id === 'x') as Extract<PinnedItem, { item_type: 'todo_task' }>).title_snapshot).toBe('cloud');

    const localNewer = todoItem('x', '2026-02-03T00:00:00.000Z', { title_snapshot: 'local-newer' });
    const merged2 = mergeMyDay([localNewer], [cloud]);
    expect((merged2.find((i) => i.pinned_id === 'x') as Extract<PinnedItem, { item_type: 'todo_task' }>).title_snapshot).toBe('local-newer');
  });

  it('tombstones win when newer (deleted_at carried with updated_at)', () => {
    const cloud = pmoItem('p', '2026-02-02T00:00:00.000Z', { deleted_at_utc: null });
    const localDeletedNewer = pmoItem('p', '2026-02-03T00:00:00.000Z', { deleted_at_utc: '2026-02-03T00:00:00.000Z' });
    const merged = mergeMyDay([localDeletedNewer], [cloud]);
    expect(merged.find((i) => i.pinned_id === 'p')!.deleted_at_utc).toBe('2026-02-03T00:00:00.000Z');
  });

  it('computeMyDayUpserts includes new or newer local items (including tombstones)', () => {
    const cloudA = pmoItem('a', '2026-02-02T00:00:00.000Z');
    const localAOlder = pmoItem('a', '2026-02-01T00:00:00.000Z');
    const localBNew = pmoItem('b', '2026-02-03T00:00:00.000Z');
    const localDeleted = pmoItem('c', '2026-02-04T00:00:00.000Z', { deleted_at_utc: '2026-02-04T00:00:00.000Z' });

    const upserts = computeMyDayUpserts([localAOlder, localBNew, localDeleted], [cloudA]);
    expect(upserts.map((i) => i.pinned_id).sort()).toEqual(['b', 'c']);
  });

  it('filterItemsToWindow keeps today+yesterday even if daysBack=1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T12:00:00.000Z'));

    const today = todoItem('today', '2026-02-02T12:00:00.000Z', { date_utc: '2026-02-02' });
    const yesterday = todoItem('yday', '2026-02-01T12:00:00.000Z', { date_utc: '2026-02-01' });
    const tooOld = todoItem('old', '2026-01-30T12:00:00.000Z', { date_utc: '2026-01-30' });

    const kept = filterItemsToWindow([today, yesterday, tooOld], { daysBack: 1 });
    expect(kept.map((i) => i.pinned_id).sort()).toEqual(['today', 'yday']);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

