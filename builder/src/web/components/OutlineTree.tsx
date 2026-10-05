import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Button, Flex, Tooltip, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fieldFilled, itemStatus, listDef, pageFields, placeOf, type Status } from '../../core/outline';
import type { AgentDef, NavEntry, Template } from '../../core/types';
import { useEditor } from '../agentContext';
import { useLang } from '../i18n';
import { routeKey, type Route } from '../util';
import { Help } from './Page';

const row = (name: ReactNode, right?: ReactNode, muted?: boolean) => (
  <span className={`tree-row${muted ? ' tree-muted' : ''}`}>
    <span className="tree-name">{name}</span>
    {right !== undefined && <span className="tree-right">{right}</span>}
  </span>
);

/** 填了几格。填完了不显示 */
const count = (s: Status) => (s.filled < s.total ? `${s.filled}/${s.total}` : undefined);

interface Outline {
  nodes: TreeDataNode[];
  /** 点节点去哪。没有记录的节点，点了只是展开或收起 */
  routes: Map<string, Route>;
  /** 每个节点的上级节点，用来自动展开 */
  parents: Map<string, string[]>;
  /** 所有能展开的节点 */
  branches: string[];
  /** 分组节点，默认展开 */
  groups: string[];
}

export function buildOutline(template: Template, def: AgentDef, untitled: (item: string) => string): Outline {
  const routes = new Map<string, Route>();
  const parents = new Map<string, string[]>();
  const branches: string[] = [];
  const node = (key: string, title: ReactNode, route: Route | undefined, above: string[], children?: TreeDataNode[]): TreeDataNode => {
    if (route) routes.set(key, route);
    parents.set(key, above);
    if (children) branches.push(key);
    return { key, title, children, isLeaf: !children };
  };

  /** 目录里的一页：某个部分（下面是它的条目），或系统提示词里单独成页的一节 */
  const entry = (id: string, above: string[]): TreeDataNode | undefined => {
    const part = template.parts.find((p) => p.id === id);
    if (part) {
      const partKey = `part:${part.id}`;
      const children = part.lists.flatMap((kind) => {
        const list = listDef(template, kind);
        // 分散在几页上的清单，只挂在它所属的那一页下面；否则同一项会在树里出现几次，节点的标识重复
        return def[kind].filter((item) => !list.placed_by || placeOf(list, item) === part.id).map((item) => {
          const status = itemStatus(list, item);
          return node(
            `item:${kind}:${item.id}`,
            row(item.name || untitled(list.item), count(status), status.total > 0 && status.filled === 0),
            { type: 'item', kind, id: item.id },
            [...above, partKey],
          );
        });
      });
      return node(partKey, row(part.name), { type: 'part', id: part.id }, above, children);
    }
    const section = template.prompt.sections.find((s) => s.id === id);
    if (!section) return undefined;
    const fields = pageFields(template, id).map((x) => x.field);
    const filled = fields.filter((f) => fieldFilled(f, def.prompt[f.id])).length;
    const status = { filled, total: fields.length, missing: [], missingRequired: [] };
    return node(`section:${section.id}`, row(section.title ?? section.name, count(status), fields.length > 0 && filled === 0), { type: 'section', id: section.id }, above);
  };

  const groups: string[] = [];
  const build = (entries: NavEntry[], above: string[]): TreeDataNode[] =>
    entries.flatMap((e) => {
      if (typeof e === 'string') return [entry(e, above)].filter((x): x is TreeDataNode => !!x);
      const key = `group:${[...above, e.name].join('/')}`;
      groups.push(key);
      const title = (
        <span className={above.length ? 'tree-group tree-subgroup' : 'tree-group'}>
          {e.name}
          <Help text={e.intro} />
        </span>
      );
      return [node(key, title, undefined, above, build(e.items, [...above, key]))];
    });
  const nodes = build(template.nav, []);
  return { nodes, routes, parents, branches, groups };
}

/** 左边的目录：定义一个 agent 要配置的全部内容。 */
export default function OutlineTree({ route }: { route: Route }) {
  const { project, go } = useEditor();
  const { t } = useLang();
  const outline = useMemo(() => buildOutline(project.template, project.def, t.untitled), [project.template, project.def, t]);
  const selected = routeKey(route);
  const [expanded, setExpanded] = useState<string[]>(outline.groups);

  // 打开哪里，就把它的上级展开
  useEffect(() => {
    const above = outline.parents.get(selected) ?? [];
    setExpanded((prev) => (above.every((k) => prev.includes(k)) ? prev : [...new Set([...prev, ...above])]));
  }, [selected, outline]);

  const toggle = (key: string) => setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="outline">
      <Flex justify="flex-end" gap={6} className="outline-bar">
        <Tooltip title={t.expandAll}>
          <Button size="small" icon={<PlusSquareOutlined />} onClick={() => setExpanded(outline.branches)} />
        </Tooltip>
        <Tooltip title={t.collapseAll}>
          <Button size="small" icon={<MinusSquareOutlined />} onClick={() => setExpanded(outline.groups)} />
        </Tooltip>
      </Flex>
      <Tree
        blockNode
        styles={{ root: { background: 'transparent' } }}
        treeData={outline.nodes}
        selectedKeys={[selected]}
        expandedKeys={expanded}
        onExpand={(keys) => setExpanded(keys as string[])}
        onSelect={(_, info) => {
          const key = String(info.node.key);
          const target = outline.routes.get(key);
          if (target) go(target);
          else toggle(key);
        }}
      />
    </div>
  );
}
