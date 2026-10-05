import { DeleteOutlined, ExportOutlined, SaveOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { App, Breadcrumb, Button, Collapse, Descriptions, Form, Input, InputNumber, Popconfirm, Select, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { destinationOf } from '../../core/route';
import { indexTemplate } from '../../core/template';
import type { Card } from '../../core/types';
import { whenLabel } from '../../core/when';
import { useAgentApi } from '../agentContext';
import type { ProjectPayload } from '../api';
import { editablePieces, type Selection } from '../util';
import WhenPicker from './WhenPicker';

interface Props {
  project: ProjectPayload;
  card: Card;
  onSaved: (card: Card, project: ProjectPayload) => void;
  onDeleted: (project: ProjectPayload) => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenFile: (file: string) => void;
  onSelect: (s: Selection) => void;
}

const FIELDS: (keyof Card)[] = ['entry', 'when', 'title', 'order', 'mechanism', 'note', 'body'];

/** 按保存后的样子比较：文件里正文末尾的换行、空字段都会被规整掉。 */
function norm(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function same(a: Card, b: Card) {
  return FIELDS.every((k) => norm(a[k]) === norm(b[k]));
}

/** 编辑一张卡片：左边写正文，右边定条目和适用条件，并显示输出位置。 */
export default function CardEditor({ project, card, onSaved, onDeleted, onDirtyChange, onOpenFile, onSelect }: Props) {
  const { message } = App.useApp();
  const api = useAgentApi();
  const { template, agent } = project;
  const refs = useMemo(() => indexTemplate(template), [template]);
  const [draft, setDraft] = useState<Card>(card);
  const [saving, setSaving] = useState(false);
  const dirty = !same(draft, card);
  const set = (patch: Partial<Card>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await api.saveCard(draft);
      onSaved(res.card, res.project);
      message.success('已保存');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [api, draft, onSaved, message]);

  // Ctrl/Cmd + S 保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && !saving) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, saving, save]);

  const remove = async () => {
    try {
      onDeleted(await api.deleteCard(card.path));
      message.success('已删除');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const ref = refs.get(draft.entry);
  const dest = destinationOf(draft, refs, agent);
  const isHardRule = ref?.piece.id === 'hard_rules';

  const entryOptions = editablePieces(template).map((p) => ({
    label: `${p.number} ${p.name}`,
    title: p.name,
    options: p.entries.map((e) => ({ label: e.name, value: e.id })),
  }));

  return (
    <div className="card-editor">
      <div className="card-editor-bar">
        <Breadcrumb
          style={{ flex: 1, minWidth: 0 }}
          items={[
            { title: <a onClick={() => ref && onSelect({ type: 'piece', id: ref.piece.id })}>{ref ? `${ref.piece.number} ${ref.piece.name}` : '未知类别'}</a> },
            { title: <a onClick={() => ref && onSelect({ type: 'entry', id: ref.entry.id })}>{ref?.entry.name ?? card.entry}</a> },
            { title: whenLabel(card.when, agent, template) },
          ]}
        />
        {dirty && <Tag color="orange">未保存</Tag>}
        <Button type="primary" icon={<SaveOutlined />} disabled={!dirty} loading={saving} onClick={save}>
          保存
        </Button>
        <Popconfirm title="删除这张卡片？" okText="删除" okButtonProps={{ danger: true }} onConfirm={remove}>
          <Button icon={<DeleteOutlined />} danger>
            删除
          </Button>
        </Popconfirm>
      </div>

      <div className="card-editor-body">
        <div className="card-editor-text" data-color-mode="light">
          <MDEditor
            value={draft.body}
            onChange={(v) => set({ body: v ?? '' })}
            preview="edit"
            visibleDragbar={false}
            height="100%"
            textareaProps={{ placeholder: ref?.entry.hint ?? '' }}
          />
        </div>

        <div className="card-editor-meta">
          {ref && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
              {ref.entry.hint}
            </Typography.Paragraph>
          )}

          <Form layout="vertical" size="small">
            <Form.Item label="条目">
              <Select value={draft.entry} options={entryOptions} onChange={(v) => set({ entry: v })} showSearch={{ optionFilterProp: 'label' }} />
            </Form.Item>
            <Form.Item label="适用条件">
              <WhenPicker agent={agent} template={template} value={draft.when} onChange={(when) => set({ when })} />
            </Form.Item>
          </Form>

          <Descriptions
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 16 }}
            items={[
              {
                label: '输出文件',
                children: dest ? (
                  <a onClick={() => onOpenFile(dest.file)}>
                    {dest.file} <ExportOutlined />
                  </a>
                ) : (
                  <Typography.Text type="danger">无法确定：条目或适用条件无效</Typography.Text>
                ),
              },
              ...(dest ? [{ label: '所在章节', children: dest.section }] : []),
            ]}
          />

          {isHardRule && (
            <Form layout="vertical" size="small">
              <Form.Item label="兜底机制" extra="列入 mechanisms.md，交给工程实现。">
                <Input.TextArea autoSize={{ minRows: 2 }} value={draft.mechanism ?? ''} onChange={(e) => set({ mechanism: e.target.value })} placeholder="如：权限规则、沙箱、只读文件" />
              </Form.Item>
            </Form>
          )}

          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'more',
                label: '更多',
                children: (
                  <Form layout="vertical" size="small">
                    <Form.Item label="标题" extra="用于区分同一条目下的多张卡片；参考资料的标题即文件名。">
                      <Input value={draft.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
                    </Form.Item>
                    <Form.Item label="排序">
                      <InputNumber value={draft.order} onChange={(v) => set({ order: v ?? undefined })} />
                    </Form.Item>
                    <Form.Item label="备注" extra="不进 agent。">
                      <Input.TextArea autoSize={{ minRows: 2 }} value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
