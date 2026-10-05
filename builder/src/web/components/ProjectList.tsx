import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, Flex, Form, Input, Modal, Result, Select, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { Lang } from '../../core/phrases';
import { workspaceApi, type AgentSummary } from '../api';
import { LangSwitch } from '../Editor';
import { useLang } from '../i18n';

interface Props {
  onOpen: (id: string) => void;
}

/** 首页：工作区里的所有 agent，可以打开或新建。 */
export default function ProjectList({ onOpen }: Props) {
  const { message } = App.useApp();
  const { t } = useLang();
  const [data, setData] = useState<{ workspace: string; agents: AgentSummary[] }>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm<{ name: string; id: string; language: Lang }>();

  useEffect(() => {
    workspaceApi.list().then(setData, (e: Error) => setError(e.message));
  }, []);

  const create = async () => {
    const { name, id, language } = await form.validateFields();
    const folder = (id || name).trim();
    setBusy(true);
    try {
      await workspaceApi.create(folder, name, language);
      setCreating(false);
      onOpen(folder);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Result status="error" title={t.workspaceFailed} subTitle={error} />;
  if (!data) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />;

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">{t.appTitle}</span>
        <div style={{ flex: 1 }} />
        <Flex align="center" gap={16}>
          <Typography.Text type="secondary">{data.workspace}</Typography.Text>
          <LangSwitch />
        </Flex>
      </header>
      <div className="app-main">
        <div className="panel">
          <Flex align="center" style={{ marginBottom: 16 }}>
            <Typography.Title level={3} style={{ margin: 0, flex: 1 }}>
              {t.myAgents}
            </Typography.Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              {t.newAgent}
            </Button>
          </Flex>

          {data.agents.length === 0 ? (
            <Empty description={t.noAgents} />
          ) : (
            <Flex gap={16} wrap>
              {data.agents.map((a) => (
                <Card key={a.id} hoverable style={{ width: 320 }} onClick={() => onOpen(a.id)}>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    {a.name}
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                    {a.description || t.noDescription}
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

      <Modal title={t.newAgent} open={creating} onOk={create} onCancel={() => setCreating(false)} confirmLoading={busy} okText={t.create} cancelText={t.cancel} destroyOnHidden>
        <Form form={form} layout="vertical" preserve={false} initialValues={{ language: 'en' }}>
          <Form.Item name="name" label={t.name} rules={[{ required: true, message: t.nameRequired }]}>
            <Input placeholder={t.namePlaceholder} />
          </Form.Item>
          <Form.Item name="id" label={t.folder} extra={t.folderHint} rules={[{ pattern: /^[^./\\][^/\\]*$/, message: t.folderRule }]}>
            <Input placeholder={t.folderPlaceholder} />
          </Form.Item>
          <Form.Item name="language" label={t.contentLanguage} extra={t.contentLanguageHint}>
            <Select<Lang> options={(['en', 'zh'] as Lang[]).map((l) => ({ value: l, label: t.langName[l] }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
