// 编辑视图中间区域的几种面板：概览、内容类别、条目、适用条件分组。

import MDEditor from '@uiw/react-md-editor';
import { Card as AntCard, Descriptions, Progress, Table, Typography } from 'antd';
import { useMemo } from 'react';
import { indexTemplate, isEditable } from '../../core/template';
import type { Card } from '../../core/types';
import { parseWhen, whenLabel } from '../../core/when';
import type { ProjectPayload } from '../api';
import { allDiagnostics, PLACE_LABEL, renderable, type Selection } from '../util';
import CardRows from './CardRows';
import DiagnosticList from './DiagnosticList';
import NewCard from './NewCard';

interface Common {
  project: ProjectPayload;
  onSelect: (s: Selection) => void;
  onCreated: (card: Card, project: ProjectPayload) => void;
  onOpenFile: (file: string) => void;
}

const openCard = (onSelect: Common['onSelect']) => (path: string) => onSelect({ type: 'card', path });

// ---------- 概览 ----------

export function Overview({ project, onSelect, onOpenFile }: Common) {
  const { template, agent, build } = project;
  const sp = build.files.find((f) => f.place === 'system_prompt');
  const budget = template.budgets.system_prompt_tokens;
  const diags = allDiagnostics(project);
  const outputs = build.files.filter((f) => f.tokens > 0);

  return (
    <div className="panel">
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {agent.name}
      </Typography.Title>
      {agent.description && <Typography.Paragraph type="secondary">{agent.description}</Typography.Paragraph>}

      <AntCard size="small" title="系统提示词体量" style={{ marginBottom: 16 }} extra={<a onClick={() => onOpenFile('system-prompt.md')}>查看</a>}>
        <Progress percent={Math.round(((sp?.tokens ?? 0) / budget) * 100)} status={(sp?.tokens ?? 0) > budget ? 'exception' : 'normal'} />
        <Typography.Text type="secondary">
          约 {sp?.tokens ?? 0} token，建议上限 {budget}。系统提示词每次调用都在，越精简越好。
        </Typography.Text>
      </AntCard>

      <AntCard size="small" title="输出文件" style={{ marginBottom: 16 }}>
        <Table
          size="small"
          pagination={false}
          rowKey="path"
          dataSource={outputs}
          onRow={(f) => ({ onClick: () => onOpenFile(f.path), style: { cursor: 'pointer' } })}
          columns={[
            { title: '文件', dataIndex: 'path', render: (p: string) => <Typography.Text code>{p}</Typography.Text> },
            { title: '类型', dataIndex: 'place', width: 120, render: (p: keyof typeof PLACE_LABEL) => PLACE_LABEL[p] },
            { title: '体量（token）', dataIndex: 'tokens', width: 120, align: 'right' },
            { title: '来源卡片', width: 100, align: 'right', render: (_, f) => f.sources.length },
          ]}
        />
      </AntCard>

      {diags.length > 0 && (
        <AntCard size="small" title="问题">
          <DiagnosticList diagnostics={diags} onOpenCard={openCard(onSelect)} onOpenFile={onOpenFile} />
        </AntCard>
      )}
    </div>
  );
}

// ---------- 内容类别（件） ----------

export function PiecePanel({ project, id, onSelect }: Common & { id: string }) {
  const { template, cards } = project;
  const piece = template.pieces.find((p) => p.id === id);
  if (!piece) return <div className="panel">没有这个类别：{id}</div>;
  const entries = piece.entries.filter((e) => isEditable(template, e));

  return (
    <div className="panel">
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {piece.number} {piece.name}
      </Typography.Title>
      <Descriptions
        size="small"
        column={1}
        bordered
        style={{ marginBottom: 16, background: '#fff' }}
        items={[
          { label: '用途', children: piece.purpose },
          { label: '写作要点', children: piece.tips },
          { label: '不属于这里', children: piece.not_here },
        ]}
      />
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={entries}
        onRow={(e) => ({ onClick: () => onSelect({ type: 'entry', id: e.id }), style: { cursor: 'pointer' } })}
        columns={[
          { title: '条目', dataIndex: 'name', width: 140 },
          { title: '内容说明', dataIndex: 'hint' },
          { title: '默认位置', width: 120, render: (_, e) => template.conditions[e.default_when]?.place },
          { title: '卡片数', width: 80, align: 'right', render: (_, e) => cards.filter((c) => c.entry === e.id).length || '' },
        ]}
      />
    </div>
  );
}

// ---------- 条目 ----------

export function EntryPanel({ project, id, onSelect, onCreated }: Common & { id: string }) {
  const { template, cards } = project;
  const ref = useMemo(() => indexTemplate(template).get(id), [template, id]);
  if (!ref) return <div className="panel">没有这个条目：{id}</div>;
  const { piece, entry } = ref;
  const own = cards.filter((c) => c.entry === id);
  const cond = template.conditions[entry.default_when];

  return (
    <div className="panel">
      <Typography.Text type="secondary">
        <a onClick={() => onSelect({ type: 'piece', id: piece.id })}>
          {piece.number} {piece.name}
        </a>
      </Typography.Text>
      <Typography.Title level={3} style={{ marginTop: 4 }}>
        {entry.name}
      </Typography.Title>
      <Descriptions
        size="small"
        column={1}
        bordered
        style={{ marginBottom: 16, background: '#fff' }}
        items={[
          { label: '内容说明', children: entry.hint },
          { label: '默认位置', children: `${cond.place}（适用条件：${cond.name}）` },
        ]}
      />
      {isEditable(template, entry) && (
        <>
          <Typography.Text strong>卡片</Typography.Text>
          <div style={{ margin: '8px 0 16px' }}>
            <CardRows project={project} cards={own} label="when" onOpen={openCard(onSelect)} />
          </div>
          <NewCard key={entry.id} project={project} entry={entry} onCreated={onCreated} />
        </>
      )}
    </div>
  );
}

// ---------- 适用条件分组 ----------

export function GroupPanel({ project, when, onSelect, onCreated, onOpenFile }: Common & { when: string }) {
  const { template, agent, cards, build } = project;
  const refs = useMemo(() => indexTemplate(template), [template]);
  const own = cards.filter((c) => c.when === when).sort((a, b) => (refs.get(a.entry)?.index ?? 0) - (refs.get(b.entry)?.index ?? 0));
  const w = parseWhen(when);
  // 这一组卡片编译后所在的文件
  const outFiles = build.files.filter((f) => f.tokens > 0 && f.sources.some((s) => own.some((c) => c.path === s)));

  return (
    <div className="panel">
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {w ? whenLabel(when, agent, template) : `无效条件：${when}`}
      </Typography.Title>
      <Descriptions
        size="small"
        column={1}
        bordered
        style={{ marginBottom: 16, background: '#fff' }}
        items={[
          { label: '输出位置', children: w ? template.conditions[w.kind].place : '无' },
          {
            label: '输出文件',
            children: outFiles.length
              ? outFiles.map((f) => (
                  <a key={f.path} onClick={() => onOpenFile(f.path)} style={{ marginRight: 12 }}>
                    {f.path}
                  </a>
                ))
              : '无',
          },
        ]}
      />
      <CardRows project={project} cards={own} label="entry" onOpen={openCard(onSelect)} />
      {w && (
        <div style={{ marginTop: 16 }}>
          <NewCard key={when} project={project} when={when} onCreated={onCreated} />
        </div>
      )}
      {outFiles.length === 1 && (
        <div style={{ marginTop: 24 }}>
          <Typography.Text strong>输出内容</Typography.Text>
          <div className="markdown-box" style={{ marginTop: 8 }} data-color-mode="light">
            <MDEditor.Markdown source={renderable(outFiles[0].content)} />
          </div>
        </div>
      )}
    </div>
  );
}
