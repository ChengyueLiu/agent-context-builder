// 适用条件的解析与显示。

import { PARAM_KINDS, SKELETON_KEYS, type AgentSpec, type ConditionKind, type ParamKind, type Template } from './types';

export interface ParsedWhen {
  kind: ConditionKind;
  /** 带参数的条件的取值，如阶段 id */
  value?: string;
}

const ALL_KINDS: ConditionKind[] = ['always', 'stage', 'domain', 'tool', 'situation', 'on_demand'];

export function isParamKind(kind: string): kind is ParamKind {
  return (PARAM_KINDS as readonly string[]).includes(kind);
}

/** 解析失败返回 null。 */
export function parseWhen(when: string): ParsedWhen | null {
  const s = (when ?? '').trim();
  if (s === 'always' || s === 'on_demand') return { kind: s };
  const i = s.indexOf(':');
  if (i < 0) return null;
  const kind = s.slice(0, i);
  const value = s.slice(i + 1).trim();
  if (!isParamKind(kind) || !value) return null;
  return { kind, value };
}

export function formatWhen(w: ParsedWhen): string {
  return isParamKind(w.kind) ? `${w.kind}:${w.value ?? ''}` : w.kind;
}

/** 用在文件名里的写法，如 stage-survey */
export function whenSlug(when: string): string {
  const w = parseWhen(when);
  if (!w) return 'unknown';
  if (w.kind === 'on_demand') return 'on-demand';
  return isParamKind(w.kind) ? `${w.kind}-${w.value}` : w.kind;
}

export function skeletonItem(agent: AgentSpec, kind: ParamKind, id: string) {
  return agent[SKELETON_KEYS[kind]].find((x) => x.id === id);
}

/** 给人看的条件名，如「阶段 · 调研定位」 */
export function whenLabel(when: string, agent: AgentSpec, template: Template): string {
  const w = parseWhen(when);
  if (!w) return `无效条件：${when}`;
  const kindName = template.conditions[w.kind]?.name ?? w.kind;
  if (!isParamKind(w.kind)) return kindName;
  const item = skeletonItem(agent, w.kind, w.value!);
  const shortKind = { stage: '阶段', domain: '领域', tool: '工具', situation: '情形' }[w.kind];
  return `${shortKind} · ${item?.name ?? `${w.value}（骨架里没有）`}`;
}

export { ALL_KINDS };
