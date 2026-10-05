// 去向：一张卡片编译后进哪个文件。规则来自文档 3.2 节——适用条件决定地方。

import type { AgentSpec, Card, Destination } from './types';
import type { EntryRef } from './template';
import { parseWhen, skeletonItem, isParamKind } from './when';

export const SYSTEM_PROMPT_FILE = 'system-prompt.md';
export const FILES_INDEX = 'files/INDEX.md';
export const MECHANISMS_FILE = 'mechanisms.md';
export const MANIFEST_FILE = 'manifest.yaml';

export function skillName(kind: 'stage' | 'domain', id: string): string {
  return `${kind}-${id}`;
}

/** 卡片路径的文件名部分（不含扩展名） */
export function cardStem(path: string): string {
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.md$/, '');
}

/** 用作文件名的安全写法 */
export function safeFileName(s: string): string {
  return s.trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

export function onDemandFileName(card: Card): string {
  return `files/${safeFileName(card.title || cardStem(card.path))}.md`;
}

/**
 * 计算去向。条目或条件无效、引用的骨架项不存在时返回 null（编译时会报诊断）。
 */
export function destinationOf(card: Card, refs: Map<string, EntryRef>, agent: AgentSpec): Destination | null {
  const ref = refs.get(card.entry);
  const w = parseWhen(card.when);
  if (!ref || !w) return null;
  if (isParamKind(w.kind) && !skeletonItem(agent, w.kind, w.value!)) return null;

  const { piece, entry } = ref;
  const heading = entry.heading || entry.name;
  const alsoMechanisms = piece.id === 'hard_rules';

  switch (w.kind) {
    case 'always':
      return { file: SYSTEM_PROMPT_FILE, place: 'system_prompt', section: `${piece.heading} › ${heading}`, alsoMechanisms };
    case 'stage':
    case 'domain': {
      const item = skeletonItem(agent, w.kind, w.value!)!;
      const dir = `skills/${skillName(w.kind, item.id)}`;
      if (entry.attachment) {
        return { file: `${dir}/${entry.attachment}.md`, place: 'skill', section: `附件：${heading}`, alsoMechanisms };
      }
      return { file: `${dir}/SKILL.md`, place: 'skill', section: heading, alsoMechanisms };
    }
    case 'tool':
      return { file: `tools/${w.value}.md`, place: 'tool', section: heading, alsoMechanisms };
    case 'situation':
      return { file: `reminders/${w.value}.md`, place: 'reminder', section: '提醒正文', alsoMechanisms };
    case 'on_demand':
      return { file: onDemandFileName(card), place: 'file', section: '全文（索引常驻）', alsoMechanisms };
  }
}
