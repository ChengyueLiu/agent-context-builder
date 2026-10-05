import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Button, Flex, Segmented, Tooltip, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useEffect, useMemo, useState } from 'react';
import { indexTemplate, isEditable } from '../../core/template';
import type { Card } from '../../core/types';
import { SKELETON_KEYS } from '../../core/types';
import { parseWhen, whenLabel } from '../../core/when';
import type { ProjectPayload } from '../api';
import { editablePieces, type Selection } from '../util';

type Mode = 'piece' | 'when';

interface Props {
  project: ProjectPayload;
  selection: Selection;
  onSelect: (s: Selection) => void;
}

/** 左栏：按件看，或按适用条件看。 */
export default function Sidebar({ project, selection, onSelect }: Props) {
  const { template, agent, cards } = project;
  const [mode, setMode] = useState<Mode>('piece');
  const refs = useMemo(() => indexTemplate(template), [template]);
  const pieces = useMemo(() => editablePieces(template), [template]);

  const cardTitle = (card: Card, primary: string) => (
    <span className={card.body.trim() ? undefined : 'tree-muted'}>
      {primary}
      {card.title && <span className="tree-count">{card.title}</span>}
    </span>
  );

  const pieceTree = useMemo<DataNode[]>(
    () =>
      pieces.map((piece) => ({
        key: `piece:${piece.id}`,
        title: `${piece.number} ${piece.name}`,
        children: piece.entries.map((entry) => {
          const own = cards.filter((c) => c.entry === entry.id);
          const hasContent = own.some((c) => c.body.trim());
          return {
            key: `entry:${entry.id}`,
            isLeaf: own.length === 0,
            title: (
              <Tooltip title={entry.hint} placement="right" mouseEnterDelay={0.6}>
                <span className={hasContent ? undefined : 'tree-muted'}>
                  {entry.name}
                  {own.length > 1 && <span className="tree-count">{own.length}</span>}
                </span>
              </Tooltip>
            ),
            children: own.length
              ? own.map((c) => ({ key: `card:${c.path}`, isLeaf: true, title: cardTitle(c, whenLabel(c.when, agent, template)) }))
              : undefined,
          };
        }),
      })),
    [pieces, agent, cards, template],
  );

  const whenTree = useMemo<DataNode[]>(() => {
    const groups: string[] = ['always'];
    for (const kind of ['stage', 'domain', 'tool', 'situation'] as const) {
      for (const it of agent[SKELETON_KEYS[kind]]) groups.push(`${kind}:${it.id}`);
    }
    groups.push('on_demand');
    // 引用了不存在的骨架项或写错的条件，也列出来，便于修
    for (const c of cards) if (!groups.includes(c.when)) groups.push(c.when);
    return groups.map((when) => {
      const own = cards
        .filter((c) => {
          // 条目写错的卡片也列出来，便于修
          const ref = refs.get(c.entry);
          return c.when === when && (!ref || isEditable(template, ref.entry));
        })
        .sort((a, b) => (refs.get(a.entry)?.index ?? 0) - (refs.get(b.entry)?.index ?? 0));
      return {
        key: `group:${when}`,
        title: (
          <span className={own.length ? undefined : 'tree-muted'}>
            {parseWhen(when) ? whenLabel(when, agent, template) : `无效条件：${when}`}
          </span>
        ),
        isLeaf: own.length === 0,
        children: own.length
          ? own.map((c) => ({ key: `card:${c.path}`, isLeaf: true, title: cardTitle(c, refs.get(c.entry)?.entry.name ?? c.entry) }))
          : undefined,
      };
    });
  }, [agent, cards, template, refs]);

  // 展开状态：默认展开所有件；选中卡片时展开它的上级
  const [expanded, setExpanded] = useState<React.Key[]>(() => pieces.map((p) => `piece:${p.id}`));
  const [expandedWhen, setExpandedWhen] = useState<React.Key[]>(['group:always']);
  useEffect(() => {
    if (selection.type !== 'card') return;
    const card = cards.find((c) => c.path === selection.path);
    if (!card) return;
    const ref = refs.get(card.entry);
    if (ref) setExpanded((prev) => [...new Set([...prev, `piece:${ref.piece.id}`, `entry:${ref.entry.id}`])]);
    setExpandedWhen((prev) => [...new Set([...prev, `group:${card.when}`])]);
  }, [selection, cards, refs]);

  /** 有子节点的节点的 key，用于全部展开 */
  const parentKeys = (nodes: DataNode[]): React.Key[] =>
    nodes.flatMap((n) => (n.children?.length ? [n.key, ...parentKeys(n.children)] : []));
  const expandAll = () => (mode === 'piece' ? setExpanded(parentKeys(pieceTree)) : setExpandedWhen(parentKeys(whenTree)));
  const collapseAll = () => (mode === 'piece' ? setExpanded([]) : setExpandedWhen([]));

  const selectedKey =
    selection.type === 'card'
      ? `card:${selection.path}`
      : selection.type === 'piece'
        ? `piece:${selection.id}`
        : selection.type === 'entry'
          ? `entry:${selection.id}`
          : selection.type === 'group'
            ? `group:${selection.when}`
            : '';

  const handleSelect = (key: string) => {
    const i = key.indexOf(':');
    const kind = key.slice(0, i);
    const rest = key.slice(i + 1);
    if (kind === 'piece') onSelect({ type: 'piece', id: rest });
    else if (kind === 'entry') onSelect({ type: 'entry', id: rest });
    else if (kind === 'card') onSelect({ type: 'card', path: rest });
    else if (kind === 'group') onSelect({ type: 'group', when: rest });
  };

  return (
    <div style={{ padding: '12px 8px' }}>
      <Flex gap={4} align="center" style={{ marginBottom: 8 }}>
        <Segmented
          block
          size="small"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { label: '按内容类别', value: 'piece' },
            { label: '按适用条件', value: 'when' },
          ]}
          style={{ flex: 1 }}
        />
        <Tooltip title="全部展开">
          <Button size="small" type="text" icon={<PlusSquareOutlined />} onClick={expandAll} />
        </Tooltip>
        <Tooltip title="全部收起">
          <Button size="small" type="text" icon={<MinusSquareOutlined />} onClick={collapseAll} />
        </Tooltip>
      </Flex>
      <Tree
        blockNode
        showLine={{ showLeafIcon: false }}
        treeData={mode === 'piece' ? pieceTree : whenTree}
        expandedKeys={mode === 'piece' ? expanded : expandedWhen}
        onExpand={(keys) => (mode === 'piece' ? setExpanded(keys) : setExpandedWhen(keys))}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onSelect={(_, info) => handleSelect(String(info.node.key))}
      />
    </div>
  );
}
