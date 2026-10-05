// 合成：把大纲里填的内容，合成 agent 最终拿到的文件。纯函数，不碰磁盘。

import YAML from 'yaml';
import type { AgentDef, AutoId, BuildResult, Diagnostic, FileGroup, Item, OutputFile, PromptSection, Segment, Template } from './types';
import { LIST_KINDS } from './types';
import { ID_RULES, itemFields, listDef, optionLabel, placeOf, selectValue, text } from './outline';
import { countLines, estimateTokens } from './tokens';

export const SYSTEM_PROMPT_FILE = 'system-prompt.md';
export const GUARANTEES_FILE = 'guarantees.md';
export const TOOLS_FILE = 'tools.json';
export const CASES_FILE = 'cases.md';
export const INSERT_FILE = 'auto-insert.md';
/** 自动插入的信息用这个标签包起来，系统提示词里说明它是什么 */
export const INSERT_TAG = '运行信息';

/** 自动加载的记忆用这个标签包起来 */
export const MEMORY_TAG = '记忆';
/** 到时机时插入的提醒用这个标签包起来 */
export const REMINDER_TAG = '系统提醒';

/** 一条提醒插入时的样子 */
export const renderReminder = (r: Item): string => `<${REMINDER_TAG}>\n${text(r.text) || '（还没写提醒的内容）'}\n</${REMINDER_TAG}>`;

/** 系统自动插入消息的内容：每条消息开头一块；会话开始和压缩之后，运行信息一块、自动加载的记忆一块。用示例值预览，真实的值由系统运行时填 */
export function renderInsertions(def: AgentDef): { perMessage: string; sessionStart: string; memory: string } {
  const block = (items: Item[]) =>
    items.length ? [`<${INSERT_TAG}>`, ...items.map((x) => `${x.name}：${text(x.sample) || '（由系统填写）'}`), `</${INSERT_TAG}>`].join('\n') : '';
  const items = def.provided.filter((x) => text(x.name));
  const memory = autoMemory(def);
  return {
    perMessage: block(items.filter((x) => x.where !== 'session_start')),
    sessionStart: block(items.filter((x) => x.where === 'session_start')),
    memory: memory.length ? [`<${MEMORY_TAG}>`, ...memory.map((m) => `## ${m.name}（${text(m.path)}）\n（系统读入这个文件的内容）`), `</${MEMORY_TAG}>`].join('\n') : '',
  };
}

/** 开工和压缩之后由系统自动加载的记忆 */
const autoMemory = (def: AgentDef): Item[] => def.memory.filter((m) => text(m.name) && text(m.path) && m.load !== 'on_demand');
export const MANIFEST_FILE = 'manifest.yaml';

/** 句子末尾补句号 */
const sentence = (s: string): string => (s && !/[。．.!！?？；;：:]$/.test(s) ? `${s}。` : s);

/** skill 的头部：这两格进系统提示词的 Skill 目录，其余是正文 */
const SKILL_HEAD = ['when_use', 'when_not'];

export function skillHasBody(template: Template, skill: Item): boolean {
  return listDef(template, 'skills').fields.some((f) => !SKILL_HEAD.includes(f.id) && text(skill[f.id]));
}

export function skillDescription(skill: Item): string {
  const use = sentence(text(skill.when_use));
  const not = text(skill.when_not);
  return [use, not ? `不用于：${sentence(not)}` : ''].filter(Boolean).join('');
}

/** 自己实现的工具进工具定义；平台自带和 MCP 的工具说明改不了，补充用法进系统提示词 */
const isOwnTool = (tool: Item): boolean => !tool.source || tool.source === 'own';

/** 知识放在别处时，写的是位置；写在这里时，生成一个文件 */
const isInlineKnowledge = (k: Item): boolean => k.form !== 'elsewhere';
const knowledgeWhere = (k: Item): string => (isInlineKnowledge(k) ? (text(k.content) ? `knowledge/${k.id}.md` : '') : text(k.location));

/** 工具的影响，对应 MCP 的工具标注 */
const EFFECT_ANNOTATIONS: Record<string, Record<string, boolean>> = {
  read: { readOnlyHint: true },
  local: { readOnlyHint: false, destructiveHint: false },
  irreversible: { readOnlyHint: false, destructiveHint: true },
  external: { readOnlyHint: false, openWorldHint: true },
};

/** 表格里的一格：去掉换行，转义竖线 */
const cell = (v: unknown): string => text(v).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|') || '—';

/** 一张清单按 group_by 那一格分块，每块一串条目；只有一块时不加小标题 */
function groupedLines(template: Template, kind: 'memory' | 'outputs', items: Item[], line: (x: Item) => string): string {
  const list = listDef(template, kind);
  const by = list.fields.find((f) => f.id === list.group_by);
  const options = by?.options ?? [];
  const rank = (x: Item) => {
    const i = options.findIndex((o) => o.value === (by ? selectValue(by, x[by.id]) : undefined));
    return i < 0 ? options.length : i;
  };
  const sorted = [...items].sort((a, b) => rank(a) - rank(b));
  const lines = (rows: Item[]) => rows.map(line).join('\n');
  const groups = [...new Set(sorted.map(rank))];
  if (!by || groups.length === 1) return lines(sorted);
  return groups.map((g) => `**${options[g]?.label ?? '其他'}**\n\n${lines(sorted.filter((x) => rank(x) === g))}`).join('\n\n');
}

/** 一样产出物的一行：放在哪、写什么、什么时候写、怎么改 */
function outputLine(template: Template, o: Item): string {
  const list = listDef(template, 'outputs');
  const bits = [`- **${o.name}**（\`${text(o.path) || '—'}\`）：`];
  if (text(o.format)) bits.push(sentence(text(o.format)));
  if (text(o.when)) bits.push(`什么时候写：${sentence(text(o.when))}`);
  bits.push(`${optionLabel(list, 'write', o)}。`);
  if (o.confirm === true) bits.push('用户确认后才算数。');
  return bits.join('');
}

/** 选了某个 skill 的产出物写进那个 skill；没选、或选的 skill 不生成的，写进系统提示词 */
function outputsOf(template: Template, def: AgentDef, skillId?: string): Item[] {
  const generated = new Set(def.skills.filter((s) => skillHasBody(template, s)).map((s) => s.id));
  return def.outputs.filter((o) => text(o.name) && (skillId ? o.skill === skillId : !generated.has(String(o.skill ?? ''))));
}

/** 系统提示词里自动生成的正文（不含标题）。来源还没填时返回空串。 */
export function renderAuto(id: AutoId, template: Template, def: AgentDef): string {
  const named = (items: Item[]) => items.filter((x) => text(x.name));
  switch (id) {
    case 'guarantee_note': {
      // 规矩本身写在它该在的地方；这里只告诉 agent 有系统在拦，被拦下时怎么办
      if (!named(def.guarantees).length) return '';
      return '有些操作会被系统直接拦下。被拦下时不要换一种方式绕过去，向用户说明。';
    }
    case 'insert_note': {
      const line = (x: Item) => `- **${x.name}**${text(x.explain) ? `：${sentence(text(x.explain))}` : ''}`;
      const provided = named(def.provided);
      const each = provided.filter((x) => x.where !== 'session_start');
      const once = provided.filter((x) => x.where === 'session_start');
      const memory = autoMemory(def);
      const parts: string[] = [];
      if (each.length) parts.push(`每条消息开头的 <${INSERT_TAG}>：\n\n${each.map(line).join('\n')}`);
      if (once.length) parts.push(`会话开始和压缩之后的 <${INSERT_TAG}>：\n\n${once.map(line).join('\n')}`);
      if (memory.length) parts.push(`会话开始和压缩之后的 <${MEMORY_TAG}>：${memory.map((m) => m.name).join('、')}，见「记忆」。`);
      if (named(def.reminders).some((r) => text(r.text))) parts.push(`<${REMINDER_TAG}>：到一定时机由系统插入，告诉你该做什么。`);
      if (!parts.length) return '';
      return [`系统会往消息里插入下面这些内容。它们来自系统，不是用户说的话。`, ...parts].join('\n\n');
    }
    case 'skill_index': {
      const skills = def.skills.filter((s) => skillHasBody(template, s));
      if (!skills.length) return '';
      const lines = skills.map((s) => `- **${s.name}**（\`${s.id}\`）：${skillDescription(s)}`);
      return `下面这些 skill 平时不加载。遇到对应的情况时，先读这个 skill，再动手。\n\n${lines.join('\n')}`;
    }
    case 'knowledge_index': {
      const docs = def.knowledge.filter((k) => text(k.name) && knowledgeWhere(k));
      if (!docs.length) return '';
      const lines = docs.map((k) => {
        if (isInlineKnowledge(k)) return `- **${k.name}**（\`${knowledgeWhere(k)}\`）：${sentence(text(k.when))}`;
        const source = text(k.source) ? `来源：${sentence(text(k.source))}` : '';
        return `- **${k.name}**：${sentence(text(k.when))}位置：${sentence(knowledgeWhere(k))}${source}`;
      });
      return `下面这些资料平时不加载，需要时去对应的位置查。\n\n${lines.join('\n')}`;
    }
    case 'tool_notes': {
      const list = listDef(template, 'tools');
      const notes = named(def.tools).filter((t) => !isOwnTool(t) && (text(t.when) || text(t.usage)));
      if (!notes.length) return '';
      const lines = notes.map((t) => {
        const bits = [`- **${t.name}**（\`${t.id}\`）：`];
        if (text(t.when)) bits.push(`什么时候用：${sentence(text(t.when))}`);
        if (text(t.usage)) bits.push(sentence(text(t.usage)));
        bits.push(`影响：${optionLabel(list, 'effect', t)}。`);
        return bits.join('');
      });
      return `下面这些工具由平台或 MCP 提供，补充用法如下：\n\n${lines.join('\n')}`;
    }
    case 'helper_list': {
      const helpers = named(def.helpers);
      if (!helpers.length) return '';
      return helpers
        .map((h) => {
          const bits = [`- **${h.name}**：${sentence(text(h.purpose))}`];
          const more: [string, unknown][] = [
            ['什么时候交给它', h.when],
            ['交代', h.brief],
            ['交回', h.returns],
            ['检查', h.check],
          ];
          for (const [label, v] of more) if (text(v)) bits.push(`${label}：${sentence(text(v))}`);
          return bits.join('');
        })
        .join('\n');
    }
    case 'memory_list': {
      const items = named(def.memory);
      if (!items.length) return '';
      const auto = new Set(autoMemory(def));
      const line = (m: Item) => {
        const bits = [`- **${m.name}**（\`${text(m.path) || '—'}\`${auto.has(m) ? '，自动加载' : '，需要时读'}）：`];
        if (text(m.format)) bits.push(sentence(text(m.format)));
        if (text(m.when)) bits.push(`什么时候更新：${sentence(text(m.when))}`);
        if (text(m.write)) bits.push(sentence(text(m.write)));
        return bits.join('');
      };
      return groupedLines(template, 'memory', items, line);
    }
    case 'output_list': {
      const items = outputsOf(template, def);
      if (!items.length) return '';
      return groupedLines(template, 'outputs', items, (o) => outputLine(template, o));
    }
  }
}

/** 系统提示词的一节里，按顺序排好的内容块：人写的格子和自动生成的部分 */
export interface SectionBlock {
  kind: 'field' | 'auto';
  id: string;
  /** 二级标题；一节只有一块时没有 */
  heading?: string;
  content: string;
}

/** 一节里有内容的块。一节有两格以上要进系统提示词时，每块一个二级标题；否则都直接写在节标题下。 */
export function sectionBlocks(section: PromptSection, template: Template, def: AgentDef): SectionBlock[] {
  const fields = section.fields.filter((f) => f.prompt !== false);
  const titled = !section.opening && fields.length + (section.auto ?? []).length > 1;
  let blocks: SectionBlock[] = [
    ...fields.map((f) => ({ kind: 'field' as const, id: f.id, heading: f.label, content: text(def.prompt[f.id]) })),
    ...(section.auto ?? []).map((a) => ({ kind: 'auto' as const, id: a.id, heading: a.label, content: renderAuto(a.id, template, def) })),
  ];
  if (section.order) {
    const rank = (id: string) => (section.order!.includes(id) ? section.order!.indexOf(id) : section.order!.length);
    blocks = [...blocks].sort((x, y) => rank(x.id) - rank(y.id));
  }
  return blocks.filter((b) => b.content).map((b) => (titled ? b : { kind: b.kind, id: b.id, content: b.content }));
}

/** 系统提示词的一节。整节都没内容时返回空串。 */
export function renderSection(section: PromptSection, template: Template, def: AgentDef): string {
  const body = sectionBlocks(section, template, def)
    .map((b) => (b.heading ? `## ${b.heading}\n\n${b.content}` : b.content))
    .join('\n\n');
  if (!body) return '';
  return section.opening ? body : `# ${section.name}\n\n${body}`;
}

/** 整份系统提示词，按节分段 */
export function renderPrompt(template: Template, def: AgentDef): Segment[] {
  const segments: Segment[] = [];
  for (const section of template.prompt.sections) {
    const content = renderSection(section, template, def);
    if (content) segments.push({ heading: section.name, content, target: `section:${section.id}` });
  }
  return segments;
}

function renderSkill(template: Template, def: AgentDef, skill: Item): { main: string; reference?: string } {
  const front = YAML.stringify({ name: skill.id, description: skillDescription(skill) }, { lineWidth: 0 }).trimEnd();
  const parts = [`---\n${front}\n---`, `# ${skill.name}`];
  for (const f of listDef(template, 'skills').fields) {
    if (SKILL_HEAD.includes(f.id) || f.id === 'reference') continue;
    const v = text(skill[f.id]);
    if (v) parts.push(`## ${f.label}\n\n${v}`);
  }
  const outputs = outputsOf(template, def, skill.id);
  if (outputs.length) parts.push(`## 产出物\n\n${outputs.map((o) => outputLine(template, o)).join('\n')}`);
  const reference = text(skill.reference);
  if (reference) parts.push(`## 附带资料\n\n需要时读同目录下的 [reference.md](reference.md)。`);
  return {
    main: parts.join('\n\n') + '\n',
    reference: reference ? `# ${skill.name} · 附带资料\n\n${reference}\n` : undefined,
  };
}

/** 一个工具的说明，写进工具定义的 description */
export function toolDescription(template: Template, tool: Item): string {
  const list = listDef(template, 'tools');
  const parts: string[] = [];
  if (text(tool.purpose)) parts.push(sentence(text(tool.purpose)));
  if (text(tool.when)) parts.push(`什么时候用：${sentence(text(tool.when))}`);
  for (const f of itemFields(list, tool)) {
    if (['purpose', 'when'].includes(f.id) || f.options) continue;
    const v = text(tool[f.id]);
    if (v) parts.push(`${f.label}：\n${v}`);
  }
  parts.push(`影响：${optionLabel(list, 'effect', tool)}。`);
  return parts.join('\n\n');
}

function renderGuarantees(def: AgentDef): string {
  const parts = ['# 系统保证', '这些规矩必须由系统强制执行，不能只靠提示词。本文件交给工程实现，不给 agent 看。'];
  const rules = def.guarantees.filter((g) => text(g.name));
  if (!rules.length) parts.push('（还没有）');
  for (const g of rules) parts.push(`## ${text(g.name)}\n\n怎么强制：${text(g.how) || '（还没写）'}`);
  return parts.join('\n\n') + '\n';
}

function renderCases(def: AgentDef): string {
  const parts = ['# 检验用例', '用来检验 agent 做得对不对。本文件不给 agent 看。'];
  const cases = def.cases.filter((c) => text(c.name) || text(c.scenario));
  if (!cases.length) parts.push('（还没有）');
  for (const c of cases) {
    const lines = [`- 情景：${text(c.scenario) || '（还没写）'}`, `- 应该怎么做：${text(c.expected) || '（还没写）'}`];
    if (text(c.check)) lines.push(`- 怎么判定：${text(c.check)}`);
    parts.push(`## ${text(c.name) || '未命名'}\n\n${lines.join('\n')}`);
  }
  return parts.join('\n\n') + '\n';
}

export function compile(template: Template, def: AgentDef): BuildResult {
  const diags: Diagnostic[] = [];
  const files: OutputFile[] = [];
  const add = (path: string, group: FileGroup, title: string, content: string, target: string, segments?: Segment[]) => {
    files.push({
      path,
      group,
      title,
      content,
      tokens: group === 'hidden' ? 0 : estimateTokens(content),
      lines: countLines(content),
      target,
      ...(segments ? { segments } : {}),
    });
  };
  const usable = checkIds(template, def, diags);

  // 一开始就给：系统提示词
  const segments = renderPrompt(template, def);
  const prompt = segments.map((s) => s.content).join('\n\n');
  add(SYSTEM_PROMPT_FILE, 'start', '系统提示词', prompt ? prompt + '\n' : '', `section:${template.prompt.sections[0].id}`, segments);
  const promptTokens = files[0].tokens;
  if (promptTokens > template.budgets.system_prompt_tokens) {
    diags.push({
      severity: 'warning',
      message: `系统提示词约 ${promptTokens} token，超过建议上限 ${template.budgets.system_prompt_tokens}。只在某类任务里用的内容，可以挪进对应的 skill`,
    });
  }

  // 一开始就给：工具定义，由程序随请求交给模型（API 会把它们和系统提示词拼在一起）
  const tools = def.tools.filter((t) => usable.has(t) && isOwnTool(t));
  if (tools.length) {
    const definitions = tools.map((t) => ({ name: t.id, description: toolDescription(template, t), annotations: EFFECT_ANNOTATIONS[String(t.effect)] ?? EFFECT_ANNOTATIONS.read }));
    add(TOOLS_FILE, 'start', '工具定义', JSON.stringify(definitions, null, 2) + '\n', 'part:tools');
  }

  // 用到才加载：每个 skill 的正文
  const skills = def.skills.filter((s) => usable.has(s) && skillHasBody(template, s));
  for (const s of def.skills) {
    if (usable.has(s) && !skillHasBody(template, s)) {
      diags.push({ severity: 'warning', message: `skill「${s.name}」还没写正文，没有生成，也不在 Skill 目录里`, target: `item:skills:${s.id}` });
    }
  }
  for (const s of skills) {
    const target = `item:skills:${s.id}`;
    const { main, reference } = renderSkill(template, def, s);
    add(`skills/${s.id}/SKILL.md`, 'on_demand', `Skill · ${s.name}`, main, target);
    if (reference) add(`skills/${s.id}/reference.md`, 'on_demand', `Skill · ${s.name} · 附带资料`, reference, target);
    const description = skillDescription(s);
    if (!description) diags.push({ severity: 'warning', message: `skill「${s.name}」没写什么时候用，agent 不知道何时读它`, target });
    if (description.length > template.budgets.skill_description_chars) {
      diags.push({ severity: 'warning', message: `skill「${s.name}」的"什么时候用"加"什么时候不用"共 ${description.length} 字，超过上限 ${template.budgets.skill_description_chars}`, target });
    }
    const lines = countLines(main);
    const tokens = estimateTokens(main);
    if (lines > template.budgets.skill_lines || tokens > template.budgets.skill_tokens) {
      diags.push({ severity: 'warning', message: `skill「${s.name}」的正文有 ${lines} 行、约 ${tokens} token，太长了。细节可以挪到附带资料里`, target });
    }
  }

  // 系统插入消息：运行信息、自动加载的记忆
  const inserts = renderInsertions(def);
  if (inserts.perMessage || inserts.sessionStart || inserts.memory) {
    const parts = ['# 自动插入', '这些内容由系统在运行时插入消息，不在系统提示词里。下面的值是示例，真实的值由系统填。'];
    if (inserts.perMessage) parts.push(`## 每条消息开头\n\n\`\`\`\n${inserts.perMessage}\n\`\`\``);
    const once = [inserts.sessionStart, inserts.memory].filter(Boolean).join('\n\n');
    if (once) parts.push(`## 会话开始和压缩之后\n\n\`\`\`\n${once}\n\`\`\``);
    add(INSERT_FILE, 'message', '自动插入', parts.join('\n\n') + '\n', 'part:environment');
  }

  // 用到才加载：知识
  const knowledge = def.knowledge.filter((k) => usable.has(k) && knowledgeWhere(k));
  for (const k of knowledge.filter(isInlineKnowledge)) {
    const source = text(k.source) ? `> 来源与更新时间：${text(k.source)}\n\n` : '';
    add(`knowledge/${k.id}.md`, 'on_demand', `知识 · ${k.name}`, `# ${k.name}\n\n${source}${text(k.content)}\n`, `item:knowledge:${k.id}`);
  }

  // 到时机时插入：系统提醒
  const reminders = def.reminders.filter((r) => usable.has(r) && text(r.text));
  for (const r of reminders) add(`reminders/${r.id}.md`, 'situation', `系统提醒 · ${r.name}`, renderReminder(r) + '\n', `item:reminders:${r.id}`);

  // 不给 agent 看
  add(GUARANTEES_FILE, 'hidden', '系统保证', renderGuarantees(def), 'part:guarantees');
  add(CASES_FILE, 'hidden', '检验用例', renderCases(def), 'part:cases');
  const manifest = {
    agent: text(def.config.name) || '未命名',
    ...(text(def.config.description) ? { description: text(def.config.description) } : {}),
    ...(text(def.config.model) ? { model: text(def.config.model) } : {}),
    note: '本目录由 agent-context-builder 生成，不要手改。在编写页里改，保存后会重新生成。',
    given_at_start: {
      system_prompt: SYSTEM_PROMPT_FILE,
      ...(tools.length ? { tools: TOOLS_FILE } : {}),
    },
    loaded_on_demand: {
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: skillDescription(s),
        file: `skills/${s.id}/SKILL.md`,
        ...(text(s.reference) ? { reference: `skills/${s.id}/reference.md` } : {}),
      })),
      knowledge: knowledge.map((k) => ({ id: k.id, name: k.name, when: text(k.when), [isInlineKnowledge(k) ? 'file' : 'location']: knowledgeWhere(k), ...(text(k.source) ? { source: text(k.source) } : {}) })),
    },
    injected_on_timing: {
      reminders: reminders.map((r) => ({ id: r.id, name: r.name, trigger: text(r.trigger), file: `reminders/${r.id}.md` })),
    },
    ...(def.tools.some((t) => text(t.name) && !isOwnTool(t)) ? { platform_tools: def.tools.filter((t) => text(t.name) && !isOwnTool(t)).map((t) => ({ name: t.id, source: t.source, effect: t.effect })) } : {}),
    memory: def.memory.filter((m) => text(m.name)),
    outputs: def.outputs.filter((o) => text(o.name)),
    provided_by_system: def.provided.filter((x) => text(x.name)),
    not_in_prompt: Object.fromEntries(template.prompt.sections.flatMap((sec) => sec.fields.filter((f) => f.prompt === false && text(def.prompt[f.id])).map((f) => [f.label, text(def.prompt[f.id])]))),
    not_for_agent: { guarantees: GUARANTEES_FILE, cases: CASES_FILE },
  };
  add(MANIFEST_FILE, 'hidden', '配置清单', YAML.stringify(manifest, { lineWidth: 0 }), `section:${template.prompt.sections[0].id}`);

  return { files, diagnostics: diags };
}

/** 检查标识：会成为文件名的要合规，同一清单里不能重复。返回可以生成文件的项。 */
function checkIds(template: Template, def: AgentDef, diags: Diagnostic[]): Set<Item> {
  const usable = new Set<Item>();
  for (const kind of LIST_KINDS) {
    const seen = new Set<string>();
    for (const item of def[kind]) {
      const target = `item:${kind}:${item.id}`;
      const rule = ID_RULES[kind];
      if (!item.id) {
        const part = template.parts.find((p) => p.lists.includes(kind));
        diags.push({ severity: 'error', message: `「${item.name || '未命名'}」没有标识，没有生成`, ...(part ? { target: `part:${part.id}` } : {}) });
      } else if (seen.has(item.id)) {
        diags.push({ severity: 'error', message: `标识重复：${item.id}。后一个没有生成`, target });
      } else if (rule && !rule.pattern.test(item.id)) {
        diags.push({ severity: 'error', message: `「${item.name}」的标识「${item.id}」${rule.message}，没有生成`, target });
      } else if (kind === 'skills' && item.id.length > 64) {
        diags.push({ severity: 'error', message: `skill「${item.name}」的标识超过 64 个字符，没有生成`, target });
      } else {
        usable.add(item);
      }
      seen.add(item.id);
    }
  }
  return usable;
}
