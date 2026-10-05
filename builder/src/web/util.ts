import { fieldPage, listDef, navPages, placeOf } from '../core/outline';
import type { AgentDef, Item, ListKind, NavEntry, PartDef, Template } from '../core/types';
import { LIST_KINDS } from '../core/types';

/** 中间显示哪一页：系统提示词里单独成页的一节、一个部分、或部分里的一项。 */
export type Route = { type: 'section'; id: string } | { type: 'part'; id: string } | { type: 'item'; kind: ListKind; id: string };

/** 路由和字符串互转。生成结果和问题列表里的“去配置”链接用字符串记位置。 */
export function routeKey(r: Route): string {
  return r.type === 'item' ? `item:${r.kind}:${r.id}` : `${r.type}:${r.id}`;
}

export function parseRouteKey(key: string): Route | undefined {
  const [type, a, ...rest] = key.split(':');
  if ((type === 'section' || type === 'part') && a) return { type, id: a };
  if (type === 'item' && (LIST_KINDS as readonly string[]).includes(a) && rest.length) return { type: 'item', kind: a as ListKind, id: rest.join(':') };
  return undefined;
}

/** 同一个位置只有一种写法：和某个部分同名的节，就是那个部分的页面 */
export function canonical(template: Template, r: Route): Route {
  return r.type === 'section' && template.parts.some((p) => p.id === r.id) ? { type: 'part', id: r.id } : r;
}

/** 左侧目录里的第一页，打开 agent 时默认显示 */
export function firstRoute(template: Template): Route {
  return canonical(template, { type: 'section', id: navPages(template.nav)[0] });
}

/** 这一页对应系统提示词里的哪一节，右边的系统提示词跟着滚到那里 */
export function sectionOf(template: Template, r: Route, def?: AgentDef): string | undefined {
  const page = r.type === 'item' ? partOfItem(template, r.kind, def?.[r.kind].find((x) => x.id === r.id)).id : r.id;
  const { sections } = template.prompt;
  if (sections.some((s) => s.id === page)) return page;
  return (
    sections.find((s) => s.fields.some((f) => fieldPage(s, f) === page))?.id ??
    sections.find((s) => (s.auto ?? []).some((a) => a.from_part === page))?.id
  );
}

/** 这一页在左侧目录里属于哪几层分组，从外到里 */
export function groupOf(template: Template, page: string): string[] {
  const walk = (entries: NavEntry[], above: string[]): string[] | undefined => {
    for (const e of entries) {
      if (typeof e === 'string') {
        if (e === page) return above;
      } else {
        const found = walk(e.items, [...above, e.name]);
        if (found) return found;
      }
    }
    return undefined;
  };
  return walk(template.nav, []) ?? [];
}

/** 表单里一格在页面上的锚点 */
export const anchorId = (field: string) => `field-${field.replace(':', '-')}`;


/** 清单里的一项在哪一页：分散在几页上的清单看这一项属于哪页，其余看清单放在哪个部分 */
export function partOfItem(template: Template, kind: ListKind, item?: Item): PartDef {
  const place = item ? placeOf(listDef(template, kind), item) : undefined;
  return template.parts.find((p) => p.id === place) ?? template.parts.find((p) => p.lists.includes(kind))!;
}

/** 渲染预览时，把文件开头的 yaml 头部显示成代码块，而不是被当成分隔线。 */
export function renderable(content: string): string {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? `\`\`\`yaml\n${m[1]}\n\`\`\`\n${content.slice(m[0].length)}` : content;
}

// ---------- 网址：#/<agent>/<位置> ----------

export function hashOf(agent: string, route: Route): string {
  return `#/${encodeURIComponent(agent)}/${encodeURIComponent(routeKey(route))}`;
}

export function agentInHash(): string | undefined {
  const m = location.hash.match(/^#\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function routeInHash(): Route | undefined {
  const key = location.hash.split('/').map((x) => decodeURIComponent(x)).at(-1) ?? '';
  return parseRouteKey(key);
}
