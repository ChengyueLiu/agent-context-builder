import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Flex, Form, Input, Modal, Popconfirm, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { fieldLoad, itemLoad, skillHasBody } from '../../core/compile';
import LoadTag from './LoadTag';
import { ID_RULES, itemFields, itemStatus, listDef, nextId, pageFields, placeOf } from '../../core/outline';
import { ProCard } from '@ant-design/pro-components';
import type { Item, ListDef, ListKind, PartDef } from '../../core/types';
import { UI } from '../../core/phrases';
import { useEditor } from '../agentContext';
import { useLang } from '../i18n';
import Page, { Help } from './Page';
import { groupOf } from '../util';
import PromptFields, { headerHelp, promptPatch, promptValues } from './PromptFields';
import { CountTag } from './Status';
import { useDraft, usePage } from './useDraft';

/** 列表里除了名称，再显示哪几格，方便一眼认出每一项 */
const SUMMARY: Record<ListKind, string[]> = {
  workflows: ['when'],
  skills: ['when_use'],
  knowledge: ['when'],
  tools: ['purpose', 'effect'],
  helpers: ['purpose'],
  provided: ['where', 'explain'],
  memory: ['path', 'load'],
  outputs: ['path', 'when'],
  guarantees: ['how'],
  reminders: ['trigger'],
  cases: ['scenario'],
};

/** 一个部分：顶上是在这一页填的系统提示词格子（比如“用法”“关卡”），下面是清单。 */
export default function PartPage({ part }: { part: PartDef }) {
  const { api, project, setProject } = useEditor();
  const { message } = App.useApp();
  const { t } = useLang();
  const fields = pageFields(project.template, part.id).map((x) => x.field);
  const { draft, set, dirty } = useDraft(promptValues(fields, project.def.prompt));
  const [saving, setSaving] = useState(false);
  const patch = promptPatch(fields, draft);

  const save = async () => {
    setSaving(true);
    try {
      setProject(await api.patch({ prompt: patch }));
      message.success(t.saved);
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  usePage(dirty, save, { prompt: patch });

  const single = fields.length === 1 ? fields[0] : undefined;
  return (
    <Page
      path={groupOf(project.template, part.id).map((title) => ({ title }))}
      title={part.name}
      help={part.intro}
      actions={
        fields.length > 0 && (
          <Button type="primary" disabled={!dirty} loading={saving} onClick={save}>
            {t.save}
          </Button>
        )
      }
    >
      <Flex vertical gap={16}>
        {fields.length > 0 && (
          <ProCard
            title={
              single && (
                <Flex align="center" gap={8}>
                  {single.label}
                  <Help text={headerHelp(undefined, fields)} />
                  <LoadTag {...fieldLoad(single)} />
                </Flex>
              )
            }
            headerBordered={!!single}
          >
            <Flex vertical gap={20}>
              <PromptFields fields={fields} draft={draft} set={set} />
            </Flex>
          </ProCard>
        )}
        {part.lists.map((kind) => (
          <ListBlocks key={kind} list={listDef(project.template, kind)} part={part.id} showTitle={part.lists.length > 1} />
        ))}
      </Flex>
    </Page>
  );
}

/** 一张清单。分散在几页上的，只显示属于这一页的；设了按哪一栏分块的，每个选项一块，空的也显示 */
function ListBlocks({ list, part, showTitle }: { list: ListDef; part: string; showTitle: boolean }) {
  const { project } = useEditor();
  const { t } = useLang();
  if (list.placed_by) {
    return <ItemList list={list} title={list.item} filter={(item) => placeOf(list, item) === part} preset={{ [list.placed_by]: part }} />;
  }
  const by = list.group_by ? list.fields.find((f) => f.id === list.group_by) : undefined;
  if (!by?.options) return <ItemList list={list} title={showTitle ? list.item : t.allOf(list.item)} />;
  const known = (item: Item) => by.options!.some((o) => o.value === item[by.id]);
  return (
    <>
      {by.options.map((o) => (
        <ItemList key={o.value} list={list} title={o.label} filter={(item) => item[by.id] === o.value} preset={{ [by.id]: o.value }} />
      ))}
      {project.def[list.kind].some((item) => !known(item)) && <ItemList list={list} title={t.uncategorized} filter={(item) => !known(item)} />}
    </>
  );
}

interface ListProps {
  list: ListDef;
  title: string;
  /** 只显示清单里的这些项 */
  filter?: (item: Item) => boolean;
  /** 在这一块里新加的项，预先填好的格子 */
  preset?: Record<string, string>;
}

function ItemList({ list, title, filter, preset }: ListProps) {
  const { api, project, setProject, go, jump } = useEditor();
  const { message } = App.useApp();
  const { lang, t } = useLang();
  const kind = list.kind;
  const all = project.def[kind];
  const items = filter ? all.filter(filter) : all;
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm<{ name: string; id?: string }>();

  const replace = async (next: Item[]) => {
    setBusy(true);
    try {
      setProject(await api.patch({ [kind]: next }));
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** 在这一块里和相邻的一项换位置；换的是整张清单里的位置 */
  const move = (index: number, by: number) => {
    const next = [...all];
    const i = all.indexOf(items[index]);
    const j = all.indexOf(items[index + by]);
    [next[i], next[j]] = [next[j], next[i]];
    void replace(next);
  };

  const add = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;
    const { name, id } = values;
    const item: Item = { id: list.needs_id ? id!.trim() : nextId(kind, all), name: name.trim(), ...(preset ?? {}) };
    if (await replace([...all, item])) {
      setAdding(false);
      jump({ type: 'item', kind, id: item.id });
    }
  };

  const rule = ID_RULES[kind];
  const columns: ColumnsType<Item> = [
    {
      title: list.name_label,
      key: 'name',
      width: 220,
      render: (_, item) => (
        <>
          <Typography.Text strong>{item.name || t.untitled(list.item)}</Typography.Text>
          {list.needs_id && (
            <div>
              <Typography.Text type="secondary" code>
                {item.id}
              </Typography.Text>
            </div>
          )}
        </>
      ),
    },
    ...SUMMARY[kind].map((fieldId) => {
      const field = list.fields.find((f) => f.id === fieldId)!;
      return {
        title: field.label,
        key: fieldId,
        ellipsis: true,
        render: (_: unknown, item: Item) => {
          if (!itemFields(list, item).includes(field)) return <Typography.Text type="secondary">—</Typography.Text>;
          const v = item[fieldId];
          const shown = field.options ? field.options.find((o) => o.value === v)?.label : v;
          return shown ? String(shown) : <Typography.Text type="secondary">{t.notWritten}</Typography.Text>;
        },
      };
    }),
    {
      title: t.loadColumn,
      key: 'load',
      width: 110,
      render: (_, item) => <LoadTag {...itemLoad(project.contentTemplate, project.def, kind, item)} />,
    },
    {
      title: t.status,
      key: 'status',
      width: 150,
      render: (_, item) => (
        <>
          <CountTag status={itemStatus(list, item)} />
          {kind === 'skills' && !skillHasBody(project.template, item) && <Tag color="orange">{t.noBodyTag}</Tag>}
        </>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, item, index) => (
        <Flex gap={2} onClick={(e) => e.stopPropagation()}>
          <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={busy || index === 0} onClick={() => move(index, -1)} title={t.moveUp} />
          <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} title={t.moveDown} />
          <Popconfirm
            title={t.deleteQ(list.item)}
            description={t.cannotUndo}
            okText={t.deleteOk}
            okButtonProps={{ danger: true }}
            cancelText={t.deleteCancel}
            onConfirm={() => replace(all.filter((x) => x !== item))}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={busy} title={t.delete} />
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <ProCard
      title={`${title} (${items.length})`}
      headerBordered
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
          {t.add(list.item)}
        </Button>
      }
    >
      <Table
        rowKey={(item) => item.id || item.name}
        columns={columns}
        dataSource={items}
        pagination={false}
        size="middle"
        locale={{ emptyText: t.empty }}
        onRow={(item) => ({ onClick: () => go({ type: 'item', kind, id: item.id }), className: 'row-click' })}
      />

      <Modal title={t.add(list.item)} open={adding} onOk={add} onCancel={() => setAdding(false)} confirmLoading={busy} okText={t.addOk} cancelText={t.cancel} destroyOnHidden>
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label={list.name_label} rules={[{ required: true, whitespace: true, message: t.fieldRequired }]}>
            <Input autoFocus />
          </Form.Item>
          {list.needs_id && (
            <Form.Item
              name="id"
              label={t.id}
              extra={list.id_hint}
              rules={[
                { required: true, whitespace: true, message: t.fieldRequired },
                ...(rule ? [{ pattern: rule.pattern, message: t.idRule(UI[lang].idRule[rule.rule]) }] : []),
                { validator: async (_: unknown, v?: string) => (v && all.some((x) => x.id === v.trim()) ? Promise.reject(new Error(t.idExists)) : undefined) },
              ]}
            >
              <Input />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </ProCard>
  );
}
