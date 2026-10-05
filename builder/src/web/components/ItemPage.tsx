import { Alert, App, Button, Form, Input, Popconfirm, Result, Space } from 'antd';
import { useState } from 'react';
import { skillHasBody } from '../../core/compile';
import { ID_RULES, itemFields, listDef } from '../../core/outline';
import type { FieldDef, Item, ListDef, ListKind, PartDef } from '../../core/types';
import { UI } from '../../core/phrases';
import { useEditor } from '../agentContext';
import { useLang } from '../i18n';
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
  const { t } = useLang();
  const list = listDef(project.template, kind);
  const item = project.def[kind].find((x) => x.id === id);
  const part = partOfItem(project.template, kind, item);
  if (!item) {
    return (
      <Result
        status="warning"
        title={t.noSuchItem(list.item)}
        subTitle={id}
        extra={<Button onClick={() => go({ type: 'part', id: part.id })}>{t.backTo(part.name)}</Button>}
      />
    );
  }
  return <ItemForm list={list} part={part} item={item} />;
}

function ItemForm({ list, part, item }: { list: ListDef; part: PartDef; item: Item }) {
  const { api, project, setProject, go, jump } = useEditor();
  const { message } = App.useApp();
  const { lang, t } = useLang();
  const { template, contentTemplate, def } = project;
  const kind = list.kind;
  /** 例子跟着内容语言：写的是什么语言，就看什么语言的例子 */
  const contentList = listDef(contentTemplate, kind);

  const saved: Values = { id: item.id, name: item.name };
  for (const f of list.fields) saved[f.id] = item[f.id];
  const { draft, set, dirty } = useDraft(saved);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = String(draft.name ?? '').trim();
    const id = list.needs_id ? String(draft.id ?? '').trim() : item.id;
    const rule = ID_RULES[kind];
    const problem = !name
      ? t.cannotBeEmpty(list.name_label)
      : !id
        ? t.idCannotBeEmpty
        : list.needs_id && rule && !rule.pattern.test(id)
          ? t.idRule(UI[lang].idRule[rule.rule])
          : id !== item.id && def[kind].some((x) => x.id === id)
            ? t.idTaken(id, list.item)
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
      message.success(t.saved);
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
  const shownId = String(draft.id ?? item.id) || t.id;

  return (
    <Page
      path={[{ title: part.name, onClick: () => go({ type: 'part', id: part.id }) }]}
      title={item.name || t.untitled(list.item)}
      actions={
        <Space>
          <Popconfirm title={t.deleteQ(list.item)} description={t.cannotUndo} okText={t.deleteOk} okButtonProps={{ danger: true }} cancelText={t.deleteCancel} onConfirm={remove}>
            <Button danger>{t.delete}</Button>
          </Popconfirm>
          <Button type="primary" disabled={!dirty} loading={saving} onClick={save}>
            {t.save}
          </Button>
        </Space>
      }
    >
      {kind === 'skills' && !skillHasBody(template, item) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={t.noBody}
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
              <span className="field-label">{t.id}</span>
            </div>
            <div className="field-hint">{list.id_hint}</div>
            <Input value={String(draft.id ?? '')} onChange={(e) => set('id', e.target.value)} style={{ maxWidth: 360 }} />
          </div>
        )}
      </div>

      {groups.map((g) => (
        <div className="card" key={g.fields[0].id}>
          <div className="card-dest">
            {t.generatesTo}
            {g.dest.replace(/<标识>|<id>/g, shownId)}
          </div>
          <Form layout="vertical">
            {g.fields.map((f) => (
              <Slot key={f.id} field={f} example={contentList.fields.find((c) => c.id === f.id)?.example} value={draft[f.id]} onChange={(v) => set(f.id, v)} />
            ))}
          </Form>
        </div>
      ))}
    </Page>
  );
}
