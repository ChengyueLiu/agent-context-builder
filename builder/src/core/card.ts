// 卡片文件的读写格式：yaml frontmatter + markdown 正文。

import YAML from 'yaml';
import type { Card, CardInput } from './types';
import { whenSlug } from './when';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

/** 本工具认识的字段，按这个顺序写出 */
const KNOWN = ['entry', 'when', 'title', 'order', 'mechanism', 'note'] as const;

export class CardParseError extends Error {}

export function parseCard(path: string, text: string): Card {
  const m = text.match(FRONTMATTER);
  if (!m) throw new CardParseError('缺少 frontmatter（文件开头的 --- 字段块）');
  let meta: Record<string, unknown>;
  try {
    meta = (YAML.parse(m[1]) ?? {}) as Record<string, unknown>;
  } catch (e) {
    throw new CardParseError(`frontmatter 不是合法的 yaml：${(e as Error).message}`);
  }
  if (typeof meta !== 'object' || Array.isArray(meta)) throw new CardParseError('frontmatter 必须是字段表');
  const str = (k: string) => (meta[k] == null ? undefined : String(meta[k]));
  const extra = Object.fromEntries(Object.entries(meta).filter(([k]) => !(KNOWN as readonly string[]).includes(k)));
  return {
    path,
    entry: str('entry') ?? '',
    when: str('when') ?? 'always',
    title: str('title'),
    order: typeof meta.order === 'number' ? meta.order : undefined,
    mechanism: str('mechanism'),
    note: str('note'),
    body: m[2].replace(/^\r?\n/, ''),
    ...(Object.keys(extra).length ? { extra } : {}),
  };
}

/** 字段按固定顺序写出，空的省略，便于 diff。 */
export function serializeCard(card: CardInput): string {
  const meta: Record<string, unknown> = { entry: card.entry, when: card.when };
  if (card.title?.trim()) meta.title = card.title.trim();
  if (typeof card.order === 'number') meta.order = card.order;
  for (const k of ['mechanism', 'note'] as const) {
    const v = card[k]?.trim();
    if (v) meta[k] = v;
  }
  for (const [k, v] of Object.entries(card.extra ?? {})) if (!(k in meta)) meta[k] = v;
  const head = YAML.stringify(meta, { lineWidth: 0 }).trimEnd();
  const body = card.body.replace(/\s+$/, '');
  return `---\n${head}\n---\n\n${body}\n`;
}

/** 卡片的规范文件名（不含序号与扩展名），由条目和条件决定。 */
export function cardBaseName(entry: string, when: string): string {
  return when === 'always' ? entry : `${entry}.${whenSlug(when)}`;
}
