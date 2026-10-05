import { CloseOutlined, LockOutlined } from '@ant-design/icons';
import { App, Button, Flex, Radio, Segmented, Tag, theme, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { INSERT_FILE, renderInsertions, renderPrompt, renderReminder } from '../../core/compile';
import { estimateTokens } from '../../core/tokens';
import type { AgentDef, DefPatch, Template } from '../../core/types';
import { LIST_KINDS } from '../../core/types';
import { text } from '../../core/outline';
import { useEditor } from '../agentContext';
import { useLang } from '../i18n';
import { canonical, type Route } from '../util';
import Markdown from './Markdown';

type Mode = 'rendered' | 'raw';
type View = 'prompt' | 'insert';

/** 右栏里的一段：对应系统提示词的哪一节（用来滚动和高亮）、去哪儿配置 */
interface Block {
  key: string;
  section?: string;
  route: Route;
  content: string;
}

/** 系统提示词里写着某段自动内容说明的那一节 */
function sectionWithAuto(template: Template, auto: string): string | undefined {
  return template.prompt.sections.find((s) => (s.auto ?? []).some((a) => a.id === auto))?.id;
}

const fence = (body: string) => '```\n' + body + '\n```';

/** 小标题用界面语言，插入的内容本身用内容语言 */
interface InsertLabels {
  perMessage: string;
  sessionStart: string;
  onTrigger: string;
}

/** 运行时由系统插入消息的内容：运行信息（每条消息、会话开始），到时机时的自动提醒 */
function insertBlocks(template: Template, def: AgentDef, labels: InsertLabels): Block[] {
  const { perMessage, sessionStart, memory } = renderInsertions(template, def);
  const provided = { section: sectionWithAuto(template, 'insert_note'), route: { type: 'part', id: 'environment' } as Route };
  const blocks: Block[] = [];
  if (perMessage) blocks.push({ key: 'per_message', ...provided, content: `## ${labels.perMessage}\n\n${fence(perMessage)}` });
  const once = `## ${labels.sessionStart}\n\n`;
  if (sessionStart) blocks.push({ key: 'session_start', ...provided, content: once + fence(sessionStart) });
  if (memory) blocks.push({ key: 'memory', section: sectionWithAuto(template, 'memory_list'), route: { type: 'part', id: 'memory' }, content: (sessionStart ? '' : once) + fence(memory) });
  const reminders = def.reminders.filter((r) => text(r.name) && text(r.trigger));
  reminders.forEach((r, i) =>
    blocks.push({
      key: `reminder:${r.id}`,
      section: sectionWithAuto(template, 'insert_note'),
      route: { type: 'item', kind: 'reminders', id: r.id },
      content: `${i === 0 ? `## ${labels.onTrigger}\n\n` : ''}**${text(r.trigger)}**\n\n${fence(renderReminder(template, r))}`,
    }),
  );
  return blocks;
}

/** 已保存的内容加上当前页还没保存的修改 */
function merged(def: AgentDef, live?: DefPatch): AgentDef {
  if (!live) return def;
  const next: AgentDef = { ...def, prompt: { ...def.prompt, ...(live.prompt ?? {}) }, config: { ...def.config, ...(live.config ?? {}) } };
  for (const kind of LIST_KINDS) if (live[kind]) next[kind] = live[kind]!;
  return next;
}

interface Props {
  /** 当前配置页对应系统提示词里的哪一节 */
  focus?: string;
  /** 当前页还没保存的修改 */
  live?: DefPatch;
  onClose: () => void;
}

/** 右边：由配置合成的系统提示词，只能看，不能改。 */
export default function PromptPane({ focus, live, onClose }: Props) {
  const { project, go } = useEditor();
  const { message } = App.useApp();
  const { t } = useLang();
  const { token } = theme.useToken();
  // 预览就是生成结果，用内容语言的大纲；只有界面上的字用界面语言
  const template = project.contentTemplate;
  const [mode, setMode] = useState<Mode>('rendered');
  const [view, setView] = useState<View>('prompt');
  const body = useRef<HTMLDivElement>(null);

  const def = useMemo(() => merged(project.def, live), [project.def, live]);
  const blocks = useMemo<Block[]>(
    () =>
      view === 'insert'
        ? insertBlocks(template, def, { perMessage: t.perMessage, sessionStart: t.sessionStart, onTrigger: t.onTrigger })
        : renderPrompt(template, def).map((seg) => {
            const id = seg.target.slice('section:'.length);
            return { key: seg.target, section: id, route: canonical(template, { type: 'section', id }), content: seg.content };
          }),
    [template, def, view, t],
  );
  const full = blocks.map((b) => b.content).join('\n\n');
  const tokens = estimateTokens(full);
  const budget = template.budgets.system_prompt_tokens;

  // 换到哪一页，就滚到系统提示词里对应的那一节
  useEffect(() => {
    const el = focus ? body.current?.querySelector<HTMLElement>(`[data-section="${focus}"]`) : undefined;
    if (el && body.current) body.current.scrollTo({ top: el.offsetTop - 12 });
  }, [focus, mode, view]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full + '\n');
      message.success(t.copied);
    } catch {
      message.error(t.copyFailed);
    }
  };

  return (
    <div className="prompt-pane">
      <div className="prompt-pane-head">
        <Flex align="center" gap={8}>
          <Radio.Group
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { value: 'prompt', label: t.promptPreview },
              { value: 'insert', label: t.insertPreview },
            ]}
          />
          <span style={{ flex: 1 }} />
          <Tooltip title={t.collapse}>
            <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
          </Tooltip>
        </Flex>
        <Flex align="center" gap={8} className="prompt-pane-meta">
          <Tooltip title={t.autoGeneratedHint}>
            <Tag icon={<LockOutlined />} style={{ margin: 0 }}>
              {t.autoGenerated}
            </Tag>
          </Tooltip>
          <Tag style={{ margin: 0 }}>{t.langName[template.language]}</Tag>
          {view === 'prompt' ? (
            <span>
              system-prompt.md ·{' '}
              <span style={tokens > budget ? { color: token.colorWarning } : undefined}>
                {t.aboutTokens(tokens, budget)}
              </span>
            </span>
          ) : (
            <span>
              {INSERT_FILE} · {t.insertMeta}
            </span>
          )}
          <span style={{ flex: 1 }} />
          <Segmented<Mode>
            size="small"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'rendered', label: t.rendered },
              { value: 'raw', label: t.raw },
            ]}
          />
          <Button size="small" onClick={copy}>
            {t.copy}
          </Button>
        </Flex>
      </div>
      <div className="prompt-pane-body" ref={body}>
        {blocks.map((b) => (
          <div key={b.key} data-section={b.section} className={`prompt-seg${b.section && b.section === focus ? ' prompt-seg-focus' : ''}`}>
            <Typography.Link className="prompt-seg-edit" onClick={() => go(b.route)}>
              {t.configure}
            </Typography.Link>
            {mode === 'rendered' ? <Markdown source={b.content} /> : <pre className="prompt-raw">{b.content}</pre>}
          </div>
        ))}
        {!blocks.length && <Typography.Text type="secondary">{t.noContent}</Typography.Text>}
      </div>
    </div>
  );
}
