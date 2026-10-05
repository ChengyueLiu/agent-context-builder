// 大纲的查询与填写情况。纯函数，前后端共用。

import type { AgentDef, FieldDef, Item, ListDef, ListKind, NavEntry, PromptSection, Template } from './types';

export const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function listDef(template: Template, kind: ListKind): ListDef {
  const def = template.lists.find((l) => l.kind === kind);
  if (!def) throw new Error(`大纲里没有清单：${kind}`);
  return def;
}

/** 选择格的取值；没选或选了不认识的值，算第一个选项 */
export function selectValue(field: FieldDef, v: unknown): string | undefined {
  const options = field.options ?? [];
  return options.some((o) => o.value === v) ? (v as string) : options[0]?.value;
}

/** 这一项要填的格子：写了 show_if 的，只在条件满足时才填 */
export function itemFields(list: ListDef, item: Item): FieldDef[] {
  const value = (id: string) => {
    const f = list.fields.find((x) => x.id === id);
    return f ? selectValue(f, item[id]) : undefined;
  };
  return list.fields.filter((f) => !f.show_if || Object.entries(f.show_if).every(([id, v]) => value(id) === v));
}

/** 分散在几页上的清单里，这一项属于哪一页（部分的 id）；不分散的清单返回 undefined */
export function placeOf(list: ListDef, item: Item): string | undefined {
  const f = list.placed_by ? list.fields.find((x) => x.id === list.placed_by) : undefined;
  return f ? selectValue(f, item[f.id]) : undefined;
}

/** 选择格某个取值的显示名 */
export function optionLabel(list: ListDef, fieldId: string, item: Item): string {
  const f = list.fields.find((x) => x.id === fieldId);
  if (!f) return '';
  const v = selectValue(f, item[fieldId]);
  return f.options?.find((o) => o.value === v)?.label ?? '';
}

/** 开关、选择、选一项总有取值（选一项可以不选），算已填；文字要有内容才算。 */
const ALWAYS_FILLED = ['switch', 'select', 'ref'];
export function fieldFilled(field: FieldDef, value: unknown): boolean {
  if (ALWAYS_FILLED.includes(field.type ?? 'text')) return true;
  return text(value) !== '';
}

export interface Status {
  filled: number;
  total: number;
  /** 还空着的格子 */
  missing: string[];
  /** 空着的必填格子 */
  missingRequired: string[];
}

function statusOf(fields: FieldDef[], get: (f: FieldDef) => unknown): Status {
  const counted = fields.filter((f) => !ALWAYS_FILLED.includes(f.type ?? 'text'));
  const missing = counted.filter((f) => !fieldFilled(f, get(f)));
  return {
    filled: counted.length - missing.length,
    total: counted.length,
    missing: missing.map((f) => f.label),
    missingRequired: missing.filter((f) => f.required).map((f) => f.label),
  };
}

export function configStatus(template: Template, def: AgentDef): Status {
  return statusOf(template.config.fields, (f) => def.config[f.id]);
}

export function sectionStatus(section: PromptSection, def: AgentDef): Status {
  return statusOf(section.fields, (f) => def.prompt[f.id]);
}

export function itemStatus(list: ListDef, item: Item): Status {
  return statusOf(itemFields(list, item), (f) => item[f.id]);
}

/** 给新加的一项起一个不重复的标识。 */
export function nextId(kind: ListKind, items: Item[]): string {
  const prefix = kind[0];
  const used = new Set(items.map((x) => x.id));
  for (let n = 1; ; n++) if (!used.has(`${prefix}${n}`)) return `${prefix}${n}`;
}

export const ID_RULES: Partial<Record<ListKind, { pattern: RegExp; message: string }>> = {
  skills: { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '只能用小写字母、数字和连字符' },
  knowledge: { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '只能用小写字母、数字和连字符' },
  tools: { pattern: /^[A-Za-z0-9_-]+$/, message: '只能用字母、数字、下划线和连字符' },
};

/** 左侧目录里的全部页面，从上到下 */
export function navPages(nav: NavEntry[]): string[] {
  return nav.flatMap((e) => (typeof e === 'string' ? [e] : navPages(e.items)));
}

/** 系统提示词里的一格在哪一页上填 */
export const fieldPage = (section: PromptSection, field: FieldDef): string => field.page ?? section.id;

/** 某一页上要填的系统提示词格子，按系统提示词里的顺序 */
export function pageFields(template: Template, page: string): { section: PromptSection; field: FieldDef }[] {
  return template.prompt.sections.flatMap((section) => section.fields.filter((f) => fieldPage(section, f) === page).map((field) => ({ section, field })));
}
