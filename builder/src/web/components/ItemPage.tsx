import { Alert, App, Button, Form, Input, Popconfirm, Result, Space } from 'antd';
import { useState } from 'react';
import { skillHasBody } from '../../core/compile';
import { ID_RULES, itemFields, listDef } from '../../core/outline';
import type { FieldDef, Item, ListDef, ListKind, PartDef } from '../../core/types';
import { useEditor } from '../agentContext';
import { partOfItem } from '../util';
import Slot from './Slot';
import Page from './Page';
import { useDraft, usePage, type Values } from './useDraft';

interface Props {
  kind: ListKind;
  id: string;
}

/** 清单里的一项：一个 skill、一个工具、一条记忆…… */
export default function ItemPage({ kind, id }: Props) {
  const { project, go } = useEditor();
  const list = listDef(project.template, kind);
  const item = project.def[kind].find((x) => x.id === id);
  const part = partOfItem(project.template, kind, item);
  if (!item) {
    return (
      <Result
        status="warning"
        title={`没有这个${list.item}`}
        subTitle={id}
        extra={<Button onClick={() => go({ type: 'part', id: part.id })}>回到「{part.name}」</Button>}
      />
    );
  }
  return <ItemForm list={list} part={part} item={item} />;
}

function ItemForm({ list, part, item }: { list: ListDef; part: PartDef; item: Item }) {
  const { api, project, setProject, go, jump } = useEditor();
  const { message } = App.useApp();
  const { template, def } = project;
  const kind = list.kind;

  const saved: Values = { id: item.id, name: item.name };
  for (const f of list.fields) saved[f.id] = item[f.id];
  const { draft, set, dirty } = useDraft(saved);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = String(draft.name ?? '').trim();
    const id = list.needs_id ? String(draft.id ?? '').trim() : item.id;
    const rule = ID_RULES[kind];
    const problem = !name
      ? `${list.name_label}不能空着`
      : !id
        ? '标识不能空着'
        : list.needs_id && rule && !rule.pattern.test(id)
          ? `标识${rule.message}`
          : id !== item.id && def[kind].some((x) => x.id === id)
            ? `已经有一个标识是 ${id} 的${list.item}了`
            : undefined;
    if (problem) {
      message.error(problem);
      return false;
    }
    const next: Item = { id, name };
    for (const f of list.fields) if (draft[f.id] !== undefined) next[f.id] = draft[f.id];
    setSaving(true);
    try {
      setProject(await api.patch({ [kind]: def[kind].map((x) => (x === item ? next : x)) }));
      message.success('已保存');
      if (id !== item.id) jump({ type: 'item', kind, id });
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  usePage(dirty, save);

  const remove = async () => {
    try {
      setProject(await api.patch({ [kind]: def[kind].filter((x) => x !== item) }));
      jump({ type: 'part', id: part.id });
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  // 相邻的格子生成到同一个地方的，放在一起，标明去处
  const groups: { dest: string; fields: FieldDef[] }[] = [];
  for (const f of itemFields(list, { ...item, ...draft } as Item)) {
    const dest = f.dest ?? list.dest;
    const last = groups[groups.length - 1];
    if (last && last.dest === dest) last.fields.push(f);
    else groups.push({ dest, fields: [f] });
  }
  const shownId = String(draft.id ?? item.id) || '标识';

  return (
    <Page
      path={[{ title: part.name, onClick: () => go({ type: 'part', id: part.id }) }]}
      title={item.name || `未命名的${list.item}`}
      actions={
        <Space>
          <Popconfirm title={`删掉这个${list.item}？`} description="删掉后不能恢复。" okText="删掉" okButtonProps={{ danger: true }} cancelText="不删" onConfirm={remove}>
            <Button danger>删除</Button>
          </Popconfirm>
          <Button type="primary" disabled={!dirty} loading={saving} onClick={save}>
            保存
          </Button>
        </Space>
      }
    >
      {kind === 'skills' && !skillHasBody(template, item) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="还没写正文，不会生成，也不进 Skill 目录。"
        />
      )}

      <div className="card">
        <div className="field">
          <div className="field-head">
            <span className="field-label">{list.name_label}</span>
          </div>
          <Input value={String(draft.name ?? '')} onChange={(e) => set('name', e.target.value)} />
        </div>
        {list.needs_id && (
          <div className="field">
            <div className="field-head">
              <span className="field-label">标识</span>
            </div>
            <div className="field-hint">{list.id_hint}</div>
            <Input value={String(draft.id ?? '')} onChange={(e) => set('id', e.target.value)} style={{ maxWidth: 360 }} />
          </div>
        )}
      </div>

      {groups.map((g) => (
        <div className="card" key={g.fields[0].id}>
          <div className="card-dest">生成到：{g.dest.replaceAll('<标识>', shownId)}</div>
          <Form layout="vertical">
            {g.fields.map((f) => (
              <Slot key={f.id} field={f} value={draft[f.id]} onChange={(v) => set(f.id, v)} />
            ))}
          </Form>
        </div>
      ))}
    </Page>
  );
}
