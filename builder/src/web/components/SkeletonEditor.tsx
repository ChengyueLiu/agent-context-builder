import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { App, Button, Card as AntCard, Flex, Form, Input, Popconfirm, Tag, Typography } from 'antd';
import { useState } from 'react';
import type { AgentSpec, ParamKind } from '../../core/types';
import { SKELETON_KEYS } from '../../core/types';
import { useAgentApi } from '../agentContext';
import type { ProjectPayload } from '../api';

interface Props {
  project: ProjectPayload;
  onSaved: (project: ProjectPayload) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const SECTIONS: { kind: ParamKind; title: string; help: string; descLabel: string; idPattern: RegExp; idHelp: string }[] = [
  {
    kind: 'stage',
    title: '阶段',
    help: '每个有内容的阶段编译成一个 skill。触发说明写进 skill 的描述，agent 据此判断何时加载。',
    descLabel: '触发说明',
    idPattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    idHelp: '小写字母、数字、连字符',
  },
  {
    kind: 'domain',
    title: '领域',
    help: '每个有内容的领域编译成一个 skill。',
    descLabel: '触发说明',
    idPattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    idHelp: '小写字母、数字、连字符',
  },
  {
    kind: 'tool',
    title: '工具',
    help: '每个工具编译成一份工具描述。',
    descLabel: '简介',
    idPattern: /^[A-Za-z0-9_-]+$/,
    idHelp: '字母、数字、下划线、连字符',
  },
  {
    kind: 'situation',
    title: '情形',
    help: '每个有内容的情形编译成一条运行时提醒。',
    descLabel: '触发条件',
    idPattern: /^[A-Za-z0-9_-]+$/,
    idHelp: '字母、数字、下划线、连字符',
  },
];

/** 骨架：阶段、领域、工具、情形。卡片的适用条件引用这里的 id。 */
export default function SkeletonEditor({ project, onSaved, onDirtyChange }: Props) {
  const { message } = App.useApp();
  const api = useAgentApi();
  const [form] = Form.useForm<AgentSpec>();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const markDirty = (d: boolean) => {
    setDirty(d);
    onDirtyChange(d);
  };

  const refCount = (kind: ParamKind, id: string | undefined) => (id ? project.cards.filter((c) => c.when === `${kind}:${id}`).length : 0);

  const save = async () => {
    let values: AgentSpec;
    try {
      values = await form.validateFields();
    } catch {
      message.error('有字段没填对，看一下标红的地方');
      return;
    }
    setSaving(true);
    try {
      onSaved(await api.saveAgent({ ...project.agent, ...values }));
      markDirty(false);
      message.success('已保存');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <Flex align="center" gap={12} style={{ marginBottom: 12 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          骨架
        </Typography.Title>
        {dirty && <Tag color="orange">未保存</Tag>}
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<SaveOutlined />} disabled={!dirty} loading={saving} onClick={save}>
          保存骨架
        </Button>
      </Flex>
      <Typography.Paragraph type="secondary">卡片的适用条件从这里取值。修改 id 后，引用旧 id 的卡片需要逐张改过来。</Typography.Paragraph>

      <Form form={form} layout="vertical" initialValues={project.agent} onValuesChange={() => markDirty(true)}>
        <AntCard size="small" style={{ marginBottom: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '写个名字' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="简介" style={{ marginBottom: 0 }}>
            <Input.TextArea autoSize={{ minRows: 1 }} />
          </Form.Item>
        </AntCard>

        {SECTIONS.map((s) => (
          <AntCard key={s.kind} size="small" title={s.title} style={{ marginBottom: 16 }}>
            <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
              {s.help}
            </Typography.Paragraph>
            <Form.List name={SKELETON_KEYS[s.kind]}>
              {(fields, { add, remove, move }) => (
                <>
                  {fields.map((field, i) => {
                    const id = form.getFieldValue([SKELETON_KEYS[s.kind], field.name, 'id']) as string | undefined;
                    const n = refCount(s.kind, id);
                    return (
                      <Flex key={field.key} gap={8} align="start">
                        <Form.Item
                          name={[field.name, 'id']}
                          style={{ width: 170 }}
                          rules={[
                            { required: true, message: '必填' },
                            { pattern: s.idPattern, message: s.idHelp },
                            {
                              validator: (_, v) => {
                                const all = (form.getFieldValue(SKELETON_KEYS[s.kind]) ?? []) as { id?: string }[];
                                return all.filter((x) => x?.id === v).length > 1 ? Promise.reject(new Error('id 重复')) : Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <Input placeholder={`标识（${s.idHelp}）`} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'name']} style={{ width: 150 }} rules={[{ required: true, message: '必填' }]}>
                          <Input placeholder="名称" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'description']} style={{ flex: 1 }}>
                          <Input.TextArea autoSize={{ minRows: 1 }} placeholder={s.descLabel} />
                        </Form.Item>
                        <Tag style={{ marginTop: 5 }} color={n ? 'blue' : undefined}>
                          {n} 张卡片
                        </Tag>
                        <Button size="small" style={{ marginTop: 4 }} icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, i - 1)} />
                        <Button size="small" style={{ marginTop: 4 }} icon={<ArrowDownOutlined />} disabled={i === fields.length - 1} onClick={() => move(i, i + 1)} />
                        <Popconfirm
                          title={`删除这个${s.title}？`}
                          description={n ? `有 ${n} 张卡片引用它，删除后这些卡片不会被编译。` : undefined}
                          onConfirm={() => remove(field.name)}
                        >
                          <Button size="small" style={{ marginTop: 4 }} danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Flex>
                    );
                  })}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ id: '', name: '', description: '' })}>
                    添加{s.title}
                  </Button>
                </>
              )}
            </Form.List>
          </AntCard>
        ))}
      </Form>
    </div>
  );
}
