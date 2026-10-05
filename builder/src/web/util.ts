import { isEditable } from '../core/template';
import type { Diagnostic, PlaceKind, Template, TemplatePiece } from '../core/types';
import type { ProjectPayload } from './api';

/** 当前选中的东西。编辑视图的中间区域据此显示。 */
export type Selection =
  | { type: 'overview' }
  | { type: 'piece'; id: string }
  | { type: 'entry'; id: string }
  | { type: 'card'; path: string }
  | { type: 'group'; when: string };

export type View = 'edit' | 'skeleton' | 'preview';

export const PLACE_LABEL: Record<PlaceKind, string> = {
  system_prompt: '系统提示词',
  skill: 'skill',
  tool: '工具描述',
  reminder: '运行时提醒',
  file: '参考资料',
  index: '资料索引',
  mechanisms: '机制清单',
  manifest: '加载清单',
};

/** 编辑器里显示的件和条目：只有开发者写的，运行时产生的、由用户填的都不显示。 */
export function editablePieces(template: Template): TemplatePiece[] {
  return template.pieces
    .map((p) => ({ ...p, entries: p.entries.filter((e) => isEditable(template, e)) }))
    .filter((p) => p.entries.length > 0);
}

export function allDiagnostics(p: ProjectPayload): Diagnostic[] {
  return [...p.loadDiagnostics, ...p.build.diagnostics];
}

/** 渲染预览时，把文件开头的 yaml frontmatter 显示成代码块，而不是被当成分隔线。 */
export function renderable(content: string): string {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? `\`\`\`yaml\n${m[1]}\n\`\`\`\n${content.slice(m[0].length)}` : content;
}

/** 正文的第一行有意义的文字，用于列表预览。 */
export function firstLine(body: string, max = 60): string {
  const line = body
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('#'))
    .map((l) => l.replace(/^[>\-*\d.\s]+/, '').trim())
    .find(Boolean);
  if (!line) return '（空）';
  return line.length > max ? `${line.slice(0, max)}…` : line;
}
