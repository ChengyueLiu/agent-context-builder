// 模板的索引与查询。不依赖 node，前端也用。

import type { Template, TemplateEntry, TemplatePiece } from './types';

export interface EntryRef {
  piece: TemplatePiece;
  entry: TemplateEntry;
  /** 条目在全部条目里的顺序，用于排序 */
  index: number;
}

export function indexTemplate(template: Template): Map<string, EntryRef> {
  const map = new Map<string, EntryRef>();
  let index = 0;
  for (const piece of template.pieces) {
    for (const entry of piece.entries) {
      map.set(entry.id, { piece, entry, index: index++ });
    }
  }
  return map;
}

export function isEditable(template: Template, entry: TemplateEntry): boolean {
  return !entry.generated && template.phases[entry.phase]?.editable === true;
}

/** 卡片所在的文件夹名，如 3-practice */
export function pieceDir(piece: TemplatePiece): string {
  return `${piece.number}-${piece.id}`;
}

/** 检查模板本身：id 重复、字段缺失。 */
export function validateTemplate(template: Template): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const piece of template.pieces ?? []) {
    if (!piece.id || !piece.name) problems.push(`有一件缺少 id 或 name`);
    for (const entry of piece.entries ?? []) {
      if (seen.has(entry.id)) problems.push(`条目 id 重复：${entry.id}`);
      seen.add(entry.id);
      if (!template.phases?.[entry.phase]) problems.push(`条目 ${entry.id} 的 phase 无效：${entry.phase}`);
      if (!template.conditions?.[entry.default_when]) problems.push(`条目 ${entry.id} 的 default_when 无效：${entry.default_when}`);
    }
  }
  return problems;
}
