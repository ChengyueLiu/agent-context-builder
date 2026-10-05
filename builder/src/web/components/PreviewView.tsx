import { CopyOutlined, WarningFilled } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { App, Button, Empty, Flex, Menu, Segmented, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { indexTemplate } from '../../core/template';
import type { OutputFile } from '../../core/types';
import type { ProjectPayload } from '../api';
import { allDiagnostics, PLACE_LABEL, renderable } from '../util';
import DiagnosticList from './DiagnosticList';

interface Props {
  project: ProjectPayload;
  file: string;
  onFileChange: (file: string) => void;
  onOpenCard: (path: string) => void;
}

const GROUPS: { title: string; test: (f: OutputFile) => boolean }[] = [
  { title: '常驻内容', test: (f) => f.place === 'system_prompt' || f.place === 'index' },
  { title: 'skill', test: (f) => f.place === 'skill' },
  { title: '工具描述', test: (f) => f.place === 'tool' },
  { title: '运行时提醒', test: (f) => f.place === 'reminder' },
  { title: '参考资料', test: (f) => f.place === 'file' },
  { title: '辅助文件（不进上下文）', test: (f) => f.place === 'mechanisms' || f.place === 'manifest' },
];

/** 预览：agent 实际拿到的每个文件，以及它由哪些卡片拼成。 */
export default function PreviewView({ project, file, onFileChange, onOpenCard }: Props) {
  const { message } = App.useApp();
  const { build, template } = project;
  const [mode, setMode] = useState<'rendered' | 'raw'>('rendered');
  const refs = useMemo(() => indexTemplate(template), [template]);
  const diags = allDiagnostics(project);
  const current = build.files.find((f) => f.path === file) ?? build.files[0];

  const flagged = new Set(diags.filter((d) => d.file).map((d) => d.file));
  const items = GROUPS.map((g) => ({
    type: 'group' as const,
    label: g.title,
    children: build.files.filter(g.test).map((f) => ({
      key: f.path,
      label: (
        <Flex justify="space-between" gap={8}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {flagged.has(f.path) && <WarningFilled style={{ color: '#faad14', marginRight: 4 }} />}
            {f.path}
          </span>
          <span className="tree-count">{f.tokens ? `${f.tokens}` : ''}</span>
        </Flex>
      ),
    })),
  })).filter((g) => g.children.length);

  if (!current) return <Empty style={{ marginTop: 80 }} description="暂无输出" />;
  const fileDiags = diags.filter((d) => d.file === current.path || (d.card && current.sources.includes(d.card)));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.content);
      message.success(`已复制 ${current.path}`);
    } catch {
      message.error('复制失败，浏览器不允许访问剪贴板');
    }
  };

  return (
    <Flex style={{ height: '100%' }}>
      <div style={{ width: 340, flexShrink: 0, overflow: 'auto', background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <Typography.Paragraph type="secondary" style={{ padding: '12px 16px 0', fontSize: 12, marginBottom: 0 }}>
          输出目录：{project.root}/build/
        </Typography.Paragraph>
        <Menu mode="inline" selectedKeys={[current.path]} items={items} onClick={(e) => onFileChange(e.key)} style={{ borderInlineEnd: 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <div className="panel">
          <Flex align="center" gap={12} wrap style={{ marginBottom: 12 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              build/{current.path}
            </Typography.Title>
            <Tag>{PLACE_LABEL[current.place]}</Tag>
            <Typography.Text type="secondary">
              {current.lines} 行{current.tokens ? `，约 ${current.tokens} token` : '，不进上下文'}
            </Typography.Text>
            <div style={{ flex: 1 }} />
            <Segmented
              size="small"
              value={mode}
              onChange={(v) => setMode(v as 'rendered' | 'raw')}
              options={[
                { label: '渲染', value: 'rendered' },
                { label: '原文', value: 'raw' },
              ]}
            />
            <Button size="small" icon={<CopyOutlined />} onClick={copy}>
              复制
            </Button>
          </Flex>

          {fileDiags.length > 0 && (
            <div className="markdown-box" style={{ marginBottom: 12 }}>
              <DiagnosticList diagnostics={fileDiags} onOpenCard={onOpenCard} onOpenFile={onFileChange} />
            </div>
          )}

          <div className="markdown-box" data-color-mode="light">
            {mode === 'raw' || current.path.endsWith('.yaml') ? (
              <pre className="raw">{current.content}</pre>
            ) : (
              <MDEditor.Markdown source={renderable(current.content)} />
            )}
          </div>

          {current.sources.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>来源卡片（{current.sources.length}）</Typography.Text>
              <Flex vertical gap={4} style={{ marginTop: 8 }}>
                {current.sources.map((p) => {
                  const card = project.cards.find((c) => c.path === p);
                  const name = card ? refs.get(card.entry)?.entry.name : undefined;
                  return (
                    <Typography.Link key={p} onClick={() => onOpenCard(p)}>
                      {name ? `${name} · ` : ''}
                      {p}
                    </Typography.Link>
                  );
                })}
              </Flex>
            </div>
          )}
        </div>
      </div>
    </Flex>
  );
}
