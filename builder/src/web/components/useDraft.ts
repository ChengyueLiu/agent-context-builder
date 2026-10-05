import { useEffect, useMemo, useRef, useState } from 'react';
import type { DefPatch } from '../../core/types';
import { useEditor } from '../agentContext';

export type Values = Record<string, string | boolean | undefined>;

/** 比较时忽略首尾空白，空和未填等同，开关的未选和 false 等同 */
function norm(v: string | boolean | undefined): string {
  if (typeof v === 'boolean') return v ? 'true' : '';
  return (v ?? '').trim();
}

/**
 * 一页表单的草稿。以已保存的内容为基准；基准变了（保存后或从磁盘重读后），
 * 没改过的格子跟着更新，改过的保留。
 */
export function useDraft(saved: Values) {
  const key = JSON.stringify(saved);
  const base = useMemo(() => JSON.parse(key) as Values, [key]);
  const [draft, setDraft] = useState<Values>(base);
  const previous = useRef(base);

  useEffect(() => {
    const before = previous.current;
    previous.current = base;
    if (before === base) return;
    setDraft((d) => {
      const next: Values = { ...base };
      for (const k of Object.keys(d)) if (norm(d[k]) !== norm(before[k])) next[k] = d[k];
      return next;
    });
  }, [base]);

  const dirty = Object.keys({ ...base, ...draft }).some((k) => norm(draft[k]) !== norm(base[k]));
  const set = (k: string, v: string | boolean) => setDraft((d) => ({ ...d, [k]: v }));
  return { draft, set, dirty };
}

/**
 * 一页表单接入编辑器：离开前提醒保存、Ctrl/Cmd + S 保存、关网页前提醒；
 * 还没保存的内容交给右边的系统提示词先显示出来。
 */
export function usePage(dirty: boolean, save: () => Promise<boolean>, live?: DefPatch) {
  const { setPage, setLive } = useEditor();
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    setPage({ dirty, save: () => saveRef.current() });
    return () => setPage({ dirty: false });
  }, [dirty, setPage]);

  const liveKey = dirty && live ? JSON.stringify(live) : '';
  useEffect(() => {
    setLive(liveKey ? (JSON.parse(liveKey) as DefPatch) : undefined);
  }, [liveKey, setLive]);
  useEffect(() => () => setLive(undefined), [setLive]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty) void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);
}
