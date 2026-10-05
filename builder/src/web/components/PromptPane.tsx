import { CloseOutlined, LockOutlined } from '@ant-design/icons';
import { App, Button, Flex, Radio, Segmented, Tag, theme, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { INSERT_FILE, renderInsertions, renderPrompt, renderReminder } from '../../core/compile';
import { estimateTokens } from '../../core/tokens';
import type { AgentDef, DefPatch, Template } from '../../core/types';
import { LIST_KINDS } from '../../core/types';
import { text } from '../../core/outline';
import { useEditor } from '../agentContext';
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

/** 运行时由系统插入消息的内容：运行信息（每条消息、会话开始），到时机时的自动提醒 */
function insertBlocks(template: Template, def: AgentDef): Block[] {
  const { perMessage, sessionStart, memory } = renderInsertions(def);
  const provided = { section: sectionWithAuto(template, 'insert_note'), route: { type: 'part', id: 'environment' } as Route };
  const blocks: Block[] = [];
  if (perMessage) blocks.push({ key: 'per_message', ...provided, content: `## 每条消息开头\n\n${fence(perMessage)}` });
  const once = '## 会话开始和压缩之后\n\n';
  if (sessionStart) blocks.push({ key: 'session_start', ...provided, content: once + fence(sessionStart) });
  if (memory) blocks.push({ key: 'memory', section: sectionWithAuto(template, 'memory_list'), route: { type: 'part', id: 'memory' }, content: (sessionStart ? '' : once) + fence(memory) });
  const reminders = def.reminders.filter((r) => text(r.name) && text(r.trigger));
  reminders.forEach((r, i) =>
    blocks.push({
      key: `reminder:${r.id}`,
      section: sectionWithAuto(template, 'insert_note'),
      route: { type: 'item', kind: 'reminders', id: r.id },
      content: `${i === 0 ? '## 到时机时\n\n' : ''}**${text(r.trigger)}**\n\n${fence(renderReminder(r))}`,
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
  const { token } = theme.useToken();
  const { template } = project;
  const [mode, setMode] = useState<Mode>('rendered');
  const [view, setView] = useState<View>('prompt');
  const body = useRef<HTMLDivElement>(null);

  const def = useMemo(() => merged(project.def, live), [project.def, live]);
  const blocks = useMemo<Block[]>(
    () =>
      view === 'insert'
        ? insertBlocks(template, def)
        : renderPrompt(template, def).map((seg) => {
            const id = seg.target.slice('section:'.length);
            return { key: seg.target, section: id, route: canonical(template, { type: 'section', id }), content: seg.content };
          }),
    [template, def, view],
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
      message.success('已复制');
    } catch {
      message.error('复制失败');
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
              { value: 'prompt', label: `${template.prompt.name}预览` },
              { value: 'insert', label: '自动插入内容预览' },
            ]}
          />
          <span style={{ flex: 1 }} />
          <Tooltip title="收起">
            <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
          </Tooltip>
        </Flex>
        <Flex align="center" gap={8} className="prompt-pane-meta">
          <Tooltip title="由左边的配置自动生成，不能直接改">
            <Tag icon={<LockOutlined />} style={{ margin: 0 }}>
              自动生成
            </Tag>
          </Tooltip>
          {view === 'prompt' ? (
            <span>
              system-prompt.md ·{' '}
              <span style={tokens > budget ? { color: token.colorWarning } : undefined}>
                约 {tokens} / {budget} token
              </span>
            </span>
          ) : (
            <span>{INSERT_FILE} · 值是示例，运行时由系统填</span>
          )}
          <span style={{ flex: 1 }} />
          <Segmented<Mode>
            size="small"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'rendered', label: '排版' },
              { value: 'raw', label: '原文' },
            ]}
          />
          <Button size="small" onClick={copy}>
            复制
          </Button>
        </Flex>
      </div>
      <div className="prompt-pane-body" ref={body}>
        {blocks.map((b) => (
          <div key={b.key} data-section={b.section} className={`prompt-seg${b.section && b.section === focus ? ' prompt-seg-focus' : ''}`}>
            <Typography.Link className="prompt-seg-edit" onClick={() => go(b.route)}>
              去配置
            </Typography.Link>
            {mode === 'rendered' ? <Markdown source={b.content} /> : <pre className="prompt-raw">{b.content}</pre>}
          </div>
        ))}
        {!blocks.length && <Typography.Text type="secondary">还没有内容</Typography.Text>}
      </div>
    </div>
  );
}
