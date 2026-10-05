import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, Flex, Form, Input, Modal, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { workspaceApi, type AgentSummary } from '../api';

interface Props {
  onOpen: (id: string) => void;
}

/** 首页：工作区里的所有 agent，可以打开或新建。 */
export default function ProjectList({ onOpen }: Props) {
  const { message } = App.useApp();
  const [data, setData] = useState<{ workspace: string; agents: AgentSummary[] }>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm<{ name: string; id: string }>();

  useEffect(() => {
    workspaceApi.list().then(setData, (e: Error) => setError(e.message));
  }, []);

  const create = async () => {
    const { name, id } = await form.validateFields();
    const folder = (id || name).trim();
    setBusy(true);
    try {
      await workspaceApi.create(folder, name);
      setCreating(false);
      onOpen(folder);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Result status="error" title="读取工作区失败" subTitle={error} />;
  if (!data) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />;

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Agent 定义编辑器</span>
        <div style={{ flex: 1 }} />
        <Typography.Text type="secondary">{data.workspace}</Typography.Text>
      </header>
      <div className="app-main">
        <div className="panel">
          <Flex align="center" style={{ marginBottom: 16 }}>
            <Typography.Title level={3} style={{ margin: 0, flex: 1 }}>
              我的 agent
            </Typography.Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              新建 agent
            </Button>
          </Flex>

          {data.agents.length === 0 ? (
            <Empty description="还没有 agent，新建一个开始" />
          ) : (
            <Flex gap={16} wrap>
              {data.agents.map((a) => (
                <Card key={a.id} hoverable style={{ width: 320 }} onClick={() => onOpen(a.id)}>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    {a.name}
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                    {a.description || '没有说明'}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {a.id}
                  </Typography.Text>
                </Card>
              ))}
            </Flex>
          )}
        </div>
      </div>

      <Modal title="新建 agent" open={creating} onOk={create} onCancel={() => setCreating(false)} confirmLoading={busy} okText="新建" destroyOnHidden>
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '写个名字' }]}>
            <Input placeholder="比如：客服 agent" />
          </Form.Item>
          <Form.Item
            name="id"
            label="文件夹名"
            extra="agent 的文件存在工作区下的这个文件夹里。不填就用名称。"
            rules={[{ pattern: /^[^./\\][^/\\]*$/, message: '不能以点开头，不能含斜杠' }]}
          >
            <Input placeholder="比如：support-agent" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
