import { ArrowLeftOutlined, FileTextOutlined, QuestionCircleOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Alert, App, Badge, Button, Drawer, Result, Segmented, Spin, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../core/phrases';
import { contentLang } from '../core/outline';
import type { DefPatch } from '../core/types';
import { EditorContext, type PageState } from './agentContext';
import { agentApi, type ProjectPayload, type ServerProject } from './api';
import { useLang } from './i18n';
import DiagnosticList from './components/DiagnosticList';
import Help from './components/Help';
import ItemPage from './components/ItemPage';
import OutlineTree from './components/OutlineTree';
import PartPage from './components/PartPage';
import PromptPane from './components/PromptPane';
import SectionPage from './components/SectionPage';
import { canonical, firstRoute, hashOf, parseRouteKey, routeInHash, routeKey, sectionOf, type Route } from './util';

interface Props {
  agentId: string;
  onBack: () => void;
}

/** 界面语言的大纲给界面用，内容语言的大纲给生成和例子用 */
function localize(raw: ServerProject, lang: Lang): ProjectPayload {
  return { ...raw, template: raw.templates[lang], contentTemplate: raw.templates[contentLang(raw.def)] };
}

/** 语言切换：中文 / English */
export function LangSwitch() {
  const { lang, setLang, t } = useLang();
  return <Segmented<Lang> size="small" value={lang} onChange={setLang} options={(['zh', 'en'] as Lang[]).map((l) => ({ value: l, label: t.langName[l] }))} />;
}

/** 打开一个 agent 之后的界面：左边目录，中间配置，右边是由配置合成的系统提示词。 */
export default function Editor({ agentId, onBack }: Props) {
  const { message, modal } = App.useApp();
  const { lang, t } = useLang();
  const api = useMemo(() => agentApi(agentId), [agentId]);
  const [raw, setProject] = useState<ServerProject>();
  const project = useMemo(() => (raw ? localize(raw, lang) : undefined), [raw, lang]);
  const [error, setError] = useState<string>();
  const [wanted, setWanted] = useState<Route | undefined>(routeInHash);
  const [live, setLive] = useState<DefPatch>();
  const [showPrompt, setShowPrompt] = useState(true);
  const [showProblems, setShowProblems] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [reloading, setReloading] = useState(false);
  const page = useRef<PageState>({ dirty: false });

  // 换了界面语言也重新取一次：问题提示是服务端按界面语言写的
  useEffect(() => {
    api.project().then(setProject, (e: Error) => setError(e.message));
  }, [api, lang]);

  const template = project?.template;
  const route = template ? canonical(template, wanted ?? firstRoute(template)) : undefined;
  const key = route ? routeKey(route) : '';

  // 网址跟着当前位置走，刷新网页后还在原处；手动改了网址，位置也跟着走
  useEffect(() => {
    if (route) history.replaceState(null, '', hashOf(agentId, route));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, key]);
  useEffect(() => {
    const onHash = () => setWanted(routeInHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // 换页后回到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const setPage = useCallback((state: PageState) => {
    page.current = state;
  }, []);

  /** 当前页有没保存的修改时，先问要不要保存，再做后面的事 */
  const guard = useCallback(
    (then: () => void) => {
      const { dirty, save } = page.current;
      if (!dirty) return then();
      const asked = modal.confirm({
        title: t.unsavedTitle,
        content: t.unsavedContent,
        okText: t.save,
        cancelText: t.stay,
        onOk: async () => {
          if (await save?.()) then();
        },
        footer: (_, { OkBtn, CancelBtn }) => (
          <>
            <Button
              danger
              onClick={() => {
                asked.destroy();
                page.current = { dirty: false };
                then();
              }}
            >
              {t.discard}
            </Button>
            <CancelBtn />
            <OkBtn />
          </>
        ),
      });
    },
    [modal, t],
  );

  const jump = useCallback((next: Route) => setWanted(next), []);
  const go = useCallback(
    (next: Route) => {
      if (template && routeKey(canonical(template, next)) === key) return;
      guard(() => setWanted(next));
    },
    [template, key, guard],
  );

  const reload = async () => {
    setReloading(true);
    try {
      setProject(await api.project());
      message.success(t.reloaded);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setReloading(false);
    }
  };

  const context = useMemo(() => (project ? { api, project, setProject, go, jump, setPage, setLive } : null), [api, project, go, jump, setPage]);

  if (error) return <Result status="error" title={t.cannotOpen} subTitle={error} extra={<Button onClick={onBack}>{t.backToList}</Button>} />;
  if (!project || !context || !route || !template) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />;

  const { def, build } = project;
  const errors = build.diagnostics.filter((d) => d.severity === 'error').length;
  const section = route.type === 'section' ? template.prompt.sections.find((s) => s.id === route.id) : undefined;
  const part = route.type === 'part' ? template.parts.find((p) => p.id === route.id) : undefined;

  const actions = [
    <Tooltip key="prompt" title={showPrompt ? t.hidePreview : t.showPreview}>
      <Button type={showPrompt ? 'default' : 'text'} icon={<FileTextOutlined />} onClick={() => setShowPrompt((x) => !x)}>
        {t.preview}
      </Button>
    </Tooltip>,
    <Badge key="problems" count={build.diagnostics.length} size="small" color={errors ? undefined : '#faad14'} offset={[-4, 4]}>
      <Button type="text" icon={<WarningOutlined />} onClick={() => setShowProblems(true)}>
        {t.problems}
      </Button>
    </Badge>,
    <Tooltip key="reload" title={t.reloadHint}>
      <Button type="text" icon={<ReloadOutlined />} loading={reloading} onClick={reload}>
        {t.reload}
      </Button>
    </Tooltip>,
    <Button key="help" type="text" icon={<QuestionCircleOutlined />} onClick={() => setShowHelp(true)}>
      {t.help}
    </Button>,
    <LangSwitch key="lang" />,
  ];

  return (
    <EditorContext.Provider value={context}>
      <ProLayout
        layout="mix"
        title={def.config.name || agentId}
        logo={<ArrowLeftOutlined />}
        onMenuHeaderClick={() => guard(onBack)}
        fixedHeader
        fixSiderbar
        siderWidth={260}
        collapsed={false}
        collapsedButtonRender={false}
        disableMobile
        pageTitleRender={false}
        footerRender={false}
        contentStyle={{ padding: 0 }}
        token={{ header: { colorBgHeader: '#fff' } }}
        actionsRender={() => actions}
        menuContentRender={() => <OutlineTree route={route} />}
      >
        <div className="workspace">
          <div className="workspace-main">
            {project.buildError && <Alert type="error" showIcon title={t.buildNotWritten} description={project.buildError} style={{ margin: 16 }} />}
            {route.type === 'section' && (section ? <SectionPage key={section.id} section={section} /> : <Result status="warning" title={t.noSuchPage} />)}
            {route.type === 'part' && (part ? <PartPage key={part.id} part={part} /> : <Result status="warning" title={t.noSuchPage} />)}
            {route.type === 'item' && <ItemPage key={key} kind={route.kind} id={route.id} />}
          </div>
          {showPrompt && (
            <aside className="workspace-prompt">
              <PromptPane focus={sectionOf(template, route, def)} live={live} onClose={() => setShowPrompt(false)} />
            </aside>
          )}
        </div>
      </ProLayout>

      <Drawer title={t.problems} open={showProblems} onClose={() => setShowProblems(false)} size={480}>
        <DiagnosticList
          diagnostics={build.diagnostics}
          onOpen={(target) => {
            const next = parseRouteKey(target);
            setShowProblems(false);
            if (next) go(next);
          }}
        />
      </Drawer>
      <Help open={showHelp} onClose={() => setShowHelp(false)} />
    </EditorContext.Provider>
  );
}
