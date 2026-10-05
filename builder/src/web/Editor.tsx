import { ArrowLeftOutlined, QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, App as AntApp, Badge, Button, Drawer, Empty, Result, Segmented, Spin, Tag, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card } from '../core/types';
import { AgentApiContext } from './agentContext';
import { agentApi, type ProjectPayload } from './api';
import CardEditor from './components/CardEditor';
import DiagnosticList from './components/DiagnosticList';
import Help from './components/Help';
import { EntryPanel, GroupPanel, Overview, PiecePanel } from './components/Panels';
import PreviewView from './components/PreviewView';
import Sidebar from './components/Sidebar';
import SkeletonEditor from './components/SkeletonEditor';
import { allDiagnostics, type Selection, type View } from './util';

interface Props {
  agentId: string;
  onBack: () => void;
}

/** 编辑一个 agent：编辑、骨架、预览三个视图。 */
export default function Editor({ agentId, onBack }: Props) {
  const { message, modal } = AntApp.useApp();
  const api = useMemo(() => agentApi(agentId), [agentId]);
  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [view, setView] = useState<View>('edit');
  const [selection, setSelection] = useState<Selection>({ type: 'overview' });
  const [previewFile, setPreviewFile] = useState('system-prompt.md');
  const [cardDirty, setCardDirty] = useState(false);
  const [skeletonDirty, setSkeletonDirty] = useState(false);
  const [skeletonKey, setSkeletonKey] = useState(0);
  const [diagOpen, setDiagOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    api.project().then(setProject, (e: Error) => setLoadError(e.message));
  }, [api]);

  // 有未保存的修改时，关闭页面前提醒
  useEffect(() => {
    if (!cardDirty && !skeletonDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [cardDirty, skeletonDirty]);

  /** 离开当前编辑之前，确认是否丢掉未保存的修改 */
  const guard = (go: () => void, includeSkeleton = false) => {
    if (!cardDirty && !(includeSkeleton && skeletonDirty)) return go();
    modal.confirm({
      title: '有未保存的修改',
      content: '离开会丢掉这些修改。',
      okText: '丢掉修改',
      okButtonProps: { danger: true },
      cancelText: '留下',
      onOk: () => {
        setCardDirty(false);
        setSkeletonDirty(false);
        go();
      },
    });
  };

  const select = (s: Selection) =>
    guard(() => {
      setSelection(s);
      setView('edit');
    });
  const openCard = (path: string) => select({ type: 'card', path });
  // 切到预览不卸载编辑器，草稿还在，所以不用确认
  const openFile = (file: string) => {
    setPreviewFile(file);
    setView('preview');
  };

  const reload = () =>
    guard(async () => {
      try {
        setProject(await api.rebuild());
        setSkeletonKey((k) => k + 1);
        message.success('已从磁盘重新读取');
      } catch (e) {
        message.error((e as Error).message);
      }
    }, true);

  const onCardSaved = useCallback((card: Card, p: ProjectPayload) => {
    setProject(p);
    setSelection({ type: 'card', path: card.path });
  }, []);

  if (loadError)
    return (
      <Result
        status="error"
        title="打不开这个 agent"
        subTitle={loadError}
        extra={
          <Button type="primary" onClick={onBack}>
            回到列表
          </Button>
        }
      />
    );
  if (!project) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />;

  const diags = allDiagnostics(project);
  const selectedCard = selection.type === 'card' ? project.cards.find((c) => c.path === selection.path) : undefined;
  const common = { project, onSelect: select, onOpenFile: openFile, onCreated: onCardSaved };

  let main: React.ReactNode;
  switch (selection.type) {
    case 'overview':
      main = <Overview {...common} />;
      break;
    case 'piece':
      main = <PiecePanel {...common} id={selection.id} />;
      break;
    case 'entry':
      main = <EntryPanel {...common} id={selection.id} />;
      break;
    case 'group':
      main = <GroupPanel {...common} when={selection.when} />;
      break;
    case 'card':
      main = selectedCard ? (
        <CardEditor
          key={selectedCard.path}
          project={project}
          card={selectedCard}
          onSaved={onCardSaved}
          onDeleted={(p) => {
            setProject(p);
            setCardDirty(false);
            setSelection({ type: 'entry', id: selectedCard.entry });
          }}
          onDirtyChange={setCardDirty}
          onOpenFile={openFile}
          onSelect={select}
        />
      ) : (
        <Empty style={{ marginTop: 80 }} description={`找不到这张卡片：${selection.path}`} />
      );
      break;
  }

  return (
    <AgentApiContext.Provider value={api}>
      <div className="app">
        <header className="app-header">
          <Tooltip title="全部 agent">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => guard(onBack, true)} />
          </Tooltip>
          <span className="app-title" onClick={() => select({ type: 'overview' })}>
            {project.agent.name}
          </span>
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { label: '编辑', value: 'edit' },
              { label: skeletonDirty ? '骨架 •' : '骨架', value: 'skeleton' },
              { label: '预览', value: 'preview' },
            ]}
          />
          <div style={{ flex: 1 }} />
          {cardDirty && <Tag color="orange">卡片未保存</Tag>}
          {diags.length > 0 && (
            <Button onClick={() => setDiagOpen(true)}>
              <Badge count={diags.length} size="small" offset={[6, -2]}>
                问题
              </Badge>
            </Button>
          )}
          <Tooltip title="在别处改了文件后，从磁盘重新读取">
            <Button icon={<ReloadOutlined />} onClick={reload} />
          </Tooltip>
          <Tooltip title="帮助">
            <Button icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} />
          </Tooltip>
        </header>

        {project.buildError && <Alert banner type="error" title={`没有写入 build/：${project.buildError}`} />}

        <div className="app-body" style={{ display: view === 'edit' ? 'flex' : 'none' }}>
          <aside className="app-sider">
            <Sidebar project={project} selection={selection} onSelect={select} />
          </aside>
          <main className={selection.type === 'card' ? 'app-main app-main-fill' : 'app-main'}>{main}</main>
        </div>
        <div className="app-body" style={{ display: view === 'skeleton' ? 'flex' : 'none' }}>
          <main className="app-main">
            <SkeletonEditor key={skeletonKey} project={project} onSaved={setProject} onDirtyChange={setSkeletonDirty} />
          </main>
        </div>
        <div className="app-body" style={{ display: view === 'preview' ? 'flex' : 'none' }}>
          <main className="app-main app-main-fill">
            <PreviewView project={project} file={previewFile} onFileChange={setPreviewFile} onOpenCard={openCard} />
          </main>
        </div>

        <Drawer title="问题" open={diagOpen} onClose={() => setDiagOpen(false)} size={480}>
          <DiagnosticList
            diagnostics={diags}
            onOpenCard={(p) => {
              setDiagOpen(false);
              openCard(p);
            }}
            onOpenFile={(f) => {
              setDiagOpen(false);
              openFile(f);
            }}
          />
        </Drawer>
        <Drawer title="帮助" open={helpOpen} onClose={() => setHelpOpen(false)} size={520}>
          <Help />
        </Drawer>
        <Typography.Text style={{ display: 'none' }}>{project.root}</Typography.Text>
      </div>
    </AgentApiContext.Provider>
  );
}
